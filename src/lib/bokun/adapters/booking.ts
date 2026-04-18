import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normalizeEmail } from "@/lib/email-normalize";
import { NotFoundError } from "@/lib/errors";
import { parseIsoDay } from "@/lib/dates";
import type { BokunBookingSummary } from "../types";

/**
 * Mappa un Bokun booking nel nostro DB (idempotent su bokunBookingId).
 *
 * - Customer: upsert per email normalizzata (Gmail alias dedup), nome NON
 *   sovrascritto su update (customer preserva identita' commerciale).
 * - Service: risolto via `bokunProductId`. Richiede admin map Service→prodotto
 *   Bokun nel seed / via admin panel (Plan 5).
 * - Transaction: Booking + BokunBooking creati atomicamente.
 *
 * Ritorna l'ID del nostro Booking (usato dal caller per fan-out availability).
 */
export async function importBokunBooking(booking: BokunBookingSummary): Promise<string> {
  const emailLower = normalizeEmail(booking.mainContactDetails.email);

  const service = await db.service.findFirst({
    where: { bokunProductId: booking.productId },
  });
  if (!service) {
    throw new NotFoundError("Service", `bokunProductId=${booking.productId}`);
  }

  const existing = await db.bokunBooking.findUnique({
    where: { bokunBookingId: String(booking.id) },
    include: { booking: true },
  });

  const totalPriceStr = new Decimal(booking.totalPrice).toFixed(2);
  const commissionStr = booking.commissionAmount
    ? new Decimal(booking.commissionAmount).toFixed(2)
    : null;
  const netStr = booking.netAmount ? new Decimal(booking.netAmount).toFixed(2) : null;

  if (existing) {
    await db.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: existing.bookingId },
        data: {
          status: mapStatus(booking.status),
          numPeople: booking.numPeople ?? existing.booking.numPeople,
          totalPrice: totalPriceStr,
        },
      });
      await tx.bokunBooking.update({
        where: { bookingId: existing.bookingId },
        data: {
          rawPayload: booking as unknown as object,
          commissionAmount: commissionStr,
          netAmount: netStr,
        },
      });
    });
    logger.info(
      { bookingId: existing.bookingId, status: booking.status },
      "Bokun booking updated",
    );
    return existing.bookingId;
  }

  // First-time import: upsert customer + create booking + BokunBooking
  const created = await db.$transaction(async (tx) => {
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

    return tx.booking.create({
      data: {
        confirmationCode: booking.confirmationCode,
        source: "BOKUN",
        externalRef: booking.productConfirmationCode,
        customerId: customer.id,
        serviceId: service.id,
        boatId: service.boatId,
        startDate: parseIsoDay(booking.startDate.slice(0, 10)),
        endDate: parseIsoDay((booking.endDate ?? booking.startDate).slice(0, 10)),
        numPeople: booking.numPeople ?? 1,
        totalPrice: totalPriceStr,
        currency: booking.currency,
        status: mapStatus(booking.status),
        bokunBooking: {
          create: {
            bokunBookingId: String(booking.id),
            channelName: booking.channelName,
            commissionAmount: commissionStr,
            netAmount: netStr,
            rawPayload: booking as unknown as object,
          },
        },
      },
    });
  });

  logger.info(
    { bookingId: created.id, confirmationCode: created.confirmationCode, channelName: booking.channelName },
    "Bokun booking imported",
  );
  return created.id;
}

function mapStatus(bokunStatus: string): "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED" {
  const s = bokunStatus.toUpperCase();
  if (s.includes("CANCEL")) return "CANCELLED";
  if (s.includes("REFUND")) return "REFUNDED";
  if (s.includes("PENDING") || s.includes("REQUEST")) return "PENDING";
  return "CONFIRMED";
}
