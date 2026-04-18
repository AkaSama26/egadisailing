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
 * Applica l'effetto di un booking Bokun su BoatAvailability.
 *
 * Chiamato sia dal webhook Bokun che dal reconciliation cron — deve restare
 * l'unica sorgente di fan-out availability verso gli altri canali, altrimenti
 * un webhook perso recuperato da cron lascerebbe il DB "autoritativo" ma gli
 * altri OTA non aggiornati.
 */
export async function syncBookingAvailability(input: BookingAvailabilityInput): Promise<void> {
  if (input.status === "CANCELLED" || input.status === "REFUNDED") {
    await releaseDates(input.boatId, input.startDate, input.endDate, CHANNELS.BOKUN);
    return;
  }
  await blockDates(
    input.boatId,
    input.startDate,
    input.endDate,
    CHANNELS.BOKUN,
    input.bookingId,
  );
}
