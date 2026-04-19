import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";
import { cancelPaymentIntent } from "@/lib/stripe/payment-intents";
import { releaseDates } from "@/lib/availability/service";
import { CHANNELS } from "@/lib/channels";

export const runtime = "nodejs";

const LEASE_NAME = "cron:pending-gc";
const LEASE_TTL_SECONDS = 5 * 60;
const PENDING_MAX_AGE_MS = 30 * 60 * 1000; // 30min — oltre questa soglia il booking e' abbandonato
// R15-REG-6: soft-timeout per non superare il lease TTL. Ogni iteration:
// cancelPaymentIntent (1-3s Stripe API) + releaseDates (7 days × fan-out).
// 4min cap lascia 1min di margine per rilasciare il lease pulito.
const RUN_BUDGET_MS = 4 * 60 * 1000;

/**
 * Cron ogni 15 min: trova booking PENDING > 30min → cancel PaymentIntent
 * Stripe + release availability + mark CANCELLED.
 *
 * Perche' serve: abbandoni checkout (chiude tab, carta rifiutata senza retry)
 * lasciano BoatAvailability LOCKED con lockedByBookingId → il pre-check
 * overlapping (Round 7) blocca i clienti legittimi. Senza GC la densita' di
 * slot falsi-positivi cresce linearmente con il traffico.
 *
 * Idempotency: ogni passo guardato (status check, PI gia' cancelled ignore,
 * releaseDates skippa se gia' AVAILABLE).
 */
export const GET = withErrorHandler(async (req: Request) => {
  requireBearerSecret(req, env.CRON_SECRET);
  await enforceRateLimit({
    identifier: "global",
    scope: RATE_LIMIT_SCOPES.PENDING_GC_CRON_IP,
    limit: 10,
    windowSeconds: 60,
  });

  const lease = await tryAcquireLease(LEASE_NAME, LEASE_TTL_SECONDS);
  if (!lease) {
    logger.warn("Pending GC skipped: another run in progress");
    return NextResponse.json({ skipped: "concurrent_run" });
  }

  const startedAt = Date.now();
  try {
    const cutoff = new Date(Date.now() - PENDING_MAX_AGE_MS);
    const BATCH_SIZE = 200;
    const MAX_BATCHES = 20; // cap hard: 4000 booking/run, oltre serve admin intervention

    let totalScanned = 0;
    let cancelled = 0;
    let piCancelled = 0;
    const errors: Array<{ bookingId: string; error: string }> = [];

    // R14-REG-A4: cursor pagination. Redis outage prolungata puo' accumulare
    // 1000+ PENDING oltre cutoff; senza loop il GC clearava solo 200/run
    // lasciando zombie slot LOCKED.
    // R15-REG-6: soft-timeout. Con 200 iter × 2-5s ciascuna potremmo superare
    // il lease TTL (5min) → un altro pod parte e double-cancella. Break al
    // budget anche se batch pieni restano.
    for (let batchIdx = 0; batchIdx < MAX_BATCHES; batchIdx++) {
      if (Date.now() - startedAt > RUN_BUDGET_MS) {
        logger.warn(
          { totalScanned, elapsedMs: Date.now() - startedAt },
          "Pending GC stopped at RUN_BUDGET_MS to avoid lease expiry",
        );
        break;
      }
      const batch = await db.booking.findMany({
        where: {
          status: "PENDING",
          source: "DIRECT",
          createdAt: { lt: cutoff },
        },
        include: { directBooking: true },
        orderBy: { createdAt: "asc" },
        take: BATCH_SIZE,
      });
      if (batch.length === 0) break;
      totalScanned += batch.length;

      for (const b of batch) {
        try {
          const pi = b.directBooking?.stripePaymentIntentId;
          if (pi) {
            const res = await cancelPaymentIntent(pi).catch((err) => {
              logger.warn(
                { err: (err as Error).message, bookingId: b.id },
                "Pending GC: cancel PI skipped (likely already terminal)",
              );
              return null;
            });
            if (res) piCancelled++;
          }

          const claim = await db.booking.updateMany({
            where: { id: b.id, status: "PENDING" },
            data: { status: "CANCELLED" },
          });
          if (claim.count === 0) continue;

          await releaseDates(b.boatId, b.startDate, b.endDate, CHANNELS.DIRECT);
          cancelled++;
        } catch (err) {
          errors.push({ bookingId: b.id, error: (err as Error).message });
          logger.error({ err: (err as Error).message, bookingId: b.id }, "Pending GC iteration failed");
        }
      }

      if (batch.length < BATCH_SIZE) break;
      if (batchIdx === MAX_BATCHES - 1) {
        logger.warn(
          { totalScanned, cutoffMinutes: PENDING_MAX_AGE_MS / 60000 },
          "Pending GC hit MAX_BATCHES cap — backlog not drained, will continue next run",
        );
      }
    }

    logger.info(
      { scanned: totalScanned, cancelled, piCancelled, errors: errors.length },
      "Pending GC cron completed",
    );
    return NextResponse.json({ scanned: totalScanned, cancelled, piCancelled, errors });
  } finally {
    await releaseLease(lease);
  }
});
