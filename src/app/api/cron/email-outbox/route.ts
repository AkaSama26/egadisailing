import { enqueueDueTransactionalEmailJobs } from "@/lib/email/outbox";
import { withCronGuard } from "@/lib/http/with-cron-guard";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { TTL } from "@/lib/timing";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export const GET = withCronGuard(
  {
    scope: RATE_LIMIT_SCOPES.EMAIL_OUTBOX_CRON_IP,
    leaseKey: LEASE_KEYS.EMAIL_OUTBOX,
    leaseTtlSeconds: TTL.CRON_LEASE_EMAIL_OUTBOX,
  },
  async () => {
    const result = await enqueueDueTransactionalEmailJobs(200);
    logger.info(result, "email-outbox cron completed");
    return result;
  },
);

export const POST = GET;
