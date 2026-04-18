"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { auditLog } from "@/lib/audit/log";
import { blockDates, releaseDates } from "@/lib/availability/service";
import { parseIsoDay, eachUtcDayInclusive } from "@/lib/dates";
import { CHANNELS } from "@/lib/channels";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";

async function requireAdmin(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  if (session.user.role !== "ADMIN") throw new ForbiddenError();
  return { userId: session.user.id };
}

const MAX_MANUAL_RANGE_DAYS = 90;

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

  await blockDates(boatId, start, end, CHANNELS.DIRECT);

  await auditLog({
    userId,
    action: "MANUAL_BLOCK",
    entity: "Boat",
    entityId: boatId,
    after: {
      boatName,
      startDate: startDateIso,
      endDate: endDateIso,
      reason: reason.trim().slice(0, 500),
    },
  });

  revalidatePath("/admin/disponibilita");
  revalidatePath("/admin/calendario");
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
  // prima (Round 10 BL-C1).
  const overlapping = await db.booking.findMany({
    where: {
      boatId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
    select: { confirmationCode: true, source: true, status: true },
    take: 10,
  });
  if (overlapping.length > 0) {
    const refs = overlapping
      .map((b) => `${b.confirmationCode} (${b.source}, ${b.status})`)
      .join(", ");
    throw new ValidationError(
      `Impossibile rilasciare: ${overlapping.length} booking attivo/i nel range. Cancellarli prima. Codici: ${refs}`,
      { overlapping: overlapping.map((b) => b.confirmationCode) },
    );
  }

  await releaseDates(boatId, start, end, CHANNELS.DIRECT);

  await auditLog({
    userId,
    action: "MANUAL_RELEASE",
    entity: "Boat",
    entityId: boatId,
    after: { boatName, startDate: startDateIso, endDate: endDateIso },
  });

  revalidatePath("/admin/disponibilita");
  revalidatePath("/admin/calendario");
  revalidatePath("/admin");
}
