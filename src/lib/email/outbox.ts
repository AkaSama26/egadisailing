import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { emailTransactionalQueue } from "@/lib/queue";

export const EMAIL_OUTBOX_STATUS = {
  PENDING: "PENDING",
  SENDING: "SENDING",
  SENT: "SENT",
  FAILED: "FAILED",
} as const;

export type EmailOutboxStatus = (typeof EMAIL_OUTBOX_STATUS)[keyof typeof EMAIL_OUTBOX_STATUS];

export interface EnqueueTransactionalEmailInput {
  templateKey: string;
  recipientEmail: string;
  recipientName?: string;
  replyTo?: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
  payload: Prisma.InputJsonValue;
  idempotencyKey: string;
  bookingId?: string;
  customerId?: string;
}

export interface EnqueueTransactionalEmailResult {
  outboxId: string;
  accepted: boolean;
  alreadySent: boolean;
  queued: boolean;
}

export function buildEmailIdempotencyKey(parts: Array<string | number | null | undefined>): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(parts.map((part) => part ?? "")))
    .digest("hex");
}

export async function enqueueTransactionalEmail(
  input: EnqueueTransactionalEmailInput,
): Promise<EnqueueTransactionalEmailResult> {
  let row: { id: string; status: string };
  try {
    row = await db.emailOutbox.create({
        data: {
          templateKey: input.templateKey,
          recipientEmail: input.recipientEmail,
          recipientName: input.recipientName,
          replyToEmail: input.replyTo?.email,
          replyToName: input.replyTo?.name,
          subject: input.subject,
          htmlContent: input.htmlContent,
          textContent: input.textContent,
          payload: input.payload,
          idempotencyKey: input.idempotencyKey,
          bookingId: input.bookingId,
          customerId: input.customerId,
          status: EMAIL_OUTBOX_STATUS.PENDING,
        },
        select: { id: true, status: true },
      });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const existing = await db.emailOutbox.findUniqueOrThrow({
        where: { idempotencyKey: input.idempotencyKey },
        select: { id: true, status: true },
      });
      row = existing;
    } else {
      throw err;
    }
  }

  if (row.status === EMAIL_OUTBOX_STATUS.SENT) {
    return {
      outboxId: row.id,
      accepted: true,
      alreadySent: true,
      queued: false,
    };
  }

  const queued = await enqueueTransactionalEmailJob(row.id);
  return {
    outboxId: row.id,
    accepted: true,
    alreadySent: false,
    queued,
  };
}

export async function enqueueTransactionalEmailJob(emailOutboxId: string): Promise<boolean> {
  try {
    await emailTransactionalQueue().add(
      "email.transactional.send",
      {
        type: "email.transactional.send",
        data: { emailOutboxId },
      },
      { jobId: `email-${emailOutboxId}` },
    );
    return true;
  } catch (err) {
    logger.error(
      { err: (err as Error).message, emailOutboxId },
      "Email outbox job enqueue failed; cron drain will retry",
    );
    return false;
  }
}

export async function enqueueDueTransactionalEmailJobs(limit = 100): Promise<{
  scanned: number;
  queued: number;
  failed: number;
}> {
  const due = await db.emailOutbox.findMany({
    where: {
      status: { in: [EMAIL_OUTBOX_STATUS.PENDING, EMAIL_OUTBOX_STATUS.FAILED] },
      nextAttemptAt: { lte: new Date() },
      attempts: { lt: 5 },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let queued = 0;
  let failed = 0;
  for (const row of due) {
    if (await enqueueTransactionalEmailJob(row.id)) queued++;
    else failed++;
  }

  return { scanned: due.length, queued, failed };
}
