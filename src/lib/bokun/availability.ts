import { bokunClient } from "./index";
import { logger } from "@/lib/logger";

/**
 * Aggiorna la vendibilita' di un prodotto Bokun per una data.
 *
 * I prodotti standard Bokun non accettano un "availabilityCount override"
 * via API REST. Usiamo quindi i closeout v2:
 * - availableSpots <= 0 -> crea closeout per la data;
 * - availableSpots > 0 -> rimuove eventuale closeout per la data.
 *
 * Nota: per prodotti condivisi la riduzione parziale dei posti viene gestita
 * dal worker con una politica conservativa: se il master DB non ha piena
 * capacita', chiudiamo Bokun per evitare overbooking.
 */
export async function updateBokunAvailability(params: {
  productId: string;
  date: string; // YYYY-MM-DD
  availableSpots: number;
}): Promise<void> {
  const productId = encodeURIComponent(params.productId);
  const date = encodeURIComponent(params.date);
  const pathAndQuery = `/restapi/v2.0/availability/${productId}/closeouts?from=${date}&to=${date}`;
  const method = params.availableSpots <= 0 ? "POST" : "DELETE";

  await bokunClient().request(method, pathAndQuery);
  logger.info(
    {
      productId: params.productId,
      date: params.date,
      spots: params.availableSpots,
      closeout: params.availableSpots <= 0,
    },
    "Bokun availability updated",
  );
}
