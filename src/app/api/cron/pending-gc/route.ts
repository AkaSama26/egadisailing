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

  try {
    const cutoff = new Date(Date.now() - PENDING_MAX_AGE_MS);
    const candidates = await db.booking.findMany({
      where: {
        status: "PENDING",
        source: "DIRECT",
        createdAt: { lt: cutoff },
      },
      include: { directBooking: true },
      take: 200,
    });

    let cancelled = 0;
    let piCancelled = 0;
    const errors: Array<{ bookingId: string; error: string }> = [];

    for (const b of candidates) {
      try {
        const pi = b.directBooking?.stripePaymentIntentId;
        if (pi) {
          // Stripe `cancelPaymentIntent` e' idempotente sui status non-cancelable
          // (returna l'intent esistente senza errore se gia' succeeded/canceled).
          const res = await cancelPaymentIntent(pi).catch((err) => {
            logger.warn(
              { err: (err as Error).message, pi, bookingId: b.id },
              "Pending GC: cancel PI skipped (likely already terminal)",
            );
            return null;
          });
          if (res) piCancelled++;
        }

        // Claim-then-do: updateMany su PENDING → 0 se altro processo ha gia'
        // transitato lo stato (webhook Stripe succeeded arrivato late).
        const claim = await db.booking.updateMany({
          where: { id: b.id, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
        if (claim.count === 0) continue;

        await releaseDates(b.boatId, b.startDate, b.endDate, CHANNELS.DIRECT);
        cancelled++;
      } catch (err) {
        errors.push({ bookingId: b.id, error: (err as Error).message });
        logger.error({ err, bookingId: b.id }, "Pending GC iteration failed");
      }
    }

    logger.info(
      { scanned: candidates.length, cancelled, piCancelled, errors: errors.length },
      "Pending GC cron completed",
    );
    return NextResponse.json({ scanned: candidates.length, cancelled, piCancelled, errors });
  } finally {
    await releaseLease(lease);
  }
});
