import Decimal from "decimal.js";
import { Prisma } from "@/generated/prisma/client";
import type { BookingStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normalizeEmail } from "@/lib/email-normalize";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { parseIsoDay, eachUtcDayInclusive } from "@/lib/dates";
import {
  acquireTxAdvisoryLock,
  acquireAvailabilityRangeLock,
} from "@/lib/db/advisory-lock";
import { createManualAlert } from "@/lib/charter/manual-alerts";
import {
  detectCrossChannelConflicts,
  recordDoubleBookingIncident,
  isBoatExclusiveServiceType,
  type CrossChannelConflict,
} from "@/lib/booking/cross-channel-conflicts";
import { upsertCustomerFromExternal } from "@/lib/booking/upsert-customer-from-external";
import type { BokunBookingSummary } from "../types";

export interface ImportedBokunBooking {
  bookingId: string;
  boatId: string;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
  previous?: {
    boatId: string;
    startDate: Date;
    endDate: Date;
    status: BookingStatus;
  };
  shouldSyncAvailability?: boolean;
  // R27-CRIT-6: caller (webhook route / reconciliation cron) puo' usare
  // `mode` per saltare fan-out quando il booking e' gia' terminale
  // (CANCELLED/REFUNDED) e non c'e' stato cambio — evita re-blockDates
  // che sovrascrive admin-cancel o burn quota API Bokun su duplicati.
  mode?: "created" | "updated" | "skipped" | "conflict";
}

const TERMINAL_STATUSES = new Set<BookingStatus>(["CANCELLED", "REFUNDED"]);

function isActiveStatus(status: BookingStatus): boolean {
  return status === "PENDING" || status === "CONFIRMED";
}

/**
 * Mappa un Bokun booking nel nostro DB (idempotent su bokunBookingId).
 *
 * Race concorrenza: webhook + reconciliation cron possono arrivare insieme
 * sullo stesso `bokunBookingId`. `findUnique`+`create` sono separati, quindi
 * due chiamate in parallelo possono entrambe vedere `null` e tentare un
 * insert → P2002 sul `bokunBookingId`. Intercettiamo P2002 e degradiamo a
 * update (rilegendo la riga gia' creata dall'altra transazione).
 *
 * Ritorna boatId/startDate/endDate/status per permettere al caller di fare
 * fan-out availability senza una query extra.
 *
 * @throws NotFoundError se `bokunProductId` non mappa a un Service.
 * @throws ValidationError se lo status Bokun non e' mappabile.
 */
export async function importBokunBooking(
  booking: BokunBookingSummary,
): Promise<ImportedBokunBooking> {
  const emailLower = normalizeEmail(booking.mainContactDetails.email);
  const status = mapStatus(booking.status);

  const service = await db.service.findFirst({
    where: { bokunProductId: booking.productId },
  });
  if (!service) {
    throw new NotFoundError("Service", `bokunProductId=${booking.productId}`);
  }

  const startDate = parseIsoDay(booking.startDate.slice(0, 10));
  const endDate = parseIsoDay((booking.endDate ?? booking.startDate).slice(0, 10));
  if (hasMultipleProductBookings(booking)) {
    await createMultiProductAlert(booking, service.boatId, startDate, endDate);
    return {
      bookingId: String(booking.id),
      boatId: service.boatId,
      startDate,
      endDate,
      status,
      mode: "skipped",
    };
  }

  const totalPriceStr = new Decimal(booking.totalPrice).toFixed(2);
  const commissionStr = booking.commissionAmount
    ? new Decimal(booking.commissionAmount).toFixed(2)
    : null;
  const netStr = booking.netAmount ? new Decimal(booking.netAmount).toFixed(2) : null;

  // GDPR minimization: salviamo SOLO i campi business-essenziali; PII
  // (firstName/lastName/email/phone/passengers) vive gia' su `Customer` che
  // ha policy di anonymization dedicata. Il retention cron ri-redige
  // eventuali payload storici con la stessa whitelist dopo 90 giorni.
  const rawPayload = buildSafeRawPayload(booking);

  // R14 cross-OTA: conflitti rilevati dentro la tx + recorded post-commit.
  let detectedConflicts: CrossChannelConflict[] = [];
  // R28-ALTA-1: terminal-skip guard hit — se settato, emettiamo
  // ManualAlert post-commit per riconciliare upstream vs locale.
  // Wrap in un ref container per evitare il narrowing TypeScript che
  // riduce a `never` quando il let e' scritto da callback chiusura.
  interface TerminalSkipInfo {
    boatId: string;
    startDate: Date;
    endDate: Date;
    bookingId: string;
    localStatus: BookingStatus;
    incomingStatus: BookingStatus;
  }
  const terminalSkipRef: { value: TerminalSkipInfo | null } = { value: null };

  try {
    const result = await db.$transaction(async (tx) => {
      // R29-#1 + R29-AUDIT-FIX1/2: advisory lock "availability" per TUTTI
      // i giorni nel range [startDate, endDate]. Chiude race 0-50ms cross-
      // adapter. Skip per SHARED services (SOCIAL_BOATING/BOAT_SHARED):
      // cohabitation e' feature, non bug.
      // Multi-day fix: prima lockava solo startDay → 2 booking con
      // startDate diverse ma range overlapping saltavano il lock.
      if (isBoatExclusiveServiceType(service.type)) {
        await acquireAvailabilityRangeLock(tx, service.boatId, startDate, endDate);
      }

      // R27-CRIT-2: advisory lock per-bokunBookingId serializza import concorrenti
      // sullo stesso booking. Senza, `findUnique` + `update` soffrivano race
      // out-of-order: webhook CANCEL committava T+600ms → webhook CREATE in
      // flight committava T+1200ms → findUnique trovava CANCEL → branch update
      // riscriveva status=CONFIRMED sopra → slot phantom (DB BLOCKED, Bokun
      // upstream CANCELLED). pg_advisory_xact_lock forza sequenzializzazione:
      // CANCEL aspetta CREATE o viceversa.
      await acquireTxAdvisoryLock(tx, "bokun-booking", String(booking.id));

      // findUnique dentro la tx + sotto advisory lock: serializza import
      // concorrenti + degrado P2002 catch below resta come safety net.
      const existing = await tx.bokunBooking.findUnique({
        where: { bokunBookingId: String(booking.id) },
        include: { booking: true },
      });

      if (existing) {
        // Optimistic guard R27-CRIT-2: se lo status corrente e' "piu' terminale"
        // del nuovo (CANCELLED/REFUNDED arrivati prima di CONFIRMED out-of-order),
        // skip l'update. Preserve il cancel admin + ordering upstream Bokun.
        if (TERMINAL_STATUSES.has(existing.booking.status) && !TERMINAL_STATUSES.has(status)) {
          logger.warn(
            {
              bokunBookingId: String(booking.id),
              existingStatus: existing.booking.status,
              incomingStatus: status,
            },
            "Bokun import: skipping non-terminal update on terminal booking (out-of-order protection)",
          );
          // R28-ALTA-1: segnaliamo al caller che il guard e' stato hit — post-
          // commit creeremo ManualAlert per riconciliare upstream. Senza, admin
          // cancel-by-mistake lasciava Bokun upstream CONFIRMED senza alert →
          // un webhook Boataround successivo non vedeva il booking Bokun
          // CANCELLED nei conflict → double-booking cross-channel silent.
          terminalSkipRef.value = {
            boatId: existing.booking.boatId,
            startDate: existing.booking.startDate,
            endDate: existing.booking.endDate,
            bookingId: existing.booking.id,
            localStatus: existing.booking.status,
            incomingStatus: status,
          };
          return {
            booking: {
              id: existing.booking.id,
              boatId: existing.booking.boatId,
              startDate: existing.booking.startDate,
              endDate: existing.booking.endDate,
              status: existing.booking.status,
            },
            mode: "skipped" as const,
          };
        }

        const previous = {
          boatId: existing.booking.boatId,
          startDate: existing.booking.startDate,
          endDate: existing.booking.endDate,
          status: existing.booking.status,
        };

        const existingService = await tx.service.findUnique({
          where: { id: existing.booking.serviceId },
          select: { type: true },
        });
        const rangeChanged =
          existing.booking.boatId !== service.boatId ||
          existing.booking.startDate.getTime() !== startDate.getTime() ||
          existing.booking.endDate.getTime() !== endDate.getTime();
        if (rangeChanged && existingService && isBoatExclusiveServiceType(existingService.type)) {
          await acquireAvailabilityRangeLock(
            tx,
            existing.booking.boatId,
            existing.booking.startDate,
            existing.booking.endDate,
          );
        }

        detectedConflicts = await detectCrossChannelConflicts(tx, {
          boatId: service.boatId,
          startDate,
          endDate,
          selfSource: "BOKUN",
          selfBookingId: existing.bookingId,
          includeSameSource: true,
        });
        if (detectedConflicts.length > 0 && isActiveStatus(status)) {
          return {
            booking: {
              id: existing.bookingId,
              boatId: existing.booking.boatId,
              startDate: existing.booking.startDate,
              endDate: existing.booking.endDate,
              status: existing.booking.status,
            },
            previous,
            mode: "conflict" as const,
          };
        }

        const customer = await upsertCustomerFromExternal(tx, {
          email: emailLower,
          firstName: booking.mainContactDetails.firstName,
          lastName: booking.mainContactDetails.lastName,
          phone: booking.mainContactDetails.phoneNumber,
          nationality: booking.mainContactDetails.country,
          language: booking.mainContactDetails.language,
        });

        const updated = await tx.booking.update({
          where: { id: existing.bookingId },
          data: {
            externalRef: booking.productConfirmationCode,
            customerId: customer.id,
            serviceId: service.id,
            boatId: service.boatId,
            startDate,
            endDate,
            status,
            numPeople: booking.numPeople ?? existing.booking.numPeople,
            totalPrice: totalPriceStr,
            exclusiveSlot: true,
            claimsAvailability: true,
          },
          select: { id: true, boatId: true, startDate: true, endDate: true, status: true },
        });
        await tx.bokunBooking.update({
          where: { bookingId: existing.bookingId },
          data: {
            channelName: booking.channelName,
            rawPayload,
            commissionAmount: commissionStr,
            netAmount: netStr,
          },
        });
        return { booking: updated, previous, mode: "updated" as const };
      }

      // R14 cross-OTA detection: cerca conflicts cross-source (non solo
      // DIRECT). Bokun e' gia' confermata upstream quindi non possiamo
      // rigettare; il caller (post-commit) emettera' ManualAlert +
      // notification admin per decidere quale cancellare.
      // Boat-exclusive only: SOCIAL_BOATING e' tour condiviso (feature,
      // non bug). Filter applicato dentro detectCrossChannelConflicts.
      detectedConflicts = await detectCrossChannelConflicts(tx, {
        boatId: service.boatId,
        startDate,
        endDate,
        selfSource: "BOKUN",
        includeSameSource: true,
      });
      if (detectedConflicts.length > 0 && isActiveStatus(status)) {
        return {
          booking: {
            id: `BOKUN-CONFLICT-${booking.id}`,
            boatId: service.boatId,
            startDate,
            endDate,
            status,
          },
          mode: "conflict" as const,
        };
      }

      const customer = await upsertCustomerFromExternal(tx, {
        email: emailLower,
        firstName: booking.mainContactDetails.firstName,
        lastName: booking.mainContactDetails.lastName,
        phone: booking.mainContactDetails.phoneNumber,
        nationality: booking.mainContactDetails.country,
        language: booking.mainContactDetails.language,
      });

      const created = await tx.booking.create({
        data: {
          confirmationCode: booking.confirmationCode,
          source: "BOKUN",
          externalRef: booking.productConfirmationCode,
          customerId: customer.id,
          serviceId: service.id,
          boatId: service.boatId,
          startDate,
          endDate,
          // Bokun a volte manda 0 (gift voucher, cart senza conferma); il
          // booking esiste ma senza persone definite — default a 1 per non
          // violare CHECK downstream.
          numPeople: booking.numPeople && booking.numPeople > 0 ? booking.numPeople : 1,
          totalPrice: totalPriceStr,
          // R19-REG-CRITICA-1: forziamo 'EUR' app-level perche' il sistema e'
          // EUR-only. Bokun hub puo' forwarded valute diverse da OTA US-based
          // (Viator/GYG con USD/GBP). La currency upstream resta in
          // `rawPayload.currency` per audit; il `totalPrice` Bokun e' gia'
          // convertito a EUR da Bokun stesso (o accettiamo il valore come EUR
          // nominale — verificare con cliente). Senza questo override: 23514
          // constraint violation in produzione al primo ordine non-EUR.
          currency: "EUR",
          status,
          exclusiveSlot: true,
          claimsAvailability: true,
          bokunBooking: {
            create: {
              bokunBookingId: String(booking.id),
              channelName: booking.channelName,
              commissionAmount: commissionStr,
              netAmount: netStr,
              rawPayload,
            },
          },
        },
        select: { id: true, boatId: true, startDate: true, endDate: true, status: true },
      });
      return { booking: created, mode: "created" as const };
    });

    logger.info(
      {
        bookingId: result.booking.id,
        bokunBookingId: String(booking.id),
        status: booking.status,
        mode: result.mode,
      },
      `Bokun booking ${result.mode}`,
    );

    // R28-ALTA-1: post-commit ManualAlert per terminal-skip hit. Idempotent
    // via partial unique (channel, boatId, date, action) WHERE status=PENDING.
    // Multi-day booking → un alert per giorno. Non blocca il flow se fallisce.
    const skipInfo = terminalSkipRef.value;
    if (skipInfo) {
      for (const day of eachUtcDayInclusive(skipInfo.startDate, skipInfo.endDate)) {
        try {
          await createManualAlert({
            channel: "BOKUN",
            boatId: skipInfo.boatId,
            date: day,
            action: "UNBLOCK",
            bookingId: skipInfo.bookingId,
            notes: `Booking locale ${skipInfo.localStatus} ma Bokun upstream invia ${skipInfo.incomingStatus}. Verificare Bokun panel: cancellare upstream o ripristinare locale.`,
          });
        } catch (err) {
          logger.warn(
            { err, bookingId: skipInfo.bookingId, day: day.toISOString() },
            "Terminal-skip ManualAlert creation failed (non-blocking)",
          );
        }
      }
    }

    // R14: post-commit double-booking incident recording. Non nella tx
    // perche' fa side-effect rete (dispatch notification) + ManualAlert
    // ha la sua advisory lock.
    if (result.mode === "conflict" && detectedConflicts.length > 0) {
      await recordBokunConflictAlerts({
        boatId: result.booking.boatId,
        startDate: result.booking.startDate,
        endDate: result.booking.endDate,
        bokunBookingId: String(booking.id),
        conflicts: detectedConflicts,
      });
    } else if (
      (result.mode === "created" || result.mode === "updated") &&
      detectedConflicts.length > 0
    ) {
      await recordDoubleBookingIncident({
        newBookingId: result.booking.id,
        newSource: "BOKUN",
        newConfirmationCode: booking.confirmationCode,
        boatId: result.booking.boatId,
        startDate: result.booking.startDate,
        endDate: result.booking.endDate,
        conflicts: detectedConflicts,
      });
    }

    return {
      bookingId: result.booking.id,
      boatId: result.booking.boatId,
      startDate: result.booking.startDate,
      endDate: result.booking.endDate,
      status: result.booking.status,
      previous: "previous" in result ? result.previous : undefined,
      shouldSyncAvailability: result.mode !== "conflict",
      mode: result.mode,
    };
  } catch (err) {
    // P2002 = concurrent insert race sulla unique bokunBookingId.
    // L'altra tx ha vinto: rileggiamo e ritorniamo come update.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.warn(
        { bokunBookingId: String(booking.id) },
        "Concurrent Bokun import race, retrying as update",
      );
      const row = await db.bokunBooking.findUnique({
        where: { bokunBookingId: String(booking.id) },
        include: { booking: { select: { id: true, boatId: true, startDate: true, endDate: true, status: true } } },
      });
      if (!row) throw err;
      return {
        bookingId: row.booking.id,
        boatId: row.booking.boatId,
        startDate: row.booking.startDate,
        endDate: row.booking.endDate,
        status: row.booking.status,
        mode: "updated",
      };
    }
    throw err;
  }
}

/**
 * Mappa gli stati Bokun noti ai nostri BookingStatus.
 * Throws su stati sconosciuti per evitare default silenziosi che bloccano
 * availability reali con payload ambigui (es. ABANDONED/TIMEOUT).
 */
const BOKUN_STATUS_MAP: Record<string, BookingStatus> = {
  CONFIRMED: "CONFIRMED",
  ARRIVED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  REJECTED: "CANCELLED",
  ABORTED: "CANCELLED",
  TIMEOUT: "CANCELLED",
  ABANDONED: "CANCELLED",
  EXPIRED: "CANCELLED",
  REFUNDED: "REFUNDED",
  REQUESTED: "PENDING",
  PENDING: "PENDING",
  CART: "PENDING",
  QUOTE: "PENDING",
};

function buildSafeRawPayload(booking: BokunBookingSummary): Prisma.InputJsonValue {
  return {
    id: booking.id,
    confirmationCode: booking.confirmationCode,
    productConfirmationCode: booking.productConfirmationCode,
    productId: booking.productId,
    status: booking.status,
    channelName: booking.channelName,
    startDate: booking.startDate,
    endDate: booking.endDate,
    numPeople: booking.numPeople,
    totalPrice: booking.totalPrice,
    currency: booking.currency,
    commissionAmount: booking.commissionAmount,
    netAmount: booking.netAmount,
    paymentStatus: booking.paymentStatus,
    passengerCount: booking.passengers?.length,
  };
}

function hasMultipleProductBookings(booking: BokunBookingSummary): boolean {
  return (
    (booking.experienceBookings?.length ?? 0) > 1 ||
    (booking.productBookings?.length ?? 0) > 1
  );
}

async function createMultiProductAlert(
  booking: BokunBookingSummary,
  boatId: string,
  startDate: Date,
  endDate: Date,
): Promise<void> {
  for (const day of eachUtcDayInclusive(startDate, endDate)) {
    await createManualAlert({
      channel: "BOKUN",
      boatId,
      date: day,
      action: "BLOCK",
      notes:
        `Bokun booking ${booking.confirmationCode} contiene piu' product booking. ` +
        "Import automatico saltato: configurare Bokun mono-prodotto o gestire manualmente.",
    });
  }
}

async function recordBokunConflictAlerts(input: {
  boatId: string;
  startDate: Date;
  endDate: Date;
  bokunBookingId: string;
  conflicts: CrossChannelConflict[];
}): Promise<void> {
  for (const conflict of input.conflicts) {
    await createManualAlert({
      channel: "BOKUN",
      boatId: input.boatId,
      date: input.startDate,
      action: "BLOCK",
      notes:
        `Bokun booking ${input.bokunBookingId} overlaps existing booking ` +
        `${conflict.confirmationCode} (${conflict.source}) from ${input.startDate.toISOString().slice(0, 10)} ` +
        `to ${input.endDate.toISOString().slice(0, 10)}. Import skipped; resolve manually upstream.`,
    });
  }
}

export function mapStatus(bokunStatus: string): BookingStatus {
  const s = bokunStatus.toUpperCase();
  const mapped = BOKUN_STATUS_MAP[s];
  if (!mapped) {
    throw new ValidationError(`Unknown Bokun booking status: ${bokunStatus}`, { bokunStatus });
  }
  return mapped;
}
