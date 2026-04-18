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

/**
 * Tenta (non bloccante) di acquisire un advisory lock di SESSIONE — non
 * rilasciato in automatico al commit, va rilasciato esplicitamente con
 * `releaseSessionAdvisoryLock`. Ritorna true se acquisito, false se un altro
 * processo lo tiene gia'.
 *
 * Uso tipico: anti-overrun per cron endpoint single-flight cross-replica.
 *
 * IMPORTANTE: `pg_try_advisory_lock` e' session-scoped, quindi le repliche
 * Next devono condividere la stessa connessione Postgres (Prisma singleton
 * per processo — OK) e il lock persiste finche' la connessione non muore.
 * Usare SEMPRE con try/finally per rilasciare anche su errore.
 */
export async function tryAcquireSessionAdvisoryLock(
  db: { $queryRawUnsafe: <T>(sql: string) => Promise<T> },
  namespace: string,
  ...parts: string[]
): Promise<boolean> {
  const key = computeAdvisoryLockKey(namespace, ...parts);
  const rows = await db.$queryRawUnsafe<Array<{ pg_try_advisory_lock: boolean }>>(
    `SELECT pg_try_advisory_lock(${key})`,
  );
  return rows[0]?.pg_try_advisory_lock === true;
}

export async function releaseSessionAdvisoryLock(
  db: { $executeRawUnsafe: (sql: string) => Promise<unknown> },
  namespace: string,
  ...parts: string[]
): Promise<void> {
  const key = computeAdvisoryLockKey(namespace, ...parts);
  await db.$executeRawUnsafe(`SELECT pg_advisory_unlock(${key})`);
}
