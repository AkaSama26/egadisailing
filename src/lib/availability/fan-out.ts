import { syncQueue } from "@/lib/queue";
import { logger } from "@/lib/logger";

export type TargetChannel =
  | "BOKUN"
  | "BOATAROUND"
  | "SAMBOAT_ICAL"
  | "CLICKANDBOAT_MANUAL"
  | "NAUTAL_MANUAL";

const ALL_CHANNELS: TargetChannel[] = [
  "BOKUN",
  "BOATAROUND",
  "SAMBOAT_ICAL",
  "CLICKANDBOAT_MANUAL",
  "NAUTAL_MANUAL",
];

export interface FanOutOptions {
  boatId: string;
  date: string; // ISO
  status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
  sourceChannel: string; // canale che ha originato l'update (viene escluso dal fan-out)
  originBookingId?: string;
}

/**
 * Distribuisce un cambio di availability a tutti i canali esterni,
 * escludendo la source che l'ha originato.
 */
export async function fanOutAvailability(opts: FanOutOptions): Promise<void> {
  const targets = ALL_CHANNELS.filter((ch) => ch !== opts.sourceChannel);

  for (const target of targets) {
    await syncQueue().add(
      "availability.update",
      {
        targetChannel: target,
        operation: "AVAILABILITY_UPDATE",
        payload: {
          boatId: opts.boatId,
          date: opts.date,
          status: opts.status,
          originBookingId: opts.originBookingId,
        },
      },
      {
        jobId: `availability-${opts.boatId}-${opts.date}-${target}`,
        priority: 1,
      },
    );
  }

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
