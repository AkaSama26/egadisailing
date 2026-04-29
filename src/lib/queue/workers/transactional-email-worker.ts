import { QUEUE_NAMES } from "@/lib/queue";
import { defineWorker } from "@/lib/queue/define-worker";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendEmailWithResult } from "@/lib/email/brevo";
import { EMAIL_OUTBOX_STATUS } from "@/lib/email/outbox";
import type { TransactionalEmailPayload } from "@/lib/queue/types";

interface TransactionalEmailJob {
  type: "email.transactional.send";
  data: TransactionalEmailPayload;
}

const MAX_EMAIL_ATTEMPTS = 5;

export function startTransactionalEmailWorker() {
  return defineWorker<TransactionalEmailJob, TransactionalEmailPayload>({
    queue: QUEUE_NAMES.EMAIL_TRANSACTIONAL,
    jobName: "email.transactional.send",
    label: "transactional-email",
    workerOptions: {
      concurrency: 3,
      limiter: { max: 10, duration: 1000 },
      alertOnFinalFailure: false,
    },
    handler: async (data) => {
      const email = await db.emailOutbox.findUnique({
        where: { id: data.emailOutboxId },
      });
      if (!email) {
        logger.warn({ emailOutboxId: data.emailOutboxId }, "Email outbox row missing");
        return;
      }
      if (email.status === EMAIL_OUTBOX_STATUS.SENT) return;

      const claimedRow = await db.emailOutbox.updateMany({
        where: {
          id: email.id,
          status: { in: [EMAIL_OUTBOX_STATUS.PENDING, EMAIL_OUTBOX_STATUS.FAILED] },
          attempts: { lt: MAX_EMAIL_ATTEMPTS },
        },
        data: {
          status: EMAIL_OUTBOX_STATUS.SENDING,
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      if (claimedRow.count !== 1) return;

      const claimed = await db.emailOutbox.findUniqueOrThrow({
        where: { id: email.id },
        select: {
          id: true,
          attempts: true,
          recipientEmail: true,
          recipientName: true,
          replyToEmail: true,
          replyToName: true,
          subject: true,
          htmlContent: true,
          textContent: true,
        },
      });

      try {
        const result = await sendEmailWithResult({
          to: claimed.recipientEmail,
          toName: claimed.recipientName ?? undefined,
          subject: claimed.subject,
          htmlContent: claimed.htmlContent,
          textContent: claimed.textContent ?? undefined,
          replyTo: claimed.replyToEmail
            ? {
                email: claimed.replyToEmail,
                name: claimed.replyToName ?? undefined,
              }
            : undefined,
        });
        if (!result.delivered) {
          throw new Error("Brevo skipped delivery");
        }

        await db.emailOutbox.update({
          where: { id: claimed.id },
          data: {
            status: EMAIL_OUTBOX_STATUS.SENT,
            brevoMessageId: result.messageId,
            sentAt: new Date(),
            lastError: null,
          },
        });
      } catch (err) {
        const attempts = claimed.attempts;
        const finalFailure = attempts >= MAX_EMAIL_ATTEMPTS;
        const delayMinutes = Math.min(60, Math.max(5, 2 ** attempts * 5));
        await db.emailOutbox.update({
          where: { id: claimed.id },
          data: {
            status: finalFailure ? EMAIL_OUTBOX_STATUS.FAILED : EMAIL_OUTBOX_STATUS.PENDING,
            lastError: (err as Error).message,
            nextAttemptAt: new Date(Date.now() + delayMinutes * 60 * 1000),
          },
        });
        throw err;
      }
    },
  });
}
