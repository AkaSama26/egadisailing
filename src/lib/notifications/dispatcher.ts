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
import {
  doubleBookingTemplate,
  type DoubleBookingPayload,
} from "./templates/double-booking";
import {
  paymentFailedTemplate,
  type PaymentFailedPayload,
} from "./templates/payment-failed";
import type { NotificationEvent } from "./events";

interface RenderedTemplate {
  subject: string;
  html: string;
  /** R22-A2-ALTA-1: plain text fallback. Migliora deliverability (SPAM
   *  score Gmail/Outlook), screen reader, client email legacy. */
  text?: string;
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
 * R21-A1-ALTA-1: helper centrale per scegliere canali notifica in base
 * alla config env. Se `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` sono
 * settati, include TELEGRAM + EMAIL (escalation rapida per admin). Se no,
 * solo EMAIL (fallback). Cosi' nuovi event types dispatcheranno di default
 * dove e' effettivamente consegnabile senza if-chain in ogni caller.
 */
export function defaultNotificationChannels(): Array<"EMAIL" | "TELEGRAM"> {
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    return ["EMAIL", "TELEGRAM"];
  }
  return ["EMAIL"];
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

  // R14-REG-C1: `sendEmail` e `sendTelegramMessage` ora ritornano boolean
  // (true = delivered upstream 2xx, false = skip silenzioso / fail). Prima
  // usavamo `.then(()=>true)` che settava true anche sul dev-skip branch,
  // rendendo `anyOk=true` sempre true con TELEGRAM_BOT_TOKEN unset (attuale
  // stato) → weather cron scriveva marker dedup senza alert consegnato.
  const emailP: Promise<boolean> = wantEmail
    ? sendEmail({
        to: env.ADMIN_EMAIL,
        subject: rendered.subject,
        htmlContent: rendered.html,
        textContent: rendered.text,
      }).catch((err: unknown) => {
        logger.error(
          { err: (err as Error).message, type: event.type },
          "Email notification failed",
        );
        return false;
      })
    : Promise.resolve(false);

  const telegramP: Promise<boolean> = wantTelegram
    ? sendTelegramMessage(rendered.telegram!).catch((err: unknown) => {
        logger.error(
          { err: (err as Error).message, type: event.type },
          "Telegram notification failed",
        );
        return false;
      })
    : Promise.resolve(false);

  const [emailOk, telegramOk] = await Promise.all([emailP, telegramP]);
  // R14-REG-C1: se nessun canale richiesto `anyOk=false` — il caller (es.
  // weather-check) NON deve marcare "dispatched" quando l'evento aveva
  // `channels: []`.
  return {
    emailOk,
    telegramOk,
    anyOk: emailOk || telegramOk,
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
    case "DOUBLE_BOOKING_DETECTED":
      return doubleBookingTemplate(event.payload as unknown as DoubleBookingPayload);
    case "PAYMENT_FAILED":
      return paymentFailedTemplate(event.payload as unknown as PaymentFailedPayload);
    // SYNC_FAILURE: template non ancora implementato, non-blocking
    default:
      return null;
  }
}
