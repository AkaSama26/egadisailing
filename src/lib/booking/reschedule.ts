import type { Prisma } from "@/generated/prisma/client";
import type { DurationType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { blockDates, markDatesPartiallyBooked, reconcileBoatDatesFromActiveBookings, releaseBookingDates } from "@/lib/availability/service";
import { CHANNELS } from "@/lib/channels";
import { ConflictError } from "@/lib/errors";
import { eachUtcDayInclusive, isoDay } from "@/lib/dates";
import { acquireTxAdvisoryLock } from "@/lib/db/advisory-lock";
import { decideBoatSlotAvailability, isBoatServiceType, isBoatSharedServiceType, loadBoatSlotAvailability } from "./boat-slot-availability";
import { BOAT_EXCLUSIVE_SERVICE_TYPES, isBoatExclusiveServiceType } from "./cross-channel-conflicts";

export interface RescheduleServiceSnapshot {
  id: string;
  type: string;
  boatId: string;
  durationType: DurationType;
  durationHours: number;
  capacityMax: number;
}

export interface RescheduleAvailabilityInput {
  bookingId: string;
  boatId: string;
  service: RescheduleServiceSnapshot;
  numPeople: number;
  startDate: Date;
  endDate: Date;
}

export async function checkRescheduleAvailability(
  input: RescheduleAvailabilityInput,
  client: Prisma.TransactionClient | typeof db = db,
): Promise<{ available: true } | { available: false; reason: string }> {
  const adminBlocks = await client.boatAvailability.count({
    where: {
      boatId: input.boatId,
      date: { gte: input.startDate, lte: input.endDate },
      status: "BLOCKED",
      lockedByBookingId: null,
    },
  });
  if (adminBlocks > 0) {
    return { available: false, reason: "La nuova data e' bloccata manualmente." };
  }

  if (isBoatServiceType(input.service.type)) {
    const slot = await loadBoatSlotAvailability(client, input.boatId, input.startDate, {
      excludeBookingIds: [input.bookingId],
    });
    const decision = decideBoatSlotAvailability(input.service, input.numPeople, slot);
    if (decision.capacityExceeded) {
      return { available: false, reason: "Capienza insufficiente sulla nuova data." };
    }
    if (decision.conflicts.length > 0) {
      return { available: false, reason: "Ci sono prenotazioni concorrenti sulla nuova data." };
    }
    return { available: true };
  }

  const conflicts = await client.booking.count({
    where: {
      id: { not: input.bookingId },
      boatId: input.boatId,
      status: { in: ["PENDING", "CONFIRMED"] },
      claimsAvailability: true,
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
      ...(isBoatExclusiveServiceType(input.service.type)
        ? {}
        : { service: { is: { type: { in: [...BOAT_EXCLUSIVE_SERVICE_TYPES] } } } }),
    },
  });
  if (conflicts > 0) {
    return { available: false, reason: "Ci sono prenotazioni concorrenti sulla nuova data." };
  }

  return { available: true };
}

export async function assertRescheduleAvailability(
  input: RescheduleAvailabilityInput,
): Promise<void> {
  const result = await checkRescheduleAvailability(input);
  if (!result.available) throw new ConflictError(result.reason);
}

export async function acquireRescheduleAvailabilityLocks(
  tx: Prisma.TransactionClient,
  input: {
    boatId: string;
    oldStartDate: Date;
    oldEndDate: Date;
    newStartDate: Date;
    newEndDate: Date;
  },
): Promise<void> {
  const days = new Set<string>();
  addRangeDays(days, input.oldStartDate, input.oldEndDate);
  addRangeDays(days, input.newStartDate, input.newEndDate);

  for (const day of [...days].sort()) {
    await acquireTxAdvisoryLock(tx, "availability", input.boatId, day);
  }
}

function addRangeDays(days: Set<string>, startDate: Date, endDate: Date): void {
  if (endDate.getTime() < startDate.getTime()) {
    throw new Error(
      `addRangeDays: endDate (${endDate.toISOString()}) < startDate (${startDate.toISOString()})`,
    );
  }
  for (const day of eachUtcDayInclusive(startDate, endDate)) {
    days.add(isoDay(day));
  }
}

export async function applyBookingReschedule(input: {
  bookingId: string;
  boatId: string;
  serviceType: string;
  oldStartDate: Date;
  oldEndDate: Date;
  newStartDate: Date;
  newEndDate: Date;
}): Promise<void> {
  if (isBoatSharedServiceType(input.serviceType)) {
    await reconcileBoatDatesFromActiveBookings({
      boatId: input.boatId,
      startDate: input.oldStartDate,
      endDate: input.oldEndDate,
      sourceChannel: CHANNELS.DIRECT,
    });
    await markDatesPartiallyBooked(
      input.boatId,
      input.newStartDate,
      input.newEndDate,
      CHANNELS.DIRECT,
    );
    return;
  }

  await releaseBookingDates({
    bookingId: input.bookingId,
    boatId: input.boatId,
    startDate: input.oldStartDate,
    endDate: input.oldEndDate,
    sourceChannel: CHANNELS.DIRECT,
  });
  await blockDates(
    input.boatId,
    input.newStartDate,
    input.newEndDate,
    CHANNELS.DIRECT,
    input.bookingId,
  );
}
