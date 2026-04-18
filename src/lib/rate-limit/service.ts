import { db } from "@/lib/db";
import { RateLimitError } from "@/lib/errors";

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

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitCheck> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + config.windowSeconds * 1000);

  // Trova eventuale finestra attiva per questo identifier+scope
  const existing = await db.rateLimitEntry.findFirst({
    where: {
      identifier: config.identifier,
      scope: config.scope,
      windowEnd: { gt: now },
    },
    orderBy: { windowStart: "desc" },
  });

  // Blocco permanente attivo
  if (existing?.blockedUntil && existing.blockedUntil > now) {
    const retryAfter = Math.ceil((existing.blockedUntil.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.blockedUntil,
      retryAfterSeconds: retryAfter,
    };
  }

  if (existing && existing.count >= config.limit) {
    const retryAfter = Math.ceil((existing.windowEnd.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.windowEnd,
      retryAfterSeconds: retryAfter,
    };
  }

  if (existing) {
    await db.rateLimitEntry.update({
      where: { id: existing.id },
      data: { count: { increment: 1 } },
    });
    return {
      allowed: true,
      remaining: config.limit - existing.count - 1,
      resetAt: existing.windowEnd,
    };
  }

  await db.rateLimitEntry.create({
    data: {
      identifier: config.identifier,
      scope: config.scope,
      count: 1,
      windowStart: now,
      windowEnd,
    },
  });

  return {
    allowed: true,
    remaining: config.limit - 1,
    resetAt: windowEnd,
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

export async function blockIdentifier(
  identifier: string,
  scope: string,
  durationSeconds: number,
): Promise<void> {
  const now = new Date();
  const blockedUntil = new Date(now.getTime() + durationSeconds * 1000);

  const existing = await db.rateLimitEntry.findFirst({
    where: { identifier, scope, windowEnd: { gt: now } },
    orderBy: { windowStart: "desc" },
  });

  if (existing) {
    await db.rateLimitEntry.update({
      where: { id: existing.id },
      data: { blockedUntil },
    });
  } else {
    await db.rateLimitEntry.create({
      data: {
        identifier,
        scope,
        count: 1,
        windowStart: now,
        windowEnd: blockedUntil,
        blockedUntil,
      },
    });
  }
}
