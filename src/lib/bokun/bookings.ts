import { bokunClient } from "./index";
import { bokunBookingResponseSchema } from "./schemas";
import { logger } from "@/lib/logger";
import type { BokunBookingSummary } from "./types";

/**
 * Fetch single booking by Bokun confirmation code.
 *
 * `bookingId` DEVE essere gia' validato con `bokunBookingIdSchema` prima di
 * essere passato qui — ma facciamo comunque `encodeURIComponent` come
 * defense-in-depth per prevenire SSRF/path-traversal verso altri endpoint
 * Bokun authenticati.
 */
export async function getBokunBooking(bookingId: string | number): Promise<BokunBookingSummary> {
  const safeId = encodeURIComponent(String(bookingId));
  const raw = await bokunClient().request<unknown>(
    "GET",
    `/booking.json/booking/${safeId}`,
  );
  // Zod parse strict — range/format validation protegge DB da payload buggato.
  return bokunBookingResponseSchema.parse(raw);
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
 *
 * Ogni booking nel result e' validato individualmente; quelli che non passano
 * vengono droppati con warning (non vogliamo che un booking malformato
 * blocchi l'intera run).
 */
export async function searchBokunBookings(params: SearchParams): Promise<SearchResult> {
  const raw = await bokunClient().request<{ bookings: unknown[]; totalHits: number }>(
    "POST",
    "/booking.json/booking-search",
    params,
  );
  const bookings: BokunBookingSummary[] = [];
  for (const b of raw.bookings ?? []) {
    const parsed = bokunBookingResponseSchema.safeParse(b);
    if (parsed.success) {
      bookings.push(parsed.data);
    } else {
      logger.warn(
        { issues: parsed.error.issues.slice(0, 3) },
        "Dropped malformed Bokun booking from search result",
      );
    }
  }
  return { bookings, totalHits: raw.totalHits ?? 0 };
}
