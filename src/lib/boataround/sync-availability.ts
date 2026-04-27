import type { BookingStatus } from "@/generated/prisma/enums";
import {
  blockDates,
  markDatesPartiallyBooked,
  reconcileBoatDatesFromActiveBookings,
  releaseDatesIfOwned,
} from "@/lib/availability/service";
import { CHANNELS } from "@/lib/channels";
import { isBoatSharedServiceType } from "@/lib/booking/boat-slot-availability";
import { db } from "@/lib/db";

export interface BookingAvailabilityInput {
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

/**
 * Single source of truth per l'effetto di un booking Boataround su
 * `BoatAvailability`. Chiamato da webhook e (future) reconciliation cron.
 */
export async function syncBookingAvailability(input: BookingAvailabilityInput): Promise<void> {
  if (input.shouldSyncAvailability === false) return;

  const booking = await db.booking.findUnique({
    where: { id: input.bookingId },
    include: { service: { select: { type: true } } },
  });
  const isSharedBoatBooking = booking ? isBoatSharedServiceType(booking.service.type) : false;

  if (input.previous && isActive(input.previous.status)) {
    const rangeChanged =
      input.previous.boatId !== input.boatId ||
      input.previous.startDate.getTime() !== input.startDate.getTime() ||
      input.previous.endDate.getTime() !== input.endDate.getTime() ||
      !isActive(input.status);
    if (rangeChanged) {
      if (isSharedBoatBooking) {
        await reconcileBoatDatesFromActiveBookings({
          boatId: input.previous.boatId,
          startDate: input.previous.startDate,
          endDate: input.previous.endDate,
          sourceChannel: CHANNELS.BOATAROUND,
        });
      } else {
        await releaseDatesIfOwned(
          input.previous.boatId,
          input.previous.startDate,
          input.previous.endDate,
          CHANNELS.BOATAROUND,
          input.bookingId,
        );
      }
    }
  }

  if (input.status === "CANCELLED" || input.status === "REFUNDED") {
    if (isSharedBoatBooking) {
      await reconcileBoatDatesFromActiveBookings({
        boatId: input.boatId,
        startDate: input.startDate,
        endDate: input.endDate,
        sourceChannel: CHANNELS.BOATAROUND,
      });
    } else {
      await releaseDatesIfOwned(
        input.boatId,
        input.startDate,
        input.endDate,
        CHANNELS.BOATAROUND,
        input.bookingId,
      );
    }
    return;
  }
  if (isSharedBoatBooking) {
    await markDatesPartiallyBooked(
      input.boatId,
      input.startDate,
      input.endDate,
      CHANNELS.BOATAROUND,
    );
  } else {
    await blockDates(
      input.boatId,
      input.startDate,
      input.endDate,
      CHANNELS.BOATAROUND,
      input.bookingId,
    );
  }
}

function isActive(status: BookingStatus): boolean {
  return status === "PENDING" || status === "CONFIRMED";
}
