import { pricingBokunQueue } from "@/lib/queue";
import { db } from "@/lib/db";
import { isoDay } from "@/lib/dates";
import { quotePrice } from "./service";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { createQueueJobIdentity, queueExecutionJobId } from "@/lib/queue/job-identity";

/**
 * Accoda job `pricing.bokun.sync` per ogni (service, date) dato.
 *
 * Chiamato dall'admin dopo create/update/delete di PricingPeriod per
 * propagare il nuovo prezzo al catalogo Bokun con markup applicato dal worker.
 *
 * Disabilitato di default finche' il contratto pricing Bokun non e' stato
 * verificato con canary + read-back. Booking/availability restano separati.
 */
export async function scheduleBokunPricingSync(options: {
  dates: Date[];
  serviceIds?: string[];
}): Promise<void> {
  if (!env.BOKUN_PRICING_SYNC_ENABLED) {
    logger.info("Bokun pricing sync disabled; schedule skipped");
    return;
  }

  const services = options.serviceIds
    ? await db.service.findMany({
        where: { id: { in: options.serviceIds }, bokunProductId: { not: null } },
      })
    : await db.service.findMany({
        where: { active: true, bokunProductId: { not: null } },
      });

  if (services.length === 0) {
    logger.debug("No services mapped to Bokun, skipping pricing sync schedule");
    return;
  }

  // R23-Q-CRITICA-1: queue dedicata per pricing. Shared "sync" queue faceva
  // round-robin drop.
  const queue = pricingBokunQueue();
  for (const service of services) {
    for (const date of options.dates) {
      const day = isoDay(date);
      try {
        const quote = await quotePrice(service.id, date, 1);
        const identity = createQueueJobIdentity(`pricing:bokun:${service.id}:${day}`);
        await queue.add(
          "pricing.bokun.sync",
          {
            type: "pricing.bokun.sync",
            ...identity,
            data: {
              serviceId: service.id,
              date: day,
              amount: quote.finalUnitPrice.toString(),
            },
          },
          { jobId: queueExecutionJobId(identity) },
        );
      } catch (err) {
        logger.error(
          { err, serviceId: service.id, date: day },
          "Failed to enqueue Bokun pricing sync",
        );
      }
    }
  }
}
