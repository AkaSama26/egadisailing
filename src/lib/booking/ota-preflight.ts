import type { DurationType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { CHANNELS, type Channel } from "@/lib/channels";
import { parseDateLikelyLocalDay, isoDay } from "@/lib/dates";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { isBokunConfigured } from "@/lib/bokun";
import { searchBokunBookings } from "@/lib/bokun/bookings";
import { importBokunBooking } from "@/lib/bokun/adapters/booking";
import { syncBookingAvailability as syncBokunBookingAvailability } from "@/lib/bokun/sync-availability";
import { isBoataroundConfigured } from "@/lib/boataround/client";
import { deriveEndDate } from "./helpers";
import { isBoatServiceType } from "./boat-slot-availability";
import { isBoatExclusiveServiceType } from "./cross-channel-conflicts";

const DEFAULT_MAX_STALE_MS = 5 * 60 * 1000;
const MAX_BOKUN_PREFLIGHT_PAGES = 3;
const BOKUN_PREFLIGHT_PAGE_SIZE = 100;

interface ServiceForPreflight {
  id: string;
  name: string;
  type: string;
  boatId: string;
  durationType: DurationType;
  durationHours: number;
  bokunProductId: string | null;
}

export interface OtaFreshnessSnapshot {
  channel: Channel;
  configured: boolean;
  healthStatus?: string | null;
  lastSyncAt?: Date | null;
}

export interface OtaFreshnessDecision {
  fresh: boolean;
  reason?: "not_configured" | "missing_status" | "red_status" | "stale_status";
  ageMs?: number | null;
}

export function evaluateOtaFreshness(
  snapshot: OtaFreshnessSnapshot,
  now: Date = new Date(),
  maxStaleMs = DEFAULT_MAX_STALE_MS,
): OtaFreshnessDecision {
  if (!snapshot.configured) return { fresh: true, reason: "not_configured" };
  if (!snapshot.healthStatus || !snapshot.lastSyncAt) {
    return { fresh: false, reason: "missing_status", ageMs: null };
  }
  if (snapshot.healthStatus !== "GREEN") {
    return {
      fresh: false,
      reason: "red_status",
      ageMs: now.getTime() - snapshot.lastSyncAt.getTime(),
    };
  }
  const ageMs = now.getTime() - snapshot.lastSyncAt.getTime();
  if (ageMs > maxStaleMs) return { fresh: false, reason: "stale_status", ageMs };
  return { fresh: true, ageMs };
}

export async function assertOtaFreshBeforePayment(input: {
  serviceId: string;
  startDate: Date;
  durationDays?: number;
  now?: Date;
}): Promise<void> {
  const service = await db.service.findUnique({
    where: { id: input.serviceId },
    select: {
      id: true,
      name: true,
      type: true,
      boatId: true,
      durationType: true,
      durationHours: true,
      bokunProductId: true,
    },
  });
  if (!service) throw new NotFoundError("Service", input.serviceId);

  const channels = channelsForService(service);
  if (channels.length === 0) return;

  const statuses = await db.channelSyncStatus.findMany({
    where: { channel: { in: channels.map((c) => c.channel) } },
  });
  const statusByChannel = new Map(statuses.map((s) => [s.channel, s]));
  const now = input.now ?? new Date();

  for (const channel of channels) {
    const status = statusByChannel.get(channel.channel);
    const decision = evaluateOtaFreshness(
      {
        channel: channel.channel,
        configured: channel.configured,
        healthStatus: status?.healthStatus,
        lastSyncAt: status?.lastSyncAt,
      },
      now,
    );
    if (decision.fresh) continue;

    if (channel.channel === CHANNELS.BOKUN && channel.configured) {
      await refreshBokunRangeForPreflight(service, input.startDate, input.durationDays);
      continue;
    }

    throw new ConflictError(
      "La disponibilita' dei portali esterni non e' aggiornata. Richiesta manuale necessaria.",
      {
        channel: channel.channel,
        reason: decision.reason,
        ageMs: decision.ageMs,
        serviceId: service.id,
      },
    );
  }
}

function channelsForService(service: ServiceForPreflight): Array<{
  channel: Channel;
  configured: boolean;
}> {
  const channels: Array<{ channel: Channel; configured: boolean }> = [];

  if (service.bokunProductId) {
    channels.push({ channel: CHANNELS.BOKUN, configured: isBokunConfigured() });
  }

  if (isBoatExclusiveServiceType(service.type) || isBoatServiceType(service.type)) {
    channels.push({
      channel: CHANNELS.BOATAROUND,
      configured: isBoataroundConfigured(),
    });
  }

  return channels.filter((c) => c.configured);
}

async function refreshBokunRangeForPreflight(
  service: ServiceForPreflight,
  requestedStartDate: Date,
  durationDays?: number,
): Promise<void> {
  const startDate = parseDateLikelyLocalDay(requestedStartDate);
  const effectiveDurationHours =
    service.type === "CABIN_CHARTER" && durationDays ? durationDays * 24 : service.durationHours;
  const effectiveDurationType =
    service.type === "CABIN_CHARTER" ? "MULTI_DAY" : service.durationType;
  const endDate = deriveEndDate(startDate, effectiveDurationType, effectiveDurationHours);

  try {
    for (let page = 1; page <= MAX_BOKUN_PREFLIGHT_PAGES; page++) {
      const result = await searchBokunBookings({
        startDate: isoDay(startDate),
        endDate: isoDay(endDate),
        page,
        pageSize: BOKUN_PREFLIGHT_PAGE_SIZE,
      });

      for (const booking of result.bookings) {
        if (booking.productId !== service.bokunProductId) continue;
        const imported = await importBokunBooking(booking);
        if (imported.mode !== "skipped") {
          await syncBokunBookingAvailability(imported);
        }
      }

      if (result.bookings.length < BOKUN_PREFLIGHT_PAGE_SIZE) break;
    }
  } catch (err) {
    logger.warn(
      {
        err,
        serviceId: service.id,
        bokunProductId: service.bokunProductId,
        startDate: isoDay(startDate),
        endDate: isoDay(endDate),
      },
      "Bokun live preflight failed",
    );
    throw new ConflictError(
      "Non riesco a verificare in tempo reale Bokun. Richiesta manuale necessaria.",
      {
        channel: CHANNELS.BOKUN,
        serviceId: service.id,
      },
    );
  }
}
