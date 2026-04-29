import { describe, it, expect, vi, beforeEach } from "vitest";

const enqueueTransactionalEmailMock = vi.fn().mockResolvedValue({
  outboxId: "email-1",
  accepted: true,
  alreadySent: false,
  queued: true,
});
const sendTelegramMock = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/email/outbox", () => ({
  enqueueTransactionalEmail: enqueueTransactionalEmailMock,
  buildEmailIdempotencyKey: vi.fn(() => "idem-test"),
}));
vi.mock("@/lib/notifications/telegram", () => ({
  sendTelegramMessage: sendTelegramMock,
  isTelegramConfigured: () => true,
}));

const OVERRIDE_TYPES = [
  "OVERRIDE_REQUESTED",
  "OVERRIDE_APPROVED",
  "OVERRIDE_REJECTED",
  "OVERRIDE_EXPIRED",
  "OVERRIDE_SUPERSEDED",
  "OVERRIDE_APOLOGY_LOSER",
  "OVERRIDE_RECONCILE_FAILED",
  "OVERRIDE_REMINDER",
  "CROSS_CHANNEL_CONFLICT",
] as const;

const CUSTOMER_OVERRIDE_TYPES = new Set([
  "OVERRIDE_REQUESTED",
  "OVERRIDE_APPROVED",
  "OVERRIDE_REJECTED",
  "OVERRIDE_EXPIRED",
  "OVERRIDE_SUPERSEDED",
  "OVERRIDE_APOLOGY_LOSER",
]);

describe("notification dispatcher — override types", () => {
  beforeEach(() => {
    enqueueTransactionalEmailMock.mockClear();
    sendTelegramMock.mockClear();
  });

  for (const type of OVERRIDE_TYPES) {
    it(`dispatches ${type} without crashing`, async () => {
      const { dispatchNotification } = await import("@/lib/notifications/dispatcher");
      const event = {
        type,
        // Esplicitamente solo EMAIL per evitare dipendenza Telegram config
        channels: ["EMAIL"],
        ...(CUSTOMER_OVERRIDE_TYPES.has(type)
          ? { recipientEmail: "mario@example.com", recipientName: "Mario" }
          : {}),
        payload: {
          customerName: "Mario",
          confirmationCode: "CODE1",
          serviceName: "Svc",
          startDate: "2026-08-15",
          numPeople: 2,
          amountPaid: "1000",
          bookingPortalUrl: "https://x.com",
          refundAmount: "1000",
          alternativeDates: ["2026-08-20"],
          contactEmail: "info@x.com",
          contactPhone: "+39 123",
          overrideRequestId: "REQ1",
          newBookingCode: "NEW1",
          upstreamConflicts: [],
          overrideDetailUrl: "https://x.com",
          boatId: "boat1",
          date: "2026-08-15",
          level: 1,
        },
      } as unknown as Parameters<typeof import("@/lib/notifications/dispatcher").dispatchNotification>[0];
      const res = await dispatchNotification(event);
      // Phase 7: dispatchNotification ora ritorna DispatchOutcome.
      // status === "ok" se entrambi i canali consegnati (qui solo EMAIL).
      expect(res.status === "ok" || res.status === "partial").toBe(true);
    });
  }
});
