import type { Prisma } from "@/generated/prisma/client";
import type { DurationType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { toUtcDay } from "@/lib/dates";

export const BOAT_SERVICE_TYPES = ["BOAT_SHARED", "BOAT_EXCLUSIVE"] as const;

export interface BoatSlotService {
  id: string;
  type: string;
  boatId: string;
  durationType: DurationType;
  capacityMax: number;
}

export interface BoatSlotBooking {
  id: string;
  source: string;
  status: string;
  serviceId: string;
  serviceType: string;
  durationType: DurationType;
  numPeople: number;
  totalPrice: Prisma.Decimal;
}

export interface BoatSlotConflict {
  booking: BoatSlotBooking;
  reason: "same_slot_exclusive" | "full_day_vs_half_day" | "half_day_vs_full_day";
}

export interface BoatSlotAvailability {
  date: Date;
  fullDaySharedSold: number;
  morningSharedSold: number;
  afternoonSharedSold: number;
  fullDaySharedRemaining: number;
  morningSharedRemaining: number;
  afternoonSharedRemaining: number;
  activeBookings: BoatSlotBooking[];
}

export interface BoatSlotDecision {
  capacityExceeded: boolean;
  sharedSold: number;
  sharedRemaining: number;
  conflicts: BoatSlotConflict[];
}

export function isBoatServiceType(type: string): boolean {
  return type === "BOAT_SHARED" || type === "BOAT_EXCLUSIVE";
}

export function isBoatSharedServiceType(type: string): boolean {
  return type === "BOAT_SHARED";
}

export function isBoatExclusiveCatalogServiceType(type: string): boolean {
  return type === "BOAT_EXCLUSIVE";
}

export function isFullDay(durationType: DurationType): boolean {
  return durationType === "FULL_DAY";
}

export function isHalfDay(durationType: DurationType): boolean {
  return durationType === "HALF_DAY_MORNING" || durationType === "HALF_DAY_AFTERNOON";
}

export function isSameSlot(a: DurationType, b: DurationType): boolean {
  return a === b;
}

/**
 * Per la barca i prodotti FULL_DAY e HALF_DAY sono mercati concorrenti sulla
 * stessa data. Morning e afternoon invece possono coesistere tra loro.
 */
export function slotScopesConflict(requested: DurationType, existing: DurationType): boolean {
  if (requested === existing) return true;
  if (isFullDay(requested) && isHalfDay(existing)) return true;
  if (isHalfDay(requested) && isFullDay(existing)) return true;
  return false;
}

export async function loadBoatSlotAvailability(
  client: Prisma.TransactionClient | typeof db,
  boatId: string,
  date: Date,
  opts: { excludeBookingIds?: string[] } = {},
): Promise<BoatSlotAvailability> {
  const day = toUtcDay(date);
  const activeBookings = await client.booking.findMany({
    where: {
      boatId,
      ...(opts.excludeBookingIds?.length
        ? { id: { notIn: opts.excludeBookingIds } }
        : {}),
      status: { in: ["PENDING", "CONFIRMED"] },
      claimsAvailability: true,
      startDate: { lte: day },
      endDate: { gte: day },
      service: { is: { type: { in: [...BOAT_SERVICE_TYPES] } } },
    },
    select: {
      id: true,
      source: true,
      status: true,
      serviceId: true,
      numPeople: true,
      totalPrice: true,
      service: { select: { type: true, durationType: true } },
    },
  });

  const mapped = activeBookings.map((b) => ({
    id: b.id,
    source: b.source,
    status: b.status,
    serviceId: b.serviceId,
    serviceType: b.service.type,
    durationType: b.service.durationType,
    numPeople: b.numPeople,
    totalPrice: b.totalPrice,
  }));

  const soldFor = (slot: DurationType) =>
    mapped
      .filter((b) => b.serviceType === "BOAT_SHARED" && b.durationType === slot)
      .reduce((sum, b) => sum + b.numPeople, 0);

  return {
    date: day,
    fullDaySharedSold: soldFor("FULL_DAY"),
    morningSharedSold: soldFor("HALF_DAY_MORNING"),
    afternoonSharedSold: soldFor("HALF_DAY_AFTERNOON"),
    fullDaySharedRemaining: Math.max(0, 12 - soldFor("FULL_DAY")),
    morningSharedRemaining: Math.max(0, 12 - soldFor("HALF_DAY_MORNING")),
    afternoonSharedRemaining: Math.max(0, 12 - soldFor("HALF_DAY_AFTERNOON")),
    activeBookings: mapped,
  };
}

export function decideBoatSlotAvailability(
  requestedService: BoatSlotService,
  requestedPeople: number,
  availability: BoatSlotAvailability,
): BoatSlotDecision {
  if (!isBoatServiceType(requestedService.type)) {
    return { capacityExceeded: false, sharedSold: 0, sharedRemaining: requestedService.capacityMax, conflicts: [] };
  }

  const sameSlotSharedSold = availability.activeBookings
    .filter(
      (b) =>
        b.serviceType === "BOAT_SHARED" &&
        b.durationType === requestedService.durationType,
    )
    .reduce((sum, b) => sum + b.numPeople, 0);
  const sharedRemaining = Math.max(0, requestedService.capacityMax - sameSlotSharedSold);
  const capacityExceeded =
    requestedService.type === "BOAT_SHARED" && requestedPeople > sharedRemaining;

  const conflicts: BoatSlotConflict[] = [];
  for (const booking of availability.activeBookings) {
    if (!slotScopesConflict(requestedService.durationType, booking.durationType)) continue;
    const sameSlot = isSameSlot(requestedService.durationType, booking.durationType);
    const bothSharedSameSlot =
      sameSlot &&
      requestedService.type === "BOAT_SHARED" &&
      booking.serviceType === "BOAT_SHARED";
    if (bothSharedSameSlot) continue;

    conflicts.push({
      booking,
      reason: sameSlot
        ? "same_slot_exclusive"
        : isFullDay(requestedService.durationType)
          ? "full_day_vs_half_day"
          : "half_day_vs_full_day",
    });
  }

  return { capacityExceeded, sharedSold: sameSlotSharedSold, sharedRemaining, conflicts };
}

export async function computeBoatServiceAvailableSpots(params: {
  service: BoatSlotService;
  date: Date;
}): Promise<number> {
  const availability = await loadBoatSlotAvailability(db, params.service.boatId, params.date);
  const decision = decideBoatSlotAvailability(params.service, 1, availability);
  if (decision.conflicts.length > 0) return 0;
  if (params.service.type === "BOAT_EXCLUSIVE") return 1;
  return decision.sharedRemaining;
}
