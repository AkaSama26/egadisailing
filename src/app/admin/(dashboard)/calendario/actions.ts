"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { withAdminAction } from "@/lib/admin/with-admin-action";
import { auditLog } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { blockDates, releaseDates } from "@/lib/availability/service";
import { parseIsoDay, eachUtcDayInclusive } from "@/lib/dates";
import { CHANNELS } from "@/lib/channels";
import { createManualAdminBooking } from "@/lib/booking/create-manual-admin";
import { quotePrice } from "@/lib/pricing/service";
import { NotFoundError, ValidationError } from "@/lib/errors";

const MAX_MANUAL_RANGE_DAYS = 90;


const isoDaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");

const manualBookingQuoteSchema = z.object({
  serviceId: z.string().min(1),
  dateIso: isoDaySchema,
  seats: z.coerce.number().int().min(1).max(100),
});

const createManualBookingSchema = z.object({
  boatId: z.string().min(1),
  serviceId: z.string().min(1),
  dateIso: isoDaySchema,
  seats: z.coerce.number().int().min(1).max(100),
  customer: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().min(1).max(50),
  }),
  totalEur: z.coerce.number(),
  depositEur: z.coerce.number(),
  balanceEur: z.coerce.number(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER"]),
  note: z.string().max(2000).optional().nullable(),
});

export const quoteManualBookingPriceAction = withAdminAction(
  {
    schema: manualBookingQuoteSchema,
    rateLimitPerMin: 120,
  },
  async (input) => {
    const service = await db.service.findUnique({
      where: { id: input.serviceId },
      select: { id: true, active: true, capacityMax: true },
    });
    if (!service) throw new NotFoundError("Service", input.serviceId);
    if (!service.active) throw new ValidationError("Servizio non attivo");
    if (input.seats > service.capacityMax) {
      throw new ValidationError(`Posti fuori range (1..${service.capacityMax})`);
    }

    try {
      const quote = await quotePrice(input.serviceId, parseIsoDay(input.dateIso), input.seats);
      return {
        available: true as const,
        totalPriceEur: quote.totalPrice.toNumber(),
        unitPriceEur: quote.finalUnitPrice.toNumber(),
        pricingUnit: quote.pricingUnit,
        legacyFallback: quote.legacyFallback,
      };
    } catch (err) {
      if (err instanceof NotFoundError && err.context.entity === "ServicePrice") {
        return {
          available: false as const,
          message: "Prezzo suggerito non configurato per questa data",
        };
      }
      throw err;
    }
  },
);

export const createManualBookingAction = withAdminAction(
  {
    schema: createManualBookingSchema,
    revalidatePaths: [
      "/admin/calendario",
      "/admin/prenotazioni",
      "/admin",
      "/admin/finanza",
    ],
  },
  async (input, { userId }) => createManualAdminBooking({ ...input, userId }),
);

async function validateRange(
  boatId: string,
  startIso: string,
  endIso: string,
): Promise<{ start: Date; end: Date; boatName: string }> {
  const start = parseIsoDay(startIso);
  const end = parseIsoDay(endIso);
  if (end < start) throw new ValidationError("endDate prima di startDate");
  const days = Array.from(eachUtcDayInclusive(start, end)).length;
  if (days > MAX_MANUAL_RANGE_DAYS) {
    throw new ValidationError(
      `Range troppo ampio (${days}g): massimo ${MAX_MANUAL_RANGE_DAYS}g. Dividere in piu' operazioni.`,
    );
  }
  const boat = await db.boat.findUnique({ where: { id: boatId }, select: { name: true } });
  if (!boat) throw new NotFoundError("Boat", boatId);
  return { start, end, boatName: boat.name };
}

/**
 * Blocca un range di date su una barca. Il source e' CHANNELS.DIRECT
 * (admin agisce come interno), fan-out verso tutti i canali esterni API
 * (Bokun/Boataround) e manual alert per Click&Boat/Nautal. iCal-mode
 * (SamBoat) e' aggiornato al prossimo poll del feed.
 */
export async function manualBlockRange(
  boatId: string,
  startDateIso: string,
  endDateIso: string,
  reason: string,
): Promise<void> {
  const { userId } = await requireAdmin();
  const { start, end, boatName } = await validateRange(boatId, startDateIso, endDateIso);

  // R26-P4 (audit double-book Agent 1 #11): symmetric overlap guard con
  // manualReleaseRange. Prima manualBlockRange consentiva block su slot
  // con Booking CONFIRMED attivo — preserveLockedBy mitigava (first
  // winner protetto) ma admin poteva nascondere inavvertitamente slot
  // venduti. Con guard: block manuale su booking attivo richiede esplicita
  // cancellazione prima.
  const overlapWhere = {
    boatId,
    status: { in: ["PENDING" as const, "CONFIRMED" as const] },
    startDate: { lte: end },
    endDate: { gte: start },
  };
  const overlappingBookings = await db.booking.findMany({
    where: overlapWhere,
    select: { confirmationCode: true, source: true, status: true },
    take: 10,
  });
  if (overlappingBookings.length > 0) {
    const refs = overlappingBookings
      .map((b) => `${b.confirmationCode} (${b.source}, ${b.status})`)
      .join(", ");
    throw new ValidationError(
      `Impossibile bloccare: ${overlappingBookings.length} booking attivo/i nel range. Cancellarli prima. Codici: ${refs}`,
      {
        overlappingSample: overlappingBookings.map((b) => b.confirmationCode),
      },
    );
  }

  await blockDates(boatId, start, end, CHANNELS.DIRECT);

  await auditLog({
    userId,
    action: AUDIT_ACTIONS.MANUAL_BLOCK,
    entity: "Boat",
    entityId: boatId,
    after: {
      boatName,
      startDate: startDateIso,
      endDate: endDateIso,
      reason: reason.trim().slice(0, 500),
    },
  });

  // R25-A2-M5: revalidate anche /admin + /admin/prenotazioni perche' il
  // block influenza KPI disponibilita' imminenti e la booking list (slot
  // non piu' bookable).
  revalidatePath("/admin/calendario");
  revalidatePath("/admin");
  revalidatePath("/admin/prenotazioni");
}

export async function manualReleaseRange(
  boatId: string,
  startDateIso: string,
  endDateIso: string,
): Promise<void> {
  const { userId } = await requireAdmin();
  const { start, end, boatName } = await validateRange(boatId, startDateIso, endDateIso);

  // Guard double-booking: se il range contiene celle bloccate da un Booking
  // PENDING/CONFIRMED attivo, il release lascia il Booking orfano (status
  // attivo ma availability AVAILABLE) → un altro cliente puo' prenotare le
  // stesse date cross-channel. Bloccare e chiedere di cancellare il booking
  // prima (Round 10 BL-C1). Round 11 Reg-A3: count separato vs take:10 per
  // non sottostimare il numero totale nel messaggio utente.
  const overlapWhere = {
    boatId,
    status: { in: ["PENDING" as const, "CONFIRMED" as const] },
    startDate: { lte: end },
    endDate: { gte: start },
  };
  const [overlappingSample, overlappingTotal] = await Promise.all([
    db.booking.findMany({
      where: overlapWhere,
      select: { confirmationCode: true, source: true, status: true },
      take: 10,
    }),
    db.booking.count({ where: overlapWhere }),
  ]);
  if (overlappingTotal > 0) {
    const refs = overlappingSample
      .map((b) => `${b.confirmationCode} (${b.source}, ${b.status})`)
      .join(", ");
    const suffix =
      overlappingTotal > overlappingSample.length
        ? ` (mostrati primi ${overlappingSample.length} di ${overlappingTotal})`
        : "";
    throw new ValidationError(
      `Impossibile rilasciare: ${overlappingTotal} booking attivo/i nel range. Cancellarli prima. Codici${suffix}: ${refs}`,
      {
        overlappingTotal,
        overlappingSample: overlappingSample.map((b) => b.confirmationCode),
      },
    );
  }

  await releaseDates(boatId, start, end, CHANNELS.DIRECT);

  await auditLog({
    userId,
    action: AUDIT_ACTIONS.MANUAL_RELEASE,
    entity: "Boat",
    entityId: boatId,
    after: { boatName, startDate: startDateIso, endDate: endDateIso },
  });

  revalidatePath("/admin/calendario");
  revalidatePath("/admin");
}
