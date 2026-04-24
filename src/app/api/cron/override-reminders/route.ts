import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { sendEscalationReminders } from "@/lib/booking/override-request";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const LEASE_TTL_SECONDS = 10 * 60;

/**
 * Cron §8.1: escalation reminder OverrideRequest PENDING.
 * Schedulato ogni ora minuto 0. Redis lease single-flight multi-replica.
 * 24h dedup via reminderLevel + lastReminderSentAt (spec §8.1).
 */
export const POST = withErrorHandler(async (req: Request) => {
  requireBearerSecret(req, env.CRON_SECRET);
  await enforceRateLimit({
    identifier: "global",
    scope: RATE_LIMIT_SCOPES.OVERRIDE_REMINDERS_CRON_IP,
    limit: 10,
    windowSeconds: 60,
    failOpen: true,
  });

  const lease = await tryAcquireLease(LEASE_KEYS.OVERRIDE_REMINDERS, LEASE_TTL_SECONDS);
  if (!lease) {
    return NextResponse.json({ skipped: "already-running" });
  }
  try {
    const result = await sendEscalationReminders();
    logger.info({ ...result }, "override-reminders cron completed");
    return NextResponse.json(result);
  } finally {
    await releaseLease(lease);
  }
});

export const GET = POST;
