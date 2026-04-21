import Decimal from "decimal.js";
import { Prisma } from "@/generated/prisma/client";
import type { BookingStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normalizeEmail } from "@/lib/email-normalize";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { parseIsoDay, isoDay } from "@/lib/dates";
import { acquireTxAdvisoryLock } from "@/lib/db/advisory-lock";
import {
  detectCrossChannelConflicts,
  recordDoubleBookingIncident,
  type CrossChannelConflict,
} from "@/lib/booking/cross-channel-conflicts";
import type { BoataroundBookingResponse } from "../schemas";

export interface ImportedBoataroundBooking {
  bookingId: string;
  boatId: string;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
}

const BOATAROUND_STATUS_MAP: Record<string, BookingStatus> = {
  CONFIRMED: "CONFIRMED",
  ACCEPTED: "CONFIRMED",
  PAID: "CONFIRMED",
  CANCELLED: "CANCELLED",
  DECLINED: "CANCELLED",
  EXPIRED: "CANCELLED",
  REFUNDED: "REFUNDED",
  PENDING: "PENDING",
  REQUESTED: "PENDING",
};

export function mapBoataroundStatus(status: string): BookingStatus {
  const mapped = BOATAROUND_STATUS_MAP[status.toUpperCase()];
  if (!mapped) {
    throw new ValidationError(`Unknown Boataround status: ${status}`, { status });
  }
  return mapped;
}

/**
 * GDPR minimization: whitelist dei campi salvati in `rawPayload` — niente
 * email/phone/country del cliente (vivono su `Customer`).
 */
function buildSafeRawPayload(b: BoataroundBookingResponse): Prisma.InputJsonValue {
  return {
    id: b.id,
    boatId: b.boatId,
    startDate: b.startDate,
    endDate: b.endDate,
    totalPrice: b.totalPrice,
    currency: b.currency,
    status: b.status,
  };
}

/**
 * Importa un booking Boataround nel DB (idempotent su `(platformName,
 * platformBookingRef)`).
 *
 * Race webhook+webhook: `findUnique` dentro la tx; P2002 sull'unique →
 * refetch e ritorno come update.
 *
 * @throws NotFoundError se `boatId` Boataround non mappa a `Boat.id`.
 * @throws ValidationError su status non mappabile.
 */
export async function importBoataroundBooking(
  booking: BoataroundBookingResponse,
): Promise<ImportedBoataroundBooking> {
  const emailLower = normalizeEmail(booking.customer.email);
  const status = mapBoataroundStatus(booking.status);

  // Assunzione: `boatId` Boataround coincide con nostro `Boat.id`. Se upstream
  // usa slug diverso, aggiungere campo `boataroundBoatId` a `Boat` in Plan 5.
  const boat = await db.boat.findUnique({ where: { id: booking.boatId } });
  if (!boat) {
    throw new NotFoundError("Boat", `boataroundBoatId=${booking.boatId}`);
  }

  const service = await db.service.findFirst({
    where: {
      boatId: boat.id,
      type: { in: ["CABIN_CHARTER", "BOAT_EXCLUSIVE"] },
      active: true,
    },
    orderBy: { priority: "desc" },
  });
  if (!service) {
    throw new NotFoundError("Service", `charter service for boat=${boat.id}`);
  }

  const totalPriceStr = new Decimal(booking.totalPrice).toFixed(2);
  const startDate = parseIsoDay(booking.startDate.slice(0, 10));
  const endDate = parseIsoDay(booking.endDate.slice(0, 10));
  const rawPayload = buildSafeRawPayload(booking);

  // R14 cross-OTA: conflitti rilevati dentro tx + recorded post-commit.
  let detectedConflicts: CrossChannelConflict[] = [];

  try {
    const result = await db.$transaction(async (tx) => {
      // R29-#1: advisory lock "availability" per (boatId, startDay) condiviso
      // cross-adapter. Chiude race 0-50ms concurrent webhook Bokun+Boataround
      // stesso slot che altrimenti skip-avano detectCrossChannelConflicts
      // (entrambe tx invisibili l'una all'altra in READ COMMITTED pre-commit).
      await acquireTxAdvisoryLock(tx, "availability", boat.id, isoDay(startDate));
      // R29-#1b: lock per-platformBookingRef (Bokun ha bokun-booking, mancava
      // simmetrico Boataround) → race webhook duplicato concorrente.
      await acquireTxAdvisoryLock(tx, "boataround-booking", booking.id);

      const existing = await tx.charterBooking.findUnique({
        where: {
          platformName_platformBookingRef: {
            platformName: "BOATAROUND",
            platformBookingRef: booking.id,
          },
        },
        include: { booking: true },
      });

      if (existing) {
        const updated = await tx.booking.update({
          where: { id: existing.bookingId },
          data: { status, totalPrice: totalPriceStr },
          select: { id: true, boatId: true, startDate: true, endDate: true, status: true },
        });
        await tx.charterBooking.update({
          where: { bookingId: existing.bookingId },
          data: { rawPayload },
        });
        return { booking: updated, mode: "updated" as const };
      }

      const customer = await tx.customer.upsert({
        where: { email: emailLower },
        update: {
          phone: booking.customer.phone || undefined,
          nationality: booking.customer.country || undefined,
        },
        create: {
          email: emailLower,
          firstName: booking.customer.firstName,
          lastName: booking.customer.lastName,
          phone: booking.customer.phone,
          nationality: booking.customer.country,
        },
      });

      // R14 cross-OTA detection (cross-source inclusi BOKUN + charter, non
      // solo DIRECT). Boataround confermata upstream → warn + ManualAlert
      // post-commit per admin action.
      detectedConflicts = await detectCrossChannelConflicts(tx, {
        boatId: boat.id,
        startDate,
        endDate,
        selfSource: "BOATAROUND",
      });

      const created = await tx.booking.create({
        data: {
          confirmationCode: `BR-${booking.id}`,
          source: "BOATAROUND",
          externalRef: booking.id,
          customerId: customer.id,
          serviceId: service.id,
          boatId: boat.id,
          startDate,
          endDate,
          numPeople: 1,
          totalPrice: totalPriceStr,
          // R19-REG-CRITICA-1: sistema EUR-only a livello DB. Valuta upstream
          // preservata in rawPayload per audit. Vedi comment in
          // bokun/adapters/booking.ts per motivazione.
          currency: "EUR",
          status,
          charterBooking: {
            create: {
              platformName: "BOATAROUND",
              platformBookingRef: booking.id,
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
        boataroundBookingId: booking.id,
        mode: result.mode,
        status: booking.status,
      },
      `Boataround booking ${result.mode}`,
    );

    // R14 cross-OTA post-commit incident recording.
    if (result.mode === "created" && detectedConflicts.length > 0) {
      await recordDoubleBookingIncident({
        newBookingId: result.booking.id,
        newSource: "BOATAROUND",
        newConfirmationCode: `BR-${booking.id}`,
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
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.warn(
        { boataroundBookingId: booking.id },
        "Concurrent Boataround import race, retrying as update",
      );
      const row = await db.charterBooking.findUnique({
        where: {
          platformName_platformBookingRef: {
            platformName: "BOATAROUND",
            platformBookingRef: booking.id,
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
