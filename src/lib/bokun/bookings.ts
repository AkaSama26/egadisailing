import { bokunClient } from "./index";
import type { BokunBookingSummary } from "./types";

/** Fetch single booking by Bokun confirmation code. */
export async function getBokunBooking(confirmationCode: string): Promise<BokunBookingSummary> {
  return bokunClient().request<BokunBookingSummary>(
    "GET",
    `/booking.json/booking/${confirmationCode}`,
  );
}

export interface SearchParams {
  startDate?: string;
  endDate?: string;
  updatedSince?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  bookings: BokunBookingSummary[];
  totalHits: number;
}

/**
 * Search bookings — usato dal cron di reconciliation come fallback per
 * webhook persi. `updatedSince` e' l'unico filtro affidabile per incremental.
 */
export async function searchBokunBookings(params: SearchParams): Promise<SearchResult> {
  return bokunClient().request<SearchResult>("POST", "/booking.json/booking-search", params);
}
