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
const { refundPaymentMock, getChargeRefundStateMock, releaseDatesMock, blockDatesMock } =
  vi.hoisted(() => ({
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
  sendEmail: vi.fn().mockResolvedValue(true),
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
});
