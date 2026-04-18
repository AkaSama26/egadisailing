import { startBokunAvailabilityWorker } from "./workers/bokun-availability-worker";
import { startBokunPricingWorker } from "./workers/bokun-pricing-worker";
import { getRegisteredWorkers, getRedisConnection } from "./index";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const globalForWorkers = globalThis as unknown as {
  __workersRegistered__?: boolean;
  __shutdownHandlerRegistered__?: boolean;
};

const SHUTDOWN_TIMEOUT_MS = 15_000;

/**
 * Registra tutti i worker BullMQ. Idempotente via globalThis flag
 * (HMR-safe in dev).
 *
 * Chiamato da src/instrumentation.ts al boot del server.
 */
export function registerQueueWorkers(): void {
  if (globalForWorkers.__workersRegistered__) return;
  globalForWorkers.__workersRegistered__ = true;

  startBokunAvailabilityWorker();
  startBokunPricingWorker();
  logger.info("BullMQ workers registered (bokun availability, bokun pricing)");

  registerShutdownHandler();
}

/**
 * Registra handler SIGTERM/SIGINT per chiudere puliti worker, Redis e DB.
 * Senza questo, `docker stop` taglia il processo mentre job sono active →
 * restano in `stalled` per ~30s e possono essere ri-eseguiti (duplicazione
 * side-effect tipo POST Bokun).
 *
 * Il timeout hard garantisce che il container non si blocchi all'infinito
 * se un close() si impappina.
 */
function registerShutdownHandler(): void {
  if (globalForWorkers.__shutdownHandlerRegistered__) return;
  globalForWorkers.__shutdownHandlerRegistered__ = true;

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received, closing workers");
    const deadline = setTimeout(() => {
      logger.error("Shutdown timeout exceeded, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    deadline.unref();

    try {
      await Promise.all(
        getRegisteredWorkers().map((w) =>
          w.close().catch((err) => logger.error({ err }, "Worker close failed")),
        ),
      );
      await getRedisConnection()
        .quit()
        .catch((err) => logger.error({ err }, "Redis quit failed"));
      await db.$disconnect().catch((err) => logger.error({ err }, "DB disconnect failed"));
      logger.info("Shutdown completed cleanly");
      clearTimeout(deadline);
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Shutdown failed");
      clearTimeout(deadline);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}
