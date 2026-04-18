import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyBokunWebhook } from "@/lib/bokun/webhook-verifier";
import { getBokunBooking } from "@/lib/bokun/bookings";
import { importBokunBooking } from "@/lib/bokun/adapters/booking";
import { blockDates, releaseDates } from "@/lib/availability/service";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { CHANNELS } from "@/lib/channels";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { UnauthorizedError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const webhookBodySchema = z.object({
  timestamp: z.string().optional(),
  bookingId: z.union([z.number(), z.string()]),
});

export const POST = withErrorHandler(async (req: Request) => {
  if (!env.BOKUN_WEBHOOK_SECRET) {
    logger.error("BOKUN_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: { code: "WEBHOOK_NOT_CONFIGURED" } }, { status: 500 });
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
  if (!topic) {
    throw new ValidationError("Missing x-bokun-topic header");
  }

  const rawBody = await req.json().catch(() => null);
  const body = webhookBodySchema.parse(rawBody);

  if (topic.startsWith("bookings/")) {
    const bokunBooking = await getBokunBooking(String(body.bookingId));
    const ourBookingId = await importBokunBooking(bokunBooking);

    const b = await db.booking.findUnique({ where: { id: ourBookingId } });
    if (!b) {
      logger.error({ ourBookingId }, "Imported booking not found after import");
      return NextResponse.json({ received: true });
    }

    if (topic === "bookings/cancel" || b.status === "CANCELLED" || b.status === "REFUNDED") {
      await releaseDates(b.boatId, b.startDate, b.endDate, CHANNELS.BOKUN);
    } else if (topic === "bookings/create" || topic === "bookings/update") {
      await blockDates(b.boatId, b.startDate, b.endDate, CHANNELS.BOKUN, b.id);
    }
  } else {
    logger.debug({ topic }, "Bokun webhook topic unhandled");
  }

  return NextResponse.json({ received: true });
});
