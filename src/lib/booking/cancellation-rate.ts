"use server";

import type { BookingSource } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getRedisConnection } from "@/lib/queue";
import { TTL } from "@/lib/timing";

const REDIS_TIMEOUT_MS = 2000;

export interface CancellationRateResult {
  rate: number;
  totalBookings: number;
  cancelledByOverride: number;
}

async function withRedisTimeout<T>(op: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    op,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), REDIS_TIMEOUT_MS)),
  ]);
}

/**
 * Rolling cancellation rate per-channel negli ultimi N giorni.
 * = (approved-override-cancelled-bookings on channel) / (total bookings on channel)
 * Cache Redis TTL 60s per-channel+windowDays.
 * Fail-open su Redis down (ritorna direct-DB fresh).
 */
export async function computeCancellationRate(
  channel: string,
  windowDays: number,
): Promise<CancellationRateResult> {
  const cacheKey = `cancellation-rate:${channel}:${windowDays}`;

  // Try cache first with timeout
  try {
    const redis = getRedisConnection();
    const cached = await withRedisTimeout(redis.get(cacheKey), null);
    if (cached) {
      return JSON.parse(cached) as CancellationRateResult;
    }
  } catch (err) {
    logger.warn({ err, channel, windowDays }, "cancellation-rate: redis get failed, falling back");
  }

  // Compute fresh from DB
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const totalBookings = await db.booking.count({
    where: {
      source: channel as BookingSource,
      createdAt: { gte: since },
    },
  });

  // Find all APPROVED OverrideRequests in the window
  const approvedOverrides = await db.overrideRequest.findMany({
    where: {
      status: "APPROVED",
      decidedAt: { gte: since },
    },
    select: { conflictingBookingIds: true },
  });

  // Collect all conflict IDs and count those that are bookings on this channel
  const allConflictIds = approvedOverrides.flatMap((ovr) => ovr.conflictingBookingIds);
  let cancelledByOverride = 0;
  if (allConflictIds.length > 0) {
    cancelledByOverride = await db.booking.count({
      where: {
        id: { in: allConflictIds },
        source: channel as BookingSource,
      },
    });
  }

  const rate = totalBookings === 0 ? 0 : cancelledByOverride / totalBookings;
  const result: CancellationRateResult = { rate, totalBookings, cancelledByOverride };

  // Cache (best-effort)
  try {
    const redis = getRedisConnection();
    await withRedisTimeout(
      redis.set(cacheKey, JSON.stringify(result), "EX", TTL.CANCELLATION_RATE),
      undefined,
    );
  } catch (err) {
    logger.warn({ err, channel, windowDays }, "cancellation-rate: redis set failed");
  }

  return result;
}

/**
 * Invalidate all cached rate entries for a specific channel.
 * Chiamato dopo approveOverride che coinvolge quel channel, per riflettere subito
 * il nuovo rate nella dashboard admin.
 */
export async function invalidateCancellationRateCache(channel: string): Promise<void> {
  try {
    const redis = getRedisConnection();
    const keys = await withRedisTimeout(redis.keys(`cancellation-rate:${channel}:*`), []);
    if (keys.length > 0) {
      await withRedisTimeout(redis.del(...keys), 0);
    }
  } catch (err) {
    logger.warn({ err, channel }, "cancellation-rate: cache invalidation failed");
  }
}
