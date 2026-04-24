import { scheduleCronFetch } from "@/lib/cron/schedule-fetch";
import { logger } from "@/lib/logger";

const globalForCron = globalThis as unknown as { __cronStarted__?: boolean };

export function startCronScheduler(): void {
  if (globalForCron.__cronStarted__) return;
  globalForCron.__cronStarted__ = true;

  // Balance reminders: ogni giorno alle 07:00 Europe/Rome
  scheduleCronFetch("0 7 * * *", "/api/cron/balance-reminders");

  // Data retention cleanup: ogni giorno alle 03:00 Europe/Rome (low-traffic).
  scheduleCronFetch("0 3 * * *", "/api/cron/retention");

  // Bokun reconciliation: ogni 5 minuti, fallback per webhook persi.
  scheduleCronFetch("*/5 * * * *", "/api/cron/bokun-reconciliation");

  // Charter email parser: ogni 5 minuti (sfasato di 2 min dal Bokun per
  // spalmare carico). Skippa silenzioso se IMAP non configurato.
  scheduleCronFetch("2-59/5 * * * *", "/api/cron/email-parser");

  // Weather check: ogni mattina 07:15 Europe/Rome (R12-M1: sfasato 15min
  // da balance-reminders per non saturare il worker in-process single-thread
  // e disperdere i picchi di carico Open-Meteo). Alert admin su booking
  // CONFIRMED nei prossimi 7gg con risk HIGH/EXTREME (Plan 6).
  scheduleCronFetch("15 7 * * *", "/api/cron/weather-check");

  // Stripe events reconciliation: ogni 15 min (sfasato di 7 min da Bokun).
  // Fallback per webhook persi: legge `/v1/events` degli ultimi 3gg e
  // replaya via `handleStripeEvent` (idempotent via ProcessedStripeEvent).
  scheduleCronFetch("7-59/15 * * * *", "/api/cron/stripe-reconciliation");

  // PENDING booking GC: ogni 15 min (sfasato di 3 min da Bokun/parser).
  // Cancella booking PENDING > 30min + PaymentIntent Stripe + release
  // availability per non zombificare slot dopo abbandono checkout.
  scheduleCronFetch("3-59/15 * * * *", "/api/cron/pending-gc");

  // Priority Override Fase 1 — 4 cron sfasati per non saturare worker Next.js.
  // overrideReminders min 0, overrideReconcile ogni 10min (granularita' sotto),
  // overrideDropdead min 15, refundRetry min 10+40.
  scheduleCronFetch("0 * * * *", "/api/cron/override-reminders");
  scheduleCronFetch("*/10 * * * *", "/api/cron/override-reconcile");
  scheduleCronFetch("15 * * * *", "/api/cron/override-dropdead");
  scheduleCronFetch("10,40 * * * *", "/api/cron/refund-retry");

  logger.info("Cron scheduler started");
}
