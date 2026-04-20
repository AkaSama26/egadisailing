export type NotificationType =
  | "NEW_BOOKING_DIRECT"
  | "NEW_BOOKING_BOKUN"
  | "NEW_BOOKING_CHARTER"
  | "BOOKING_CANCELLED"
  | "PAYMENT_FAILED"
  | "SYNC_FAILURE"
  | "WEATHER_ALERT"
  | "DOUBLE_BOOKING_DETECTED";

export type NotificationChannel = "EMAIL" | "TELEGRAM";

export interface NotificationEvent<TPayload = Record<string, unknown>> {
  type: NotificationType;
  channels: NotificationChannel[];
  payload: TPayload;
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
  PAYMENT_FAILED: ["EMAIL"],
  SYNC_FAILURE: ["EMAIL", "TELEGRAM"],
  WEATHER_ALERT: ["EMAIL", "TELEGRAM"],
  // Double-booking e' evento urgente (cliente stopped/embarassment rischio) —
  // TELEGRAM attivo se configurato per escalation rapida.
  DOUBLE_BOOKING_DETECTED: ["EMAIL", "TELEGRAM"],
};
