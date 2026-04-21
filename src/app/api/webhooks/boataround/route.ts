import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { verifyBoataroundWebhook } from "@/lib/boataround/webhook-verifier";
import { getBoataroundBooking } from "@/lib/boataround/bookings";
import { boataroundWebhookBodySchema } from "@/lib/boataround/schemas";
import { importBoataroundBooking } from "@/lib/boataround/adapters/booking";
import { syncBookingAvailability } from "@/lib/boataround/sync-availability";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { AppError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getClientIp, getUserAgent, normalizeIpForRateLimit } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";

export const runtime = "nodejs";

// R25-A3-C1/C2/C3: stesso pattern di bokun/route.ts — replay window + size cap.
const REPLAY_WINDOW_MS = 5 * 60 * 1000;
const MAX_WEBHOOK_BODY_BYTES = 1_048_576; // 1MB

export const POST = withErrorHandler(async (req: Request) => {
  if (!env.BOATAROUND_WEBHOOK_SECRET) {
    throw new AppError("WEBHOOK_NOT_CONFIGURED", "Boataround webhook not configured", 500);
  }

  const ip = getClientIp(req.headers);
  // R25-A3-A1: IPv6 /64 normalize.
  await enforceRateLimit({
    identifier: normalizeIpForRateLimit(ip),
    scope: RATE_LIMIT_SCOPES.BOATAROUND_WEBHOOK_IP,
    limit: 60,
    windowSeconds: 60,
    // R28-CRIT-3: fail-closed. HMAC CPU-bound + Redis outage = DoS amplification.
    failOpen: false,
  });

  // R25-A3-C3: body size cap.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_WEBHOOK_BODY_BYTES) {
    throw new ValidationError(`Body too large (${contentLength} > ${MAX_WEBHOOK_BODY_BYTES})`);
  }

  // arrayBuffer invece di text() per preservare BOM/charset originali —
  // HMAC upstream e' sui bytes raw, UTF-8 decode puo' consumare BOM e divergere.
  const bodyBuf = Buffer.from(await req.arrayBuffer());
  // R25-A3-M2: enforce size anche post-read se content-length era 0/missing.
  if (bodyBuf.byteLength > MAX_WEBHOOK_BODY_BYTES) {
    throw new ValidationError(`Body too large`);
  }
  const rawBody = bodyBuf.toString("utf8");
  const signature = req.headers.get("x-boataround-signature") ?? "";

  if (!verifyBoataroundWebhook(bodyBuf, signature, env.BOATAROUND_WEBHOOK_SECRET)) {
    logger.warn(
      {
        ip,
        userAgent: getUserAgent(req.headers),
        signaturePrefix: signature.slice(0, 8),
      },
      "Boataround webhook HMAC invalid",
    );
    throw new UnauthorizedError("Invalid signature");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    throw new AppError("INVALID_JSON", "Invalid JSON body", 400);
  }
  const body = boataroundWebhookBodySchema.parse(parsedJson);

  // R25-A3-C2: replay window ±5min su `body.timestamp` (Boataround invia
  // timestamp nel body, no header dedicato). Se assente o fuori window,
  // reject. Applica stesso pattern di Bokun.
  if (body.timestamp) {
    const parsed = Date.parse(body.timestamp);
    if (!Number.isNaN(parsed)) {
      const age = Math.abs(Date.now() - parsed);
      if (age > REPLAY_WINDOW_MS) {
        logger.warn(
          { timestamp: body.timestamp, ageMs: age, ip },
          "Boataround webhook outside replay window (±5min)",
        );
        throw new ValidationError("Webhook timestamp outside replay window");
      }
    }
  }

  // R25-A3-M1: JSON.stringify invece di template string con `|` separator —
  // se `body.type` contiene `|`, hash collision cross-eventi (es. type=
  // "create|x" + bookingId="y" vs type="create" + bookingId="x|y"). Stringify
  // di un array {type,bookingId,timestamp,signature} evita il problema.
  const eventId = crypto
    .createHash("sha256")
    .update(JSON.stringify([body.type, body.bookingId, body.timestamp ?? "", signature]))
    .digest("hex");

  // R28-CRIT-2: dedup pre-check (read-only), marker alla fine. Pattern
  // aligned con Stripe + Bokun post-R28. Prima: marker INSERT-first → se
  // getBoataroundBooking o import/sync falliva, retry trovava dedup → 200
  // duplicate → booking mai importato permanentemente.
  const existing = await db.processedBoataroundEvent.findUnique({
    where: { eventId },
    select: { eventId: true },
  });
  if (existing) {
    logger.info(
      { eventId, type: body.type },
      "Boataround webhook duplicate (pre-check)",
    );
    return NextResponse.json({ received: true, duplicate: true });
  }

  const bokunBooking = await getBoataroundBooking(body.bookingId);
  const imported = await importBoataroundBooking(bokunBooking);
  await syncBookingAvailability(imported);

  try {
    await db.processedBoataroundEvent.create({
      data: { eventId, eventType: body.type },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.info(
        { eventId, type: body.type },
        "Boataround marker race (concurrent retry completed first)",
      );
    } else {
      throw err;
    }
  }

  return NextResponse.json({ received: true });
});
