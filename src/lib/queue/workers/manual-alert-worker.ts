import { QUEUE_NAMES } from "@/lib/queue";
import { defineWorker } from "@/lib/queue/define-worker";
import { createManualAlert } from "@/lib/charter/manual-alerts";
import { logger } from "@/lib/logger";
import { CHANNELS } from "@/lib/channels";
import { parseIsoDay } from "@/lib/dates";
import type { AvailabilityUpdateJobPayload } from "@/lib/queue/types";

interface AvailabilityJob {
  type: "availability.update";
  data: AvailabilityUpdateJobPayload;
}

/**
 * Worker che traduce i job `availability.update` per i canali email-only
 * (Click&Boat, Nautal) in `ManualAlert` row da risolvere a mano nel pannello
 * admin. Niente API call: crediamo al fan-out interno come source of truth
 * e lasciamo all'operatore la sincronizzazione esterna.
 */
export function startManualAlertWorker() {
  return defineWorker<AvailabilityJob, AvailabilityUpdateJobPayload>({
    queue: QUEUE_NAMES.AVAIL_MANUAL,
    jobName: "availability.update",
    label: "manual-alert",
    // R23-Q-ALTA-2: concurrency=1 — createManualAlert fa advisory lock,
    // concurrency=3 serialize inutile + scaricava pool Prisma + SIGTERM
    // timeout risk con 3 active jobs.
    workerOptions: { concurrency: 1 },
    handler: async (data) => {
      // Sanity guard: fan-out routing only enqueues CLICKANDBOAT/NAUTAL here,
      // un payload diverso significa producer bug — log+skip invece di drop.
      if (data.targetChannel !== CHANNELS.CLICKANDBOAT && data.targetChannel !== CHANNELS.NAUTAL) {
        logger.warn(
          { targetChannel: data.targetChannel, queue: QUEUE_NAMES.AVAIL_MANUAL },
          "Unexpected targetChannel on manual alert queue",
        );
        return;
      }

      await createManualAlert({
        channel: data.targetChannel,
        boatId: data.boatId,
        date: parseIsoDay(data.date),
        action: data.status === "AVAILABLE" ? "UNBLOCK" : "BLOCK",
        bookingId: data.originBookingId,
      });
    },
  });
}
