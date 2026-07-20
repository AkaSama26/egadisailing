import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueueTransactionalEmail: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    ADMIN_EMAIL: "admin@example.invalid",
    BREVO_SENDER_EMAIL: "sender@example.invalid",
    TELEGRAM_NOTIFICATIONS_ENABLED: false,
  },
}));
vi.mock("@/lib/email/outbox", () => ({
  buildEmailIdempotencyKey: () => "test-key",
  enqueueTransactionalEmail: mocks.enqueueTransactionalEmail,
}));
vi.mock("./telegram", () => ({ sendTelegramMessage: vi.fn() }));

import { dispatchNotification, toDispatchResult } from "./dispatcher";

describe("dispatchNotification outbox state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("non avanza il caller quando l'outbox FAILED richiede risoluzione", async () => {
    mocks.enqueueTransactionalEmail.mockResolvedValueOnce({
      outboxId: "e-failed",
      accepted: false,
      alreadySent: false,
      dismissed: false,
      needsResolution: true,
      queued: false,
    });

    const outcome = await dispatchNotification({
      type: "OVERRIDE_REMINDER",
      channels: ["EMAIL"],
      payload: { confirmationCode: "ABC123", level: 1 },
    });

    expect(outcome.status).toBe("failed");
    expect(toDispatchResult(outcome)).toMatchObject({
      emailOk: false,
      anyOk: false,
    });
  });
});
