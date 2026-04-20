import Decimal from "decimal.js";
import { Prisma } from "@/generated/prisma/client";
import type { BookingStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normalizeEmail } from "@/lib/email-normalize";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { parseIsoDay } from "@/lib/dates";
import {
  detectCrossChannelConflicts,
  recordDoubleBookingIncident,
  type CrossChannelConflict,
} from "@/lib/booking/cross-channel-conflicts";
import type { BokunBookingSummary } from "../types";

export interface ImportedBokunBooking {
  bookingId: string;
  boatId: string;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
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

  const totalPriceStr = new Decimal(booking.totalPrice).toFixed(2);
  const commissionStr = booking.commissionAmount
    ? new Decimal(booking.commissionAmount).toFixed(2)
    : null;
  const netStr = booking.netAmount ? new Decimal(booking.netAmount).toFixed(2) : null;
  const startDate = parseIsoDay(booking.startDate.slice(0, 10));
  const endDate = parseIsoDay((booking.endDate ?? booking.startDate).slice(0, 10));

  // GDPR minimization: salviamo SOLO i campi business-essenziali; PII
  // (firstName/lastName/email/phone/passengers) vive gia' su `Customer` che
  // ha policy di anonymization dedicata. Il retention cron ri-redige
  // eventuali payload storici con la stessa whitelist dopo 90 giorni.
  const rawPayload = buildSafeRawPayload(booking);

  // R14 cross-OTA: conflitti rilevati dentro la tx + recorded post-commit.
  let detectedConflicts: CrossChannelConflict[] = [];

  try {
    const result = await db.$transaction(async (tx) => {
      // findUnique dentro la tx: serializza con l'upsert successivo
      // sotto lo stesso lock implicito del bokunBookingId unique index.
      const existing = await tx.bokunBooking.findUnique({
        where: { bokunBookingId: String(booking.id) },
        include: { booking: true },
      });

      if (existing) {
        const updated = await tx.booking.update({
          where: { id: existing.bookingId },
          data: {
            status,
            numPeople: booking.numPeople ?? existing.booking.numPeople,
            totalPrice: totalPriceStr,
          },
          select: { id: true, boatId: true, startDate: true, endDate: true, status: true },
        });
        await tx.bokunBooking.update({
          where: { bookingId: existing.bookingId },
          data: { rawPayload, commissionAmount: commissionStr, netAmount: netStr },
        });
        return { booking: updated, mode: "updated" as const };
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
      });

      const customer = await tx.customer.upsert({
        where: { email: emailLower },
        update: {
          phone: booking.mainContactDetails.phoneNumber || undefined,
          nationality: booking.mainContactDetails.country || undefined,
          language: booking.mainContactDetails.language || undefined,
        },
        create: {
          email: emailLower,
          firstName: booking.mainContactDetails.firstName,
          lastName: booking.mainContactDetails.lastName,
          phone: booking.mainContactDetails.phoneNumber,
          nationality: booking.mainContactDetails.country,
          language: booking.mainContactDetails.language,
        },
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

    // R14: post-commit double-booking incident recording. Non nella tx
    // perche' fa side-effect rete (dispatch notification) + ManualAlert
    // ha la sua advisory lock.
    if (result.mode === "created" && detectedConflicts.length > 0) {
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

export function mapStatus(bokunStatus: string): BookingStatus {
  const s = bokunStatus.toUpperCase();
  const mapped = BOKUN_STATUS_MAP[s];
  if (!mapped) {
    throw new ValidationError(`Unknown Bokun booking status: ${bokunStatus}`, { bokunStatus });
  }
  return mapped;
}
