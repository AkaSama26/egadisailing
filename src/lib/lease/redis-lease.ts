import { getRedisConnection } from "@/lib/queue";

const LEASE_KEY_PREFIX = "lease:";

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
 * @returns true se il lease e' stato acquisito, false altrimenti.
 */
export async function tryAcquireLease(name: string, ttlSeconds: number): Promise<boolean> {
  const redis = getRedisConnection();
  const result = await redis.set(
    `${LEASE_KEY_PREFIX}${name}`,
    String(process.pid),
    "EX",
    ttlSeconds,
    "NX",
  );
  return result === "OK";
}

export async function releaseLease(name: string): Promise<void> {
  const redis = getRedisConnection();
  await redis.del(`${LEASE_KEY_PREFIX}${name}`);
}
