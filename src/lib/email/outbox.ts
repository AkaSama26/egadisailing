import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { emailTransactionalQueue } from "@/lib/queue";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { auditLog } from "@/lib/audit/log";
import { ValidationError } from "@/lib/errors";
import { createQueueJobIdentity, queueExecutionJobId } from "@/lib/queue/job-identity";
import { env } from "@/lib/env";

export const EMAIL_OUTBOX_STATUS = {
  PENDING: "PENDING",
  SENDING: "SENDING",
  SENT: "SENT",
  FAILED: "FAILED",
  DISMISSED: "DISMISSED",
} as const;

export type EmailOutboxStatus = (typeof EMAIL_OUTBOX_STATUS)[keyof typeof EMAIL_OUTBOX_STATUS];

const EMAIL_OUTBOX_STATUS_SET = new Set<string>(Object.values(EMAIL_OUTBOX_STATUS));

function parseEmailOutboxStatus(value: string): EmailOutboxStatus {
  if (EMAIL_OUTBOX_STATUS_SET.has(value)) return value as EmailOutboxStatus;
  throw new Error(`Unexpected EmailOutbox status: ${value}`);
}

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
  dismissed: boolean;
  needsResolution: boolean;
  queued: boolean;
}

export interface ResolveTransactionalEmailResult {
  outboxId: string;
  changed: boolean;
  status: EmailOutboxStatus;
  queued?: boolean;
}

export const ROLLBACK_DISMISS_REASON_PREFIX = "Automatic rollback safety:";

const MAX_EMAIL_ATTEMPTS = 5;
// Il cron gira ogni 5 minuti. Tre minuti + il worst-case fino al prossimo
// tick resta dentro la TTL minima (15 min) dell'idempotency key Brevo.
const SENDING_VISIBILITY_TIMEOUT_MS = 3 * 60 * 1000;
const BREVO_IDEMPOTENCY_SAFE_WINDOW_MS = 14 * 60 * 1000;
const EMAIL_RETRY_DELAY_MINUTES = 5;
const EMAIL_CRON_MAX_WAIT_MINUTES = 5;

export function buildEmailIdempotencyKey(parts: Array<string | number | null | undefined>): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(parts.map((part) => part ?? "")))
    .digest("hex");
}

/** Converte la chiave business dell'outbox in un UUID v4-layout stabile
 * accettato da Brevo. Tutti i retry dello stesso record riusano la stessa
 * chiave senza introdurre stato aggiuntivo. */
export function emailProviderIdempotencyKey(outboxKey: string): string {
  const bytes = crypto.createHash("sha256").update(outboxKey).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function emailRetryPolicy(
  deliveryMode: "log" | "brevo" | "smtp",
  attempts: number,
  deliveryStartedAt: Date,
  now = new Date(),
): { finalFailure: boolean; delayMinutes: number } {
  const nextWorstCaseAt =
    now.getTime() +
    (EMAIL_RETRY_DELAY_MINUTES + EMAIL_CRON_MAX_WAIT_MINUTES) * 60 * 1000;
  const remainsInsideProviderWindow =
    nextWorstCaseAt < deliveryStartedAt.getTime() + BREVO_IDEMPOTENCY_SAFE_WINDOW_MS;
  return {
    finalFailure:
      deliveryMode !== "brevo" ||
      attempts >= MAX_EMAIL_ATTEMPTS ||
      !remainsInsideProviderWindow,
    delayMinutes: EMAIL_RETRY_DELAY_MINUTES,
  };
}

export function emailDeliveryWindowExpired(deliveryStartedAt: Date, now = new Date()): boolean {
  return now.getTime() >= deliveryStartedAt.getTime() + BREVO_IDEMPOTENCY_SAFE_WINDOW_MS;
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
      dismissed: false,
      needsResolution: false,
      queued: false,
    };
  }

  if (row.status === EMAIL_OUTBOX_STATUS.DISMISSED) {
    return {
      outboxId: row.id,
      accepted: true,
      alreadySent: false,
      dismissed: true,
      needsResolution: false,
      queued: false,
    };
  }

  if (row.status === EMAIL_OUTBOX_STATUS.FAILED) {
    // La chiave idempotente esiste ma l'elemento e' terminale finche' un
    // operatore non verifica Brevo e sceglie retry/dismiss. Non dichiararlo
    // accettato: i caller non devono avanzare marker/reminder come consegnati.
    return {
      outboxId: row.id,
      accepted: false,
      alreadySent: false,
      dismissed: false,
      needsResolution: true,
      queued: false,
    };
  }

  // FAILED richiede una decisione amministrativa esplicita; SENDING ha gia'
  // un'esecuzione proprietaria del claim. Solo PENDING puo' essere accodato.
  const queued =
    row.status === EMAIL_OUTBOX_STATUS.PENDING
      ? await enqueueTransactionalEmailJob(row.id)
      : false;
  return {
    outboxId: row.id,
    accepted: true,
    alreadySent: false,
    dismissed: false,
    needsResolution: false,
    queued,
  };
}

export async function enqueueTransactionalEmailJob(emailOutboxId: string): Promise<boolean> {
  try {
    const identity = createQueueJobIdentity(`email-outbox:${emailOutboxId}`);
    await emailTransactionalQueue().add(
      "email.transactional.send",
      {
        type: "email.transactional.send",
        ...identity,
        data: { emailOutboxId },
      },
      {
        jobId: queueExecutionJobId(identity),
        // L'outbox DB e il cron governano retry/delay. Lasciare anche i retry
        // BullMQ attivi crea due scheduler concorrenti: il backoff BullMQ (1m)
        // riparte prima di `nextAttemptAt` (5m), non riesce a fare claim e
        // trasforma erroneamente il job in COMPLETED, cancellando l'evidenza
        // del failure. Ogni execution job tenta quindi una sola volta; il cron
        // accoda una nuova execution UUID quando il record torna eleggibile.
        attempts: 1,
      },
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

/**
 * Recupera claim SENDING abbandonati da un crash del worker. Il visibility
 * timeout viene scritto al claim; il cron rende nuovamente eleggibili solo i
 * claim Brevo REST ancora coperti da idempotenza. SMTP/log diventano FAILED
 * e richiedono verifica manuale; gli attempt esauriti non sono mai reinviati.
 */
export async function recoverStaleTransactionalEmails(
  now = new Date(),
  deliveryMode: "log" | "brevo" | "smtp" = env.EMAIL_DELIVERY_MODE,
): Promise<{
  pending: number;
  failed: number;
}> {
  // Solo Brevo REST offre una idempotency key verificabile. Con SMTP una
  // disconnessione dopo l'ack del relay ma prima del commit SENT e' ambigua:
  // un recupero automatico potrebbe consegnare due volte la stessa email.
  if (deliveryMode !== "brevo") {
    const failed = await db.emailOutbox.updateMany({
      where: {
        status: EMAIL_OUTBOX_STATUS.SENDING,
        nextAttemptAt: { lte: now },
      },
      data: {
        status: EMAIL_OUTBOX_STATUS.FAILED,
        lastError:
          "Sending claim expired without provider idempotency; manual delivery verification required",
        nextAttemptAt: now,
      },
    });
    return { pending: 0, failed: failed.count };
  }

  const providerWindowCutoff = new Date(
    now.getTime() - BREVO_IDEMPOTENCY_SAFE_WINDOW_MS,
  );
  const [pending, failed] = await db.$transaction([
    db.emailOutbox.updateMany({
      where: {
        status: EMAIL_OUTBOX_STATUS.SENDING,
        nextAttemptAt: { lte: now },
        attempts: { lt: MAX_EMAIL_ATTEMPTS },
        // Null identifica un claim legacy/ambiguo: non sappiamo quando sia
        // partita la consegna e quindi non possiamo provare che la chiave sia
        // ancora nella finestra di deduplica del provider.
        deliveryStartedAt: { gt: providerWindowCutoff },
      },
      data: {
        status: EMAIL_OUTBOX_STATUS.PENDING,
        lastError: "Recovered stale sending claim after worker interruption",
        nextAttemptAt: now,
      },
    }),
    db.emailOutbox.updateMany({
      where: {
        status: EMAIL_OUTBOX_STATUS.SENDING,
        nextAttemptAt: { lte: now },
        OR: [
          { attempts: { gte: MAX_EMAIL_ATTEMPTS } },
          { deliveryStartedAt: null },
          { deliveryStartedAt: { lte: providerWindowCutoff } },
        ],
      },
      data: {
        status: EMAIL_OUTBOX_STATUS.FAILED,
        lastError: "Sending claim expired after maximum attempts",
        nextAttemptAt: now,
      },
    }),
  ]);
  return { pending: pending.count, failed: failed.count };
}

/** Reset amministrativo atomico. Crash tra update DB ed enqueue e' recuperato
 * dal cron, che seleziona PENDING; retry ripetuti restano idempotenti. */
export async function retryTransactionalEmail(input: {
  emailOutboxId: string;
  userId: string;
  reason: string;
}): Promise<ResolveTransactionalEmailResult> {
  const now = new Date();
  const reason = input.reason.trim();
  if (!reason) throw new ValidationError("A retry reason is required");
  const changed = await db.emailOutbox.updateMany({
    where: { id: input.emailOutboxId, status: EMAIL_OUTBOX_STATUS.FAILED },
    data: {
      status: EMAIL_OUTBOX_STATUS.PENDING,
      attempts: 0,
      deliveryStartedAt: null,
      lastError: null,
      nextAttemptAt: now,
      resolvedAt: now,
      resolvedByUserId: input.userId,
      resolutionReason: reason,
    },
  });
  const row = await db.emailOutbox.findUniqueOrThrow({
    where: { id: input.emailOutboxId },
    select: { status: true },
  });
  const status = parseEmailOutboxStatus(row.status);

  if (changed.count === 1) {
    await auditLog({
      userId: input.userId,
      action: AUDIT_ACTIONS.EMAIL_OUTBOX_RETRY,
      entity: "EmailOutbox",
      entityId: input.emailOutboxId,
      after: {
        status: EMAIL_OUTBOX_STATUS.PENDING,
        reasonProvided: true,
      },
    });
  }

  if (changed.count !== 1) {
    return { outboxId: input.emailOutboxId, changed: false, status };
  }
  const queued = await enqueueTransactionalEmailJob(input.emailOutboxId);
  return {
    outboxId: input.emailOutboxId,
    changed: changed.count === 1,
    status,
    queued,
  };
}

/** Chiusura esplicita senza invio. SENT e DISMISSED sono terminali immutabili. */
export async function dismissTransactionalEmail(input: {
  emailOutboxId: string;
  userId: string;
  reason: string;
}): Promise<ResolveTransactionalEmailResult> {
  const reason = input.reason.trim();
  if (!reason) throw new ValidationError("A resolution reason is required");

  const changed = await db.emailOutbox.updateMany({
    where: {
      id: input.emailOutboxId,
      status: { in: [EMAIL_OUTBOX_STATUS.PENDING, EMAIL_OUTBOX_STATUS.FAILED] },
    },
    data: {
      status: EMAIL_OUTBOX_STATUS.DISMISSED,
      resolvedAt: new Date(),
      resolvedByUserId: input.userId,
      resolutionReason: reason,
      nextAttemptAt: new Date(),
    },
  });
  const row = await db.emailOutbox.findUniqueOrThrow({
    where: { id: input.emailOutboxId },
    select: { status: true },
  });
  const status = parseEmailOutboxStatus(row.status);
  if (changed.count === 1) {
    await auditLog({
      userId: input.userId,
      action: AUDIT_ACTIONS.EMAIL_OUTBOX_DISMISS,
      entity: "EmailOutbox",
      entityId: input.emailOutboxId,
      after: { status: EMAIL_OUTBOX_STATUS.DISMISSED, reasonProvided: true },
    });
  }
  return {
    outboxId: input.emailOutboxId,
    changed: changed.count === 1,
    status,
  };
}

/**
 * Crea una nuova outbox per una comunicazione quarantinata da un rollback.
 * Il record DISMISSED resta immutabile: la nuova chiave business, derivata
 * dall'ID originale, rende l'operazione idempotente anche su doppio click.
 * Il caller amministrativo deve prima verificare in Brevo l'assenza della
 * consegna e fornire una motivazione esplicita.
 */
export async function createRollbackReplacementEmail(input: {
  emailOutboxId: string;
  userId: string;
  reason: string;
}): Promise<EnqueueTransactionalEmailResult> {
  const reason = input.reason.trim();
  if (!reason) throw new ValidationError("A replacement approval reason is required");

  const original = await db.emailOutbox.findUniqueOrThrow({
    where: { id: input.emailOutboxId },
    select: {
      id: true,
      templateKey: true,
      recipientEmail: true,
      recipientName: true,
      replyToEmail: true,
      replyToName: true,
      subject: true,
      htmlContent: true,
      textContent: true,
      payload: true,
      bookingId: true,
      customerId: true,
      status: true,
      resolutionReason: true,
    },
  });
  if (
    original.status !== EMAIL_OUTBOX_STATUS.DISMISSED ||
    !original.resolutionReason?.startsWith(ROLLBACK_DISMISS_REASON_PREFIX)
  ) {
    throw new ValidationError("Only rollback-quarantined email can be replaced");
  }

  const replacement = await enqueueTransactionalEmail({
    templateKey: original.templateKey,
    recipientEmail: original.recipientEmail,
    recipientName: original.recipientName ?? undefined,
    replyTo: original.replyToEmail
      ? {
          email: original.replyToEmail,
          name: original.replyToName ?? undefined,
        }
      : undefined,
    subject: original.subject,
    htmlContent: original.htmlContent,
    textContent: original.textContent ?? undefined,
    payload: JSON.parse(
      JSON.stringify({
        replacementOfOutboxId: original.id,
        originalPayload: original.payload,
      }),
    ) as Prisma.InputJsonValue,
    idempotencyKey: buildEmailIdempotencyKey([
      "rollback-replacement",
      original.id,
    ]),
    bookingId: original.bookingId ?? undefined,
    customerId: original.customerId ?? undefined,
  });

  await auditLog({
    userId: input.userId,
    action: AUDIT_ACTIONS.EMAIL_OUTBOX_ROLLBACK_REPLACEMENT,
    entity: "EmailOutbox",
    entityId: original.id,
    after: {
      replacementOutboxId: replacement.outboxId,
      reasonProvided: true,
      accepted: replacement.accepted,
      queued: replacement.queued,
    },
  });
  return replacement;
}

export async function enqueueDueTransactionalEmailJobs(limit = 100): Promise<{
  scanned: number;
  queued: number;
  failed: number;
  recovered: { pending: number; failed: number };
}> {
  const now = new Date();
  const recovered = await recoverStaleTransactionalEmails(now);
  const due = await db.emailOutbox.findMany({
    where: {
      status: EMAIL_OUTBOX_STATUS.PENDING,
      nextAttemptAt: { lte: now },
      attempts: { lt: MAX_EMAIL_ATTEMPTS },
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

  return { scanned: due.length, queued, failed, recovered };
}

export { MAX_EMAIL_ATTEMPTS, SENDING_VISIBILITY_TIMEOUT_MS };
