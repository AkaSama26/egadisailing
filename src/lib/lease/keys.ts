/**
 * R20-A4: nomi lease Redis consolidati. Evita typo silent (es.
 * `"cron:weather_check"` vs `"cron:weather-check"` → due key diverse →
 * lease non effettivo) e centralizza lista per operations grep.
 *
 * Usato da: cron scheduler routes + weather/service.ts cache stampede lease.
 */
export const LEASE_KEYS = {
  WEATHER_CHECK: "cron:weather-check",
  BOKUN_RECONCILIATION: "cron:bokun-reconciliation",
  EMAIL_PARSER: "cron:email-parser",
  PENDING_GC: "cron:pending-gc",
  BALANCE_REMINDERS: "cron:balance-reminders",
  RETENTION: "cron:retention",
  WEATHER_FETCH_TRAPANI: "weather:fetch:trapani",
} as const;

export type LeaseKey = (typeof LEASE_KEYS)[keyof typeof LEASE_KEYS];
