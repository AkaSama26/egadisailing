/**
 * Next.js instrumentation hook — runs once at server startup.
 * Avvia lo scheduler cron interno + BullMQ workers solo in runtime Node.
 *
 * Errori di bootstrap vengono loggati fatal ma NON crashano il processo —
 * preferiamo "degraded mode" (il sito prende booking DIRECT) a crash loop
 * quando Redis/DB sono temporaneamente giu'.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Sentry init FIRST — cattura errori boot degli altri componenti.
    try {
      const { initSentry } = await import("@/lib/sentry/init");
      initSentry("server");
    } catch (err) {
      console.error("[instrumentation] Sentry init failed", err);
    }

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
    return;
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    try {
      const { initSentry } = await import("@/lib/sentry/init");
      initSentry("edge");
    } catch (err) {
      console.error("[instrumentation] Sentry edge init failed", err);
    }
  }
}

/**
 * Next.js 16 hook: catture automatiche errori Server Component + route.
 * Delega a Sentry.captureException.
 */
export async function onRequestError(
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
  },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError(err, request, context);
  } catch {
    // Sentry non installato — fallback silenzioso.
  }
}
