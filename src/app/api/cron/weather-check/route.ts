import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { addDays, toUtcDay } from "@/lib/dates";
import { getWeatherForDate } from "@/lib/weather/service";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";
import { getClientIp } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";

export const runtime = "nodejs";

const LEASE_NAME = "cron:weather-check";
const LEASE_TTL_SECONDS = 5 * 60;
const ALERT_RESEND_THROTTLE_MS = 24 * 60 * 60 * 1000; // 24h tra re-alert per stesso risk

/**
 * Cron giornaliero (schedulato 07:15 Europe/Rome): scan delle prossime 7
 * giornate con prenotazioni CONFIRMED, dispatch alert admin (email + telegram)
 * se risk >= HIGH.
 *
 * Hardening Round 12:
 * - R12-C1: `toUtcDay(now)` per includere booking del giorno corrente
 *   (era `new Date()` che escludeva perche' `startDate` e' UTC midnight).
 * - R12-C4: rate-limit pre-Bearer (protezione se CRON_SECRET leak → ban Open-Meteo).
 * - R12-A1 alert fatigue: `weatherLastAlertedRisk` + `weatherLastAlertedAt`
 *   evitano email ripetute per lo stesso risk nelle stesse 24h.
 *
 * Multi-replica safety: Redis lease single-flight (R12-C1 audit abuse).
 */
export const GET = withErrorHandler(async (req: Request) => {
  await enforceRateLimit({
    identifier: getClientIp(req.headers),
    scope: RATE_LIMIT_SCOPES.WEATHER_CRON_IP,
    limit: 10,
    windowSeconds: 60,
  });
  requireBearerSecret(req, env.CRON_SECRET);

  const leased = await tryAcquireLease(LEASE_NAME, LEASE_TTL_SECONDS);
  if (!leased) {
    logger.warn("Weather check skipped: another run in progress");
    return NextResponse.json({ skipped: "concurrent_run" });
  }

  try {
    const today = toUtcDay(new Date());
    const weekEnd = addDays(today, 7);

    const bookings = await db.booking.findMany({
      where: {
        status: "CONFIRMED",
        startDate: { gte: today, lte: weekEnd },
      },
      include: {
        service: { select: { name: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
    });

    let alertCount = 0;
    let skippedRecent = 0;
    const errors: Array<{ bookingId: string; error: string }> = [];
    const now = new Date();

    for (const b of bookings) {
      try {
        const w = await getWeatherForDate(b.startDate);
        if (!w) continue;
        if (w.risk !== "HIGH" && w.risk !== "EXTREME") continue;

        // R12-A1: dedup su stesso risk inviato nelle ultime 24h. Se il risk
        // cambia (HIGH → EXTREME), dispatch subito senza attendere throttle.
        if (
          b.weatherLastAlertedRisk === w.risk &&
          b.weatherLastAlertedAt &&
          now.getTime() - b.weatherLastAlertedAt.getTime() < ALERT_RESEND_THROTTLE_MS
        ) {
          skippedRecent++;
          continue;
        }

        await dispatchNotification({
          type: "WEATHER_ALERT",
          channels: ["EMAIL", "TELEGRAM"],
          payload: {
            confirmationCode: b.confirmationCode,
            customerName: `${b.customer.firstName} ${b.customer.lastName}`.trim(),
            serviceName: b.service.name,
            startDate: b.startDate.toISOString().slice(0, 10),
            risk: w.risk,
            reasons: w.reasons,
          },
        });

        await db.booking.update({
          where: { id: b.id },
          data: {
            weatherLastAlertedRisk: w.risk,
            weatherLastAlertedAt: now,
          },
        });
        alertCount++;
      } catch (err) {
        errors.push({ bookingId: b.id, error: (err as Error).message });
        logger.error({ err, bookingId: b.id }, "Weather check for booking failed");
      }
    }

    logger.info(
      { checked: bookings.length, alertCount, skippedRecent, errors: errors.length },
      "Weather check cron completed",
    );
    return NextResponse.json({
      checked: bookings.length,
      alertCount,
      skippedRecent,
      errors,
    });
  } finally {
    await releaseLease(LEASE_NAME).catch((err) =>
      logger.warn({ err }, "Failed to release weather-check lease (TTL will recover)"),
    );
  }
});
