import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { refundPayment, getChargeRefundState } from "@/lib/stripe/payment-intents";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const LEASE_TTL_SECONDS = 10 * 60;

/**
 * Cron §8.3: retry Payment FAILED con stripeChargeId. Idempotent via
 * getChargeRefundState (R27 pattern). Batch 50/run, ogni 30min.
 * Fallimenti ripetuti segnati nei log — manual escalation via admin UI.
 */
export const POST = withErrorHandler(async (req: Request) => {
  await enforceRateLimit({
    identifier: "global",
    scope: RATE_LIMIT_SCOPES.REFUND_RETRY_CRON_IP,
    limit: 10,
    windowSeconds: 60,
    failOpen: true,
  });
  requireBearerSecret(req, env.CRON_SECRET);

  const lease = await tryAcquireLease(LEASE_KEYS.REFUND_RETRY, LEASE_TTL_SECONDS);
  if (!lease) {
    return NextResponse.json({ skipped: "already-running" });
  }
  try {
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
    return NextResponse.json({ retried, recovered, exhausted });
  } finally {
    await releaseLease(lease);
  }
});

export const GET = POST;
