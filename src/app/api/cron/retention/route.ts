import { NextResponse } from "next/server";
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
 * - WeatherForecastCache               → delete dopo 14 giorni
 * - AuditLog                           → delete dopo 24 mesi (bilanciato con antifraud/compliance)
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
    weatherCacheDeleted: 0,
    auditLogDeleted: 0,
  };

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
    logger.error({ err }, "OTP retention cleanup failed");
  }

  try {
    results.sessionDeleted = (
      await db.bookingRecoverySession.deleteMany({
        where: { expiresAt: { lt: ninetyDaysAgo } },
      })
    ).count;
  } catch (err) {
    logger.error({ err }, "Session retention cleanup failed");
  }

  try {
    results.rateLimitDeleted = (
      await db.rateLimitEntry.deleteMany({
        where: { windowEnd: { lt: sevenDaysAgo } },
      })
    ).count;
  } catch (err) {
    logger.error({ err }, "RateLimit retention cleanup failed");
  }

  try {
    results.stripeEventDeleted = (
      await db.processedStripeEvent.deleteMany({
        where: { processedAt: { lt: sixtyDaysAgo } },
      })
    ).count;
  } catch (err) {
    logger.error({ err }, "StripeEvent retention cleanup failed");
  }

  try {
    results.weatherCacheDeleted = (
      await db.weatherForecastCache.deleteMany({
        where: { fetchedAt: { lt: fourteenDaysAgo } },
      })
    ).count;
  } catch (err) {
    logger.error({ err }, "Weather cache retention cleanup failed");
  }

  try {
    results.auditLogDeleted = (
      await db.auditLog.deleteMany({
        where: { timestamp: { lt: twoYearsAgo } },
      })
    ).count;
  } catch (err) {
    logger.error({ err }, "AuditLog retention cleanup failed");
  }

  logger.info(results, "Data retention cleanup completed");
  return NextResponse.json(results);
});
