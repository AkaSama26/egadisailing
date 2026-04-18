import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { addDays } from "@/lib/dates";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";

export const runtime = "nodejs";

/**
 * Cron giornaliero di data retention — GDPR art. 5.1.e (storage limitation).
 *
 * Policy:
 * - BookingRecoveryOtp usati/scaduti   → delete dopo 30 giorni
 * - BookingRecoverySession scadute     → delete dopo 90 giorni
 * - RateLimitEntry con window chiusa   → delete dopo 7 giorni
 * - ProcessedStripeEvent               → delete dopo 60 giorni (Stripe retry max 30g)
 * - ProcessedBokunEvent                → delete dopo 30 giorni
 * - WeatherForecastCache               → delete dopo 14 giorni
 * - AuditLog                           → delete dopo 24 mesi (bilanciato con antifraud/compliance)
 * - BokunBooking.rawPayload            → redacted PII dopo 90 giorni
 * - Booking e Customer: retention 10 anni (art. 2220 c.c.) gestiti separatamente
 *
 * Auth: Bearer CRON_SECRET (timing-safe).
 */
export const GET = withErrorHandler(async (req: Request) => {
  requireBearerSecret(req, env.CRON_SECRET);

  const now = new Date();
  const thirtyDaysAgo = addDays(now, -30);
  const ninetyDaysAgo = addDays(now, -90);
  const sevenDaysAgo = addDays(now, -7);
  const sixtyDaysAgo = addDays(now, -60);
  const fourteenDaysAgo = addDays(now, -14);
  const twoYearsAgo = addDays(now, -365 * 2);

  const results = {
    otpDeleted: 0,
    sessionDeleted: 0,
    rateLimitDeleted: 0,
    stripeEventDeleted: 0,
    bokunEventDeleted: 0,
    bokunPayloadRedacted: 0,
    weatherCacheDeleted: 0,
    auditLogDeleted: 0,
  };
  const errors: string[] = [];

  try {
    results.otpDeleted = (
      await db.bookingRecoveryOtp.deleteMany({
        where: {
          OR: [{ usedAt: { not: null } }, { expiresAt: { lt: now } }],
          createdAt: { lt: thirtyDaysAgo },
        },
      })
    ).count;
  } catch (err) {
    errors.push("otp");
    logger.error({ err }, "OTP retention cleanup failed");
  }

  try {
    results.sessionDeleted = (
      await db.bookingRecoverySession.deleteMany({
        where: { expiresAt: { lt: ninetyDaysAgo } },
      })
    ).count;
  } catch (err) {
    errors.push("session");
    logger.error({ err }, "Session retention cleanup failed");
  }

  try {
    results.rateLimitDeleted = (
      await db.rateLimitEntry.deleteMany({
        where: { windowEnd: { lt: sevenDaysAgo } },
      })
    ).count;
  } catch (err) {
    errors.push("rateLimit");
    logger.error({ err }, "RateLimit retention cleanup failed");
  }

  try {
    results.stripeEventDeleted = (
      await db.processedStripeEvent.deleteMany({
        where: { processedAt: { lt: sixtyDaysAgo } },
      })
    ).count;
  } catch (err) {
    errors.push("stripeEvent");
    logger.error({ err }, "StripeEvent retention cleanup failed");
  }

  try {
    results.bokunEventDeleted = (
      await db.processedBokunEvent.deleteMany({
        where: { processedAt: { lt: thirtyDaysAgo } },
      })
    ).count;
  } catch (err) {
    errors.push("bokunEvent");
    logger.error({ err }, "BokunEvent retention cleanup failed");
  }

  // GDPR: BokunBooking.rawPayload contiene PII (firstName/lastName/email/phone/
  // passengers). La retention legale del Booking e' 10 anni (art. 2220 c.c.)
  // ma la PII serve solo finche' la prenotazione e' operativa. Dopo 90g
  // sostituiamo il payload con i soli campi business-essenziali, cancellando
  // la PII residua. Idempotent: ri-esecuzione su record gia' redatti non ha
  // effetti (non matchano il filtro grazie al marker `_redacted: true`).
  try {
    const ninetyDayOldBookings = await db.bokunBooking.findMany({
      where: { booking: { createdAt: { lt: ninetyDaysAgo } } },
      select: { bookingId: true, rawPayload: true },
      take: 500,
    });
    for (const row of ninetyDayOldBookings) {
      const payload = row.rawPayload as Record<string, unknown>;
      if (payload && typeof payload === "object" && payload._redacted === true) continue;
      const redacted: Prisma.InputJsonValue = {
        id: (payload?.id as number | undefined) ?? null,
        productId: (payload?.productId as string | undefined) ?? null,
        status: (payload?.status as string | undefined) ?? null,
        channelName: (payload?.channelName as string | undefined) ?? null,
        startDate: (payload?.startDate as string | undefined) ?? null,
        endDate: (payload?.endDate as string | undefined) ?? null,
        numPeople: (payload?.numPeople as number | undefined) ?? null,
        totalPrice: (payload?.totalPrice as number | undefined) ?? null,
        currency: (payload?.currency as string | undefined) ?? null,
        _redacted: true,
        _redactedAt: now.toISOString(),
      };
      await db.bokunBooking.update({
        where: { bookingId: row.bookingId },
        data: { rawPayload: redacted },
      });
      results.bokunPayloadRedacted++;
    }
  } catch (err) {
    errors.push("bokunPayload");
    logger.error({ err }, "Bokun rawPayload redaction failed");
  }

  try {
    results.weatherCacheDeleted = (
      await db.weatherForecastCache.deleteMany({
        where: { fetchedAt: { lt: fourteenDaysAgo } },
      })
    ).count;
  } catch (err) {
    errors.push("weather");
    logger.error({ err }, "Weather cache retention cleanup failed");
  }

  try {
    results.auditLogDeleted = (
      await db.auditLog.deleteMany({
        where: { timestamp: { lt: twoYearsAgo } },
      })
    ).count;
  } catch (err) {
    errors.push("auditLog");
    logger.error({ err }, "AuditLog retention cleanup failed");
  }

  const payload = { ...results, errors };
  if (errors.length > 0) {
    logger.warn(payload, "Data retention cleanup completed with partial failures");
    return NextResponse.json(payload, { status: 207 });
  }
  logger.info(payload, "Data retention cleanup completed");
  return NextResponse.json(payload);
});
