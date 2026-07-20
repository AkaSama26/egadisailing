import { beforeEach, describe, expect, it, vi } from "vitest";

interface EmailJobData {
  emailOutboxId: string;
}

const mocks = vi.hoisted(() => ({
  handler: undefined as undefined | ((data: EmailJobData) => Promise<void>),
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  updateMany: vi.fn(),
  sendEmailWithResult: vi.fn(),
}));

vi.mock("@/lib/queue", () => ({
  QUEUE_NAMES: { EMAIL_TRANSACTIONAL: "email.transactional" },
}));
vi.mock("@/lib/queue/define-worker", () => ({
  defineWorker: vi.fn((config: { handler: (data: EmailJobData) => Promise<void> }) => {
    mocks.handler = config.handler;
    return { name: "email.transactional" };
  }),
}));
vi.mock("@/lib/db", () => ({
  db: {
    emailOutbox: {
      findUnique: mocks.findUnique,
      findUniqueOrThrow: mocks.findUniqueOrThrow,
      updateMany: mocks.updateMany,
    },
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn() },
}));
vi.mock("@/lib/email/brevo", () => ({
  sendEmailWithResult: mocks.sendEmailWithResult,
}));
vi.mock("@/lib/email/outbox", () => ({
  EMAIL_OUTBOX_STATUS: {
    PENDING: "PENDING",
    SENDING: "SENDING",
    SENT: "SENT",
    FAILED: "FAILED",
    DISMISSED: "DISMISSED",
  },
  MAX_EMAIL_ATTEMPTS: 5,
  SENDING_VISIBILITY_TIMEOUT_MS: 180_000,
  emailDeliveryWindowExpired: vi.fn().mockReturnValue(false),
  emailProviderIdempotencyKey: vi.fn().mockReturnValue("provider-key"),
  emailRetryPolicy: vi.fn().mockReturnValue({ finalFailure: true, delayMinutes: 5 }),
  isHistoricalEmailResolution: vi.fn((reason?: string | null) =>
    reason?.startsWith("Historical cutover: archived; owner decision: never send") ?? false,
  ),
}));
vi.mock("@/lib/env", () => ({
  env: { EMAIL_DELIVERY_MODE: "brevo" },
}));

import { startTransactionalEmailWorker } from "./transactional-email-worker";

const baseEmail = {
  id: "outbox-1",
  status: "PENDING",
  attempts: 0,
  deliveryStartedAt: null,
  resolutionReason: null,
  historicalDismissedAt: null,
};

async function runJob() {
  expect(mocks.handler).toBeTypeOf("function");
  await mocks.handler!({ emailOutboxId: "outbox-1" });
}

describe("transactional email worker terminal and idempotent behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handler = undefined;
    startTransactionalEmailWorker();
  });

  it.each(["SENT", "DISMISSED"])("non reinvia un record terminale %s", async (status) => {
    mocks.findUnique.mockResolvedValueOnce({ ...baseEmail, status });

    await runJob();

    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.sendEmailWithResult).not.toHaveBeenCalled();
  });

  it("non invia una email storica anche se lo status fosse alterato a PENDING", async () => {
    mocks.findUnique.mockResolvedValueOnce({
      ...baseEmail,
      status: "PENDING",
      historicalDismissedAt: new Date("2026-07-19T12:00:00.000Z"),
      resolutionReason:
        "Historical cutover: archived; owner decision: never send; booking date 2026-08-14",
    });

    await runJob();

    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.sendEmailWithResult).not.toHaveBeenCalled();
  });

  it("rende FAILED un tentativo legacy ambiguo senza inviarlo", async () => {
    mocks.findUnique.mockResolvedValueOnce({
      ...baseEmail,
      attempts: 1,
      deliveryStartedAt: null,
    });
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });

    await runJob();

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "outbox-1",
          status: "PENDING",
          attempts: { gt: 0 },
          deliveryStartedAt: null,
        }),
        data: expect.objectContaining({
          status: "FAILED",
          lastError: expect.stringContaining("manual Brevo verification"),
        }),
      }),
    );
    expect(mocks.sendEmailWithResult).not.toHaveBeenCalled();
  });

  it("una doppia esecuzione invia una sola volta grazie al claim CAS", async () => {
    mocks.findUnique.mockResolvedValue({ ...baseEmail });
    mocks.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    mocks.findUniqueOrThrow.mockResolvedValueOnce({
      id: "outbox-1",
      attempts: 1,
      recipientEmail: "customer@example.com",
      recipientName: "Cliente",
      replyToEmail: null,
      replyToName: null,
      subject: "Conferma",
      htmlContent: "<p>Conferma</p>",
      textContent: "Conferma",
      idempotencyKey: "business-key",
      deliveryStartedAt: new Date(),
    });
    mocks.sendEmailWithResult.mockResolvedValueOnce({
      delivered: true,
      messageId: "brevo-message-1",
    });

    await runJob();
    await runJob();

    expect(mocks.sendEmailWithResult).toHaveBeenCalledOnce();
    expect(mocks.sendEmailWithResult).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "provider-key" }),
    );
  });
});
