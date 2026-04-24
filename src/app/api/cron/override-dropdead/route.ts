import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { expireDropDeadRequests } from "@/lib/booking/override-request";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const LEASE_TTL_SECONDS = 10 * 60;

/**
 * Cron §8.2: auto-expire PENDING OverrideRequest con dropDeadAt passato.
 * Cancella newBooking + refund + release via postCommitCancelBooking.
 * Schedulato ogni ora minuto 15 (sfasato da reminders).
 */
export const POST = withErrorHandler(async (req: Request) => {
  requireBearerSecret(req, env.CRON_SECRET);
  await enforceRateLimit({
    identifier: "global",
    scope: RATE_LIMIT_SCOPES.OVERRIDE_DROPDEAD_CRON_IP,
    limit: 10,
    windowSeconds: 60,
    failOpen: true,
  });

  const lease = await tryAcquireLease(LEASE_KEYS.OVERRIDE_DROPDEAD, LEASE_TTL_SECONDS);
  if (!lease) {
    return NextResponse.json({ skipped: "already-running" });
  }
  try {
    const result = await expireDropDeadRequests();
    logger.info({ ...result }, "override-dropdead cron completed");
    return NextResponse.json(result);
  } finally {
    await releaseLease(lease);
  }
});

export const GET = POST;
