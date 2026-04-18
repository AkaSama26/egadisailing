import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRedisConnection } from "@/lib/queue";
import { logger } from "@/lib/logger";

type CheckResult = { ok: true; latencyMs: number } | { ok: false; error: string };

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

export async function GET() {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const healthy = database.ok && redis.ok;

  if (!healthy) {
    logger.warn({ database, redis }, "Health check failed");
  }

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks: { database, redis },
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
