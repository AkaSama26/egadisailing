import { createWorker, registerWorker } from "@/lib/queue";
import { createManualAlert } from "@/lib/charter/manual-alerts";
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
  const worker = createWorker<AvailabilityJob>(
    "sync",
    async (job) => {
      if (job.name !== "availability.update") return;
      const { data } = job.data;
      if (!data) return;
      if (data.targetChannel !== CHANNELS.CLICKANDBOAT && data.targetChannel !== CHANNELS.NAUTAL) {
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
    { concurrency: 3 },
  );
  registerWorker(worker);
  return worker;
}
