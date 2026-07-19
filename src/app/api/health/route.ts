import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getRedisConnection } from "@/lib/queue";
import { logger } from "@/lib/logger";
import {
  requireBearerSecret,
  withErrorHandler,
} from "@/lib/http/with-error-handler";
import {
  checkQueueHealth,
  isChannelHealthEnabled,
  type QueueHealth,
} from "@/lib/queue/health";

export const HEALTH_DEPENDENCY_TIMEOUT_MS = 5_000;

type CheckResult = { ok: true; latencyMs: number } | { ok: false; error: string };

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

async function withHealthTimeout<T>(label: string, operation: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${label} health check timed out`)),
          HEALTH_DEPENDENCY_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function unavailableQueueHealth(error: string): QueueHealth {
  return {
    ok: false,
    waiting: 0,
    paused: 0,
    active: 0,
    delayed: 0,
    prioritized: 0,
    failedRetained: 0,
    failedRecent24h: 0,
    unresolvedRecent: 0,
    failedOutboxRecent: 0,
    stale: 0,
    oldestAgeMs: null,
    queues: [],
    error,
  };
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await withHealthTimeout("database", db.$queryRaw`SELECT 1`);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function checkRedis(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const pong = await withHealthTimeout("redis", getRedisConnection().ping());
    if (pong !== "PONG") throw new Error(`Unexpected: ${pong}`);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function checkChannels(): Promise<ChannelStatus> {
  try {
    const rows = await withHealthTimeout(
      "channel status",
      db.channelSyncStatus.findMany({
        select: { channel: true, healthStatus: true, lastSyncAt: true, lastError: true },
      }),
    );
    const activeRows = rows.filter((row) => isChannelHealthEnabled(row.channel));
    const anyRed = activeRows.some((r) => r.healthStatus === "RED");
    return {
      ok: !anyRed,
      channels: activeRows.map((r) => ({
        channel: r.channel,
        healthStatus: r.healthStatus,
        lastSyncAt: r.lastSyncAt?.toISOString() ?? null,
        lastError: r.lastError,
      })),
    };
  } catch (err) {
    return { ok: false, channels: [], error: (err as Error).message };
  }
}

/**
 * Healthcheck.
 *
 * - `/api/health` (default): liveness minimale del processo, senza dipendenze.
 *   Non deve innescare restart-loop durante un outage DB/Redis.
 * - `/api/health?deep=1`: include queue depth + ChannelSyncStatus. Usare
 *   per monitor esterno / admin dashboard. Gli errori terminali storici sono
 *   informativi; 503 solo per recenti irrisolti, job stale o canali RED attivi.
 */
export const GET = withErrorHandler(async (req: Request) => {
  const url = new URL(req.url);
  const deepRequested = url.searchParams.get("deep") === "1";

  const release =
    env.NEXT_DEPLOYMENT_ID ??
    env.DEPLOYMENT_VERSION ??
    env.GIT_SHA ??
    env.SENTRY_RELEASE ??
    "unknown";

  if (!deepRequested) {
    return NextResponse.json(
      {
        status: "ok",
        release,
        uptimeSec: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  }

  // Deep mode espone internals (queue counts, lastError, channel health) ed
  // usa un segreto dedicato: CRON_SECRET non amplia i privilegi operativi.
  if (!env.OPS_HEALTH_SECRET) {
    logger.warn(
      { ip: req.headers.get("x-forwarded-for") ?? "unknown" },
      "Deep health check requested but OPS_HEALTH_SECRET is not configured",
    );
    return NextResponse.json(
      { status: "unavailable", release, timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
  requireBearerSecret(req, env.OPS_HEALTH_SECRET);

  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const coreOk = database.ok && redis.ok;

  const [queue, channels] = await Promise.all([
    coreOk
      ? withHealthTimeout("queue", checkQueueHealth()).catch((err) =>
          unavailableQueueHealth((err as Error).message),
        )
      : Promise.resolve(
          unavailableQueueHealth("Skipped because database or Redis is unavailable"),
        ),
    database.ok
      ? checkChannels()
      : Promise.resolve({
          ok: false,
          channels: [],
          error: "Skipped because database is unavailable",
        } satisfies ChannelStatus),
  ]);
  const deepOk = coreOk && queue.ok && channels.ok;

  if (!deepOk) {
    logger.warn({ database, redis, queue, channels }, "Deep health check failed");
  }

  return NextResponse.json(
    {
      status: deepOk ? "ok" : "degraded",
      release,
      uptimeSec: Math.floor(process.uptime()),
      checks: { database, redis, queue, channels },
      timestamp: new Date().toISOString(),
    },
    { status: deepOk ? 200 : 503 },
  );
});
