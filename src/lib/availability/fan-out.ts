import {
  availBokunQueue,
  availBoataroundQueue,
  availManualQueue,
} from "@/lib/queue";
import type { Queue } from "bullmq";
import type { AvailabilityUpdateJobPayload, Job as SyncJob } from "@/lib/queue/types";
import { CHANNEL_SYNC_MODE, CHANNELS, FAN_OUT_CHANNELS, SYNC_MODE, type Channel } from "@/lib/channels";
import { logger } from "@/lib/logger";

export interface FanOutOptions {
  boatId: string;
  date: string; // ISO YYYY-MM-DD
  status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
  sourceChannel: string;
  originBookingId?: string;
}

/**
 * R23-Q-CRITICA-1: queue dedicata per channel. Shared `"sync"` queue era
 * round-robin distributed tra 4 worker → job silently dropped dal worker
 * sbagliato (early-return = completed successful in BullMQ). Ora ogni
 * target va nella propria queue consumata da un solo worker type.
 */
function queueForChannel(channel: Channel): Queue<SyncJob> | null {
  switch (channel) {
    case CHANNELS.BOKUN:
      return availBokunQueue();
    case CHANNELS.BOATAROUND:
      return availBoataroundQueue();
    case CHANNELS.CLICKANDBOAT:
    case CHANNELS.NAUTAL:
      return availManualQueue();
    default:
      return null;
  }
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

  // R23-Q-MEDIA-4: Promise.allSettled → partial enqueue visibile invece di
  // "Fan-out enqueue failed" generico che nasconde quale target ha fallito.
  const results = await Promise.allSettled(
    targets.map((targetChannel) => {
      const queue = queueForChannel(targetChannel);
      if (!queue) {
        return Promise.reject(new Error(`No queue for channel ${targetChannel}`));
      }
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

  const succeeded: Channel[] = [];
  const failed: Array<{ channel: Channel; error: string }> = [];
  results.forEach((res, idx) => {
    const ch = targets[idx];
    if (res.status === "fulfilled") succeeded.push(ch);
    else failed.push({ channel: ch, error: (res.reason as Error).message });
  });

  if (failed.length > 0) {
    logger.error(
      {
        boatId: opts.boatId,
        date: opts.date,
        succeeded,
        failed,
        source: opts.sourceChannel,
      },
      "Availability fan-out partial failure",
    );
  } else {
    logger.info(
      {
        boatId: opts.boatId,
        date: opts.date,
        targets: succeeded,
        source: opts.sourceChannel,
      },
      "Availability fan-out queued",
    );
  }
}
