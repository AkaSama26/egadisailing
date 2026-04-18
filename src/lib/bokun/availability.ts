import { bokunClient } from "./index";
import { logger } from "@/lib/logger";

/**
 * Aggiorna il numero di posti disponibili di un prodotto Bokun per una data.
 *
 * Pattern "availability override":
 * - `availabilityCount = 0` → blocca il prodotto per quella data su tutti gli OTA
 *   (Viator, GYG, Airbnb Experiences, ecc. che distribuiscono via Bokun).
 * - `availabilityCount > 0` → posti aggiornati al nuovo valore.
 *
 * Idempotent su (productId, date): piu' update consecutivi si sovrascrivono.
 */
export async function updateBokunAvailability(params: {
  productId: string;
  date: string; // YYYY-MM-DD
  availableSpots: number;
}): Promise<void> {
  const pathAndQuery = `/activity.json/${params.productId}/availability-override`;
  await bokunClient().request("POST", pathAndQuery, {
    date: params.date,
    availabilityCount: params.availableSpots,
    reason: params.availableSpots === 0 ? "BOOKED_ELSEWHERE" : "AVAILABILITY_UPDATE",
  });
  logger.info(
    { productId: params.productId, date: params.date, spots: params.availableSpots },
    "Bokun availability updated",
  );
}
