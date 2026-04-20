import { pricingBokunQueue } from "@/lib/queue";
import { db } from "@/lib/db";
import { isoDay } from "@/lib/dates";
import { quotePrice } from "./service";
import { logger } from "@/lib/logger";

/**
 * Accoda job `pricing.bokun.sync` per ogni (service, date) dato.
 *
 * Chiamato dall'admin dopo create/update di HotDayRule o HotDayOverride
 * per propagare il nuovo prezzo al catalogo Bokun con markup applicato
 * dal worker.
 *
 * jobId deterministico `bokun-pricing-{serviceId}-{date}` per coalescenza
 * BullMQ: update ripetuti sulla stessa cella collassano sull'ultimo.
 */
export async function scheduleBokunPricingSync(options: {
  dates: Date[];
  serviceIds?: string[];
}): Promise<void> {
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
        await queue.add(
          "pricing.bokun.sync",
          {
            type: "pricing.bokun.sync",
            data: {
              serviceId: service.id,
              date: day,
              amount: quote.finalPricePerPerson.toString(),
            },
          },
          { jobId: `bokun-pricing-${service.id}-${day}` },
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
