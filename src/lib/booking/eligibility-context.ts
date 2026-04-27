"use server";

import Decimal from "decimal.js";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { toUtcDay, eachUtcDayInclusive } from "@/lib/dates";
import { quotePrice } from "@/lib/pricing/service";
import type { OverrideEligibilityInput } from "./override-eligibility";
import {
  decideBoatSlotAvailability,
  isBoatServiceType,
  loadBoatSlotAvailability,
} from "./boat-slot-availability";

export interface LoadEligibilityContextInput {
  boatId: string;
  serviceId: string;
  startDate: Date | string;
  endDate: Date | string;
  durationDays?: number;
  numPax: number;
}

/**
 * Carica tutto il contesto necessario a `checkOverrideEligibility`:
 *  - conflicting bookings PENDING|CONFIRMED overlapping range
 *  - admin boat-blocks (BoatAvailability BLOCKED + lockedByBookingId=null)
 *  - newBookingRevenue via quotePrice
 *
 * Usato dal Server Action wizard-preview (`checkOverrideEligibilityAction`).
 *
 * NOTA: `createPendingDirectBooking` NON usa questo helper perche' deve
 * partizionare conflicts in "ownRetriable" (propri PENDING con PI terminal)
 * vs "blockers" tramite lookup su Payment+DirectBooking. Quella logica
 * e' inline nella tx — clean substitution non possibile.
 *
 * Se `tx` fornito, usa quello. Altrimenti usa il client globale (preview).
 */
export async function loadEligibilityContext(
  input: LoadEligibilityContextInput,
  tx?: Prisma.TransactionClient,
): Promise<{
  input: OverrideEligibilityInput;
  rawConflicts: Array<{ id: string; totalPrice: Prisma.Decimal; source: string }>;
}> {
  const client = tx ?? db;
  const startDay = toUtcDay(new Date(input.startDate));
  const endDay = toUtcDay(new Date(input.endDate));

  const service = await client.service.findUnique({
    where: { id: input.serviceId },
    select: {
      id: true,
      type: true,
      boatId: true,
      durationType: true,
      capacityMax: true,
    },
  });

  let conflictingBookings: Array<{ id: string; totalPrice: Prisma.Decimal; source: string }> = [];
  const fullDayPriorityConflictIds = new Set<string>();
  if (service && isBoatServiceType(service.type)) {
    const slot = await loadBoatSlotAvailability(client, input.boatId, startDay);
    const decision = decideBoatSlotAvailability(service, input.numPax, slot);
    for (const conflict of decision.conflicts) {
      if (
        service.durationType !== "FULL_DAY" &&
        conflict.booking.durationType === "FULL_DAY"
      ) {
        fullDayPriorityConflictIds.add(conflict.booking.id);
      }
    }
    const ids = decision.conflicts.map((c) => c.booking.id);
    conflictingBookings =
      ids.length > 0
        ? await client.booking.findMany({
            where: { id: { in: ids } },
            select: { id: true, totalPrice: true, source: true },
          })
        : [];
  } else {
    conflictingBookings = await client.booking.findMany({
      where: {
        boatId: input.boatId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startDate: { lte: endDay },
        endDate: { gte: startDay },
      },
      select: { id: true, totalPrice: true, source: true },
    });
  }

  const dayRange = Array.from(eachUtcDayInclusive(startDay, endDay));
  const availability = await client.boatAvailability.findMany({
    where: {
      boatId: input.boatId,
      date: { in: dayRange },
      status: "BLOCKED",
      lockedByBookingId: null,
    },
    select: { date: true },
  });

  const quote = await quotePrice(input.serviceId, startDay, input.numPax, {
    durationDays: input.durationDays,
  });
  const newBookingRevenue = new Decimal(quote.totalPrice.toString());

  return {
    input: {
      newBookingRevenue,
      conflictingBookings: [
        ...conflictingBookings.map((b) => ({
          id: b.id,
          revenue: new Decimal(b.totalPrice.toString()),
          isAdminBlock: false,
          source: b.source,
          blockReason: fullDayPriorityConflictIds.has(b.id)
            ? ("full_day_priority" as const)
            : undefined,
        })),
        ...availability.map((a) => ({
          id: `block:${a.date.toISOString().slice(0, 10)}`,
          revenue: new Decimal(0),
          isAdminBlock: true,
          source: "ADMIN_BLOCK",
        })),
      ],
      experienceDate: startDay,
      today: new Date(),
    },
    rawConflicts: conflictingBookings,
  };
}
