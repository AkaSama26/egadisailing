import RedisMock from "ioredis-mock";
import type { Redis } from "ioredis";

/**
 * ioredis-mock singleton per test. Compatibile con ioredis API (SET, GET,
 * INCR, EXPIRE, EVAL, SETNX). Usato da rate-limit + lease + BullMQ.
 *
 * **Caveat**: EVAL script Lua viene emulato in JS — comportamento identico
 * per pattern Redlock (GET + DEL) ma attenzione a script complessi.
 *
 * Helper `installRedisMock()` da chiamare nel `vi.mock("@/lib/queue")`:
 *
 * ```ts
 * import { installRedisMock } from "../helpers/redis-mock";
 * vi.mock("@/lib/queue", () => ({
 *   getRedisConnection: () => installRedisMock(),
 * }));
 * ```
 */

let mockInstance: Redis | null = null;

export function installRedisMock(): Redis {
  if (!mockInstance) {
    mockInstance = new RedisMock() as unknown as Redis;
  }
  return mockInstance;
}

export async function resetRedisMock(): Promise<void> {
  if (mockInstance) {
    await mockInstance.flushall();
  }
}

export function closeRedisMock(): void {
  if (mockInstance) {
    void mockInstance.quit();
    mockInstance = null;
  }
}
