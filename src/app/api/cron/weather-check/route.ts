import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { addDays } from "@/lib/dates";
import { getWeatherForDate } from "@/lib/weather/service";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";

export const runtime = "nodejs";

/**
 * Cron giornaliero 07:00 Europe/Rome: scan delle prossime 7 giornate con
 * prenotazioni CONFIRMED, dispatch alert admin (email + telegram) se
 * risk >= HIGH.
 *
 * Auth: Bearer CRON_SECRET timing-safe.
 */
export const GET = withErrorHandler(async (req: Request) => {
  requireBearerSecret(req, env.CRON_SECRET);

  const now = new Date();
  const weekEnd = addDays(now, 7);

  const bookings = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      startDate: { gte: now, lte: weekEnd },
    },
    include: {
      service: { select: { name: true } },
      customer: { select: { firstName: true, lastName: true } },
    },
  });

  let alertCount = 0;
  const errors: Array<{ bookingId: string; error: string }> = [];

  for (const b of bookings) {
    try {
      const w = await getWeatherForDate(b.startDate);
      if (!w) continue;
      if (w.risk !== "HIGH" && w.risk !== "EXTREME") continue;

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
      alertCount++;
    } catch (err) {
      errors.push({ bookingId: b.id, error: (err as Error).message });
      logger.error({ err, bookingId: b.id }, "Weather check for booking failed");
    }
  }

  logger.info({ checked: bookings.length, alertCount, errors: errors.length }, "Weather check cron completed");
  return NextResponse.json({
    checked: bookings.length,
    alertCount,
    errors,
  });
});
