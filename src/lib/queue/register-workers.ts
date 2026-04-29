import { startBokunAvailabilityWorker } from "./workers/bokun-availability-worker";
import { startBokunBookingWorker } from "./workers/bokun-booking-worker";
import { startBokunPricingWorker } from "./workers/bokun-pricing-worker";
import { startBoataroundAvailabilityWorker } from "./workers/boataround-availability-worker";
import { startManualAlertWorker } from "./workers/manual-alert-worker";
import { startTransactionalEmailWorker } from "./workers/transactional-email-worker";
import { getRegisteredWorkers, getRedisConnection } from "./index";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const globalForWorkers = globalThis as unknown as {
  __workersRegistered__?: boolean;
  __shutdownHandlerRegistered__?: boolean;
  __shuttingDown__?: boolean;
};

// R28-CRIT-5: pattern drain sostituisce il singolo SHUTDOWN_TIMEOUT_MS=15s.
// Prima: `close()` senza timeout interno + hard-timeout 15s → su Bokun
// API slow 22s (15s + 1 retry 7s) il SIGKILL a 15s abbandonava job active
// mid-HTTP → BullMQ stalled recovery a 30s → re-enqueue → doppio POST
// upstream. Ora: pause (stop picking) → close graceful con timeout per-worker.
// BullMQ Worker.close() attende job active a completarsi (drain ufficiale).
// Il timeout per-worker previene hang infinito se un job upstream non risponde.
const DRAIN_TIMEOUT_MS = 25_000;
const HARD_TIMEOUT_MS = DRAIN_TIMEOUT_MS + 10_000; // 35s fallback esterno
// Richiede `stop_grace_period: 45s` in docker-compose.prod.yml (margin
// 10s per HTTP in-flight Next oltre il worker shutdown).

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
  startBokunBookingWorker();
  startBokunPricingWorker();
  startBoataroundAvailabilityWorker();
  startManualAlertWorker();
  startTransactionalEmailWorker();
  logger.info(
    "BullMQ workers registered (bokun availability, bokun booking, bokun pricing, boataround availability, manual alert, transactional email)",
  );

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
    if (globalForWorkers.__shuttingDown__) {
      logger.warn({ signal }, "Shutdown already in progress, ignoring repeat signal");
      return;
    }
    globalForWorkers.__shuttingDown__ = true;

    logger.info({ signal }, "Shutdown signal received — draining workers");

    const hardDeadline = setTimeout(() => {
      logger.error(
        { timeoutMs: HARD_TIMEOUT_MS },
        "Hard shutdown timeout exceeded — forcing exit",
      );
      process.exit(1);
    }, HARD_TIMEOUT_MS);
    hardDeadline.unref();

    const workers = getRegisteredWorkers();

    try {
      // Step 1: pause — stop picking new job. Active continuano a execution.
      // BullMQ Worker.pause(true) = doNotWaitActive=true, non attende il
      // drain, solo stoppa il polling Redis per nuovi job.
      await Promise.all(
        workers.map((w) =>
          w.pause(true).catch((err) =>
            logger.error({ err, worker: w.name }, "Worker pause failed"),
          ),
        ),
      );
      logger.info({ workerCount: workers.length }, "Workers paused");

      // Step 2: close graceful. BullMQ `close()` (default force=false) attende
      // i job active a completarsi prima di chiudere — e' il drain "ufficiale".
      // Non c'e' un timeout interno su close(); il HARD_TIMEOUT_MS esterno
      // + stop_grace_period 45s sono la safety-net. Al worst-case abbiamo
      // DRAIN_TIMEOUT_MS=25s copertura Bokun API slow 22s + margine 3s.
      const closePromises = workers.map((w) =>
        Promise.race([
          w.close().catch((err) =>
            logger.error({ err, worker: w.name }, "Worker close failed"),
          ),
          new Promise<void>((resolve) =>
            setTimeout(() => {
              logger.warn(
                { worker: w.name, timeoutMs: DRAIN_TIMEOUT_MS },
                "Worker drain timeout — stalled recovery via altra replica",
              );
              resolve();
            }, DRAIN_TIMEOUT_MS),
          ),
        ]),
      );
      await Promise.all(closePromises);

      // Step 4: connections DOPO tutti i worker per evitare race
      // "Redis disconnected" mentre worker e' in close() loop.
      await getRedisConnection()
        .quit()
        .catch((err) => logger.error({ err }, "Redis quit failed"));
      await db.$disconnect().catch((err) => logger.error({ err }, "DB disconnect failed"));

      logger.info("Shutdown completed cleanly");
      clearTimeout(hardDeadline);
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Shutdown failed");
      clearTimeout(hardDeadline);
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
