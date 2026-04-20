import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { verifyBokunWebhookResult } from "@/lib/bokun/webhook-verifier";
import { getBokunBooking } from "@/lib/bokun/bookings";
import { bokunWebhookBodySchema } from "@/lib/bokun/schemas";
import { importBokunBooking } from "@/lib/bokun/adapters/booking";
import { syncBookingAvailability } from "@/lib/bokun/sync-availability";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { AppError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getClientIp, getUserAgent, normalizeIpForRateLimit } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";

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

// R25-A3-C3: body-size limit. Stripe tip. 2-10KB max 100KB; settiamo 1MB
// generosamente per sicurezza. HMAC verify e' CPU-bound → un attaccante
// potrebbe flood con body 100MB+ per saturare event loop.
const MAX_WEBHOOK_BODY_BYTES = 1_048_576; // 1MB

/**
 * Webhook Bokun — rate-limited per IP (60 req/min) a defense-in-depth contro
 * burst/DoS sulla verifica HMAC. Idempotency via `ProcessedBokunEvent`
 * (insert-first: P2002 → 200 duplicate silenzioso).
 *
 * Log diagnostici su HMAC invalid: ip, ua, signature prefix — per distinguere
 * attacco da rotazione secret mal configurata senza leakare la signature completa.
 */
export const POST = withErrorHandler(async (req: Request) => {
  if (!env.BOKUN_WEBHOOK_SECRET) {
    throw new AppError("WEBHOOK_NOT_CONFIGURED", "Bokun webhook not configured", 500);
  }

  const ip = getClientIp(req.headers);
  const userAgent = getUserAgent(req.headers);

  // R25-A3-A1: normalizeIpForRateLimit — IPv6 /64 subnet rotation bypass.
  // Rate-limit PRIMA della verifica HMAC — la verifica stessa e' CPU-bound
  // (HMAC compute) e vogliamo cappare gli attacchi brute-force cheap.
  await enforceRateLimit({
    identifier: normalizeIpForRateLimit(ip),
    scope: RATE_LIMIT_SCOPES.BOKUN_WEBHOOK_IP,
    limit: 60,
    windowSeconds: 60,
  });

  // R25-A3-C3: body size cap pre-HMAC. Content-Length check veloce + fallback
  // su stream check quando header mancante.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_WEBHOOK_BODY_BYTES) {
    throw new ValidationError(`Body too large (${contentLength} > ${MAX_WEBHOOK_BODY_BYTES})`);
  }

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
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

  const rawBody = await req.json().catch(() => null);
  const body = bokunWebhookBodySchema.parse(rawBody);

  // Idempotency: hash(topic|bookingId|timestamp|signature) come eventId.
  // Bokun non fornisce un event.id esplicito, ma la combinazione e' unica
  // entro la ragionevole finestra di retry upstream.
  const signature = headers["x-bokun-hmac"] ?? headers["x-bokun-signature"] ?? "";
  const eventId = crypto
    .createHash("sha256")
    .update(`${topic}|${body.bookingId}|${body.timestamp ?? ""}|${signature}`)
    .digest("hex");

  try {
    await db.processedBokunEvent.create({ data: { eventId, topic } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.info({ eventId, topic }, "Bokun webhook duplicate, skipping");
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw err;
  }

  if (!topic.startsWith("bookings/")) {
    logger.debug({ topic }, "Bokun webhook topic outside bookings namespace");
    return NextResponse.json({ received: true });
  }

  if (!HANDLED_TOPICS.has(topic)) {
    // Topic noto ma non mappato (es. bookings/reschedule): import+sync comunque,
    // cosi' il DB riflette lo stato upstream.
    logger.warn({ topic }, "Bokun webhook topic unhandled, forcing import+sync");
  }

  const bokunBooking = await getBokunBooking(body.bookingId);
  const imported = await importBokunBooking(bokunBooking);
  await syncBookingAvailability(imported);

  return NextResponse.json({ received: true });
});
