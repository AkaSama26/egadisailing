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

  logger.info("Cron scheduler started");
}
