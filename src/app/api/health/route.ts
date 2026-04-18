import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRedisConnection, syncQueue } from "@/lib/queue";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/http/with-error-handler";

type CheckResult = { ok: true; latencyMs: number } | { ok: false; error: string };

interface QueueStatus {
  ok: boolean;
  waiting: number;
  active: number;
  failed: number;
  delayed: number;
  error?: string;
}

interface ChannelStatus {
  ok: boolean;
  channels: Array<{
    channel: string;
    healthStatus: string;
    lastSyncAt: string | null;
    lastError: string | null;
  }>;
  error?: string;
}

// Soglia di failed job oltre la quale consideriamo la queue non-ok.
const QUEUE_FAILED_THRESHOLD = 100;

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function checkRedis(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const pong = await getRedisConnection().ping();
    if (pong !== "PONG") throw new Error(`Unexpected: ${pong}`);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function checkQueue(): Promise<QueueStatus> {
  try {
    const counts = await syncQueue().getJobCounts("waiting", "active", "failed", "delayed");
    const failed = counts.failed ?? 0;
    return {
      ok: failed < QUEUE_FAILED_THRESHOLD,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      failed,
      delayed: counts.delayed ?? 0,
    };
  } catch (err) {
    return { ok: false, waiting: 0, active: 0, failed: 0, delayed: 0, error: (err as Error).message };
  }
}

async function checkChannels(): Promise<ChannelStatus> {
  try {
    const rows = await db.channelSyncStatus.findMany({
      select: { channel: true, healthStatus: true, lastSyncAt: true, lastError: true },
    });
    const anyRed = rows.some((r) => r.healthStatus === "RED");
    return {
      ok: !anyRed,
      channels: rows.map((r) => ({
        channel: r.channel,
        healthStatus: r.healthStatus,
        lastSyncAt: r.lastSyncAt?.toISOString() ?? null,
        lastError: r.lastError,
      })),
    };
  } catch (err) {
    return { ok: true, channels: [], error: (err as Error).message };
  }
}

/**
 * Healthcheck.
 *
 * - `/api/health` (default): shallow — DB + Redis ping. Target per liveness
 *   probe container: deve restare up anche se Bokun/canali sono RED, perche'
 *   il sito continua a prendere booking DIRECT.
 * - `/api/health?deep=1`: include queue depth + ChannelSyncStatus. Usare
 *   per monitor esterno / admin dashboard. 503 se RED o failed > threshold.
 */
export const GET = withErrorHandler(async (req: Request) => {
  const url = new URL(req.url);
  const deep = url.searchParams.get("deep") === "1";

  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const coreOk = database.ok && redis.ok;

  if (!deep) {
    if (!coreOk) logger.warn({ database, redis }, "Health check failed");
    return NextResponse.json(
      {
        status: coreOk ? "ok" : "degraded",
        checks: { database, redis },
        timestamp: new Date().toISOString(),
      },
      { status: coreOk ? 200 : 503 },
    );
  }

  const [queue, channels] = await Promise.all([checkQueue(), checkChannels()]);
  const deepOk = coreOk && queue.ok && channels.ok;

  if (!deepOk) {
    logger.warn({ database, redis, queue, channels }, "Deep health check failed");
  }

  return NextResponse.json(
    {
      status: deepOk ? "ok" : "degraded",
      checks: { database, redis, queue, channels },
      timestamp: new Date().toISOString(),
    },
    { status: deepOk ? 200 : 503 },
  );
});
