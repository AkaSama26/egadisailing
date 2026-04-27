import { db } from "@/lib/db";
import {
  blockDates,
  markDatesPartiallyBooked,
  reconcileBoatDatesFromActiveBookings,
  releaseBookingDates,
} from "@/lib/availability/service";
import { CHANNELS } from "@/lib/channels";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { isBoatSharedServiceType } from "./boat-slot-availability";

export async function applyDirectBookingAvailabilityHold(bookingId: string): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { service: { select: { type: true } } },
  });
  if (!booking) throw new NotFoundError("Booking", bookingId);
  if (booking.status !== "PENDING" || booking.source !== "DIRECT") return;

  if (isBoatSharedServiceType(booking.service.type)) {
    await markDatesPartiallyBooked(
      booking.boatId,
      booking.startDate,
      booking.endDate,
      CHANNELS.DIRECT,
    );
    return;
  }

  await blockDates(
    booking.boatId,
    booking.startDate,
    booking.endDate,
    CHANNELS.DIRECT,
    booking.id,
  );
}

export async function attachPaymentIntentToPendingDirectBooking(input: {
  bookingId: string;
  paymentIntentId: string;
}): Promise<void> {
  const result = await db.directBooking.updateMany({
    where: {
      bookingId: input.bookingId,
      OR: [
        { stripePaymentIntentId: null },
        { stripePaymentIntentId: input.paymentIntentId },
      ],
    },
    data: { stripePaymentIntentId: input.paymentIntentId },
  });

  if (result.count === 0) {
    logger.warn(
      { bookingId: input.bookingId, paymentIntentId: input.paymentIntentId },
      "Pending DirectBooking already has a different PaymentIntent",
    );
  }
}

export async function cancelPendingDirectBookingAndReleaseHold(input: {
  bookingId: string;
  reason: string;
}): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: input.bookingId },
    include: { service: { select: { type: true } } },
  });
  if (!booking) return;
  if (booking.status !== "PENDING" || booking.source !== "DIRECT") return;

  await db.booking.updateMany({
    where: { id: booking.id, status: "PENDING", source: "DIRECT" },
    data: { status: "CANCELLED" },
  });

  if (isBoatSharedServiceType(booking.service.type)) {
    await reconcileBoatDatesFromActiveBookings({
      boatId: booking.boatId,
      startDate: booking.startDate,
      endDate: booking.endDate,
      sourceChannel: CHANNELS.DIRECT,
    });
  } else {
    await releaseBookingDates({
      bookingId: booking.id,
      boatId: booking.boatId,
      startDate: booking.startDate,
      endDate: booking.endDate,
      sourceChannel: CHANNELS.DIRECT,
    });
  }

  logger.info(
    { bookingId: booking.id, reason: input.reason },
    "Pending direct booking cancelled and availability hold released",
  );
}
