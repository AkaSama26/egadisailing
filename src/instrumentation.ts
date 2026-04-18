/**
 * Next.js instrumentation hook — runs once at server startup.
 * Avvia lo scheduler cron interno + BullMQ workers solo in runtime Node.
 *
 * Errori di bootstrap vengono loggati fatal ma NON crashano il processo —
 * preferiamo "degraded mode" (il sito prende booking DIRECT) a crash loop
 * quando Redis/DB sono temporaneamente giu'.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const [{ startCronScheduler }, { registerQueueWorkers }, { logger }] = await Promise.all([
      import("@/lib/cron/scheduler"),
      import("@/lib/queue/register-workers"),
      import("@/lib/logger"),
    ]);
    try {
      startCronScheduler();
    } catch (err) {
      logger.fatal({ err }, "Cron scheduler failed to start — running in degraded mode");
    }
    try {
      registerQueueWorkers();
    } catch (err) {
      logger.fatal({ err }, "BullMQ workers failed to register — running in degraded mode");
    }
  } catch (err) {
    // Logger non importabile: fallback a console.error. NON throw.
    console.error("[instrumentation] bootstrap failed", err);
  }
}
