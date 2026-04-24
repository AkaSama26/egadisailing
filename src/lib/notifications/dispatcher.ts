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
import {
  syncFailureTemplate,
  type SyncFailurePayload,
} from "./templates/sync-failure";
import { bookingPendingOverrideConfirmationTemplate } from "@/lib/email/templates/booking-pending-override-confirmation";
import { overrideApprovedWinnerTemplate } from "@/lib/email/templates/override-approved-winner";
import { overrideRejectedWinnerTemplate } from "@/lib/email/templates/override-rejected-winner";
import { overrideExpiredTemplate } from "@/lib/email/templates/override-expired";
import { overrideSupersededTemplate } from "@/lib/email/templates/override-superseded";
import { overrideReconcileFailedAdminTemplate } from "@/lib/email/templates/override-reconcile-failed-admin";
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
    case "SYNC_FAILURE":
      return syncFailureTemplate(event.payload as unknown as SyncFailurePayload);
    case "OVERRIDE_REQUESTED": {
      const tpl = bookingPendingOverrideConfirmationTemplate(
        event.payload as unknown as Parameters<typeof bookingPendingOverrideConfirmationTemplate>[0],
      );
      return { subject: tpl.subject, html: tpl.html, text: tpl.text };
    }
    case "OVERRIDE_APPROVED": {
      const tpl = overrideApprovedWinnerTemplate(
        event.payload as unknown as Parameters<typeof overrideApprovedWinnerTemplate>[0],
      );
      return { subject: tpl.subject, html: tpl.html, text: tpl.text };
    }
    case "OVERRIDE_REJECTED": {
      const tpl = overrideRejectedWinnerTemplate(
        event.payload as unknown as Parameters<typeof overrideRejectedWinnerTemplate>[0],
      );
      return { subject: tpl.subject, html: tpl.html, text: tpl.text };
    }
    case "OVERRIDE_EXPIRED": {
      const tpl = overrideExpiredTemplate(
        event.payload as unknown as Parameters<typeof overrideExpiredTemplate>[0],
      );
      return { subject: tpl.subject, html: tpl.html, text: tpl.text };
    }
    case "OVERRIDE_SUPERSEDED": {
      const tpl = overrideSupersededTemplate(
        event.payload as unknown as Parameters<typeof overrideSupersededTemplate>[0],
      );
      return { subject: tpl.subject, html: tpl.html, text: tpl.text };
    }
    case "OVERRIDE_RECONCILE_FAILED": {
      const tpl = overrideReconcileFailedAdminTemplate(
        event.payload as unknown as Parameters<typeof overrideReconcileFailedAdminTemplate>[0],
      );
      return { subject: tpl.subject, html: tpl.html, text: tpl.text };
    }
    case "OVERRIDE_REMINDER": {
      // No dedicated template — inline subject + summary for admin escalation.
      const payload = event.payload as { confirmationCode?: string; level?: number };
      const subject = `Reminder override PENDING ${payload.confirmationCode ?? "?"}`;
      return {
        subject,
        html: `<p>Override request pending level ${payload.level ?? 1}. Decisione richiesta.</p>`,
        text: `Override reminder level ${payload.level ?? 1}: ${payload.confirmationCode ?? "?"}`,
      };
    }
    case "CROSS_CHANNEL_CONFLICT": {
      const payload = event.payload as { boatId?: string; date?: string };
      return {
        subject: `ManualAlert: cross-channel conflict`,
        html: `<p>Cross-channel conflict detected on boat <strong>${payload.boatId ?? "?"}</strong> date ${payload.date ?? "?"}.</p>`,
        text: `Cross-channel conflict ${payload.boatId ?? "?"} ${payload.date ?? "?"}`,
      };
    }
    default:
      return null;
  }
}
