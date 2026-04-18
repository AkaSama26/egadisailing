/**
 * Il self-echo detection e' ora incorporato in `updateAvailability` dentro
 * la transazione (TOCTOU-safe). Questa funzione resta disponibile per usi
 * read-only (debug, reporting) ma NON deve essere usata per logica di flusso.
 */

import { db } from "@/lib/db";
import { toUtcDay } from "@/lib/dates";

const DEFAULT_WINDOW_SECONDS = 120;

/**
 * Read-only check: indica se un update e' un eco di uno che abbiamo fatto noi.
 * NON atomic — non usare per decisioni critiche.
 */
export async function isSelfEcho(
  boatId: string,
  date: Date,
  incomingSource: string,
  windowSeconds = DEFAULT_WINDOW_SECONDS,
): Promise<boolean> {
  const availability = await db.boatAvailability.findUnique({
    where: { boatId_date: { boatId, date: toUtcDay(date) } },
  });

  if (!availability) return false;
  if (availability.lastSyncedSource !== incomingSource) return false;
  if (!availability.lastSyncedAt) return false;

  const ageSeconds = (Date.now() - availability.lastSyncedAt.getTime()) / 1000;
  return ageSeconds < windowSeconds;
}
