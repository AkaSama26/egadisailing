import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { addDays, parseDateLikelyLocalDay } from "@/lib/dates";
import { getWeatherForDate } from "@/lib/weather/service";
import { dispatchNotification, defaultNotificationChannels } from "@/lib/notifications/dispatcher";
import { withCronGuard } from "@/lib/http/with-cron-guard";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { LEASE_KEYS } from "@/lib/lease/keys";

export const runtime = "nodejs";

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
 * Multi-replica safety: Redis lease single-flight (via withCronGuard).
 */
export const GET = withCronGuard(
  {
    scope: RATE_LIMIT_SCOPES.WEATHER_CRON_IP,
    leaseKey: LEASE_KEYS.WEATHER_CHECK,
    leaseTtlSeconds: 5 * 60,
  },
  async (_req, _ctx) => {
    // R22-A4-CRITICA-1: `toUtcDay(new Date())` usava day UTC → ai margini
    // (cron manuale ore 00:30 Rome CEST = 22:30 UTC ieri) il cron saltava
    // booking di oggi Italia. `Booking.startDate` e' salvato via
    // `parseDateLikelyLocalDay` (UTC midnight del day Europe/Rome) quindi
    // il lower bound deve usare lo stesso format per evitare drift.
    // In orario nominale (07:15 Rome) i due coincidono; fix difensivo per
    // cron manuale / DST boundary / replica multi-timezone.
    const today = parseDateLikelyLocalDay(new Date());
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

        const dispatchResult = await dispatchNotification({
          type: "WEATHER_ALERT",
          channels: defaultNotificationChannels(),
          payload: {
            confirmationCode: b.confirmationCode,
            customerName: `${b.customer.firstName} ${b.customer.lastName}`.trim(),
            serviceName: b.service.name,
            startDate: b.startDate.toISOString().slice(0, 10),
            risk: w.risk,
            reasons: w.reasons,
          },
        });

        // R13-C1: marker dedup SOLO se almeno un canale ha consegnato.
        // Se tutti i canali falliscono (Brevo 5xx + Telegram down), domani
        // il cron dovra' re-alertare invece di bloccarsi 24h credendo
        // di aver notificato.
        if (dispatchResult.anyOk) {
          await db.booking.update({
            where: { id: b.id },
            data: {
              weatherLastAlertedRisk: w.risk,
              weatherLastAlertedAt: now,
            },
          });
          alertCount++;
        } else {
          errors.push({ bookingId: b.id, error: "all notification channels failed" });
          logger.warn(
            { bookingId: b.id, risk: w.risk },
            "Weather alert dispatch failed on all channels, marker not updated",
          );
        }
      } catch (err) {
        errors.push({ bookingId: b.id, error: (err as Error).message });
        logger.error({ err, bookingId: b.id }, "Weather check for booking failed");
      }
    }

    logger.info(
      { checked: bookings.length, alertCount, skippedRecent, errors: errors.length },
      "Weather check cron completed",
    );
    return {
      checked: bookings.length,
      alertCount,
      skippedRecent,
      errors,
    };
  },
);
