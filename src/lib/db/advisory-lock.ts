import crypto from "node:crypto";
import { eachUtcDayInclusive, isoDay } from "@/lib/dates";

/**
 * Genera una chiave bigint 63-bit deterministica per Postgres advisory locks.
 *
 * Usa SHA-1 del namespaced input per ridurre collision rate rispetto al
 * rolling hash custom. Postgres `pg_advisory_xact_lock(bigint)` accetta
 * signed 64-bit, quindi clampiamo a 63-bit positivi.
 */
export function computeAdvisoryLockKey(namespace: string, ...parts: string[]): string {
  const input = `${namespace}:${parts.join(":")}`;
  const hash = crypto.createHash("sha1").update(input).digest();
  // Read first 8 bytes as BigInt64 and clamp a 63-bit positive.
  const n = hash.readBigInt64BE(0);
  const clamped = n < BigInt(0) ? -n : n;
  const mask = (BigInt(1) << BigInt(63)) - BigInt(1);
  return (clamped & mask).toString();
}

/**
 * Acquisisce un advisory lock transazionale. Il lock viene rilasciato
 * automaticamente al commit/rollback della transazione.
 *
 * Usa SOLO dentro `db.$transaction(async (tx) => ...)`.
 *
 * Esempio:
 *   await acquireTxAdvisoryLock(tx, "booking", boatId, isoDay);
 */
export async function acquireTxAdvisoryLock(
  tx: { $executeRawUnsafe: (sql: string) => Promise<unknown> },
  namespace: string,
  ...parts: string[]
): Promise<void> {
  const key = computeAdvisoryLockKey(namespace, ...parts);
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${key})`);
}

// Nota: non esporre helper di session advisory lock con Prisma. Il pool
// pg (max=20) fa atterrare acquire e release su connessioni diverse,
// rendendo l'`pg_advisory_unlock` un no-op silenzioso. Per lock cross-request
// usare `src/lib/lease/redis-lease.ts` (SETNX + TTL, multi-replica safe).

/**
 * R29-AUDIT-FIX1: acquisisce advisory lock "availability" per TUTTI i giorni
 * nel range [startDate, endDate] inclusivi, in ordine ascendente.
 *
 * Prima: R29 lockava solo `isoDay(startDate)` — un booking multi-day (Bokun
 * lun-dom) e un booking overlapping ma con startDate diversa (Boataround
 * mar-lun) acquisivano chiavi diverse → entrambi passavano pre-check
 * `detectCrossChannelConflicts` pre-commit (READ COMMITTED non vede tx
 * gemella) → race 0-50ms aperta.
 *
 * Ora: lock ogni giorno singolarmente. Se 2 range overlappano, almeno
 * un giorno e' in comune → lock shared → serializzazione garantita.
 * Ordine ascendente previene deadlock (lock ordering consistente).
 *
 * Use SOLO per boat-exclusive services (CABIN_CHARTER/BOAT_EXCLUSIVE).
 * Per SHARED (SOCIAL_BOATING/BOAT_SHARED) il lock e' overhead inutile
 * (cohabitation legittima).
 */
export async function acquireAvailabilityRangeLock(
  tx: { $executeRawUnsafe: (sql: string) => Promise<unknown> },
  boatId: string,
  startDate: Date,
  endDate: Date,
): Promise<void> {
  // R29-AUDIT-FIX-INVARIANT: guard esplicito contro end < start. Senza
  // questo, eachUtcDayInclusive ritornava 0 giorni silenziosamente → 0
  // lock acquisiti → serializzazione cross-adapter saltata. Oggi tutti i
  // callsite validano upstream (Zod schemas, deriveEndDate) ma una drift
  // futura potrebbe introdurre silent bug. Throw esplicito.
  if (endDate.getTime() < startDate.getTime()) {
    throw new Error(
      `acquireAvailabilityRangeLock: endDate (${endDate.toISOString()}) < startDate (${startDate.toISOString()})`,
    );
  }
  // eachUtcDayInclusive ritorna gia' ordinato ASC via iterator.
  for (const day of eachUtcDayInclusive(startDate, endDate)) {
    await acquireTxAdvisoryLock(tx, "availability", boatId, isoDay(day));
  }
}
