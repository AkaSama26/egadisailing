import { createWorker, registerWorker, QUEUE_NAMES } from "@/lib/queue";
import { updateBokunAvailability } from "@/lib/bokun/availability";
import { isBokunConfigured } from "@/lib/bokun";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { parseIsoDay } from "@/lib/dates";
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
  const worker = createWorker<AvailabilityJob>(
    QUEUE_NAMES.AVAIL_BOKUN,
    async (job) => {
      // R23-Q-CRITICA-1: queue dedicata — no early-return drop. Manteniamo
      // il check name come guard-rail (producer potrebbe evolvere, ma non
      // deve droppare silente: log+throw per visibilita').
      if (job.name !== "availability.update") {
        logger.warn(
          { jobName: job.name, queue: QUEUE_NAMES.AVAIL_BOKUN },
          "Unexpected job name on Bokun availability queue",
        );
        return;
      }
      const { data } = job.data;
      if (!data) return;

      if (!isBokunConfigured()) {
        logger.warn(
          { boatId: data.boatId, date: data.date },
          "Bokun not configured, skipping availability sync",
        );
        return;
      }

      // R23-Q-CRITICA-2: re-read DB prima di push upstream. jobId coalescence
      // agisce solo su job waiting/delayed — una volta active, un nuovo
      // enqueue con stesso jobId non sostituisce. Burst su stessa cella con
      // concurrency=3 → ordine non deterministico → data.status stale.
      // Leggiamo lo stato corrente DB per vincere sempre il "last write" DB.
      const current = await db.boatAvailability.findUnique({
        where: {
          boatId_date: { boatId: data.boatId, date: parseIsoDay(data.date) },
        },
        select: { status: true },
      });
      const effectiveStatus = current?.status ?? data.status;

      // Trova tutti i Service mappati a questo boatId con bokunProductId settato
      const services = await db.service.findMany({
        where: { boatId: data.boatId, bokunProductId: { not: null } },
      });

      for (const service of services) {
        const spots = effectiveStatus === "AVAILABLE" ? service.capacityMax : 0;
        await updateBokunAvailability({
          productId: service.bokunProductId!,
          date: data.date,
          availableSpots: spots,
        });
      }
    },
    // Limiter: max 10 POST/sec verso Bokun per evitare 429. Concurrency=3
    // mantiene il throughput su job di canali diversi quando verranno aggiunti.
    { concurrency: 3, limiter: { max: 10, duration: 1000 } },
  );
  registerWorker(worker);
  return worker;
}
