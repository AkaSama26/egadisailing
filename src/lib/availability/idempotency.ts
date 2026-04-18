import { db } from "@/lib/db";

/**
 * Verifica se un aggiornamento di availability è un "eco" di uno che abbiamo appena
 * inviato noi stessi (per prevenire loop infiniti).
 *
 * Se lastSyncedSource matcha la source in arrivo e lastSyncedAt è recente (< windowSeconds),
 * consideriamo l'update come self-echo e restituiamo true (= da ignorare).
 */
export async function isSelfEcho(
  boatId: string,
  date: Date,
  incomingSource: string,
  windowSeconds = 120,
): Promise<boolean> {
  const availability = await db.boatAvailability.findUnique({
    where: { boatId_date: { boatId, date } },
  });

  if (!availability) return false;
  if (availability.lastSyncedSource !== incomingSource) return false;
  if (!availability.lastSyncedAt) return false;

  const ageSeconds = (Date.now() - availability.lastSyncedAt.getTime()) / 1000;
  return ageSeconds < windowSeconds;
}
