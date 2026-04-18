import { syncQueue } from "@/lib/queue";
import type { AvailabilityUpdateJobPayload } from "@/lib/queue/types";
import { CHANNEL_SYNC_MODE, FAN_OUT_CHANNELS, SYNC_MODE, type Channel } from "@/lib/channels";
import { logger } from "@/lib/logger";

export interface FanOutOptions {
  boatId: string;
  date: string; // ISO YYYY-MM-DD
  status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
  sourceChannel: string;
  originBookingId?: string;
}

/**
 * Accoda un job per ogni canale esterno diverso dalla source.
 *
 * `jobId` deterministico per coalescenza BullMQ: update multipli sulla stessa
 * cella convergeranno sullo stato finale (il worker rilegge sempre dal DB
 * prima di chiamare il canale esterno, quindi l'ordine di esecuzione non conta).
 */
export async function fanOutAvailability(opts: FanOutOptions): Promise<void> {
  const sourceAsChannel = opts.sourceChannel as Channel;
  // Skip canali che usano pull (iCal): SamBoat legge il feed a intervallo,
  // non ha senso accodare job ignorati da ogni worker (spreco estrazione + log).
  // Gli UNBLOCK comunque non si propagano automaticamente per iCal senza
  // METHOD:CANCEL — limite noto del formato sottoscrizione (deferred Plan 5).
  const targets = FAN_OUT_CHANNELS.filter(
    (ch) => ch !== sourceAsChannel && CHANNEL_SYNC_MODE[ch] !== SYNC_MODE.ICAL,
  );

  const queue = syncQueue();
  await Promise.all(
    targets.map((targetChannel) => {
      const payload: AvailabilityUpdateJobPayload = {
        boatId: opts.boatId,
        date: opts.date,
        status: opts.status,
        targetChannel,
        originBookingId: opts.originBookingId,
      };
      return queue.add(
        "availability.update",
        { type: "availability.update", data: payload },
        {
          jobId: `availability-${opts.boatId}-${opts.date}-${targetChannel}`,
          priority: 1,
        },
      );
    }),
  );

  logger.info(
    {
      boatId: opts.boatId,
      date: opts.date,
      targets,
      source: opts.sourceChannel,
    },
    "Availability fan-out queued",
  );
}
