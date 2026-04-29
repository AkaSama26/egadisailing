import { db } from "@/lib/db";
import { withCronGuard } from "@/lib/http/with-cron-guard";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { TTL } from "@/lib/timing";
import { refundPayment, getChargeRefundState } from "@/lib/stripe/payment-intents";
import { logger } from "@/lib/logger";
import { dispatchNotification, defaultNotificationChannels } from "@/lib/notifications/dispatcher";

export const runtime = "nodejs";

/**
 * Cron §8.3: retry Payment FAILED con stripeChargeId. Idempotent via
 * getChargeRefundState (R27 pattern). Batch 50/run, ogni 30min.
 * Fallimenti ripetuti segnati nei log — manual escalation via admin UI.
 */
export const POST = withCronGuard(
  {
    scope: RATE_LIMIT_SCOPES.REFUND_RETRY_CRON_IP,
    leaseKey: LEASE_KEYS.REFUND_RETRY,
    leaseTtlSeconds: TTL.CRON_LEASE_REFUND_RETRY,
  },
  async (_req, _ctx) => {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    // Payment non ha updatedAt — usiamo createdAt come cutoff anti-loop
    // (un FAILED appena marcato deve avere tempo di essere verificato).
    const failed = await db.payment.findMany({
      where: {
        status: "FAILED",
        type: { not: "REFUND" },
        stripeChargeId: { not: null },
        createdAt: { lt: cutoff },
      },
      take: 50,
      select: { id: true, stripeChargeId: true },
    });

    let retried = 0;
    let recovered = 0;
    let exhausted = 0;

    for (const p of failed) {
      if (!p.stripeChargeId) continue;
      retried++;
      try {
        const state = await getChargeRefundState(p.stripeChargeId);
        if (state.residualCents > 0) {
          await refundPayment(p.stripeChargeId, state.residualCents);
          await db.payment.update({
            where: { id: p.id },
            data: { status: "REFUNDED" },
          });
          recovered++;
        } else {
          // already refunded upstream → mark consistent in DB
          await db.payment.update({
            where: { id: p.id },
            data: { status: "REFUNDED" },
          });
          recovered++;
        }
      } catch (err) {
        exhausted++;
        logger.error({ err, paymentId: p.id }, "refund-retry iteration failed");
      }
    }
    logger.info({ retried, recovered, exhausted }, "refund-retry cron completed");
    if (exhausted > 0) {
      await dispatchNotification({
        type: "PAYMENT_FAILED",
        channels: defaultNotificationChannels(),
        payload: {
          confirmationCode: "refund-retry",
          customerName: "n/a",
          serviceName: "Stripe refund retry",
          startDate: new Date().toISOString().slice(0, 10),
          amount: "n/a",
          reason: `${exhausted} refund retry falliti: controllare /admin/finanza`,
        },
        emailIdempotencyKey: `refund-retry-exhausted:${new Date().toISOString().slice(0, 13)}`,
      });
    }
    return { retried, recovered, exhausted };
  },
);

export const GET = POST;
