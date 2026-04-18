import { createWorker } from "@/lib/queue";
import { updateBokunAvailability } from "@/lib/bokun/availability";
import { isBokunConfigured } from "@/lib/bokun";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { CHANNELS } from "@/lib/channels";
import type { AvailabilityUpdateJobPayload } from "@/lib/queue/types";

interface AvailabilityJob {
  type: "availability.update";
  data: AvailabilityUpdateJobPayload;
}

/**
 * Worker BullMQ: consuma job "availability.update" con targetChannel=BOKUN.
 * Push su Bokun con `capacityMax` del servizio se AVAILABLE, 0 se BLOCKED.
 */
export function startBokunAvailabilityWorker() {
  return createWorker<AvailabilityJob>(
    "sync",
    async (job) => {
      if (job.name !== "availability.update") return;
      const { data } = job.data;
      if (!data || data.targetChannel !== CHANNELS.BOKUN) return;

      if (!isBokunConfigured()) {
        logger.warn(
          { boatId: data.boatId, date: data.date },
          "Bokun not configured, skipping availability sync",
        );
        return;
      }

      // Trova tutti i Service mappati a questo boatId con bokunProductId settato
      const services = await db.service.findMany({
        where: { boatId: data.boatId, bokunProductId: { not: null } },
      });

      for (const service of services) {
        const spots = data.status === "AVAILABLE" ? service.capacityMax : 0;
        await updateBokunAvailability({
          productId: service.bokunProductId!,
          date: data.date,
          availableSpots: spots,
        });
      }
    },
    3,
  );
}
