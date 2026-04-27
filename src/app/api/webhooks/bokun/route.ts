import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { verifyBokunWebhookResult } from "@/lib/bokun/webhook-verifier";
import { bokunBookingIdSchema, bokunWebhookBodySchema } from "@/lib/bokun/schemas";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { withWebhookGuard } from "@/lib/http/with-webhook-guard";
import { AppError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getUserAgent } from "@/lib/http/client-ip";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { withDedupedEvent } from "@/lib/dedup/processed-event";
import { bookingBokunQueue } from "@/lib/queue";

export const runtime = "nodejs";

const HANDLED_TOPICS = new Set([
  "bookings/create",
  "bookings/update",
  "bookings/cancel",
]);

// R25-A3-C1: replay window ±5min su `x-bokun-date` header. Bokun invia date
// ISO8601 nell'header. Senza questo check, un attaccante con webhook body+sig
// capturato puo' replayare indefinitamente dopo 30gg (retention dedup table).
const REPLAY_WINDOW_MS = 5 * 60 * 1000;

/**
 * Webhook Bokun — rate-limited per IP (60 req/min) a defense-in-depth contro
 * burst/DoS sulla verifica HMAC. Idempotency via `ProcessedBokunEvent`
 * (pre-check + INSERT-at-end).
 *
 * Log diagnostici su HMAC invalid: ip, ua, signature prefix — per distinguere
 * attacco da rotazione secret mal configurata senza leakare la signature completa.
 *
 * Rate-limit + body-cap + arrayBuffer→Buffer estratti in `withWebhookGuard`.
 */
export const POST = withWebhookGuard(
  {
    scope: RATE_LIMIT_SCOPES.BOKUN_WEBHOOK_IP,
    label: "bokun",
  },
  async ({ body: bodyBuf, headers: reqHeaders, ip }) => {
    if (!env.BOKUN_WEBHOOK_SECRET) {
      throw new AppError("WEBHOOK_NOT_CONFIGURED", "Bokun webhook not configured", 500);
    }

    const userAgent = getUserAgent(reqHeaders);

    const headers: Record<string, string> = {};
    reqHeaders.forEach((value, key) => {
      headers[key] = value;
    });

    const verify = verifyBokunWebhookResult(headers, env.BOKUN_WEBHOOK_SECRET);
    if (!verify.ok) {
      const signature = headers["x-bokun-hmac"] ?? headers["x-bokun-signature"] ?? "";
      logger.warn(
        {
          topic: headers["x-bokun-topic"],
          ip,
          userAgent,
          signaturePrefix: signature.slice(0, 8),
          // R25-A3-A3: reason tipizzato distingue attack (`not-hex`,
          // `length-mismatch`) vs config drift (`hmac-mismatch` → secret rotation
          // mal configurata) vs missing header.
          reason: verify.reason,
        },
        "Bokun webhook HMAC invalid",
      );
      throw new UnauthorizedError("Invalid signature");
    }

    // R25-A3-C1: replay window ±5min. Bokun invia `x-bokun-date` ISO8601.
    // Se assente o fuori window, reject (previene replay di webhook vecchio
    // capturato che passerebbe HMAC ma non e' piu' legittimo).
    const bokunDate = headers["x-bokun-date"];
    if (bokunDate) {
      const parsed = Date.parse(bokunDate);
      if (!Number.isNaN(parsed)) {
        const age = Math.abs(Date.now() - parsed);
        if (age > REPLAY_WINDOW_MS) {
          logger.warn(
            { bokunDate, ageMs: age, ip },
            "Bokun webhook outside replay window (±5min)",
          );
          throw new ValidationError("Webhook timestamp outside replay window");
        }
      }
    }
    // NOTE: header mancante non causa reject — Bokun legacy non sempre lo invia.
    // Dedup via `ProcessedBokunEvent` resta fallback per retry upstream.

    const topic = headers["x-bokun-topic"];
    if (!topic) throw new ValidationError("Missing x-bokun-topic header");

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(bodyBuf.toString("utf8"));
    } catch {
      parsedJson = null;
    }
    const body = bokunWebhookBodySchema.parse(parsedJson);
    const headerBookingId = headers["x-bokun-booking-id"];
    const headerExperienceBookingId = headers["x-bokun-experiencebooking-id"];

    const isBookingTopic = topic.startsWith("bookings/");
    if (isBookingTopic && !headerBookingId) {
      throw new ValidationError("Missing x-bokun-booking-id header");
    }
    const bookingId =
      headerBookingId !== undefined
        ? String(bokunBookingIdSchema.parse(headerBookingId))
        : body.bookingId !== undefined
          ? String(body.bookingId)
          : null;
    if (isBookingTopic && !bookingId) throw new ValidationError("Missing Bokun bookingId");
    if (body.bookingId !== undefined && String(body.bookingId) !== bookingId) {
      throw new ValidationError("Bokun bookingId mismatch between header and body");
    }
    const experienceBookingId =
      headerExperienceBookingId !== undefined
        ? String(bokunBookingIdSchema.parse(headerExperienceBookingId))
        : body.experienceBookingId !== undefined
          ? String(body.experienceBookingId)
          : undefined;

    // Idempotency: hash(topic|bookingId|timestamp|signature) come eventId.
    // Bokun non fornisce un event.id esplicito, ma la combinazione e' unica
    // entro la ragionevole finestra di retry upstream.
    const signature = headers["x-bokun-hmac"] ?? headers["x-bokun-signature"] ?? "";
    const eventId = crypto
      .createHash("sha256")
      .update(JSON.stringify([topic, bookingId ?? "", experienceBookingId ?? "", body.timestamp ?? "", signature]))
      .digest("hex");

    // R28-CRIT-2: dedup pre-check (read-only) invece di INSERT-first.
    // Pattern aligned con Stripe webhook-handler. Prima: marker scritto PRIMA
    // dell'import → se import/sync falliva (Bokun 503 / Redis down / advisory
    // wait timeout), il route 500 → Bokun retry → dedup trovava il marker →
    // 200 duplicate → booking MAI importato, perdita permanente. Ora: check
    // idempotency; se gia' processato, skip. Altrimenti processa + marker al
    // fondo con P2002 catch (race concurrent retry).
    const dedup = await withDedupedEvent(
      "ProcessedBokunEvent",
      eventId,
      { topic },
      async () => {
        if (!topic.startsWith("bookings/")) {
          logger.debug({ topic }, "Bokun webhook topic outside bookings namespace");
          // Topic non-bookings: nessun side effect ma marker scritto al fondo
          // per evitare retry storm upstream.
          return;
        }

        if (!HANDLED_TOPICS.has(topic)) {
          // Topic noto ma non mappato (es. bookings/reschedule): import+sync
          // comunque, cosi' il DB riflette lo stato upstream.
          logger.warn({ topic }, "Bokun webhook topic unhandled, forcing import+sync");
        }

        if (!bookingId) return;
        await bookingBokunQueue().add(
          "booking.webhook.process",
          {
            type: "booking.webhook.process",
            data: {
              provider: "BOKUN",
              eventId,
              topic,
              bookingId,
              experienceBookingId,
              receivedAt: new Date().toISOString(),
            },
          },
          { jobId: `bokun-booking-${eventId}` },
        );
      },
    );

    if (dedup.skipped) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ received: true });
  },
);
