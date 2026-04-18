import { boataroundClient } from "./client";

/**
 * Spinge lo stato di disponibilita' su Boataround. Il partner API attende
 * `boatId` + `date` (YYYY-MM-DD) + `available` boolean.
 */
export async function updateBoataroundAvailability(params: {
  boatId: string;
  date: string;
  available: boolean;
}): Promise<void> {
  await boataroundClient().request("POST", "/partner/availability", {
    boatId: params.boatId,
    date: params.date,
    available: params.available,
  });
}
