export type NotificationType =
  | "NEW_BOOKING_DIRECT"
  | "NEW_BOOKING_BOKUN"
  | "NEW_BOOKING_CHARTER"
  | "BOOKING_CANCELLED"
  | "PAYMENT_FAILED"
  | "SYNC_FAILURE"
  | "WEATHER_ALERT"
  | "DOUBLE_BOOKING_DETECTED"
  // Fase 1 Trimarano — priority override system
  | "OVERRIDE_REQUESTED"
  | "OVERRIDE_ADMIN_REQUESTED"
  | "OVERRIDE_REMINDER"
  | "OVERRIDE_APPROVED"
  | "OVERRIDE_REJECTED"
  | "OVERRIDE_EXPIRED"
  | "OVERRIDE_SUPERSEDED"
  | "OVERRIDE_RECONCILE_FAILED"
  | "OVERRIDE_APOLOGY_LOSER"
  | "CROSS_CHANNEL_CONFLICT";

export type NotificationChannel = "EMAIL" | "TELEGRAM";

export interface NotificationEvent<TPayload = Record<string, unknown>> {
  type: NotificationType;
  channels: NotificationChannel[];
  payload: TPayload;
  /**
   * Override del recipient email (per eventi customer-facing).
   * Se omesso, dispatcher usa env.ADMIN_EMAIL (default admin-centric).
   */
  recipientEmail?: string;
}

/**
 * Default routing per tipo di evento. Il caller puo' override passando
 * `channels` diverso (es. ridurre a solo EMAIL se Telegram non configurato).
 */
export const CHANNEL_DEFAULTS: Record<NotificationType, NotificationChannel[]> = {
  NEW_BOOKING_DIRECT: ["EMAIL"],
  NEW_BOOKING_BOKUN: ["EMAIL"],
  NEW_BOOKING_CHARTER: ["EMAIL"],
  BOOKING_CANCELLED: ["EMAIL"],
  // R27-CRIT-4: chargeback/dispute Stripe sono business-critical (revenue
  // loss €500-2000/caso + deadline 7gg per evidence). Escalation TELEGRAM
  // se configurato.
  PAYMENT_FAILED: ["EMAIL", "TELEGRAM"],
  SYNC_FAILURE: ["EMAIL", "TELEGRAM"],
  WEATHER_ALERT: ["EMAIL", "TELEGRAM"],
  // Double-booking e' evento urgente (cliente stopped/embarassment rischio) —
  // TELEGRAM attivo se configurato per escalation rapida.
  DOUBLE_BOOKING_DETECTED: ["EMAIL", "TELEGRAM"],
  // Fase 1 Trimarano — priority override system.
  // Customer-facing (EMAIL only — no telegram broadcast):
  OVERRIDE_REQUESTED: ["EMAIL"],
  OVERRIDE_APPROVED: ["EMAIL"],
  OVERRIDE_REJECTED: ["EMAIL"],
  OVERRIDE_EXPIRED: ["EMAIL"],
  OVERRIDE_SUPERSEDED: ["EMAIL"],
  // Customer "loser" che perde lo slot in approveOverride → riceve
  // overbookingApology con voucher + rebooking suggestions (R29-#2).
  OVERRIDE_APOLOGY_LOSER: ["EMAIL"],
  // Admin-facing (EMAIL + TELEGRAM escalation):
  OVERRIDE_ADMIN_REQUESTED: ["EMAIL", "TELEGRAM"],
  OVERRIDE_REMINDER: ["EMAIL"],
  OVERRIDE_RECONCILE_FAILED: ["EMAIL", "TELEGRAM"],
  CROSS_CHANNEL_CONFLICT: ["EMAIL", "TELEGRAM"],
};
