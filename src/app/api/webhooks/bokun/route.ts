import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { verifyBokunWebhook } from "@/lib/bokun/webhook-verifier";
import { getBokunBooking } from "@/lib/bokun/bookings";
import { bokunWebhookBodySchema } from "@/lib/bokun/schemas";
import { importBokunBooking } from "@/lib/bokun/adapters/booking";
import { syncBookingAvailability } from "@/lib/bokun/sync-availability";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { AppError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getClientIp, getUserAgent } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";

export const runtime = "nodejs";

const HANDLED_TOPICS = new Set([
  "bookings/create",
  "bookings/update",
  "bookings/cancel",
]);

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

  // Rate-limit PRIMA della verifica HMAC — la verifica stessa e' CPU-bound
  // (HMAC compute) e vogliamo cappare gli attacchi brute-force cheap.
  await enforceRateLimit({
    identifier: ip,
    scope: RATE_LIMIT_SCOPES.BOKUN_WEBHOOK_IP,
    limit: 60,
    windowSeconds: 60,
  });

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  if (!verifyBokunWebhook(headers, env.BOKUN_WEBHOOK_SECRET)) {
    const signature = headers["x-bokun-hmac"] ?? headers["x-bokun-signature"] ?? "";
    logger.warn(
      {
        topic: headers["x-bokun-topic"],
        ip,
        userAgent,
        signaturePrefix: signature.slice(0, 8),
      },
      "Bokun webhook HMAC invalid",
    );
    throw new UnauthorizedError("Invalid signature");
  }

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
