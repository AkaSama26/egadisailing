/**
 * Next.js instrumentation hook — runs once at server startup.
 * Avvia lo scheduler cron interno + BullMQ workers solo in runtime Node.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [{ startCronScheduler }, { registerQueueWorkers }] = await Promise.all([
      import("@/lib/cron/scheduler"),
      import("@/lib/queue/register-workers"),
    ]);
    startCronScheduler();
    registerQueueWorkers();
  }
}
