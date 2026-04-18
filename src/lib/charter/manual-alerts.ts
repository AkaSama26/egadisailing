import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { toUtcDay, isoDay } from "@/lib/dates";
import { acquireTxAdvisoryLock } from "@/lib/db/advisory-lock";

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

const MANUAL_ALERT_LOCK_NAMESPACE = "manual-alert";

/**
 * Crea un ManualAlert PENDING idempotente. Dedup: advisory lock su
 * `(channel, boatId, date, action)` + findFirst DENTRO tx — previene race
 * tra worker concorrenti (concurrency=3) che altrimenti creerebbero 2 alert
 * identici per stesso slot.
 *
 * Difesa DB-level via partial unique index in migration
 * `20260418220000_plan4_round8_manual_alert_unique`.
 */
export async function createManualAlert(input: CreateManualAlertInput): Promise<void> {
  const day = toUtcDay(input.date);
  const dayKey = isoDay(day);
  try {
    await db.$transaction(async (tx) => {
      await acquireTxAdvisoryLock(
        tx,
        MANUAL_ALERT_LOCK_NAMESPACE,
        input.channel,
        input.boatId,
        dayKey,
        input.action,
      );
      const existing = await tx.manualAlert.findFirst({
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
      await tx.manualAlert.create({
        data: {
          channel: input.channel,
          boatId: input.boatId,
          date: day,
          action: input.action,
          bookingId: input.bookingId,
          notes: input.notes,
        },
      });
    });
    logger.info(
      { channel: input.channel, boatId: input.boatId, action: input.action },
      "Manual alert created",
    );
  } catch (err) {
    // Partial unique index fallback: se due tx sfuggono al lock (es. DB
    // restart), P2002 garantisce che solo una vinca.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.debug({ input }, "Manual alert concurrent race caught by unique index");
      return;
    }
    throw err;
  }
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
