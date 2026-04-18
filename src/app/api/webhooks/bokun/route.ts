import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { verifyBokunWebhook } from "@/lib/bokun/webhook-verifier";
import { getBokunBooking } from "@/lib/bokun/bookings";
import { importBokunBooking } from "@/lib/bokun/adapters/booking";
import { syncBookingAvailability } from "@/lib/bokun/sync-availability";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { AppError, UnauthorizedError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const webhookBodySchema = z.object({
  timestamp: z.string().optional(),
  bookingId: z.union([z.number(), z.string()]),
});

const HANDLED_TOPICS = new Set([
  "bookings/create",
  "bookings/update",
  "bookings/cancel",
]);

export const POST = withErrorHandler(async (req: Request) => {
  if (!env.BOKUN_WEBHOOK_SECRET) {
    throw new AppError("WEBHOOK_NOT_CONFIGURED", "Bokun webhook not configured", 500);
  }

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  if (!verifyBokunWebhook(headers, env.BOKUN_WEBHOOK_SECRET)) {
    logger.warn({ topic: headers["x-bokun-topic"] }, "Bokun webhook HMAC invalid");
    throw new UnauthorizedError("Invalid signature");
  }

  const topic = headers["x-bokun-topic"];
  if (!topic) throw new ValidationError("Missing x-bokun-topic header");

  const rawBody = await req.json().catch(() => null);
  const body = webhookBodySchema.parse(rawBody);

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

  const bokunBooking = await getBokunBooking(String(body.bookingId));
  const imported = await importBokunBooking(bokunBooking);
  await syncBookingAvailability(imported);

  return NextResponse.json({ received: true });
});
