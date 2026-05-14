import cron from "node-cron";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const INTERNAL_CRON_ORIGIN =
  env.NODE_ENV === "production" ? "http://127.0.0.1:3000" : env.APP_URL;

/**
 * Registra un cron schedule che fa fetch verso un endpoint interno
 * (routing HTTP → handler). Fail-tolerant: errors loggati ma non crash.
 * Timezone fisso Europe/Rome.
 *
 * @param schedule cron expression (es. "0 * * * *" ogni ora minuto 0)
 * @param endpoint path relativo (es. "/api/cron/override-reminders")
 * @param label label human-readable per log (default = endpoint)
 */
export function scheduleCronFetch(
  schedule: string,
  endpoint: string,
  label?: string,
): void {
  const tag = label ?? endpoint.split("/").pop() ?? endpoint;
  cron.schedule(
    schedule,
    async () => {
      try {
        const res = await fetch(`${INTERNAL_CRON_ORIGIN}${endpoint}`, {
          headers: { authorization: `Bearer ${env.CRON_SECRET}` },
        });
        if (!res.ok) {
          logger.warn({ status: res.status, endpoint }, `${tag} cron non-2xx`);
        }
      } catch (err) {
        logger.error({ err, endpoint }, `${tag} cron fetch failed`);
      }
    },
    { timezone: "Europe/Rome" },
  );
}
