import { randomUUID } from "node:crypto";
import { getRedisConnection } from "@/lib/queue";
import { logger } from "@/lib/logger";

const LEASE_KEY_PREFIX = "lease:";
const ACQUIRE_TIMEOUT_MS = 2_000;

// Lua script server-side (Redis scripting, non JavaScript eval) che rilascia
// il lease SOLO se il token matcha l'owner. Previene il caso "leader slow
// oltre TTL cancella il lease del successore". Pattern Redlock-lite.
const RELEASE_SCRIPT = [
  'if redis.call("GET", KEYS[1]) == ARGV[1] then',
  '  return redis.call("DEL", KEYS[1])',
  "else",
  "  return 0",
  "end",
].join("\n");

export interface LeaseHandle {
  name: string;
  token: string;
}

/**
 * Lease distribuito single-flight su Redis.
 *
 * Perche' non advisory lock Postgres? `pg_try_advisory_lock` e' scoped alla
 * connessione; con Prisma pool (max=20) acquisizione e release possono finire
 * su connessioni diverse → `pg_advisory_unlock` ritorna false e il lock resta
 * de facto permanente fino al reset della connessione. Redis SETNX e'
 * atomic, multi-replica safe e ha TTL auto-release built-in (se il processo
 * crasha, il lease si libera al TTL).
 *
 * R13-A1: lease con token random (non pid condiviso) + release via Lua
 * atomico che verifica ownership. Previene il caso "leader oltre TTL
 * rilascia il lease del successore" che regrediva il fix single-flight.
 *
 * R13-I: `Promise.race` con timeout 2s + fail-open su Redis down. Meglio
 * una cron run senza protezione concurrent che un webhook hung per minuti.
 *
 * @returns LeaseHandle se acquisito o fail-open, null se un altro owner valido
 *   detiene il lease.
 */
// R26-P3 (test-found regression): sentinel per distinguere timeout (Redis
// down, fail-open) da NX-fail (key exists, fail-closed con return null).
// `Promise.race` con entrambi return `null` era ambiguo → fail-open scattava
// anche quando un altro owner detentava il lease → 2 admin concurrent cancel
// entrambi proseguivano → double refund race. Integration test
// `admin-concurrency.test.ts` ha esposto il bug con 2 refund calls invece di 1.
const TIMEOUT_SENTINEL = Symbol("redis-lease-timeout");

export async function tryAcquireLease(
  name: string,
  ttlSeconds: number,
): Promise<LeaseHandle | null> {
  const redis = getRedisConnection();
  const token = randomUUID();
  try {
    const result = await Promise.race<string | null | typeof TIMEOUT_SENTINEL>([
      redis.set(`${LEASE_KEY_PREFIX}${name}`, token, "EX", ttlSeconds, "NX"),
      new Promise((resolve) => setTimeout(() => resolve(TIMEOUT_SENTINEL), ACQUIRE_TIMEOUT_MS)),
    ]);
    if (result === TIMEOUT_SENTINEL) {
      // Redis unresponsive: fail-open per evitare di hangare webhook/cron.
      // Accettiamo race concurrent come trade-off per availability.
      logger.warn({ name }, "Redis lease acquire timeout (fail-open, proceeding without lock)");
      return { name, token };
    }
    if (result === "OK") {
      return { name, token };
    }
    // `null` da SET NX = key gia' esiste, un altro owner detiene il lease.
    // Fail-closed — ritorniamo null, caller gestira' come ConflictError.
    return null;
  } catch (err) {
    logger.warn(
      { name, err: (err as Error).message },
      "Redis lease acquire failed (fail-open, proceeding without lock)",
    );
    return { name, token };
  }
}

/**
 * Rilascia il lease solo se il token corrisponde (il leader originale e'
 * ancora il proprietario). Su Redis down: no-op silenzioso, il TTL originale
 * libera comunque il lease.
 */
export async function releaseLease(handle: LeaseHandle): Promise<void> {
  const redis = getRedisConnection();
  try {
    await Promise.race([
      redis.eval(RELEASE_SCRIPT, 1, `${LEASE_KEY_PREFIX}${handle.name}`, handle.token),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ACQUIRE_TIMEOUT_MS)),
    ]);
  } catch (err) {
    logger.warn(
      { name: handle.name, err: (err as Error).message },
      "Redis lease release failed (TTL will recover)",
    );
  }
}
