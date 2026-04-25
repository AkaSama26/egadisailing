import { withCronGuard } from "@/lib/http/with-cron-guard";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { sendEscalationReminders } from "@/lib/booking/override-request";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Cron §8.1: escalation reminder OverrideRequest PENDING.
 * Schedulato ogni ora minuto 0. Redis lease single-flight multi-replica.
 * 24h dedup via reminderLevel + lastReminderSentAt (spec §8.1).
 */
export const POST = withCronGuard(
  {
    scope: RATE_LIMIT_SCOPES.OVERRIDE_REMINDERS_CRON_IP,
    leaseKey: LEASE_KEYS.OVERRIDE_REMINDERS,
    leaseTtlSeconds: 10 * 60,
  },
  async (_req, _ctx) => {
    const result = await sendEscalationReminders();
    logger.info({ ...result }, "override-reminders cron completed");
    return result;
  },
);

export const GET = POST;
