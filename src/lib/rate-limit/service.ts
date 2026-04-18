import { getRedisConnection } from "@/lib/queue";
import { RateLimitError } from "@/lib/errors";

/**
 * Rate limiter atomico su Redis.
 *
 * Usa INCR + EXPIRE in pipeline singola: operazione thread-safe su Redis
 * (single-threaded), non soggetta al race check-then-act del pattern DB.
 *
 * Sliding window fixed-bucket: il bucket e' scope:identifier:windowStart
 * dove windowStart = floor(now / windowSeconds). Al termine della finestra
 * il TTL scade e il counter si azzera.
 *
 * Per i blocchi persistenti (blockIdentifier) usiamo una key separata con TTL.
 */

const KEY_PREFIX = "rl";
const BLOCK_KEY_PREFIX = "rlb";

export interface RateLimitConfig {
  identifier: string;
  scope: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitCheck {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

function counterKey(scope: string, identifier: string, windowStart: number): string {
  return `${KEY_PREFIX}:${scope}:${identifier}:${windowStart}`;
}

function blockKey(scope: string, identifier: string): string {
  return `${BLOCK_KEY_PREFIX}:${scope}:${identifier}`;
}

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitCheck> {
  const redis = getRedisConnection();
  const nowMs = Date.now();
  const windowStart = Math.floor(nowMs / (config.windowSeconds * 1000)) * config.windowSeconds;
  const resetAtMs = (windowStart + config.windowSeconds) * 1000;
  const resetAt = new Date(resetAtMs);

  // Blocco manuale attivo?
  const block = await redis.get(blockKey(config.scope, config.identifier));
  if (block) {
    const blockTtlMs = await redis.pttl(blockKey(config.scope, config.identifier));
    const retryAfterSeconds = Math.max(1, Math.ceil(blockTtlMs / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(nowMs + blockTtlMs),
      retryAfterSeconds,
    };
  }

  const key = counterKey(config.scope, config.identifier, windowStart);

  const pipeline = redis.multi();
  pipeline.incr(key);
  pipeline.expire(key, config.windowSeconds);
  const results = await pipeline.exec();
  if (!results) {
    throw new Error("Redis pipeline returned null");
  }
  const [incrResult] = results;
  if (incrResult[0]) {
    throw incrResult[0];
  }
  const count = Number(incrResult[1]);

  if (count > config.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remaining: config.limit - count,
    resetAt,
  };
}

export async function enforceRateLimit(config: RateLimitConfig): Promise<void> {
  const result = await checkRateLimit(config);
  if (!result.allowed) {
    throw new RateLimitError(result.retryAfterSeconds ?? 60, {
      identifier: config.identifier,
      scope: config.scope,
    });
  }
}

/**
 * Blocca un identifier per durationSeconds. Max cap 24h.
 */
export async function blockIdentifier(
  identifier: string,
  scope: string,
  durationSeconds: number,
): Promise<void> {
  const MAX_BLOCK_SECONDS = 24 * 60 * 60;
  const capped = Math.min(Math.max(1, Math.floor(durationSeconds)), MAX_BLOCK_SECONDS);
  const redis = getRedisConnection();
  await redis.set(blockKey(scope, identifier), "1", "EX", capped);
}

export async function unblockIdentifier(identifier: string, scope: string): Promise<void> {
  const redis = getRedisConnection();
  await redis.del(blockKey(scope, identifier));
}
