import { QUEUE_NAMES } from "@/lib/queue";
import { defineWorker } from "@/lib/queue/define-worker";
import { updateBoataroundAvailability } from "@/lib/boataround/availability";
import { isBoataroundConfigured } from "@/lib/boataround/client";
import { db } from "@/lib/db";
import { parseIsoDay } from "@/lib/dates";
import type { AvailabilityUpdateJobPayload } from "@/lib/queue/types";

interface AvailabilityJob {
  type: "availability.update";
  data: AvailabilityUpdateJobPayload;
}

/**
 * Worker BullMQ: consuma job `availability.update` con targetChannel=BOATAROUND.
 * Pusha lo stato AVAILABLE/BLOCKED su Boataround con limiter upstream 10/s.
 */
export function startBoataroundAvailabilityWorker() {
  return defineWorker<AvailabilityJob, AvailabilityUpdateJobPayload>({
    queue: QUEUE_NAMES.AVAIL_BOATAROUND,
    jobName: "availability.update",
    label: "boataround-availability",
    configCheck: isBoataroundConfigured,
    configCheckLogContext: (data) => ({ boatId: data.boatId, date: data.date }),
    workerOptions: { concurrency: 3, limiter: { max: 10, duration: 1000 } },
    handler: async (data) => {
      // Re-read DB prima di pushare upstream: coalescenza jobId BullMQ
      // garantisce l'ultimo job vinca per ID, ma job con date/boat diverse
      // o order stale possono portare status obsoleto nel payload. Leggiamo
      // lo stato DB corrente per essere sempre coerenti.
      const current = await db.boatAvailability.findUnique({
        where: {
          boatId_date: { boatId: data.boatId, date: parseIsoDay(data.date) },
        },
        select: { status: true },
      });
      const effectiveStatus = current?.status ?? data.status;

      await updateBoataroundAvailability({
        boatId: data.boatId,
        date: data.date,
        available: effectiveStatus === "AVAILABLE",
      });
    },
  });
}
