import { Prisma } from "@/generated/prisma/client";
import type { BookingStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normalizeEmail } from "@/lib/email-normalize";
import { fromCents } from "@/lib/pricing/cents";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { blockDates, releaseBookingDates } from "@/lib/availability/service";
import { CHANNELS, type Channel } from "@/lib/channels";
import { toUtcDay, parseDateLikelyLocalDay } from "@/lib/dates";
import {
  acquireTxAdvisoryLock,
  acquireAvailabilityRangeLock,
} from "@/lib/db/advisory-lock";
import {
  detectCrossChannelConflicts,
  recordDoubleBookingIncident,
  BOAT_EXCLUSIVE_SERVICE_TYPES,
  type CrossChannelConflict,
} from "@/lib/booking/cross-channel-conflicts";
import { upsertCustomerFromExternal } from "@/lib/booking/upsert-customer-from-external";
import { createManualAlert } from "@/lib/charter/manual-alerts";
import type {
  CharterPlatform,
  ExtractedCharterBooking,
} from "@/lib/email-parser/booking-extractor";

// Sanity check anti-DoS e anti-parser-bug. Un parser buggato (o email
// spoofata) non deve poter bloccare anni di availability.
const MAX_CHARTER_DURATION_DAYS = 30;
const MAX_CHARTER_FUTURE_DAYS = 730; // 2 anni
const MIN_CHARTER_CENTS = 5_000; // 50 EUR
const MAX_CHARTER_CENTS = 100_000_00; // 100k EUR

export interface ImportCharterInput extends ExtractedCharterBooking {
  platform: CharterPlatform;
  boatId: string;
}

export interface ImportedCharterBooking {
  bookingId: string;
  boatId: string;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
  shouldSyncAvailability?: boolean;
  previous?: {
    boatId: string;
    startDate: Date;
    endDate: Date;
    status: BookingStatus;
  };
}

const PLATFORM_TO_CHANNEL: Record<CharterPlatform, Channel> = {
  SAMBOAT: CHANNELS.SAMBOAT,
  CLICKANDBOAT: CHANNELS.CLICKANDBOAT,
  NAUTAL: CHANNELS.NAUTAL,
};

/**
 * Importa un booking charter estratto da email. Idempotent su
 * `(platformName, platformBookingRef)`. Blocca availability via
 * `blockDates` POST-commit (fan-out verso altri canali).
 *
 * Cross-channel race detection: se trova un DIRECT PENDING/CONFIRMED
 * overlapping, log warn (admin review — la charter platform ha gia'
 * confermato upstream).
 *
 * @throws NotFoundError se `boatId` o nessun charter service trovato.
 */
export async function importCharterBooking(
  input: ImportCharterInput,
): Promise<ImportedCharterBooking> {
  validateCharterInput(input);
  const emailLower = normalizeEmail(input.customerEmail);

  const service = await db.service.findFirst({
    where: {
      boatId: input.boatId,
      type: { in: [...BOAT_EXCLUSIVE_SERVICE_TYPES] },
      active: true,
    },
    orderBy: { priority: "desc" },
  });
  if (!service) {
    throw new NotFoundError("Service", `charter service for boat=${input.boatId}`);
  }

  const totalPriceStr = fromCents(input.totalAmountCents).toFixed(2);

  // R14 cross-OTA: conflitti rilevati dentro tx + recorded post-commit.
  let detectedConflicts: CrossChannelConflict[] = [];

  try {
    const result = await db.$transaction(async (tx) => {
      // R29-#1 + R29-AUDIT-FIX1: lock "availability" per TUTTI i giorni nel
      // range [startDate, endDate]. Charter import filtra service boat-exclusive
      // upstream (line 67) quindi lock sempre necessario.
      await acquireAvailabilityRangeLock(tx, input.boatId, input.startDate, input.endDate);
      // R29-#1b: lock per-platformBookingRef (parser + re-run cron).
      await acquireTxAdvisoryLock(
        tx,
        "charter-booking",
        `${input.platform}:${input.platformBookingRef}`,
      );

      const existing = await tx.charterBooking.findUnique({
        where: {
          platformName_platformBookingRef: {
            platformName: input.platform,
            platformBookingRef: input.platformBookingRef,
          },
        },
        include: { booking: true },
      });

      const customer = await upsertCustomerFromExternal(tx, {
        email: emailLower,
        firstName: input.customerFirstName,
        lastName: input.customerLastName,
        phone: input.customerPhone,
        nationality: input.customerNationality,
      });

      if (existing) {
        const previous = {
          boatId: existing.booking.boatId,
          startDate: existing.booking.startDate,
          endDate: existing.booking.endDate,
          status: existing.booking.status,
        };
        const targetStatus: BookingStatus =
          input.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED";
        detectedConflicts = await detectCrossChannelConflicts(tx, {
          boatId: input.boatId,
          startDate: input.startDate,
          endDate: input.endDate,
          selfSource: input.platform,
          includeSameSource: true,
          selfBookingId: existing.bookingId,
        });
        if (detectedConflicts.length > 0 && targetStatus !== "CANCELLED") {
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

        const updated = await tx.booking.update({
          where: { id: existing.bookingId },
          data: {
            customerId: customer.id,
            serviceId: service.id,
            boatId: input.boatId,
            startDate: input.startDate,
            endDate: input.endDate,
            totalPrice: new Prisma.Decimal(totalPriceStr),
            currency: input.currency,
            status: targetStatus,
            externalRef: input.platformBookingRef,
            exclusiveSlot: true,
            claimsAvailability: true,
          },
          select: { id: true, boatId: true, startDate: true, endDate: true, status: true },
        });
        await tx.charterBooking.update({
          where: { bookingId: existing.bookingId },
          data: {
            rawPayload: {
              platform: input.platform,
              ref: input.platformBookingRef,
              startDate: input.startDate.toISOString().slice(0, 10),
              endDate: input.endDate.toISOString().slice(0, 10),
              totalAmountCents: input.totalAmountCents,
              currency: input.currency,
            } satisfies Prisma.InputJsonValue,
          },
        });
        return {
          booking: updated,
          previous,
          mode: targetStatus === "CANCELLED" ? ("cancelled" as const) : ("updated" as const),
        };
      }

      // R14 cross-OTA detection cross-source (incluso BOKUN/BOATAROUND/
      // charter platforms). Charter ha gia' committato upstream → warn +
      // ManualAlert post-commit per admin review.
      detectedConflicts = await detectCrossChannelConflicts(tx, {
        boatId: input.boatId,
        startDate: input.startDate,
        endDate: input.endDate,
        selfSource: input.platform,
        includeSameSource: true,
      });
      if (detectedConflicts.length > 0 && input.status !== "CANCELLED") {
        return {
          booking: {
            id: `${input.platform}-CONFLICT-${input.platformBookingRef}`,
            boatId: input.boatId,
            startDate: input.startDate,
            endDate: input.endDate,
            status: "CONFIRMED" as BookingStatus,
          },
          previous: null,
          mode: "conflict" as const,
        };
      }

      const created = await tx.booking.create({
        data: {
          confirmationCode: `${input.platform.slice(0, 2)}-${input.platformBookingRef}`,
          source: input.platform,
          externalRef: input.platformBookingRef,
          customerId: customer.id,
          serviceId: service.id,
          boatId: input.boatId,
          startDate: input.startDate,
          endDate: input.endDate,
          numPeople: 1,
          totalPrice: new Prisma.Decimal(totalPriceStr),
          currency: input.currency,
          status: input.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED",
          exclusiveSlot: true,
          claimsAvailability: true,
          charterBooking: {
            create: {
              platformName: input.platform,
              platformBookingRef: input.platformBookingRef,
              // GDPR minimization: niente subject (contiene nome cliente in
              // template "Prenotazione di Mario Rossi confermata") — viola
              // art. 5.1.c. La PII vive su `Customer` con policy dedicata.
              rawPayload: {
                platform: input.platform,
                ref: input.platformBookingRef,
                startDate: input.startDate.toISOString().slice(0, 10),
                endDate: input.endDate.toISOString().slice(0, 10),
                totalAmountCents: input.totalAmountCents,
                currency: input.currency,
              } satisfies Prisma.InputJsonValue,
            },
          },
        },
        select: { id: true, boatId: true, startDate: true, endDate: true, status: true },
      });

      return { booking: created, previous: null, mode: "created" as const };
    });

    // Fan-out availability POST-commit per evitare ghost jobs su rollback.
    const channel = PLATFORM_TO_CHANNEL[input.platform];
    if (result.previous && result.previous.status !== "CANCELLED" && result.previous.status !== "REFUNDED") {
      const rangeChanged =
        result.previous.boatId !== result.booking.boatId ||
        result.previous.startDate.getTime() !== result.booking.startDate.getTime() ||
        result.previous.endDate.getTime() !== result.booking.endDate.getTime() ||
        result.booking.status === "CANCELLED" ||
        result.booking.status === "REFUNDED";
      if (rangeChanged) {
        await releaseBookingDates({
          bookingId: result.booking.id,
          boatId: result.previous.boatId,
          startDate: result.previous.startDate,
          endDate: result.previous.endDate,
          sourceChannel: channel,
        });
      }
    }

    if (
      (result.mode === "created" || result.mode === "updated") &&
      result.booking.status !== "CANCELLED" &&
      result.booking.status !== "REFUNDED"
    ) {
      await blockDates(
        result.booking.boatId,
        result.booking.startDate,
        result.booking.endDate,
        channel,
        result.booking.id,
      );
    } else if (result.mode === "cancelled") {
      // R24-P2-MEDIA: solo su transizione CONFIRMED→CANCELLED.
      // `mode==="skipped" && status==="CANCELLED"` (email cancellazione
      // replay su booking gia' cancellato) scatenava fan-out inutile —
      // idempotent via self-echo ma sprecava job BullMQ + log noise.
      await releaseBookingDates({
        bookingId: result.booking.id,
        boatId: result.booking.boatId,
        startDate: result.booking.startDate,
        endDate: result.booking.endDate,
        sourceChannel: channel,
      });
    }

    logger.info(
      {
        bookingId: result.booking.id,
        platform: input.platform,
        ref: input.platformBookingRef,
        mode: result.mode,
      },
      `Charter booking ${result.mode}`,
    );

    // R14 cross-OTA post-commit incident recording.
    // R24-A1-A4: un import charter CANCELLED (email di disdetta al primo
    // ingest) non deve emettere alert — non e' un booking attivo.
    if (result.mode === "conflict" && detectedConflicts.length > 0) {
      await recordCharterConflictAlerts({
        platform: input.platform,
        platformBookingRef: input.platformBookingRef,
        boatId: result.booking.boatId,
        startDate: result.booking.startDate,
        endDate: result.booking.endDate,
        conflicts: detectedConflicts,
      });
    } else if (
      result.mode === "created" &&
      result.booking.status !== "CANCELLED" &&
      detectedConflicts.length > 0
    ) {
      await recordDoubleBookingIncident({
        newBookingId: result.booking.id,
        newSource: input.platform,
        newConfirmationCode: `${input.platform.slice(0, 2)}-${input.platformBookingRef}`,
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
      shouldSyncAvailability: result.mode !== "conflict",
      previous: result.previous ?? undefined,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.warn(
        { platform: input.platform, ref: input.platformBookingRef },
        "Concurrent charter import race, retrying as lookup",
      );
      const row = await db.charterBooking.findUnique({
        where: {
          platformName_platformBookingRef: {
            platformName: input.platform,
            platformBookingRef: input.platformBookingRef,
          },
        },
        include: {
          booking: {
            select: { id: true, boatId: true, startDate: true, endDate: true, status: true },
          },
        },
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

async function recordCharterConflictAlerts(input: {
  platform: CharterPlatform;
  platformBookingRef: string;
  boatId: string;
  startDate: Date;
  endDate: Date;
  conflicts: CrossChannelConflict[];
}): Promise<void> {
  for (const conflict of input.conflicts) {
    await createManualAlert({
      channel: input.platform,
      boatId: input.boatId,
      date: input.startDate,
      action: "BLOCK",
      notes:
        `${input.platform} booking ${input.platformBookingRef} overlaps existing booking ` +
        `${conflict.confirmationCode} (${conflict.source}) from ${input.startDate.toISOString().slice(0, 10)} ` +
        `to ${input.endDate.toISOString().slice(0, 10)}. Import skipped; resolve manually upstream.`,
    });
  }
}

/**
 * Sanity check pre-insert anti-DoS.
 *
 * Un parser buggato o un'email spoofata puo' estrarre un range arbitrario
 * (es. "2026-01-01 to 2099-12-31" = 26k righe BoatAvailability + altrettanti
 * job fan-out). Throw di `ValidationError` fa tornare il cron un error che
 * lascia l'email UNSEEN per review manuale.
 *
 * @throws ValidationError se dates/amount fuori range ragionevole.
 */
function validateCharterInput(input: ImportCharterInput): void {
  const start = toUtcDay(input.startDate);
  const end = toUtcDay(input.endDate);

  if (end < start) {
    throw new ValidationError("Charter endDate before startDate", {
      platform: input.platform,
      ref: input.platformBookingRef,
    });
  }

  const durationDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (durationDays > MAX_CHARTER_DURATION_DAYS) {
    throw new ValidationError(
      `Charter duration ${durationDays}d exceeds max ${MAX_CHARTER_DURATION_DAYS}d`,
      { platform: input.platform, ref: input.platformBookingRef, durationDays },
    );
  }

  // R22-P2-MEDIA-2: parseDateLikelyLocalDay allinea con day Europe/Rome
  // (stesso frame di start=parseDateLikelyLocalDay). Evita off-by-one a
  // mezzanotte Rome quando l'email arriva cross-TZ.
  const today = parseDateLikelyLocalDay(new Date());
  const daysFromNow = Math.round((start.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (daysFromNow < -7) {
    throw new ValidationError("Charter startDate too far in the past", {
      platform: input.platform,
      ref: input.platformBookingRef,
      daysFromNow,
    });
  }
  if (daysFromNow > MAX_CHARTER_FUTURE_DAYS) {
    throw new ValidationError(
      `Charter startDate ${daysFromNow}d in future exceeds max ${MAX_CHARTER_FUTURE_DAYS}d`,
      { platform: input.platform, ref: input.platformBookingRef, daysFromNow },
    );
  }

  if (input.totalAmountCents < MIN_CHARTER_CENTS || input.totalAmountCents > MAX_CHARTER_CENTS) {
    throw new ValidationError(
      `Charter totalAmountCents ${input.totalAmountCents} out of range [${MIN_CHARTER_CENTS}..${MAX_CHARTER_CENTS}]`,
      { platform: input.platform, ref: input.platformBookingRef },
    );
  }
}
