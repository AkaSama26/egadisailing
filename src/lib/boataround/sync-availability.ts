import type { BookingStatus } from "@/generated/prisma/enums";
import { blockDates, releaseDates } from "@/lib/availability/service";
import { CHANNELS } from "@/lib/channels";

export interface BookingAvailabilityInput {
  bookingId: string;
  boatId: string;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
}

/**
 * Single source of truth per l'effetto di un booking Boataround su
 * `BoatAvailability`. Chiamato da webhook e (future) reconciliation cron.
 */
export async function syncBookingAvailability(input: BookingAvailabilityInput): Promise<void> {
  if (input.status === "CANCELLED" || input.status === "REFUNDED") {
    await releaseDates(input.boatId, input.startDate, input.endDate, CHANNELS.BOATAROUND);
    return;
  }
  await blockDates(
    input.boatId,
    input.startDate,
    input.endDate,
    CHANNELS.BOATAROUND,
    input.bookingId,
  );
}
