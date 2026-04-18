import cron from "node-cron";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const globalForCron = globalThis as unknown as { __cronStarted__?: boolean };

export function startCronScheduler(): void {
  if (globalForCron.__cronStarted__) return;
  globalForCron.__cronStarted__ = true;

  // Balance reminders: ogni giorno alle 07:00 Europe/Rome
  cron.schedule(
    "0 7 * * *",
    async () => {
      logger.info("Running balance-reminders cron");
      try {
        const url = `${env.APP_URL}/api/cron/balance-reminders`;
        const res = await fetch(url, {
          headers: { authorization: `Bearer ${env.CRON_SECRET}` },
        });
        logger.info({ status: res.status }, "balance-reminders cron response");
      } catch (err) {
        logger.error({ err }, "balance-reminders cron fetch failed");
      }
    },
    { timezone: "Europe/Rome" },
  );

  // Data retention cleanup: ogni giorno alle 03:00 Europe/Rome (low-traffic).
  cron.schedule(
    "0 3 * * *",
    async () => {
      logger.info("Running retention cleanup cron");
      try {
        const url = `${env.APP_URL}/api/cron/retention`;
        const res = await fetch(url, {
          headers: { authorization: `Bearer ${env.CRON_SECRET}` },
        });
        logger.info({ status: res.status }, "retention cron response");
      } catch (err) {
        logger.error({ err }, "retention cron fetch failed");
      }
    },
    { timezone: "Europe/Rome" },
  );

  // Bokun reconciliation: ogni 5 minuti, fallback per webhook persi.
  cron.schedule("*/5 * * * *", async () => {
    try {
      const url = `${env.APP_URL}/api/cron/bokun-reconciliation`;
      const res = await fetch(url, {
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      });
      if (!res.ok) {
        logger.warn({ status: res.status }, "bokun-reconciliation cron non-2xx");
      }
    } catch (err) {
      logger.error({ err }, "bokun-reconciliation cron fetch failed");
    }
  });

  // Charter email parser: ogni 5 minuti (sfasato di 2 min dal Bokun per
  // spalmare carico). Skippa silenzioso se IMAP non configurato.
  cron.schedule("2-59/5 * * * *", async () => {
    try {
      const url = `${env.APP_URL}/api/cron/email-parser`;
      const res = await fetch(url, {
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      });
      if (!res.ok) {
        logger.warn({ status: res.status }, "email-parser cron non-2xx");
      }
    } catch (err) {
      logger.error({ err }, "email-parser cron fetch failed");
    }
  });

  logger.info("Cron scheduler started");
}
