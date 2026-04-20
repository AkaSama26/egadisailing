import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/server";
import { handleStripeEvent } from "@/lib/stripe/webhook-handler";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";
import { LEASE_KEYS } from "@/lib/lease/keys";

export const runtime = "nodejs";

const LEASE_NAME = LEASE_KEYS.STRIPE_RECONCILIATION;
// Cron gira ogni 15 min (schedulato in src/lib/cron/scheduler.ts). Lease
// copre il run worst-case: 7gg × ~100 eventi × ~150ms handler = ~105s.
const LEASE_TTL_SECONDS = 10 * 60;

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
// di Stripe (che e' 3gg) senza re-processare storia infinita.
const INITIAL_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;

// Safety cap: 100 pages × 100 eventi = 10k eventi/run massimo. Se hit,
// il run successivo continua dal cursore aggiornato progressivamente.
const PAGE_SIZE = 100;
const MAX_PAGES = 100;

const CHANNEL_KEY = "STRIPE_EVENTS_RECONCILIATION";

/**
 * Cron Stripe events reconciliation — fallback per webhook persi.
 *
 * Scenario critico: il webhook endpoint del sito va giu' per outage (Caddy
 * crash, deploy rolling, DNS flap) → Stripe ritenta 3gg ma dopo X failure
 * consecutivi marca l'endpoint come "degraded" e riduce il rate. Se il
 * fix supera la finestra retry, l'evento e' perso → Payment non creato,
 * Booking PENDING per sempre, soldi ricevuti ma cliente non confermato.
 *
 * Questo cron legge `/v1/events` dal cursore precedente, filtra per i
 * type rilevanti, e chiama `handleStripeEvent` che e' idempotente via
 * `ProcessedStripeEvent` (duplicati skip silente).
 *
 * Anti-overrun: Redis lease single-flight 10min TTL (auto-liberation).
 * Rate-limit: 10/min per IP (secret leak cap).
 * Cursore: salvato in `ChannelSyncStatus.lastSyncAt` con channel key
 * `STRIPE_EVENTS_RECONCILIATION`. Iniziale = 3gg (Stripe retry window).
 */
export const GET = withErrorHandler(async (req: Request) => {
  requireBearerSecret(req, env.CRON_SECRET);
  // R24-A1-C2: `identifier: "global"` come tutti gli altri cron protetti
  // (R13-C2 pattern). `getClientIp` era spoofabile via X-Forwarded-For
  // rotation in caso di CRON_SECRET leakato.
  await enforceRateLimit({
    identifier: "global",
    scope: RATE_LIMIT_SCOPES.STRIPE_CRON_IP,
    limit: 10,
    windowSeconds: 60,
  });

  if (!env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ skipped: "stripe_not_configured" });
  }

  const lease = await tryAcquireLease(LEASE_NAME, LEASE_TTL_SECONDS);
  if (!lease) {
    logger.warn("Stripe reconciliation skipped: another run in progress");
    return NextResponse.json({ skipped: "concurrent_run" });
  }

  const runStartedAt = new Date();
  try {
    const syncStatus = await db.channelSyncStatus.findUnique({
      where: { channel: CHANNEL_KEY },
    });
    const initialLookback = new Date(runStartedAt.getTime() - INITIAL_LOOKBACK_MS);
    // Cursore in secondi epoch per Stripe events.list
    const since = syncStatus?.lastSyncAt ?? initialLookback;
    const sinceEpoch = Math.floor(since.getTime() / 1000);

    let totalFetched = 0;
    let replayed = 0;
    let skippedAlreadyProcessed = 0;
    let failed = 0;
    let pages = 0;
    let startingAfter: string | undefined = undefined;
    let hasMore = true;
    // Stripe events.list ritorna eventi in ORDINE DESCENDENTE (newest→oldest).
    // R24-A1-C1: traccio SIA max (newest) SIA min (oldest) visto. Al MAX_PAGES
    // cap (backlog enorme), il cursore deve avanzare a `minEventCreated - 1`
    // invece del max — altrimenti gli eventi OLDER non processati in questo
    // run vengono saltati permanentemente. Con un backlog 15k eventi + MAX_PAGES
    // 100 (10k processati), 5k eventi dal T+run-3gg a T+max_processed sarebbero
    // persi.
    let maxEventCreated = sinceEpoch;
    let minEventCreated: number | null = null;

    const stripeClient = stripe();

    while (hasMore && pages < MAX_PAGES) {
      const response: Stripe.ApiList<Stripe.Event> = await stripeClient.events.list({
        created: { gte: sinceEpoch },
        limit: PAGE_SIZE,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      pages++;
      totalFetched += response.data.length;

      for (const event of response.data) {
        if (event.created > maxEventCreated) {
          maxEventCreated = event.created;
        }
        if (minEventCreated === null || event.created < minEventCreated) {
          minEventCreated = event.created;
        }
        if (!RECONCILED_EVENT_TYPES.includes(event.type)) {
          continue;
        }
        // Fast-path: se gia' processato skip senza invocare handler (evita
        // query DB ridondanti nei side-effect del handler che fa comunque
        // il check iniziale).
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
      if (hasMore && response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    const hitMaxPages = pages >= MAX_PAGES && hasMore;
    if (hitMaxPages) {
      logger.warn(
        { pages, totalFetched, minEventCreated },
        "Stripe reconciliation hit MAX_PAGES cap — backlog remains",
      );
    }

    // R24-A1-C1: cursore avanzamento. Stripe events.list default desc
    // (newest first). Pagination complete = tutti gli eventi fino a `since`
    // sono stati visti; si puo' avanzare al maxEventCreated.
    //
    // Cap hit (hitMaxPages + hasMore): abbiamo processato solo il segment
    // NEWEST del backlog. Gli eventi OLDER del minEventCreated NON sono
    // raggiungibili con `starting_after` da zero al prossimo run (stripe
    // riparte da newest). Se avanzassimo il cursore gli eventi vecchi
    // sarebbero persi permanentemente.
    //
    // Strategia safety: NON avanzare cursore + healthStatus YELLOW +
    // logger.warn. Il prossimo run ri-processera' stesso segment (dedup
    // via ProcessedStripeEvent = no side-effect doppio) + vedra' nuovi
    // eventi. Admin deve aumentare MAX_PAGES se il warn persiste > 1h
    // (indica backlog reale — probabile outage prolungato).
    let nextSince: Date;
    if (failed > 0 || hitMaxPages) {
      // No-advance: retry al prossimo run.
      nextSince = since;
    } else if (maxEventCreated > sinceEpoch) {
      // Run completo: avanza al piu' recente visto. -1s perche' Stripe gte
      // e' inclusivo; dedup via ProcessedStripeEvent copre l'overlap.
      nextSince = new Date((maxEventCreated - 1) * 1000);
    } else {
      // Nessun evento in questo run: cursore invariato.
      nextSince = since;
    }

    const durationMs = Date.now() - runStartedAt.getTime();
    // R24-A1-C1: YELLOW anche su hitMaxPages per allertare l'admin al backlog.
    const status: "GREEN" | "YELLOW" = failed === 0 && !hitMaxPages ? "GREEN" : "YELLOW";
    const errMsg = failed > 0
      ? `${failed} replays failed`
      : hitMaxPages
        ? `MAX_PAGES cap hit — backlog remains, increase MAX_PAGES or retry`
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
        durationMs,
        since: since.toISOString(),
      },
      "Stripe reconciliation run completed",
    );

    return NextResponse.json({
      totalFetched,
      replayed,
      skippedAlreadyProcessed,
      failed,
      pages,
      durationMs,
    });
  } catch (err) {
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
  } finally {
    await releaseLease(lease);
  }
});
