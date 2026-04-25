import { withCronGuard } from "@/lib/http/with-cron-guard";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { TTL } from "@/lib/timing";
import { expireDropDeadRequests } from "@/lib/booking/override-request";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Cron §8.2: auto-expire PENDING OverrideRequest con dropDeadAt passato.
 * Cancella newBooking + refund + release via postCommitCancelBooking.
 * Schedulato ogni ora minuto 15 (sfasato da reminders).
 */
export const POST = withCronGuard(
  {
    scope: RATE_LIMIT_SCOPES.OVERRIDE_DROPDEAD_CRON_IP,
    leaseKey: LEASE_KEYS.OVERRIDE_DROPDEAD,
    leaseTtlSeconds: TTL.CRON_LEASE_OVERRIDE_DROPDEAD,
  },
  async (_req, _ctx) => {
    const result = await expireDropDeadRequests();
    logger.info({ ...result }, "override-dropdead cron completed");
    return result;
  },
);

export const GET = POST;
