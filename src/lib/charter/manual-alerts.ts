import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { toUtcDay } from "@/lib/dates";

export type ManualAlertChannel = "CLICKANDBOAT" | "NAUTAL";
export type ManualAlertAction = "BLOCK" | "UNBLOCK";

export interface CreateManualAlertInput {
  channel: ManualAlertChannel;
  boatId: string;
  date: Date;
  action: ManualAlertAction;
  bookingId?: string;
  notes?: string;
}

/**
 * Crea un alert nella coda manuale (admin review). Idempotent per slot
 * stesso giorno/azione: se esiste gia' un PENDING identico, lo skippiamo.
 */
export async function createManualAlert(input: CreateManualAlertInput): Promise<void> {
  const day = toUtcDay(input.date);
  const existing = await db.manualAlert.findFirst({
    where: {
      channel: input.channel,
      boatId: input.boatId,
      date: day,
      action: input.action,
      status: "PENDING",
    },
    select: { id: true },
  });
  if (existing) {
    logger.debug({ existingId: existing.id }, "Manual alert already pending, dedup");
    return;
  }
  await db.manualAlert.create({
    data: {
      channel: input.channel,
      boatId: input.boatId,
      date: day,
      action: input.action,
      bookingId: input.bookingId,
      notes: input.notes,
    },
  });
  logger.info({ channel: input.channel, boatId: input.boatId, action: input.action }, "Manual alert created");
}

export async function resolveManualAlert(id: string, userId?: string): Promise<void> {
  await db.manualAlert.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date(), resolvedByUserId: userId },
  });
}

export async function listPendingManualAlerts() {
  return db.manualAlert.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
