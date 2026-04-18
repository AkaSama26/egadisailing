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
import { AppError, UnauthorizedError } from "@/lib/errors";
import { getClientIp, getUserAgent } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (req: Request) => {
  if (!env.BOATAROUND_WEBHOOK_SECRET) {
    throw new AppError("WEBHOOK_NOT_CONFIGURED", "Boataround webhook not configured", 500);
  }

  const ip = getClientIp(req.headers);
  await enforceRateLimit({
    identifier: ip,
    scope: RATE_LIMIT_SCOPES.BOATAROUND_WEBHOOK_IP,
    limit: 60,
    windowSeconds: 60,
  });

  const rawBody = await req.text();
  const signature = req.headers.get("x-boataround-signature") ?? "";

  if (!verifyBoataroundWebhook(rawBody, signature, env.BOATAROUND_WEBHOOK_SECRET)) {
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

  const eventId = crypto
    .createHash("sha256")
    .update(`${body.type}|${body.bookingId}|${body.timestamp ?? ""}|${signature}`)
    .digest("hex");

  try {
    await db.processedBoataroundEvent.create({
      data: { eventId, eventType: body.type },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.info({ eventId, type: body.type }, "Boataround webhook duplicate, skipping");
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw err;
  }

  const bokunBooking = await getBoataroundBooking(body.bookingId);
  const imported = await importBoataroundBooking(bokunBooking);
  await syncBookingAvailability(imported);

  return NextResponse.json({ received: true });
});
