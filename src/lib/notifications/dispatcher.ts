import { sendEmail } from "@/lib/email/brevo";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendTelegramMessage } from "./telegram";
import { newBookingTemplate, type NewBookingPayload } from "./templates/new-booking";
import {
  weatherAlertTemplate,
  type WeatherAlertPayload,
} from "./templates/weather-alert";
import {
  bookingCancelledTemplate,
  type BookingCancelledPayload,
} from "./templates/booking-cancelled";
import type { NotificationEvent } from "./events";

interface RenderedTemplate {
  subject: string;
  html: string;
  telegram?: string;
}

/**
 * Dispatcher centrale notifiche admin. Route il `NotificationEvent` al
 * template giusto + invia sui canali richiesti (EMAIL/TELEGRAM).
 *
 * Failure policy: ogni canale e' try/catch indipendente → un canale failed
 * non blocca l'altro. Email e' best-effort (Brevo down fallisce tutto il
 * task ma il caller logga).
 */
export async function dispatchNotification(event: NotificationEvent): Promise<void> {
  const rendered = renderTemplate(event);
  if (!rendered) {
    logger.warn({ type: event.type }, "No template for notification type, skipping");
    return;
  }

  const ops: Promise<unknown>[] = [];

  if (event.channels.includes("EMAIL")) {
    ops.push(
      sendEmail({
        to: env.ADMIN_EMAIL,
        subject: rendered.subject,
        htmlContent: rendered.html,
      }).catch((err) =>
        logger.error(
          { err: (err as Error).message, type: event.type },
          "Email notification failed",
        ),
      ),
    );
  }

  if (event.channels.includes("TELEGRAM") && rendered.telegram) {
    ops.push(
      sendTelegramMessage(rendered.telegram).catch((err) =>
        logger.error(
          { err: (err as Error).message, type: event.type },
          "Telegram notification failed",
        ),
      ),
    );
  }

  await Promise.all(ops);
}

function renderTemplate(event: NotificationEvent): RenderedTemplate | null {
  switch (event.type) {
    case "NEW_BOOKING_DIRECT":
    case "NEW_BOOKING_BOKUN":
    case "NEW_BOOKING_CHARTER":
      return newBookingTemplate(event.payload as unknown as NewBookingPayload);
    case "WEATHER_ALERT":
      return weatherAlertTemplate(event.payload as unknown as WeatherAlertPayload);
    case "BOOKING_CANCELLED":
      return bookingCancelledTemplate(event.payload as unknown as BookingCancelledPayload);
    // PAYMENT_FAILED + SYNC_FAILURE: template generici stub, non-blocking
    default:
      return null;
  }
}
