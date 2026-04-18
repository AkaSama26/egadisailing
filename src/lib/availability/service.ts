import { db } from "@/lib/db";
import type { AvailabilityStatus } from "@/generated/prisma/enums";
import { fanOutAvailability } from "./fan-out";
import { isSelfEcho } from "./idempotency";
import { logger } from "@/lib/logger";

export interface UpdateAvailabilityInput {
  boatId: string;
  date: Date;
  status: AvailabilityStatus;
  sourceChannel: string;
  lockedByBookingId?: string;
  skipFanOut?: boolean;
}

/**
 * Aggiorna BoatAvailability e (a meno di skipFanOut) triggera fan-out ai canali.
 * Usa isSelfEcho per evitare loop.
 */
export async function updateAvailability(input: UpdateAvailabilityInput): Promise<void> {
  const dateOnly = new Date(
    Date.UTC(input.date.getUTCFullYear(), input.date.getUTCMonth(), input.date.getUTCDate()),
  );

  if (await isSelfEcho(input.boatId, dateOnly, input.sourceChannel)) {
    logger.debug(
      { boatId: input.boatId, date: dateOnly, source: input.sourceChannel },
      "Self-echo detected, skipping availability update",
    );
    return;
  }

  await db.boatAvailability.upsert({
    where: { boatId_date: { boatId: input.boatId, date: dateOnly } },
    update: {
      status: input.status,
      lockedByBookingId: input.lockedByBookingId ?? null,
      lastSyncedSource: input.sourceChannel,
      lastSyncedAt: new Date(),
    },
    create: {
      boatId: input.boatId,
      date: dateOnly,
      status: input.status,
      lockedByBookingId: input.lockedByBookingId ?? null,
      lastSyncedSource: input.sourceChannel,
      lastSyncedAt: new Date(),
    },
  });

  if (!input.skipFanOut) {
    await fanOutAvailability({
      boatId: input.boatId,
      date: dateOnly.toISOString().slice(0, 10),
      status: input.status,
      sourceChannel: input.sourceChannel,
      originBookingId: input.lockedByBookingId,
    });
  }
}

export async function blockDates(
  boatId: string,
  startDate: Date,
  endDate: Date,
  sourceChannel: string,
  lockedByBookingId?: string,
): Promise<void> {
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    await updateAvailability({
      boatId,
      date: new Date(cursor),
      status: "BLOCKED",
      sourceChannel,
      lockedByBookingId,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

export async function releaseDates(
  boatId: string,
  startDate: Date,
  endDate: Date,
  sourceChannel: string,
): Promise<void> {
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    await updateAvailability({
      boatId,
      date: new Date(cursor),
      status: "AVAILABLE",
      sourceChannel,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}
