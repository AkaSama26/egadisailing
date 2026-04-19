/**
 * Unica source of truth per i canali di prenotazione.
 *
 * Deve restare allineato con l'enum Prisma `BookingSource`. Se aggiungi un
 * canale qui, aggiornalo anche nello schema e nel seed (`ChannelSyncStatus`).
 */

export const CHANNELS = {
  DIRECT: "DIRECT",
  BOKUN: "BOKUN",
  BOATAROUND: "BOATAROUND",
  SAMBOAT: "SAMBOAT",
  CLICKANDBOAT: "CLICKANDBOAT",
  NAUTAL: "NAUTAL",
} as const;

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS];

export const ALL_CHANNELS: Channel[] = Object.values(CHANNELS);

/**
 * Canali verso cui facciamo fan-out quando la disponibilità cambia.
 * DIRECT è escluso perché è il canale interno.
 */
export const FAN_OUT_CHANNELS: Channel[] = ALL_CHANNELS.filter((c) => c !== CHANNELS.DIRECT);

/**
 * Strategia di sync per canale.
 * - API: chiamata REST bidirezionale (Bokun, Boataround)
 * - ICAL: export iCal che il portale legge periodicamente (SamBoat, Airbnb Homes)
 * - EMAIL: ingestion via email parsing + alert manuale per export (Click&Boat, Nautal)
 * - INTERNAL: sito proprietario
 */
export const SYNC_MODE = {
  API: "API",
  ICAL: "ICAL",
  EMAIL: "EMAIL",
  INTERNAL: "INTERNAL",
} as const;

export type SyncMode = (typeof SYNC_MODE)[keyof typeof SYNC_MODE];

export const CHANNEL_SYNC_MODE: Record<Channel, SyncMode> = {
  [CHANNELS.DIRECT]: SYNC_MODE.INTERNAL,
  [CHANNELS.BOKUN]: SYNC_MODE.API,
  [CHANNELS.BOATAROUND]: SYNC_MODE.API,
  [CHANNELS.SAMBOAT]: SYNC_MODE.ICAL,
  [CHANNELS.CLICKANDBOAT]: SYNC_MODE.EMAIL,
  [CHANNELS.NAUTAL]: SYNC_MODE.EMAIL,
};

export function isChannel(value: string): value is Channel {
  return ALL_CHANNELS.includes(value as Channel);
}

/**
 * Scope per rate limiting — tutti i valori usabili nello schema devono passare da qui.
 */
export const RATE_LIMIT_SCOPES = {
  OTP_REQUEST_EMAIL_HOUR: "OTP_REQUEST_EMAIL_HOUR",
  OTP_REQUEST_EMAIL_DAY: "OTP_REQUEST_EMAIL_DAY",
  OTP_REQUEST_IP_HOUR: "OTP_REQUEST_IP_HOUR",
  OTP_REQUEST_IP_DAY: "OTP_REQUEST_IP_DAY",
  OTP_REQUEST_EMAILIP_HOUR: "OTP_REQUEST_EMAILIP_HOUR",
  OTP_REQUEST_BURST: "OTP_REQUEST_BURST",
  OTP_VERIFY_EMAIL_HOUR: "OTP_VERIFY_EMAIL_HOUR",
  OTP_VERIFY_IP_HOUR: "OTP_VERIFY_IP_HOUR",
  OTP_BLOCK_EMAIL: "OTP_BLOCK_EMAIL",
  OTP_BLOCK_IP: "OTP_BLOCK_IP",
  BOKUN_WEBHOOK_IP: "BOKUN_WEBHOOK_IP",
  BOKUN_CRON_IP: "BOKUN_CRON_IP",
  BOATAROUND_WEBHOOK_IP: "BOATAROUND_WEBHOOK_IP",
  ICAL_EXPORT_IP: "ICAL_EXPORT_IP",
  EMAIL_CRON_IP: "EMAIL_CRON_IP",
  CONTACT_FORM_IP: "CONTACT_FORM_IP",
  CONTACT_FORM_EMAIL: "CONTACT_FORM_EMAIL",
  WEATHER_CRON_IP: "WEATHER_CRON_IP",
  PENDING_GC_CRON_IP: "PENDING_GC_CRON_IP",
  BALANCE_REMINDERS_CRON_IP: "BALANCE_REMINDERS_CRON_IP",
  RETENTION_CRON_IP: "RETENTION_CRON_IP",
  ADMIN_LOGIN_IP: "ADMIN_LOGIN_IP",
  ADMIN_LOGIN_EMAIL: "ADMIN_LOGIN_EMAIL",
} as const;

export type RateLimitScope = (typeof RATE_LIMIT_SCOPES)[keyof typeof RATE_LIMIT_SCOPES];
