import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { seedBoatAndService, seedBooking } from "../helpers/seed-override";
import { createOverrideRequest } from "@/lib/booking/override-request";
import Decimal from "decimal.js";

// approveOverride usa db module-level: mock per dirottarlo al test client.
let db: Awaited<ReturnType<typeof setupTestDb>>;
vi.mock("@/lib/db", () => ({
  get db() {
    return db;
  },
}));

// Task 2.5: mock Stripe + availability + queue + email.
// vi.hoisted needed because vi.mock factories execute before top-level const init.
const {
  refundPaymentMock,
  getChargeRefundStateMock,
  releaseDatesMock,
  blockDatesMock,
  sendEmailMock,
} = vi.hoisted(() => ({
  refundPaymentMock: vi
    .fn()
    .mockResolvedValue({ id: "re_test", status: "succeeded" }),
  getChargeRefundStateMock: vi.fn().mockResolvedValue({
    totalCents: 200000,
    refundedCents: 0,
    residualCents: 200000,
  }),
  releaseDatesMock: vi.fn().mockResolvedValue(undefined),
  blockDatesMock: vi.fn().mockResolvedValue(undefined),
  sendEmailMock: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/stripe/payment-intents", () => ({
  refundPayment: refundPaymentMock,
  getChargeRefundState: getChargeRefundStateMock,
  cancelPaymentIntent: vi.fn(),
  createPaymentIntent: vi.fn(),
}));

vi.mock("@/lib/availability/service", () => ({
  releaseDates: releaseDatesMock,
  blockDates: blockDatesMock,
  updateAvailability: vi.fn(),
}));

vi.mock("@/lib/queue", () => ({
  getRedisConnection: () => ({ quit: vi.fn() }),
  syncQueue: () => ({ add: vi.fn() }),
  availBokunQueue: () => ({ add: vi.fn() }),
  availBoataroundQueue: () => ({ add: vi.fn() }),
  availManualQueue: () => ({ add: vi.fn() }),
  pricingBokunQueue: () => ({ add: vi.fn() }),
  getQueue: () => ({ add: vi.fn() }),
  QUEUE_NAMES: { AVAIL_BOKUN: "x", AVAIL_BOATAROUND: "x", AVAIL_MANUAL: "x", PRICING_BOKUN: "x" },
  ALL_QUEUE_NAMES: [],
}));

vi.mock("@/lib/email/brevo", () => ({
  sendEmail: sendEmailMock,
}));

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestDb();
});

describe("createOverrideRequest", () => {
  it("persiste OverrideRequest PENDING con tutti i campi", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const newBooking = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "3000.00",
      status: "PENDING",
    });
    const conflict = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "2000.00",
      status: "CONFIRMED",
      startDate: new Date("2026-08-14"),
      endDate: new Date("2026-08-16"),
    });

    const result = await db.$transaction(async (tx) => {
      return createOverrideRequest(tx, {
        newBookingId: newBooking.id,
        conflictingBookingIds: [conflict.id],
        conflictSourceChannels: ["DIRECT"],
        newBookingRevenue: new Decimal("3000.00"),
        conflictingRevenueTotal: new Decimal("2000.00"),
        dropDeadAt: new Date("2026-07-31"),
      });
    });

    expect(result.requestId).toBeDefined();
    expect(result.supersededRequestIds).toEqual([]);

    const or = await db.overrideRequest.findUnique({
      where: { id: result.requestId },
    });
    expect(or?.status).toBe("PENDING");
    expect(or?.newBookingId).toBe(newBooking.id);
    expect(or?.conflictingBookingIds).toEqual([conflict.id]);
    expect(or?.newBookingRevenue.toString()).toBe("3000");
    expect(or?.conflictingRevenueTotal.toString()).toBe("2000");
    expect(or?.dropDeadAt.toISOString()).toBe("2026-07-31T00:00:00.000Z");
    expect(or?.reminderLevel).toBe(0);
    expect(or?.lastReminderSentAt).toBeNull();
  });

  it("crea request + supersede richiesta inferiore esistente", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const conflictBooking = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "1000.00",
      status: "CONFIRMED",
    });

    // Prima request: Laura Gourmet €2000
    const laura = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "2000.00",
      status: "PENDING",
    });
    const lauraRequest = await db.$transaction((tx) =>
      createOverrideRequest(tx, {
        newBookingId: laura.id,
        conflictingBookingIds: [conflictBooking.id],
        newBookingRevenue: new Decimal("2000.00"),
        conflictingRevenueTotal: new Decimal("1000.00"),
        dropDeadAt: new Date("2026-07-31"),
      }),
    );

    // Seconda request: Sofia Charter €7500
    const sofia = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "7500.00",
      status: "PENDING",
    });
    const sofiaRequest = await db.$transaction((tx) =>
      createOverrideRequest(tx, {
        newBookingId: sofia.id,
        conflictingBookingIds: [conflictBooking.id],
        newBookingRevenue: new Decimal("7500.00"),
        conflictingRevenueTotal: new Decimal("1000.00"),
        dropDeadAt: new Date("2026-07-31"),
      }),
    );

    // Sofia deve aver supersed laura
    expect(sofiaRequest.supersededRequestIds).toEqual([lauraRequest.requestId]);

    const lauraUpdated = await db.overrideRequest.findUnique({
      where: { id: lauraRequest.requestId },
    });
    expect(lauraUpdated?.status).toBe("REJECTED");
    expect(lauraUpdated?.decisionNotes).toContain("auto-superseded by request");
    expect(lauraUpdated?.decisionNotes).toContain(sofiaRequest.requestId);
    expect(lauraUpdated?.decisionNotes).toContain("€7500.00");

    const lauraBookingUpdated = await db.booking.findUnique({
      where: { id: laura.id },
    });
    expect(lauraBookingUpdated?.status).toBe("CANCELLED");
  });

  it("NON supersede richiesta a revenue pari (solo strict greater)", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const conflict = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "1000.00",
      status: "CONFIRMED",
    });

    const laura = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "2000.00",
      status: "PENDING",
    });
    const lauraRequest = await db.$transaction((tx) =>
      createOverrideRequest(tx, {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        newBookingRevenue: new Decimal("2000.00"),
        conflictingRevenueTotal: new Decimal("1000.00"),
        dropDeadAt: new Date("2026-07-31"),
      }),
    );

    // Sofia con STESSO revenue (2000) — NON deve superare Laura
    const sofia = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "2000.00",
      status: "PENDING",
    });
    const sofiaRequest = await db.$transaction((tx) =>
      createOverrideRequest(tx, {
        newBookingId: sofia.id,
        conflictingBookingIds: [conflict.id],
        newBookingRevenue: new Decimal("2000.00"),
        conflictingRevenueTotal: new Decimal("1000.00"),
        dropDeadAt: new Date("2026-07-31"),
      }),
    );

    expect(sofiaRequest.supersededRequestIds).toEqual([]);

    const lauraUpdated = await db.overrideRequest.findUnique({
      where: { id: lauraRequest.requestId },
    });
    expect(lauraUpdated?.status).toBe("PENDING"); // NOT rejected
  });

  it("supersede preserva conflictSourceChannels del request originale (multi-source)", async () => {
    const { boat, service } = await seedBoatAndService(db);
    // Conflict misto: 1 DIRECT + 1 BOKUN
    const conflictDirect = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "1000.00",
      status: "CONFIRMED",
    });
    const customerBokun = await db.customer.create({
      data: { email: "bk@x.com", firstName: "B", lastName: "K" },
    });
    const conflictBokun = await db.booking.create({
      data: {
        confirmationCode: "BK000001",
        source: "BOKUN",
        customerId: customerBokun.id,
        serviceId: service.id,
        boatId: boat.id,
        startDate: new Date("2026-08-15"),
        endDate: new Date("2026-08-15"),
        numPeople: 2,
        totalPrice: "800.00",
        status: "CONFIRMED",
      },
    });

    const laura = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "2000.00",
      status: "PENDING",
    });
    const lauraReq = await db.$transaction((tx) =>
      createOverrideRequest(tx, {
        newBookingId: laura.id,
        conflictingBookingIds: [conflictDirect.id, conflictBokun.id],
        newBookingRevenue: new Decimal("2000.00"),
        conflictingRevenueTotal: new Decimal("1800.00"),
        dropDeadAt: new Date("2026-07-31"),
      }),
    );

    const or = await db.overrideRequest.findUnique({
      where: { id: lauraReq.requestId },
    });
    expect(or?.conflictSourceChannels.sort()).toEqual(["BOKUN", "DIRECT"]);
  });
});

describe("approveOverride", () => {
  it("approva: cancella conflicts, conferma newBooking, update status", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000.00", status: "CONFIRMED",
    });
    const laura = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000.00", status: "PENDING",
    });
    const adminUser = await db.user.create({
      data: {
        email: "admin@test.com",
        passwordHash: "x",
        name: "Admin",
        role: "ADMIN",
      },
    });
    const req = await db.$transaction((tx) =>
      createOverrideRequest(tx, {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        newBookingRevenue: new Decimal("3000.00"),
        conflictingRevenueTotal: new Decimal("2000.00"),
        dropDeadAt: new Date("2026-07-31"),
      }),
    );

    const { approveOverride } = await import("@/lib/booking/override-request");
    const result = await approveOverride(req.requestId, adminUser.id, "test approve");

    expect(result.approved).toBe(true);

    const orUpdated = await db.overrideRequest.findUnique({
      where: { id: req.requestId },
    });
    expect(orUpdated?.status).toBe("APPROVED");
    expect(orUpdated?.decidedByUserId).toBe(adminUser.id);
    expect(orUpdated?.decisionNotes).toBe("test approve");

    const conflictUpdated = await db.booking.findUnique({ where: { id: conflict.id } });
    expect(conflictUpdated?.status).toBe("CANCELLED");

    const lauraUpdated = await db.booking.findUnique({ where: { id: laura.id } });
    expect(lauraUpdated?.status).toBe("CONFIRMED");
  });

  it("approva: triggers refund conflict + releaseDates + blockDates newBooking", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000.00", status: "CONFIRMED",
    });
    await db.payment.create({
      data: {
        bookingId: conflict.id, amount: "2000.00",
        type: "FULL", method: "STRIPE", status: "SUCCEEDED",
        stripeChargeId: "ch_test_conflict",
        processedAt: new Date(),
      },
    });
    const laura = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000.00", status: "PENDING",
    });
    const admin = await db.user.create({
      data: { email: "admin-approve-post@t.com", passwordHash: "x", name: "A", role: "ADMIN" },
    });
    const req = await db.$transaction((tx) =>
      createOverrideRequest(tx, {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        newBookingRevenue: new Decimal("3000"),
        conflictingRevenueTotal: new Decimal("2000"),
        dropDeadAt: new Date("2026-07-31"),
      }),
    );

    // Reset mocks AFTER seed (seed doesn't call them, but safety)
    refundPaymentMock.mockClear();
    releaseDatesMock.mockClear();
    blockDatesMock.mockClear();

    const { approveOverride } = await import("@/lib/booking/override-request");
    const result = await approveOverride(req.requestId, admin.id);

    expect(result.approved).toBe(true);
    expect(result.refundErrors).toEqual([]);

    // Verify conflict booking passed through postCommitCancelBooking
    expect(refundPaymentMock).toHaveBeenCalledWith("ch_test_conflict", 200000);
    expect(releaseDatesMock).toHaveBeenCalled();

    // Verify newBooking got blockDates
    expect(blockDatesMock).toHaveBeenCalled();

    // Verify Payment.status flipped to REFUNDED in DB
    const refundedPayment = await db.payment.findFirst({
      where: { bookingId: conflict.id },
    });
    expect(refundedPayment?.status).toBe("REFUNDED");
  });

  it("approva: invia email apology al loser + audit log OVERRIDE_APPROVED", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000.00", status: "CONFIRMED",
    });
    await db.payment.create({
      data: {
        bookingId: conflict.id, amount: "2000.00",
        type: "FULL", method: "STRIPE", status: "SUCCEEDED",
        stripeChargeId: "ch_test_2_6",
        processedAt: new Date(),
      },
    });
    const laura = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000.00", status: "PENDING",
    });
    const admin = await db.user.create({
      data: { email: "admin-2-6@t.com", passwordHash: "x", name: "A", role: "ADMIN" },
    });
    const req = await db.$transaction((tx) =>
      createOverrideRequest(tx, {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        newBookingRevenue: new Decimal("3000"),
        conflictingRevenueTotal: new Decimal("2000"),
        dropDeadAt: new Date("2026-07-31"),
      }),
    );

    // Load conflict email for later assertion (seed helper auto-generates)
    const conflictLoaded = await db.booking.findUnique({
      where: { id: conflict.id },
      include: { customer: { select: { email: true } } },
    });
    const conflictEmail = conflictLoaded!.customer.email;

    sendEmailMock.mockClear();

    const { approveOverride } = await import("@/lib/booking/override-request");
    const result = await approveOverride(req.requestId, admin.id);

    expect(result.approved).toBe(true);

    // sendEmail chiamato con email del conflict (loser)
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: conflictEmail,
      subject: expect.stringContaining("scusiamo"),
    }));

    expect(result.emailsSent).toBe(1);
    expect(result.emailsFailed).toBe(0);

    // Audit log creato
    const auditLogs = await db.auditLog.findMany({
      where: { action: "OVERRIDE_APPROVED", entityId: req.requestId },
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.userId).toBe(admin.id);
  });
});

describe("rejectOverride", () => {
  it("rifiuta: cancella newBooking, refund, email, audit REJECTED", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const laura = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000.00", status: "PENDING",
    });
    await db.payment.create({
      data: {
        bookingId: laura.id, amount: "3000.00",
        type: "FULL", method: "STRIPE", status: "SUCCEEDED",
        stripeChargeId: "ch_laura_new_reject",
        processedAt: new Date(),
      },
    });
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000.00", status: "CONFIRMED",
    });
    const admin = await db.user.create({
      data: { email: "admin-reject@t.com", passwordHash: "x", name: "A", role: "ADMIN" },
    });
    const req = await db.$transaction((tx) =>
      createOverrideRequest(tx, {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        newBookingRevenue: new Decimal("3000"),
        conflictingRevenueTotal: new Decimal("2000"),
        dropDeadAt: new Date("2026-07-31"),
      }),
    );

    refundPaymentMock.mockClear();
    sendEmailMock.mockClear();
    getChargeRefundStateMock.mockResolvedValueOnce({
      totalCents: 300000,
      refundedCents: 0,
      residualCents: 300000,
    });

    const { rejectOverride } = await import("@/lib/booking/override-request");
    const result = await rejectOverride(req.requestId, admin.id, "too aggressive");

    expect(result.rejected).toBe(true);
    expect(result.refundOk).toBe(true);

    const lauraUpdated = await db.booking.findUnique({ where: { id: laura.id } });
    expect(lauraUpdated?.status).toBe("CANCELLED");

    // Conflict INVARIATO
    const conflictUpdated = await db.booking.findUnique({ where: { id: conflict.id } });
    expect(conflictUpdated?.status).toBe("CONFIRMED");

    expect(refundPaymentMock).toHaveBeenCalledWith("ch_laura_new_reject", 300000);

    const auditLogs = await db.auditLog.findMany({
      where: { action: "OVERRIDE_REJECTED", entityId: req.requestId },
    });
    expect(auditLogs).toHaveLength(1);
  });
});

describe("expireDropDeadRequests", () => {
  it("espira solo richieste PENDING con dropDeadAt <= now", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const laura = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000", status: "PENDING",
    });
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000", status: "CONFIRMED",
    });

    // Request già scaduta (dropDeadAt nel passato)
    const expired = await db.overrideRequest.create({
      data: {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        conflictSourceChannels: ["DIRECT"],
        newBookingRevenue: "3000",
        conflictingRevenueTotal: "2000",
        dropDeadAt: new Date("2020-01-01"),
        status: "PENDING",
      },
    });

    // CANCEL laura manually first so the postCommitCancelBooking guard passes
    // (the helper requires booking.status === "CANCELLED" at call time,
    // but our code does the cancel inside tx BEFORE the helper, so it should work)

    const { expireDropDeadRequests } = await import("@/lib/booking/override-request");
    const result = await expireDropDeadRequests();

    expect(result.expired).toBeGreaterThanOrEqual(1);

    const expiredReq = await db.overrideRequest.findUnique({ where: { id: expired.id } });
    expect(expiredReq?.status).toBe("EXPIRED");

    const lauraUpdated = await db.booking.findUnique({ where: { id: laura.id } });
    expect(lauraUpdated?.status).toBe("CANCELLED");

    // Conflict INVARIATO
    const conflictUpdated = await db.booking.findUnique({ where: { id: conflict.id } });
    expect(conflictUpdated?.status).toBe("CONFIRMED");
  });

  it("NON espira PENDING con dropDeadAt in futuro", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const laura = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000", status: "PENDING",
    });
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000", status: "CONFIRMED",
    });
    const futureReq = await db.overrideRequest.create({
      data: {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        conflictSourceChannels: ["DIRECT"],
        newBookingRevenue: "3000",
        conflictingRevenueTotal: "2000",
        dropDeadAt: new Date("2099-01-01"), // futuro
        status: "PENDING",
      },
    });

    const { expireDropDeadRequests } = await import("@/lib/booking/override-request");
    await expireDropDeadRequests();

    const stillPending = await db.overrideRequest.findUnique({ where: { id: futureReq.id } });
    expect(stillPending?.status).toBe("PENDING");

    const lauraStillPending = await db.booking.findUnique({ where: { id: laura.id } });
    expect(lauraStillPending?.status).toBe("PENDING");
  });
});

describe("sendEscalationReminders", () => {
  it("24h reminderLevel 0 → 1, email sent", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const laura = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000.00", status: "PENDING",
    });
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000.00", status: "CONFIRMED",
    });
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    sendEmailMock.mockClear();

    const req = await db.overrideRequest.create({
      data: {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        conflictSourceChannels: ["DIRECT"],
        newBookingRevenue: "3000",
        conflictingRevenueTotal: "2000",
        dropDeadAt: new Date("2026-12-31"),
        status: "PENDING",
        createdAt: yesterday,
        reminderLevel: 0,
      },
    });

    const { sendEscalationReminders } = await import("@/lib/booking/override-request");
    const result = await sendEscalationReminders();

    expect(result.sent).toBe(1);
    expect(result.errors).toBe(0);
    const updated = await db.overrideRequest.findUnique({ where: { id: req.id } });
    expect(updated?.reminderLevel).toBe(1);
    expect(updated?.lastReminderSentAt).not.toBeNull();
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining("pending") }),
    );
  });

  it("già reminder 24h inviato 12h fa → NON re-invia", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const laura = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000.00", status: "PENDING",
    });
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000.00", status: "CONFIRMED",
    });
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    sendEmailMock.mockClear();

    const req = await db.overrideRequest.create({
      data: {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        conflictSourceChannels: ["DIRECT"],
        newBookingRevenue: "3000",
        conflictingRevenueTotal: "2000",
        dropDeadAt: new Date("2026-12-31"),
        status: "PENDING",
        createdAt: twoDaysAgo,
        reminderLevel: 1,
        lastReminderSentAt: twelveHoursAgo,
      },
    });

    const { sendEscalationReminders } = await import("@/lib/booking/override-request");
    const result = await sendEscalationReminders();

    expect(result.sent).toBe(0);
    const updated = await db.overrideRequest.findUnique({ where: { id: req.id } });
    expect(updated?.reminderLevel).toBe(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("status REJECTED non riceve reminder", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const laura = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000.00", status: "CANCELLED",
    });
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000.00", status: "CONFIRMED",
    });
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    sendEmailMock.mockClear();

    await db.overrideRequest.create({
      data: {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        conflictSourceChannels: ["DIRECT"],
        newBookingRevenue: "3000",
        conflictingRevenueTotal: "2000",
        dropDeadAt: new Date("2026-12-31"),
        status: "REJECTED",
        createdAt: yesterday,
        reminderLevel: 0,
      },
    });

    const { sendEscalationReminders } = await import("@/lib/booking/override-request");
    const result = await sendEscalationReminders();

    expect(result.sent).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
