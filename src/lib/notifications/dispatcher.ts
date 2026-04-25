import { sendEmail } from "@/lib/email/brevo";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { failed, ok, partial, type Outcome, type PartialError } from "@/lib/result";
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
import { overrideAdminRequestedTemplate } from "@/lib/email/templates/override-admin-requested";
import { overrideApprovedWinnerTemplate } from "@/lib/email/templates/override-approved-winner";
import { overrideRejectedWinnerTemplate } from "@/lib/email/templates/override-rejected-winner";
import { overrideExpiredTemplate } from "@/lib/email/templates/override-expired";
import { overrideSupersededTemplate } from "@/lib/email/templates/override-superseded";
import { overrideReconcileFailedAdminTemplate } from "@/lib/email/templates/override-reconcile-failed-admin";
import type { NotificationEvent, NotificationType } from "./events";

interface RenderedTemplate {
  subject: string;
  html: string;
  /** R22-A2-ALTA-1: plain text fallback. Migliora deliverability (SPAM
   *  score Gmail/Outlook), screen reader, client email legacy. */
  text?: string;
  telegram?: string;
}

/** Channel delivery outcome data. */
export interface DispatchData {
  emailDelivered: boolean;
  telegramDelivered: boolean;
}

/** Outcome typed result of dispatchNotification. Phase 7 migration. */
export type DispatchOutcome = Outcome<DispatchData>;

/**
 * Backward-compat shape used by callers prior to Phase 7. Kept for incremental
 * migration: callers gradually migrate to `DispatchOutcome` direct usage.
 */
export interface DispatchResult {
  emailOk: boolean;
  telegramOk: boolean;
  /** true se almeno un canale richiesto ha avuto successo. */
  anyOk: boolean;
  /** true se il template non esiste (no-op) — il caller puo' ignorare. */
  skipped: boolean;
}

/**
 * Convert `DispatchOutcome` to legacy `DispatchResult` shape. Lets existing
 * callers continue working while Outcome migration completes incrementally.
 */
export function toDispatchResult(outcome: DispatchOutcome): DispatchResult {
  if (outcome.status === "failed") {
    // Distinguish "no template (skipped)" from "all channels failed":
    // skipped iff dispatcher returned failed with kind:"other" id:"skipped".
    const isSkipped = outcome.errors.some((e) => e.id === "skipped");
    return {
      emailOk: false,
      telegramOk: false,
      anyOk: false,
      skipped: isSkipped,
    };
  }
  // ok or partial
  return {
    emailOk: outcome.data.emailDelivered,
    telegramOk: outcome.data.telegramDelivered,
    anyOk: outcome.data.emailDelivered || outcome.data.telegramDelivered,
    skipped: false,
  };
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
 * non blocca l'altro. Ritorna `DispatchOutcome` (Phase 7 Outcome<T>) per
 * permettere ai caller (es. weather cron alert dedup) di distinguere
 * "dispatched" da "failed" invece di affidarsi al void (R13-C1). Caller
 * legacy possono usare `toDispatchResult(outcome)` per shape pre-Phase-7.
 */
export async function dispatchNotification(event: NotificationEvent): Promise<DispatchOutcome> {
  const rendered = renderTemplate(event);
  if (!rendered) {
    logger.warn({ type: event.type }, "No template for notification type, skipping");
    // Phase 7: skip e' un "failed" con marker `skipped` per
    // discriminazione caller (toDispatchResult espone `skipped:true`).
    return failed([
      {
        id: "skipped",
        message: `No template for notification type ${event.type}`,
        kind: "other",
      },
    ]);
  }

  const wantEmail = event.channels.includes("EMAIL");
  const wantTelegram = event.channels.includes("TELEGRAM") && !!rendered.telegram;

  // R14-REG-C1: `sendEmail` e `sendTelegramMessage` ora ritornano boolean
  // (true = delivered upstream 2xx, false = skip silenzioso / fail). Prima
  // usavamo `.then(()=>true)` che settava true anche sul dev-skip branch,
  // rendendo `anyOk=true` sempre true con TELEGRAM_BOT_TOKEN unset (attuale
  // stato) → weather cron scriveva marker dedup senza alert consegnato.
  const errors: PartialError[] = [];

  const emailP: Promise<boolean> = wantEmail
    ? sendEmail({
        to: env.ADMIN_EMAIL,
        subject: rendered.subject,
        htmlContent: rendered.html,
        textContent: rendered.text,
      }).catch((err: unknown) => {
        const message = (err as Error).message;
        logger.error(
          { err: message, type: event.type },
          "Email notification failed",
        );
        errors.push({ id: "email", message, kind: "email" });
        return false;
      })
    : Promise.resolve(false);

  const telegramP: Promise<boolean> = wantTelegram
    ? sendTelegramMessage(rendered.telegram!).catch((err: unknown) => {
        const message = (err as Error).message;
        logger.error(
          { err: message, type: event.type },
          "Telegram notification failed",
        );
        errors.push({ id: "telegram", message, kind: "telegram" });
        return false;
      })
    : Promise.resolve(false);

  const [emailDelivered, telegramDelivered] = await Promise.all([emailP, telegramP]);

  // Track non-throwing-but-undelivered (e.g. sendEmail returned false from
  // a 4xx upstream caught upstream).
  if (wantEmail && !emailDelivered && !errors.some((e) => e.id === "email")) {
    errors.push({ id: "email", message: "email not delivered", kind: "email" });
  }
  if (wantTelegram && !telegramDelivered && !errors.some((e) => e.id === "telegram")) {
    errors.push({ id: "telegram", message: "telegram not delivered", kind: "telegram" });
  }

  const data: DispatchData = { emailDelivered, telegramDelivered };

  // No channels requested OR all failed → failed.
  if (!wantEmail && !wantTelegram) {
    return failed([
      { id: "dispatch", message: "no channels requested", kind: "other" },
    ]);
  }
  if (errors.length === 0) {
    return ok(data);
  }
  if (emailDelivered || telegramDelivered) {
    return partial(data, errors);
  }
  return failed(errors);
}

/**
 * Lookup map per i 7 eventi OVERRIDE_* template-backed. Ogni entry chiama
 * il template function corrispondente e normalizza a RenderedTemplate
 * (subject+html+text). Consolida 7 case switch identici in uno
 * `renderTemplate`.
 */
type OverrideTemplateFn = (payload: Record<string, unknown>) => {
  subject: string;
  html: string;
  text: string;
};

const OVERRIDE_TEMPLATE_MAP: Partial<Record<NotificationType, OverrideTemplateFn>> = {
  OVERRIDE_REQUESTED: (p) =>
    bookingPendingOverrideConfirmationTemplate(
      p as unknown as Parameters<typeof bookingPendingOverrideConfirmationTemplate>[0],
    ),
  OVERRIDE_ADMIN_REQUESTED: (p) =>
    overrideAdminRequestedTemplate(
      p as unknown as Parameters<typeof overrideAdminRequestedTemplate>[0],
    ),
  OVERRIDE_APPROVED: (p) =>
    overrideApprovedWinnerTemplate(
      p as unknown as Parameters<typeof overrideApprovedWinnerTemplate>[0],
    ),
  OVERRIDE_REJECTED: (p) =>
    overrideRejectedWinnerTemplate(
      p as unknown as Parameters<typeof overrideRejectedWinnerTemplate>[0],
    ),
  OVERRIDE_EXPIRED: (p) =>
    overrideExpiredTemplate(
      p as unknown as Parameters<typeof overrideExpiredTemplate>[0],
    ),
  OVERRIDE_SUPERSEDED: (p) =>
    overrideSupersededTemplate(
      p as unknown as Parameters<typeof overrideSupersededTemplate>[0],
    ),
  OVERRIDE_RECONCILE_FAILED: (p) =>
    overrideReconcileFailedAdminTemplate(
      p as unknown as Parameters<typeof overrideReconcileFailedAdminTemplate>[0],
    ),
};

function renderTemplate(event: NotificationEvent): RenderedTemplate | null {
  // Check OVERRIDE_* template-backed lookup first (consolidation).
  const overrideFn = OVERRIDE_TEMPLATE_MAP[event.type];
  if (overrideFn) {
    const tpl = overrideFn(event.payload as Record<string, unknown>);
    return { subject: tpl.subject, html: tpl.html, text: tpl.text };
  }

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
