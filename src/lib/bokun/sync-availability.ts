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
 * Applica l'effetto di un booking Bokun su BoatAvailability.
 *
 * Chiamato sia dal webhook Bokun che dal reconciliation cron — deve restare
 * l'unica sorgente di fan-out availability verso gli altri canali, altrimenti
 * un webhook perso recuperato da cron lascerebbe il DB "autoritativo" ma gli
 * altri OTA non aggiornati.
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
          sourceChannel: CHANNELS.BOKUN,
        });
      } else {
        await releaseDatesIfOwned(
          input.previous.boatId,
          input.previous.startDate,
          input.previous.endDate,
          CHANNELS.BOKUN,
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
        sourceChannel: CHANNELS.BOKUN,
      });
    } else {
      await releaseDatesIfOwned(
        input.boatId,
        input.startDate,
        input.endDate,
        CHANNELS.BOKUN,
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
      CHANNELS.BOKUN,
    );
  } else {
    await blockDates(
      input.boatId,
      input.startDate,
      input.endDate,
      CHANNELS.BOKUN,
      input.bookingId,
    );
  }
}

function isActive(status: BookingStatus): boolean {
  return status === "PENDING" || status === "CONFIRMED";
}
