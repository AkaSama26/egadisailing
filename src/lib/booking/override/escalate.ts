"use server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  defaultNotificationChannels,
  dispatchNotification,
  toDispatchResult,
} from "@/lib/notifications/dispatcher";

export interface SendEscalationRemindersResult {
  sent: number;
  errors: number;
}

/**
 * Cron helper §8.1: escalation reminder per OverrideRequest PENDING.
 * Trigger:
 *   - reminderLevel=0 AND createdAt <= 24h ago → primo reminder, level→1
 *   - reminderLevel>=1 AND lastReminderSentAt <= 24h ago → escalation ripetuta
 * Batch 50/run. Error-tolerant.
 */
export async function sendEscalationReminders(): Promise<SendEscalationRemindersResult> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const candidates = await db.overrideRequest.findMany({
    where: {
      status: "PENDING",
      OR: [
        { reminderLevel: 0, createdAt: { lte: twentyFourHoursAgo } },
        { reminderLevel: { gte: 1 }, lastReminderSentAt: { lte: twentyFourHoursAgo } },
      ],
    },
    include: {
      newBooking: { select: { confirmationCode: true } },
    },
    take: 50,
  });

  let sent = 0;
  let errors = 0;

  for (const req of candidates) {
    try {
      const ageHours = Math.floor((now.getTime() - req.createdAt.getTime()) / (60 * 60 * 1000));
      const nextLevel = req.reminderLevel + 1;
      const outcome = await dispatchNotification({
        type: "OVERRIDE_REMINDER",
        channels: defaultNotificationChannels(),
        payload: {
          confirmationCode: req.newBooking.confirmationCode,
          level: nextLevel,
          ageHours,
          overrideRequestId: req.id,
        },
        emailIdempotencyKey: `override-reminder:${req.id}:${nextLevel}`,
      });
      const delivered = toDispatchResult(outcome).anyOk;

      if (!delivered) {
        errors++;
        continue;
      }

      await db.overrideRequest.update({
        where: { id: req.id },
        data: {
          reminderLevel: nextLevel,
          lastReminderSentAt: now,
        },
      });
      sent++;
    } catch (err) {
      errors++;
      logger.error({ err, requestId: req.id }, "escalation reminder failed");
    }
  }

  return { sent, errors };
}
