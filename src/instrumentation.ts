/**
 * Next.js instrumentation hook — runs once at server startup.
 * Avvia lo scheduler cron interno solo in runtime Node (non edge/web).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCronScheduler } = await import("@/lib/cron/scheduler");
    startCronScheduler();
  }
}
