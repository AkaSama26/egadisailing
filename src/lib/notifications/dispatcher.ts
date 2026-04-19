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

export interface DispatchResult {
  emailOk: boolean;
  telegramOk: boolean;
  /** true se almeno un canale richiesto ha avuto successo. */
  anyOk: boolean;
  /** true se il template non esiste (no-op) — il caller puo' ignorare. */
  skipped: boolean;
}

/**
 * Dispatcher centrale notifiche admin. Route il `NotificationEvent` al
 * template giusto + invia sui canali richiesti (EMAIL/TELEGRAM).
 *
 * Failure policy: ogni canale e' try/catch indipendente → un canale failed
 * non blocca l'altro. Ritorna `DispatchResult` per permettere ai caller
 * (es. weather cron alert dedup) di distinguere "dispatched" da "failed"
 * invece di affidarsi al void (R13-C1).
 */
export async function dispatchNotification(event: NotificationEvent): Promise<DispatchResult> {
  const rendered = renderTemplate(event);
  if (!rendered) {
    logger.warn({ type: event.type }, "No template for notification type, skipping");
    return { emailOk: false, telegramOk: false, anyOk: false, skipped: true };
  }

  const wantEmail = event.channels.includes("EMAIL");
  const wantTelegram = event.channels.includes("TELEGRAM") && !!rendered.telegram;

  const emailP = wantEmail
    ? sendEmail({
        to: env.ADMIN_EMAIL,
        subject: rendered.subject,
        htmlContent: rendered.html,
      }).then(
        () => true,
        (err: unknown) => {
          logger.error(
            { err: (err as Error).message, type: event.type },
            "Email notification failed",
          );
          return false;
        },
      )
    : Promise.resolve(false);

  const telegramP = wantTelegram
    ? sendTelegramMessage(rendered.telegram!).then(
        () => true,
        (err: unknown) => {
          logger.error(
            { err: (err as Error).message, type: event.type },
            "Telegram notification failed",
          );
          return false;
        },
      )
    : Promise.resolve(false);

  const [emailOk, telegramOk] = await Promise.all([emailP, telegramP]);
  const anyRequested = wantEmail || wantTelegram;
  return {
    emailOk,
    telegramOk,
    anyOk: anyRequested ? emailOk || telegramOk : true,
    skipped: false,
  };
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
