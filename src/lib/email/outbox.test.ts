import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  updateMany: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  findMany: vi.fn(),
  queueAdd: vi.fn().mockResolvedValue({ id: "queued" }),
  auditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db", () => ({
  db: {
    emailOutbox: {
      create: mocks.create,
      updateMany: mocks.updateMany,
      findUniqueOrThrow: mocks.findUniqueOrThrow,
      findMany: mocks.findMany,
    },
    $transaction: vi.fn(async (promises: Array<Promise<unknown>>) => Promise.all(promises)),
  },
}));
vi.mock("@/lib/queue", () => ({
  emailTransactionalQueue: () => ({ add: mocks.queueAdd }),
}));
vi.mock("@/lib/audit/log", () => ({ auditLog: mocks.auditLog }));
vi.mock("@/lib/env", () => ({
  env: { EMAIL_DELIVERY_MODE: "brevo" },
}));

import {
  createRollbackReplacementEmail,
  dismissTransactionalEmail,
  EMAIL_OUTBOX_STATUS,
  emailProviderIdempotencyKey,
  emailDeliveryWindowExpired,
  emailRetryPolicy,
  enqueueTransactionalEmail,
  enqueueDueTransactionalEmailJobs,
  HISTORICAL_DISMISS_REASON_PREFIX,
  isHistoricalEmailResolution,
  recoverStaleTransactionalEmails,
  retryTransactionalEmail,
} from "./outbox";

describe("email outbox resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queueAdd.mockResolvedValue({ id: "queued" });
  });

  it("non dichiara accettato un record FAILED che richiede risoluzione", async () => {
    mocks.create.mockResolvedValueOnce({
      id: "e-failed",
      status: EMAIL_OUTBOX_STATUS.FAILED,
    });

    const result = await enqueueTransactionalEmail({
      templateKey: "test",
      recipientEmail: "nobody@example.invalid",
      subject: "test",
      htmlContent: "<p>test</p>",
      payload: {},
      idempotencyKey: "failed-key",
    });

    expect(result).toMatchObject({
      outboxId: "e-failed",
      accepted: false,
      needsResolution: true,
      queued: false,
    });
    expect(mocks.queueAdd).not.toHaveBeenCalled();
  });

  it("deriva una UUID provider stabile dalla chiave outbox", () => {
    const first = emailProviderIdempotencyKey("booking-confirmation:abc");
    const second = emailProviderIdempotencyKey("booking-confirmation:abc");
    expect(first).toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("mantiene i retry Brevo nella TTL e manda SMTP a revisione manuale", () => {
    const startedAt = new Date("2026-07-19T10:00:00.000Z");
    expect(
      emailRetryPolicy("brevo", 1, startedAt, new Date("2026-07-19T10:01:00.000Z")),
    ).toEqual({
      finalFailure: false,
      delayMinutes: 5,
    });
    expect(
      emailRetryPolicy("brevo", 2, startedAt, new Date("2026-07-19T10:10:00.000Z")),
    ).toEqual({
      finalFailure: true,
      delayMinutes: 5,
    });
    expect(emailRetryPolicy("smtp", 1, startedAt, startedAt)).toEqual({
      finalFailure: true,
      delayMinutes: 5,
    });
    expect(
      emailDeliveryWindowExpired(startedAt, new Date("2026-07-19T10:14:00.000Z")),
    ).toBe(true);
  });

  it("non reinvia mai un record SENT", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });
    mocks.findUniqueOrThrow.mockResolvedValueOnce({ status: EMAIL_OUTBOX_STATUS.SENT });

    const result = await retryTransactionalEmail({
      emailOutboxId: "e1",
      userId: "admin-1",
      reason: "verified in Brevo",
    });

    expect(result).toEqual({ outboxId: "e1", changed: false, status: "SENT" });
    expect(mocks.queueAdd).not.toHaveBeenCalled();
    expect(mocks.auditLog).not.toHaveBeenCalled();
  });

  it("chiude FAILED come DISMISSED e scrive audit una sola volta", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });
    mocks.findUniqueOrThrow.mockResolvedValueOnce({ status: EMAIL_OUTBOX_STATUS.DISMISSED });

    const result = await dismissTransactionalEmail({
      emailOutboxId: "e2",
      userId: "admin-1",
      reason: "prenotazione cancellata",
    });

    expect(result.status).toBe("DISMISSED");
    expect(result.changed).toBe(true);
    expect(mocks.queueAdd).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledTimes(1);
  });

  it("crea una sola outbox sostitutiva per una futura quarantena rollback verificata", async () => {
    mocks.findUniqueOrThrow.mockResolvedValueOnce({
      id: "future-rollback-dismissed",
      templateKey: "booking-confirmation",
      recipientEmail: "customer@example.com",
      recipientName: "Cliente",
      replyToEmail: null,
      replyToName: null,
      subject: "Conferma",
      htmlContent: "<p>Conferma</p>",
      textContent: "Conferma",
      payload: { bookingId: "booking-1" },
      bookingId: "booking-1",
      customerId: "customer-1",
      status: EMAIL_OUTBOX_STATUS.DISMISSED,
      resolutionReason:
        "Automatic rollback safety: delivery outcome is ambiguous; verify Brevo",
      historicalDismissedAt: null,
    });
    mocks.create.mockResolvedValueOnce({
      id: "replacement-1",
      status: EMAIL_OUTBOX_STATUS.PENDING,
    });

    const result = await createRollbackReplacementEmail({
      emailOutboxId: "future-rollback-dismissed",
      userId: "admin-1",
      reason: "Brevo verificato: nessuna consegna precedente",
    });

    expect(result).toMatchObject({
      outboxId: "replacement-1",
      accepted: true,
      queued: true,
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payload: expect.objectContaining({
            replacementOfOutboxId: "future-rollback-dismissed",
          }),
          idempotencyKey: expect.stringMatching(/^[0-9a-f]{64}$/),
        }),
      }),
    );
    expect(mocks.queueAdd).toHaveBeenCalledOnce();
  });

  it("rifiuta una sostituzione per qualunque email storica tombstonata", async () => {
    mocks.findUniqueOrThrow.mockResolvedValueOnce({
      id: "historical-dismissed",
      status: EMAIL_OUTBOX_STATUS.DISMISSED,
      resolutionReason:
        "Automatic rollback safety: testo alterato manualmente",
      historicalDismissedAt: new Date("2026-07-19T12:00:00.000Z"),
    });

    await expect(
      createRollbackReplacementEmail({
        emailOutboxId: "historical-dismissed",
        userId: "admin-1",
        reason: "tentativo non consentito",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.queueAdd).not.toHaveBeenCalled();
  });

  it("rifiuta per sempre il retry di una email storica, incluso il caso 14 agosto", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });
    mocks.findUniqueOrThrow.mockResolvedValueOnce({
      status: EMAIL_OUTBOX_STATUS.DISMISSED,
      historicalDismissedAt: new Date("2026-07-19T12:00:00.000Z"),
      resolutionReason: `${HISTORICAL_DISMISS_REASON_PREFIX}; booking date 2026-08-14`,
    });

    await expect(
      retryTransactionalEmail({
        emailOutboxId: "historical-2026-08-14",
        userId: "admin-1",
        reason: "tentativo non consentito anche dopo verifica Brevo",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.queueAdd).not.toHaveBeenCalled();
    expect(mocks.auditLog).not.toHaveBeenCalled();
    expect(
      isHistoricalEmailResolution(
        `${HISTORICAL_DISMISS_REASON_PREFIX}; booking date 2026-08-14`,
      ),
    ).toBe(true);
  });

  it("non sovrascrive la motivazione terminale di una email storica", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });
    mocks.findUniqueOrThrow.mockResolvedValueOnce({
      status: EMAIL_OUTBOX_STATUS.DISMISSED,
      historicalDismissedAt: new Date("2026-07-19T12:00:00.000Z"),
      resolutionReason: HISTORICAL_DISMISS_REASON_PREFIX,
    });

    await expect(
      dismissTransactionalEmail({
        emailOutboxId: "historical-1",
        userId: "admin-1",
        reason: "tentativo di modifica",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.auditLog).not.toHaveBeenCalled();
  });

  it("retry FAILED fa CAS a PENDING e usa un nuovo execution id", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });
    mocks.findUniqueOrThrow.mockResolvedValueOnce({ status: EMAIL_OUTBOX_STATUS.PENDING });

    const result = await retryTransactionalEmail({
      emailOutboxId: "e3",
      userId: "admin-1",
      reason: "no prior delivery found",
    });

    expect(result).toMatchObject({ changed: true, status: "PENDING", queued: true });
    const [, payload, options] = mocks.queueAdd.mock.calls[0];
    expect(payload.logicalKey).toBe("email-outbox:e3");
    expect(options.jobId).toMatch(/^exec-/);
    expect(options.attempts).toBe(1);
  });

  it("un retry concorrente che non vince il CAS non accoda un duplicato", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });
    mocks.findUniqueOrThrow.mockResolvedValueOnce({ status: EMAIL_OUTBOX_STATUS.PENDING });

    const result = await retryTransactionalEmail({
      emailOutboxId: "e-concurrent",
      userId: "admin-1",
      reason: "verified in Brevo",
    });

    expect(result).toEqual({
      outboxId: "e-concurrent",
      changed: false,
      status: EMAIL_OUTBOX_STATUS.PENDING,
    });
    expect(mocks.queueAdd).not.toHaveBeenCalled();
    expect(mocks.auditLog).not.toHaveBeenCalled();
  });

  it("il cron recupera un retry approvato se l'enqueue immediato fallisce", async () => {
    mocks.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 });
    mocks.findUniqueOrThrow.mockResolvedValueOnce({ status: EMAIL_OUTBOX_STATUS.PENDING });
    mocks.findMany.mockResolvedValueOnce([{ id: "e-recover" }]);
    mocks.queueAdd.mockRejectedValueOnce(new Error("redis unavailable"));

    const retry = await retryTransactionalEmail({
      emailOutboxId: "e-recover",
      userId: "admin-1",
      reason: "delivery checked in Brevo",
    });
    const drain = await enqueueDueTransactionalEmailJobs();

    expect(retry).toMatchObject({ changed: true, status: "PENDING", queued: false });
    expect(drain).toMatchObject({ scanned: 1, queued: 1, failed: 0 });
    expect(mocks.queueAdd).toHaveBeenCalledTimes(2);
    const firstPayload = mocks.queueAdd.mock.calls[0][1];
    const secondPayload = mocks.queueAdd.mock.calls[1][1];
    expect(firstPayload.logicalKey).toBe("email-outbox:e-recover");
    expect(secondPayload.logicalKey).toBe("email-outbox:e-recover");
    expect(firstPayload.executionId).not.toBe(secondPayload.executionId);
    expect(mocks.queueAdd.mock.calls[1][2]).toMatchObject({ attempts: 1 });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          historicalDismissedAt: null,
          OR: expect.arrayContaining([
            expect.objectContaining({ resolutionReason: null }),
          ]),
        }),
      }),
    );
  });

  it("il drain recupera claim SENDING stale prima di accodare", async () => {
    mocks.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 });
    mocks.findMany.mockResolvedValueOnce([{ id: "e4" }]);

    const result = await enqueueDueTransactionalEmailJobs();

    expect(result.recovered).toEqual({ pending: 1, failed: 2 });
    expect(result.queued).toBe(1);
  });

  it("non recupera automaticamente un claim SMTP ambiguo", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });

    const result = await recoverStaleTransactionalEmails(
      new Date("2026-07-19T10:10:00.000Z"),
      "smtp",
    );

    expect(result).toEqual({ pending: 0, failed: 1 });
    expect(mocks.updateMany).toHaveBeenCalledTimes(1);
    expect(mocks.updateMany.mock.calls[0][0]).toMatchObject({
      where: { status: EMAIL_OUTBOX_STATUS.SENDING },
      data: { status: EMAIL_OUTBOX_STATUS.FAILED },
    });
    expect(mocks.queueAdd).not.toHaveBeenCalled();
  });

  it("non recupera automaticamente un claim Brevo legacy senza inizio consegna", async () => {
    mocks.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    const now = new Date("2026-07-19T10:10:00.000Z");
    const result = await recoverStaleTransactionalEmails(now, "brevo");

    expect(result).toEqual({ pending: 0, failed: 1 });
    expect(mocks.updateMany.mock.calls[0][0]).toMatchObject({
      where: {
        deliveryStartedAt: { gt: new Date("2026-07-19T09:56:00.000Z") },
      },
    });
    expect(mocks.updateMany.mock.calls[1][0]).toMatchObject({
      where: {
        AND: expect.arrayContaining([
          expect.objectContaining({
            OR: expect.arrayContaining([{ deliveryStartedAt: null }]),
          }),
        ]),
      },
    });
    expect(mocks.queueAdd).not.toHaveBeenCalled();
  });
});
