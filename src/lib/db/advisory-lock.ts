import crypto from "node:crypto";

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
