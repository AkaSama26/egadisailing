import { boataroundClient } from "./client";
import {
  boataroundBookingResponseSchema,
  type BoataroundBookingResponse,
} from "./schemas";

/**
 * Fetch singolo booking Boataround. `bookingId` DEVE essere gia' validato
 * con `boataroundBookingIdSchema` prima di essere passato qui.
 * Defense-in-depth: `encodeURIComponent` anche se schema regex copre gia'
 * caratteri URL-reserved.
 */
export async function getBoataroundBooking(bookingId: string): Promise<BoataroundBookingResponse> {
  const safeId = encodeURIComponent(bookingId);
  const raw = await boataroundClient().request<unknown>(
    "GET",
    `/partner/bookings/${safeId}`,
  );
  return boataroundBookingResponseSchema.parse(raw);
}
