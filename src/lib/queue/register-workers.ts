import { startBokunAvailabilityWorker } from "./workers/bokun-availability-worker";
import { startBokunPricingWorker } from "./workers/bokun-pricing-worker";
import { logger } from "@/lib/logger";

const globalForWorkers = globalThis as unknown as { __workersRegistered__?: boolean };

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
}
