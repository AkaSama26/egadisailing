import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { getClientIp, normalizeIpForRateLimit } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { getRedisConnection } from "@/lib/queue";
import { RL_WINDOW } from "@/lib/timing";
import { ValidationError } from "@/lib/errors";
import { isPublicBookingServiceEnabled } from "@/lib/services/public-booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRESENCE_WINDOW_MS = 90_000;
const PRESENCE_TTL_SECONDS = 120;

const payloadSchema = z.object({
  serviceId: z.string().min(1).max(120),
  visitorId: z.string().min(16).max(80).regex(/^[A-Za-z0-9_-]+$/),
});

function presenceKey(serviceId: string): string {
  return `presence.experience.${serviceId}`;
}

function hashVisitorId(visitorId: string): string {
  return crypto.createHash("sha256").update(visitorId).digest("hex").slice(0, 40);
}

export const POST = withErrorHandler(async (req: Request) => {
  const ip = getClientIp(req.headers);
  await enforceRateLimit({
    identifier: normalizeIpForRateLimit(ip),
    scope: RATE_LIMIT_SCOPES.EXPERIENCE_PRESENCE_IP,
    limit: 240,
    windowSeconds: RL_WINDOW.HOUR,
    failOpen: true,
  });

  const input = payloadSchema.parse(await req.json());
  if (!isPublicBookingServiceEnabled(input.serviceId)) {
    throw new ValidationError("Esperienza non trovata");
  }
  const service = await db.service.findUnique({
    where: { id: input.serviceId },
    select: { id: true, active: true },
  });
  if (!service?.active) {
    throw new ValidationError("Esperienza non trovata");
  }

  const now = Date.now();
  const redis = getRedisConnection();
  const key = presenceKey(input.serviceId);
  const member = hashVisitorId(input.visitorId);
  const pipeline = redis.multi();
  pipeline.zadd(key, now, member);
  pipeline.zremrangebyscore(key, 0, now - PRESENCE_WINDOW_MS);
  pipeline.expire(key, PRESENCE_TTL_SECONDS);
  pipeline.zcard(key);
  const results = await pipeline.exec();
  if (!results) throw new Error("Redis pipeline returned null");
  const zcardResult = results[3];
  if (zcardResult[0]) throw zcardResult[0];

  return NextResponse.json({
    data: {
      count: Math.max(1, Number(zcardResult[1] ?? 1)),
      windowSeconds: PRESENCE_WINDOW_MS / 1000,
    },
  });
});
