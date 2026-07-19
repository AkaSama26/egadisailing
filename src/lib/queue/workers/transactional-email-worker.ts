import { QUEUE_NAMES } from "@/lib/queue";
import { defineWorker } from "@/lib/queue/define-worker";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendEmailWithResult } from "@/lib/email/brevo";
import {
  EMAIL_OUTBOX_STATUS,
  emailDeliveryWindowExpired,
  emailProviderIdempotencyKey,
  emailRetryPolicy,
  MAX_EMAIL_ATTEMPTS,
  SENDING_VISIBILITY_TIMEOUT_MS,
} from "@/lib/email/outbox";
import type { TransactionalEmailPayload } from "@/lib/queue/types";
import { env } from "@/lib/env";

interface TransactionalEmailJob {
  type: "email.transactional.send";
  data: TransactionalEmailPayload;
}

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
    serializeByLogicalKey: {},
    handler: async (data) => {
      const email = await db.emailOutbox.findUnique({
        where: { id: data.emailOutboxId },
      });
      if (!email) {
        logger.warn({ emailOutboxId: data.emailOutboxId }, "Email outbox row missing");
        return;
      }
      if (
        email.status === EMAIL_OUTBOX_STATUS.SENT ||
        email.status === EMAIL_OUTBOX_STATUS.DISMISSED
      ) return;

      const now = new Date();
      // Un record creato dal worker precedente incrementava `attempts` prima
      // della chiamata Brevo, ma non registrava `deliveryStartedAt` ne' una
      // idempotency key provider. Dopo il cutover non possiamo distinguere una
      // risposta persa da un invio mai avvenuto: rendilo terminale e richiedi
      // verifica manuale. Il retry amministrativo esplicito resetta entrambi i
      // campi e resta quindi riconoscibile come autorizzato.
      if (
        email.status === EMAIL_OUTBOX_STATUS.PENDING &&
        email.attempts > 0 &&
        email.deliveryStartedAt === null
      ) {
        await db.emailOutbox.updateMany({
          where: {
            id: email.id,
            status: EMAIL_OUTBOX_STATUS.PENDING,
            attempts: { gt: 0 },
            deliveryStartedAt: null,
          },
          data: {
            status: EMAIL_OUTBOX_STATUS.FAILED,
            lastError:
              "Legacy delivery outcome ambiguous; manual Brevo verification required",
            nextAttemptAt: now,
          },
        });
        return;
      }
      if (
        email.status === EMAIL_OUTBOX_STATUS.PENDING &&
        email.deliveryStartedAt &&
        emailDeliveryWindowExpired(email.deliveryStartedAt, now)
      ) {
        await db.emailOutbox.updateMany({
          where: { id: email.id, status: EMAIL_OUTBOX_STATUS.PENDING },
          data: {
            status: EMAIL_OUTBOX_STATUS.FAILED,
            lastError:
              "Automatic retry stopped: provider idempotency window expired; manual delivery verification required",
          },
        });
        return;
      }
      const claimedRow = await db.emailOutbox.updateMany({
        where: {
          id: email.id,
          status: EMAIL_OUTBOX_STATUS.PENDING,
          nextAttemptAt: { lte: now },
          attempts: { lt: MAX_EMAIL_ATTEMPTS },
        },
        data: {
          status: EMAIL_OUTBOX_STATUS.SENDING,
          attempts: { increment: 1 },
          deliveryStartedAt: email.deliveryStartedAt ?? now,
          lastError: null,
          nextAttemptAt: new Date(now.getTime() + SENDING_VISIBILITY_TIMEOUT_MS),
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
          idempotencyKey: true,
          deliveryStartedAt: true,
        },
      });

      try {
        const result = await sendEmailWithResult({
          to: claimed.recipientEmail,
          toName: claimed.recipientName ?? undefined,
          subject: claimed.subject,
          htmlContent: claimed.htmlContent,
          textContent: claimed.textContent ?? undefined,
          idempotencyKey: emailProviderIdempotencyKey(claimed.idempotencyKey),
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

        await db.emailOutbox.updateMany({
          where: { id: claimed.id, status: EMAIL_OUTBOX_STATUS.SENDING },
          data: {
            status: EMAIL_OUTBOX_STATUS.SENT,
            brevoMessageId: result.messageId,
            sentAt: new Date(),
            lastError: null,
          },
        });
      } catch (err) {
        const attempts = claimed.attempts;
        // La idempotency key Brevo ha TTL minima 15 minuti: retry fissi a
        // 5 minuti restano nella finestra anche col cron ogni 5 minuti.
        // SMTP non offre dedup garantita: una risposta persa va a revisione
        // manuale, mai in retry automatico.
        const { finalFailure, delayMinutes } = emailRetryPolicy(
          env.EMAIL_DELIVERY_MODE,
          attempts,
          claimed.deliveryStartedAt ?? now,
        );
        await db.emailOutbox.updateMany({
          where: { id: claimed.id, status: EMAIL_OUTBOX_STATUS.SENDING },
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
