import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withCronGuard } from "@/lib/http/with-cron-guard";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { cancelPaymentIntent } from "@/lib/stripe/payment-intents";
import {
  reconcileBoatDatesFromActiveBookings,
  releaseBookingDates,
} from "@/lib/availability/service";
import { CHANNELS } from "@/lib/channels";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { TTL, RUN_BUDGET, MAX_BATCHES as MAX_BATCHES_LIMITS } from "@/lib/timing";
import { processBatchPaginated } from "@/lib/cron/process-batch-paginated";
import { isBoatSharedServiceType } from "@/lib/booking/boat-slot-availability";

export const runtime = "nodejs";

import { PENDING_GC_TTL_MS } from "@/lib/booking/constants";

// R20-A1-1: cutoff a 45min (da 30min) per creare buffer 30min rispetto alla
// DIRECT_RETRY_WINDOW_MS (15min). Evita race retry-window vs GC concorrente
// al bordo 30min quando cliente clicca "Usa altro metodo" al 29:59.
const PENDING_MAX_AGE_MS = PENDING_GC_TTL_MS;
// R15-REG-6: soft-timeout per non superare il lease TTL. Ogni iteration:
// cancelPaymentIntent (1-3s Stripe API) + releaseDates (7 days × fan-out).
// 4min cap lascia 1min di margine per rilasciare il lease pulito.
const RUN_BUDGET_MS = RUN_BUDGET.STANDARD;

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
export const GET = withCronGuard(
  {
    scope: RATE_LIMIT_SCOPES.PENDING_GC_CRON_IP,
    leaseKey: LEASE_KEYS.PENDING_GC,
    leaseTtlSeconds: TTL.CRON_LEASE_PENDING_GC,
    runBudgetMs: RUN_BUDGET_MS,
  },
  async (_req, ctx) => {
    const cutoff = new Date(Date.now() - PENDING_MAX_AGE_MS);
    const BATCH_SIZE = 200;

    let cancelled = 0;
    let piCancelled = 0;
    const errors: Array<{ bookingId: string; error: string }> = [];

    // R14-REG-A4: cursor pagination via processBatchPaginated helper.
    // R15-REG-6: soft-timeout via ctx.shouldStop() break per non superare il
    // lease TTL.
    const batchResult = await processBatchPaginated({
      label: "pending-gc",
      batchSize: BATCH_SIZE,
      maxBatches: MAX_BATCHES_LIMITS.STANDARD, // cap 4000 booking/run
      shouldStop: () => ctx.shouldStop(),
      fetchBatch: async (_cursor, size) => {
        const batch = await db.booking.findMany({
          where: {
            status: "PENDING",
            source: "DIRECT",
            createdAt: { lt: cutoff },
          },
          include: {
            directBooking: true,
            service: { select: { type: true } },
          },
          orderBy: { createdAt: "asc" },
          take: size,
        });
        // No cursor needed: the workload is consumed inline (status flip
        // PENDING→CANCELLED) so the same query naturally advances each run.
        return { items: batch, nextCursor: undefined };
      },
      processItem: async (b) => {
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
          if (claim.count === 0) return;

          if (isBoatSharedServiceType(b.service.type)) {
            await reconcileBoatDatesFromActiveBookings({
              boatId: b.boatId,
              startDate: b.startDate,
              endDate: b.endDate,
              sourceChannel: CHANNELS.DIRECT,
            });
          } else {
            await releaseBookingDates({
              bookingId: b.id,
              boatId: b.boatId,
              startDate: b.startDate,
              endDate: b.endDate,
              sourceChannel: CHANNELS.DIRECT,
            });
          }
          cancelled++;
        } catch (err) {
          errors.push({ bookingId: b.id, error: (err as Error).message });
          logger.error(
            { err: (err as Error).message, bookingId: b.id },
            "Pending GC iteration failed",
          );
        }
      },
    });
    const totalScanned = batchResult.processedCount;
    if (batchResult.hitTimeout) {
      logger.warn(
        { totalScanned, elapsedMs: ctx.elapsedMs() },
        "Pending GC stopped at RUN_BUDGET_MS to avoid lease expiry",
      );
    }
    if (batchResult.hitMaxBatches) {
      logger.warn(
        { totalScanned, cutoffMinutes: PENDING_MAX_AGE_MS / 60000 },
        "Pending GC hit MAX_BATCHES cap — backlog not drained, will continue next run",
      );
    }

    // R26-P4 (audit double-book Agent 1 #5-tail): recovery drift
    // cleanup. Se il cron e' crashato tra `updateMany CANCELLED` e
    // `releaseDates`, la cella resta BLOCKED con lockedByBookingId che
    // punta a un booking CANCELLED → slot unbookable permanentemente +
    // customer legittimo bloccato. Qui rileviamo questa drift e releasee.
    // Stesso pattern: BoatAvailability BLOCKED + lockedByBooking.status
    // IN (CANCELLED, REFUNDED).
    let driftReleased = 0;
    try {
      const orphans = await db.boatAvailability.findMany({
        where: {
          status: "BLOCKED",
          lockedByBookingId: { not: null },
          lockedByBooking: {
            status: { in: ["CANCELLED", "REFUNDED"] },
          },
        },
        select: { boatId: true, date: true, lockedByBookingId: true },
        take: 200,
      });
      for (const o of orphans) {
        try {
          if (!o.lockedByBookingId) continue;
          await releaseBookingDates({
            bookingId: o.lockedByBookingId,
            boatId: o.boatId,
            startDate: o.date,
            endDate: o.date,
            sourceChannel: CHANNELS.DIRECT,
          });
          driftReleased++;
        } catch (err) {
          logger.warn(
            { err: (err as Error).message, boatId: o.boatId, date: o.date },
            "Drift release failed, will retry next run",
          );
        }
      }
      if (orphans.length > 0) {
        logger.info(
          { orphans: orphans.length, released: driftReleased },
          "Pending GC: drift BLOCKED+CANCELLED cells recovered",
        );
      }
    } catch (err) {
      logger.error({ err: (err as Error).message }, "Drift scan failed");
    }

    logger.info(
      {
        scanned: totalScanned,
        cancelled,
        piCancelled,
        driftReleased,
        errors: errors.length,
      },
      "Pending GC cron completed",
    );
    return {
      scanned: totalScanned,
      cancelled,
      piCancelled,
      driftReleased,
      errors,
    };
  },
);
