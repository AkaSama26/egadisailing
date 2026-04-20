import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/server";
import { handleStripeEvent } from "@/lib/stripe/webhook-handler";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";
import { getClientIp } from "@/lib/http/client-ip";
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
  await enforceRateLimit({
    identifier: getClientIp(req.headers),
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
    // Traccio il timestamp piu' alto visto: il prossimo cursore deve essere
    // >= di questo per non riprocessare (paginazione Stripe e' desc so il
    // primo batch ha il piu' recente — ma per sicurezza tracco max esplicito).
    let maxEventCreated = sinceEpoch;

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

    if (pages >= MAX_PAGES) {
      logger.warn({ pages, totalFetched }, "Stripe reconciliation hit MAX_PAGES cap");
    }

    // Cursore salvato: avanza solo se abbiamo visto eventi piu' recenti.
    // Se `failed > 0` NON avanziamo il cursore: il prossimo run riprovera'.
    // Questo e' una scelta di safety — preferiamo ri-processare qualche
    // evento gia' andato OK (idempotent) piuttosto che perderne uno.
    let nextSince: Date;
    if (failed === 0 && maxEventCreated > sinceEpoch) {
      // Avanza a 1s prima del piu' recente visto: Stripe `created[gte]`
      // inclusivo, il prossimo run ri-vedra' il piu' recente ma saltera'
      // via dedup.
      nextSince = new Date((maxEventCreated - 1) * 1000);
    } else {
      // Mantieni cursore se failed>0 o nessun evento nuovo.
      nextSince = since;
    }

    const durationMs = Date.now() - runStartedAt.getTime();
    await db.channelSyncStatus.upsert({
      where: { channel: CHANNEL_KEY },
      update: {
        lastSyncAt: nextSince,
        healthStatus: failed === 0 ? "GREEN" : "YELLOW",
        lastError: failed > 0 ? `${failed} replays failed` : null,
      },
      create: {
        channel: CHANNEL_KEY,
        lastSyncAt: nextSince,
        healthStatus: failed === 0 ? "GREEN" : "YELLOW",
        lastError: failed > 0 ? `${failed} replays failed` : null,
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
