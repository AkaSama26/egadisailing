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
    // R28-CRIT-3: fail-closed. HMAC verify CPU-bound: durante Redis outage
    // attaccante con firme random flood 10k req/s → event loop saturation
    // → cascading failure sito. Bokun retry finche' Redis torna up.
    failOpen: false,
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

  // R25-P2-ALTA: body-size post-read check (content-length missing case) —
  // stesso pattern di boataround/stripe routes. Senza, upstream con
  // missing `content-length` buffera tutto prima dell'enforcement.
  const bodyBuf = Buffer.from(await req.arrayBuffer());
  if (bodyBuf.byteLength > MAX_WEBHOOK_BODY_BYTES) {
    throw new ValidationError("Body too large");
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(bodyBuf.toString("utf8"));
  } catch {
    parsedJson = null;
  }
  const body = bokunWebhookBodySchema.parse(parsedJson);

  // Idempotency: hash(topic|bookingId|timestamp|signature) come eventId.
  // Bokun non fornisce un event.id esplicito, ma la combinazione e' unica
  // entro la ragionevole finestra di retry upstream.
  const signature = headers["x-bokun-hmac"] ?? headers["x-bokun-signature"] ?? "";
  const eventId = crypto
    .createHash("sha256")
    .update(`${topic}|${body.bookingId}|${body.timestamp ?? ""}|${signature}`)
    .digest("hex");

  // R28-CRIT-2: dedup pre-check (read-only) invece di INSERT-first.
  // Pattern aligned con Stripe webhook-handler. Prima: marker scritto PRIMA
  // dell'import → se import/sync falliva (Bokun 503 / Redis down / advisory
  // wait timeout), il route 500 → Bokun retry → dedup trovava il marker →
  // 200 duplicate → booking MAI importato, perdita permanente. Ora: check
  // idempotency; se gia' processato, skip. Altrimenti processa + marker al
  // fondo con P2002 catch (race concurrent retry).
  const existing = await db.processedBokunEvent.findUnique({
    where: { eventId },
    select: { eventId: true },
  });
  if (existing) {
    logger.info({ eventId, topic }, "Bokun webhook duplicate (pre-check)");
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!topic.startsWith("bookings/")) {
    logger.debug({ topic }, "Bokun webhook topic outside bookings namespace");
    // Marker write: topic non-bookings non ha side effect pero' mark to
    // avoid retry storm upstream.
    await markProcessed(eventId, topic);
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

  // Marker ALLA FINE (solo se import+sync success). Se P2002, un retry
  // concorrente ha vinto → skip silent. Se altro error, propaga → 500 →
  // Bokun retry di nuovo (raro: side-effect gia' committati, retry nuovo
  // import e' no-op via advisory lock + P2002 catch in importBokunBooking).
  await markProcessed(eventId, topic);

  return NextResponse.json({ received: true });
});

async function markProcessed(eventId: string, topic: string): Promise<void> {
  try {
    await db.processedBokunEvent.create({ data: { eventId, topic } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.info(
        { eventId, topic },
        "Bokun marker race (concurrent retry completed first)",
      );
      return;
    }
    throw err;
  }
}
