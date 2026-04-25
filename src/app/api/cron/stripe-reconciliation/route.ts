import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/server";
import { handleStripeEvent } from "@/lib/stripe/webhook-handler";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { withCronGuard } from "@/lib/http/with-cron-guard";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { getRedisConnection } from "@/lib/queue";
import { TTL } from "@/lib/timing";

export const runtime = "nodejs";

// R28-ALTA-3: soft-timeout per non superare lease TTL. 10k event × 5-8s
// Stripe handler (refund doppia API call R27) = worst-case ore teoriche.
// 8min cap lascia 2min margine per cursor persist + finally. Pattern
// identico pending-gc + bokun-reconciliation RUN_BUDGET_MS.
const RUN_BUDGET_MS = 8 * 60 * 1000;

// Eventi di cui ci importa per il reconciliation. Filtrare upstream evita
// di scaricare eventi inutili (customer.*, product.*, invoice.*).
const RECONCILED_EVENT_TYPES = [
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "charge.refunded",
];

// Quanto indietro andiamo al primo run (senza cursore) o se il cursore e'
// troppo vecchio (gap di deployment). 3gg copre il worst-case retry window
// di Stripe senza re-processare storia infinita. Stripe retention events ≈ 30gg.
const INITIAL_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;
// R24-P2-LOW: Stripe events retention e' ~30gg — se il cursore e' stuck
// oltre questa finestra, events.list non ritorna piu' quei record.
// Cap preventivo a 28gg: se `since` e' piu' vecchio, ri-ancoriamo a now-28d
// + alert amministratore. Evita silent data gap sul cursore dimenticato.
const MAX_LOOKBACK_MS = 28 * 24 * 60 * 60 * 1000;

// Safety cap per-run: 100 pages × 100 eventi = 10k eventi/run. Se hit + hasMore
// il backlog continua al prossimo run via `starting_after` persistito in Redis.
const PAGE_SIZE = 100;
const MAX_PAGES = 100;

const CHANNEL_KEY = "STRIPE_EVENTS_RECONCILIATION";
// R24-P2-CRITICA: cursore `starting_after` persistito cross-run via Redis.
// Stripe events.list ritorna desc (newest first). `starting_after` walks
// deeper (older) within a run ma RESETTA per-query — senza cross-run
// persistence, backlog > MAX_PAGES*PAGE_SIZE (10k) mai raggiunto (pagination
// sempre restart da newest). Redis key TTL = 7gg per auto-clear in caso
// di bug + idempotency naturalmente copre via ProcessedStripeEvent.
const CURSOR_REDIS_KEY = "stripe-reconciliation:starting-after";
const CURSOR_REDIS_TTL_SEC = TTL.STRIPE_RECONCILIATION_CURSOR;

/**
 * Cron Stripe events reconciliation — fallback per webhook persi.
 *
 * Scenario critico: webhook endpoint down per outage (Caddy crash, deploy
 * rolling, DNS flap) → Stripe ritenta 3gg poi marca endpoint degraded.
 * Se il fix supera retry window, l'evento e' perso → Payment non creato,
 * Booking PENDING per sempre, soldi ricevuti ma cliente non confermato.
 *
 * Cursori:
 *  - `since` (ChannelSyncStatus.lastSyncAt): lower bound temporal query
 *  - `startingAfter` (Redis): continuation Stripe cursor cross-run per
 *    drenare backlog > MAX_PAGES incrementalmente
 *
 * Flow:
 *  - Run completo (pages < MAX_PAGES): clear Redis cursor + advance
 *    `since` a maxEventCreated-1 → reset per next run partendo da newest.
 *  - Hit MAX_PAGES: save last event id in Redis, NON avanza since →
 *    next run continua dallo stesso punto older nella stessa window.
 *  - failed > 0: non avanza (retry idempotent via ProcessedStripeEvent).
 */
export const GET = withCronGuard(
  {
    scope: RATE_LIMIT_SCOPES.STRIPE_CRON_IP,
    leaseKey: LEASE_KEYS.STRIPE_RECONCILIATION,
    leaseTtlSeconds: 10 * 60,
    runBudgetMs: RUN_BUDGET_MS,
  },
  async (_req, ctx) => {
    if (!env.STRIPE_SECRET_KEY) {
      return { skipped: "stripe_not_configured" };
    }

    const runStartedAt = new Date();
    const redis = getRedisConnection();

    try {
      const syncStatus = await db.channelSyncStatus.findUnique({
        where: { channel: CHANNEL_KEY },
      });
      const initialLookback = new Date(runStartedAt.getTime() - INITIAL_LOOKBACK_MS);
      const maxLookback = new Date(runStartedAt.getTime() - MAX_LOOKBACK_MS);
      let since = syncStatus?.lastSyncAt ?? initialLookback;
      // R24-P2-LOW: cap su since vecchio > 28gg (Stripe retention ~30gg).
      // Oltre questa finestra events.list ritorna nulla → silent gap. Ri-ancoriamo
      // + warn admin.
      if (since < maxLookback) {
        logger.warn(
          { originalSince: since.toISOString(), cappedTo: maxLookback.toISOString() },
          "Stripe reconciliation cursor > 28d — capping (Stripe retention limit)",
        );
        since = maxLookback;
      }
      const sinceEpoch = Math.floor(since.getTime() / 1000);

      // R24-P2-CRITICA: leggi cursor continuation da run precedente se presente.
      const persistedCursor = await redis.get(CURSOR_REDIS_KEY).catch(() => null);

      let totalFetched = 0;
      let replayed = 0;
      let skippedAlreadyProcessed = 0;
      let failed = 0;
      let pages = 0;
      let startingAfter: string | undefined = persistedCursor ?? undefined;
      let hasMore = true;
      let maxEventCreated = sinceEpoch;
      let minEventCreated: number | null = null;
      let lastEventIdThisRun: string | undefined = undefined;

      const stripeClient = stripe();
      let budgetExceeded = false;

      while (hasMore && pages < MAX_PAGES) {
        // R28-ALTA-3: break su budget per evitare overrun lease TTL 10min.
        if (ctx.shouldStop()) {
          budgetExceeded = true;
          logger.warn(
            {
              pages,
              totalFetched,
              replayed,
              failed,
              elapsedMs: ctx.elapsedMs(),
            },
            "Stripe reconciliation stopped at RUN_BUDGET_MS — backlog continues next run",
          );
          break;
        }
        const response: Stripe.ApiList<Stripe.Event> = await stripeClient.events.list({
          created: { gte: sinceEpoch },
          limit: PAGE_SIZE,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        pages++;
        totalFetched += response.data.length;

        for (const event of response.data) {
          if (event.created > maxEventCreated) maxEventCreated = event.created;
          if (minEventCreated === null || event.created < minEventCreated) {
            minEventCreated = event.created;
          }
          if (!RECONCILED_EVENT_TYPES.includes(event.type)) {
            continue;
          }
          const existing = await db.processedStripeEvent.findUnique({
            where: { eventId: event.id },
            select: { eventId: true },
          });
          if (existing) {
            skippedAlreadyProcessed++;
            continue;
          }
          try {
            await handleStripeEvent(event);
            replayed++;
            logger.info(
              { eventId: event.id, eventType: event.type },
              "Stripe event replayed via reconciliation cron",
            );
          } catch (err) {
            failed++;
            logger.error(
              {
                eventId: event.id,
                eventType: event.type,
                errorCode: (err as { code?: string }).code,
                errorMessage: (err as Error).message,
              },
              "Stripe event replay failed — will retry next run",
            );
          }
        }

        hasMore = response.has_more;
        if (response.data.length > 0) {
          lastEventIdThisRun = response.data[response.data.length - 1].id;
        }
        if (hasMore && lastEventIdThisRun) {
          startingAfter = lastEventIdThisRun;
        }
      }

      const hitMaxPages = pages >= MAX_PAGES && hasMore;
      // R28-ALTA-3: budget-break e' semanticamente equivalente a hitMaxPages
      // (abbiamo interrotto il drain, serve continuare al prossimo run). Unifichiamo.
      const reachedLimit = hitMaxPages || budgetExceeded;
      if (reachedLimit) {
        logger.warn(
          {
            pages,
            totalFetched,
            minEventCreated,
            lastEventIdThisRun,
            reason: budgetExceeded ? "run_budget" : "max_pages",
          },
          "Stripe reconciliation reached limit — backlog will continue next run",
        );
      }

      // R24-P2-CRITICA + R28-ALTA-3: gestione cursor cross-run per backlog drain.
      // - reachedLimit + lastEventIdThisRun: persist cursor, NON advance since
      //   → next run continua dallo stesso punto older.
      // - failed > 0 (no limit): non advance since (idempotent retry).
      // - Run completo (no limit, no fail): clear Redis cursor + advance since.
      let nextSince: Date;
      if (failed > 0 && !reachedLimit) {
        nextSince = since;
      } else if (reachedLimit && lastEventIdThisRun) {
        await redis
          .set(CURSOR_REDIS_KEY, lastEventIdThisRun, "EX", CURSOR_REDIS_TTL_SEC)
          .catch((err) => logger.error({ err }, "Failed to persist cursor"));
        nextSince = since; // Mantieni lower bound per continuare stesso window
      } else {
        // Run completo: clear continuation + advance since.
        await redis.del(CURSOR_REDIS_KEY).catch(() => null);
        if (maxEventCreated > sinceEpoch) {
          nextSince = new Date((maxEventCreated - 1) * 1000);
        } else {
          nextSince = since;
        }
      }

      const durationMs = Date.now() - runStartedAt.getTime();
      const status: "GREEN" | "YELLOW" = failed === 0 && !reachedLimit ? "GREEN" : "YELLOW";
      const errMsg = failed > 0
        ? `${failed} replays failed`
        : reachedLimit
          ? budgetExceeded
            ? `RUN_BUDGET_MS cap — backlog drain continues next run`
            : `MAX_PAGES cap — backlog drain continues next run`
          : null;
      await db.channelSyncStatus.upsert({
        where: { channel: CHANNEL_KEY },
        update: { lastSyncAt: nextSince, healthStatus: status, lastError: errMsg },
        create: {
          channel: CHANNEL_KEY,
          lastSyncAt: nextSince,
          healthStatus: status,
          lastError: errMsg,
        },
      });

      logger.info(
        {
          totalFetched,
          replayed,
          skippedAlreadyProcessed,
          failed,
          pages,
          hitMaxPages,
          continuationPersisted: hitMaxPages,
          durationMs,
          since: since.toISOString(),
        },
        "Stripe reconciliation run completed",
      );

      return {
        totalFetched,
        replayed,
        skippedAlreadyProcessed,
        failed,
        pages,
        hitMaxPages,
        durationMs,
      };
    } catch (err) {
      // R25-A1-M1: stale cursor wedge. Se il persisted cursor punta a un event
      // id > ~30d (Stripe retention limit), `events.list({starting_after:...})`
      // throws `resource_missing`. Senza clear, ogni run seguente si wedgia
      // sullo stesso error per 7gg (TTL Redis key). Fix: detect 404 →
      // clear cursor → RED → next run partira' da `since` fresh senza cursor.
      const stripeErr = err as { code?: string; type?: string; statusCode?: number };
      const isResourceMissing =
        stripeErr.code === "resource_missing" ||
        (stripeErr.statusCode === 404 && stripeErr.type === "StripeInvalidRequestError");
      if (isResourceMissing) {
        logger.warn(
          { err },
          "Stripe reconciliation: stale cursor detected → clearing Redis continuation",
        );
        await redis.del(CURSOR_REDIS_KEY).catch(() => null);
      }
      logger.error({ err }, "Stripe reconciliation failed");
      await db.channelSyncStatus.upsert({
        where: { channel: CHANNEL_KEY },
        update: { healthStatus: "RED", lastError: (err as Error).message },
        create: {
          channel: CHANNEL_KEY,
          healthStatus: "RED",
          lastError: (err as Error).message,
        },
      });
      throw err;
    }
  },
);
