"use server";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email/brevo";

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
      const delivered = await sendEmail({
        to: env.ADMIN_EMAIL,
        subject: `Override request pending level ${nextLevel}: ${req.newBooking.confirmationCode}`,
        htmlContent: `<p>Override request <strong>${req.newBooking.confirmationCode}</strong> pending da ${ageHours}h (reminder level ${nextLevel}). Decisione richiesta.</p>`,
        textContent: `Override request ${req.newBooking.confirmationCode} pending (${ageHours}h, level ${nextLevel}). Decisione richiesta.`,
      });

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
