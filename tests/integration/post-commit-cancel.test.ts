/**
 * Integration test — postCommitCancelBooking helper (Chunk 2a Task 2.0).
 *
 * Verifica:
 *  1. Happy path: Payment SUCCEEDED → refund + Payment REFUNDED + releaseDates
 *     chiamato + audit log scritto con azione `BOOKING_CANCELLED_BY_OVERRIDE`.
 *  2. Booking senza payments: skip refund, release + audit chiamati.
 *  3. Stripe refund failure: error collected in `refundsFailed[]`, NON throw,
 *     Payment resta SUCCEEDED (no state change on fail).
 *  4. releaseDates failure: `releaseOk=false`, non throw, audit scritto lo stesso.
 *  5. Booking non esistente → throw Error (caller error, non degradation).
 *  6. Payment con type=REFUND o senza stripeChargeId → skip (no refund tentato).
 *  7. Residual=0 (charge gia' rimborsato upstream) → skip refund call ma
 *     Payment marked REFUNDED, count refundsSucceeded++.
 *
 * Usa mocks Stripe + availability per isolare: il test e' integration-DB
 * (seed reale + audit log reale) ma service-level (no Stripe API, no fan-out).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { seedBoatAndService, seedBooking } from "../helpers/seed-override";

// Mocks devono stare sopra l'import del modulo under test.
const refundPaymentMock = vi.fn();
const getChargeRefundStateMock = vi.fn();
vi.mock("@/lib/stripe/payment-intents", () => ({
  refundPayment: refundPaymentMock,
  getChargeRefundState: getChargeRefundStateMock,
}));

const releaseDatesMock = vi.fn();
const blockDatesMock = vi.fn();
vi.mock("@/lib/availability/service", () => ({
  releaseDates: releaseDatesMock,
  blockDates: blockDatesMock,
}));

let testPrisma: Awaited<ReturnType<typeof setupTestDb>>;
vi.mock("@/lib/db", () => ({
  get db() {
    return testPrisma;
  },
}));

let db: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => {
  db = await setupTestDb();
  testPrisma = db;
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  vi.clearAllMocks();
  // Default mocks: refund OK, state residual=full, release OK.
  refundPaymentMock.mockResolvedValue({ id: "re_test_default", status: "succeeded" });
  getChargeRefundStateMock.mockResolvedValue({
    totalCents: 200000,
    refundedCents: 0,
    residualCents: 200000,
  });
  releaseDatesMock.mockResolvedValue(undefined);
});

describe("postCommitCancelBooking", () => {
  it("happy path: Payment SUCCEEDED → refund + release + audit", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const booking = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "2000.00",
      status: "CANCELLED", // il caller ha gia' settato nella tx sua
    });
    await db.payment.create({
      data: {
        bookingId: booking.id,
        amount: "2000.00",
        type: "FULL",
        method: "STRIPE",
        status: "SUCCEEDED",
        stripeChargeId: "ch_test_123",
        processedAt: new Date(),
      },
    });

    const { postCommitCancelBooking } = await import(
      "@/lib/booking/post-commit-cancel"
    );
    const res = await postCommitCancelBooking({
      bookingId: booking.id,
      actorUserId: null,
      reason: "override_rejected",
    });

    expect(res.refundsAttempted).toBe(1);
    expect(res.refundsSucceeded).toBe(1);
    expect(res.refundsFailed).toEqual([]);
    expect(res.releaseOk).toBe(true);

    expect(refundPaymentMock).toHaveBeenCalledWith("ch_test_123", 200000);
    expect(releaseDatesMock).toHaveBeenCalledWith(
      boat.id,
      booking.startDate,
      booking.endDate,
      "DIRECT",
    );

    // Payment marked REFUNDED
    const payments = await db.payment.findMany({ where: { bookingId: booking.id } });
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe("REFUNDED");

    // Audit log scritto
    const audit = await db.auditLog.findMany({
      where: { action: "BOOKING_CANCELLED_BY_OVERRIDE", entityId: booking.id },
    });
    expect(audit).toHaveLength(1);
    const after = audit[0].after as Record<string, unknown>;
    expect(after.reason).toBe("override_rejected");
    expect(after.refundsSucceeded).toBe(1);
    expect(after.releaseOk).toBe(true);
  });

  it("booking senza payments: skip refund, release + audit ok", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const booking = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      status: "CANCELLED",
    });
    // Seed User per FK auditLog.userId (altrimenti auditLog fallisce silent).
    const user = await db.user.create({
      data: {
        email: "admin-test@egadisailing.test",
        passwordHash: "x",
        name: "Admin Test",
        role: "ADMIN",
      },
    });

    const { postCommitCancelBooking } = await import(
      "@/lib/booking/post-commit-cancel"
    );
    const res = await postCommitCancelBooking({
      bookingId: booking.id,
      actorUserId: user.id,
      reason: "override_approved",
    });

    expect(res.refundsAttempted).toBe(0);
    expect(res.refundsSucceeded).toBe(0);
    expect(refundPaymentMock).not.toHaveBeenCalled();
    expect(releaseDatesMock).toHaveBeenCalledOnce();

    const audit = await db.auditLog.findMany({
      where: { entityId: booking.id },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0].userId).toBe(user.id);
  });

  it("Stripe refund failure: error collected, NON throw, Payment resta SUCCEEDED", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const booking = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "1000.00",
      status: "CANCELLED",
    });
    const payment = await db.payment.create({
      data: {
        bookingId: booking.id,
        amount: "1000.00",
        type: "FULL",
        method: "STRIPE",
        status: "SUCCEEDED",
        stripeChargeId: "ch_test_fail",
        processedAt: new Date(),
      },
    });

    refundPaymentMock.mockRejectedValueOnce(new Error("Stripe: network error"));

    const { postCommitCancelBooking } = await import(
      "@/lib/booking/post-commit-cancel"
    );
    const res = await postCommitCancelBooking({
      bookingId: booking.id,
      actorUserId: null,
      reason: "override_expired",
    });

    expect(res.refundsAttempted).toBe(1);
    expect(res.refundsSucceeded).toBe(0);
    expect(res.refundsFailed).toHaveLength(1);
    expect(res.refundsFailed[0].paymentId).toBe(payment.id);
    expect(res.refundsFailed[0].message).toMatch(/network/i);
    expect(res.releaseOk).toBe(true);

    // Payment status NON cambiato (refund ha fallito)
    const reloaded = await db.payment.findUnique({ where: { id: payment.id } });
    expect(reloaded?.status).toBe("SUCCEEDED");

    // Release chiamato comunque (indipendente da refund)
    expect(releaseDatesMock).toHaveBeenCalledOnce();

    // Audit log riflette il fallimento
    const audit = await db.auditLog.findMany({
      where: { entityId: booking.id },
    });
    const after = audit[0].after as Record<string, unknown>;
    expect(after.refundsFailed).toBe(1);
    expect(after.refundsSucceeded).toBe(0);
  });

  it("releaseDates failure: releaseOk=false, audit scritto lo stesso", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const booking = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      status: "CANCELLED",
    });

    releaseDatesMock.mockRejectedValueOnce(new Error("Advisory lock timeout"));

    const { postCommitCancelBooking } = await import(
      "@/lib/booking/post-commit-cancel"
    );
    const res = await postCommitCancelBooking({
      bookingId: booking.id,
      actorUserId: null,
      reason: "override_superseded",
    });

    expect(res.releaseOk).toBe(false);

    const audit = await db.auditLog.findMany({
      where: { entityId: booking.id },
    });
    expect(audit).toHaveLength(1);
    const after = audit[0].after as Record<string, unknown>;
    expect(after.releaseOk).toBe(false);
  });

  it("booking non esistente → throw Error", async () => {
    const { postCommitCancelBooking } = await import(
      "@/lib/booking/post-commit-cancel"
    );
    await expect(
      postCommitCancelBooking({
        bookingId: "non-existent",
        actorUserId: null,
        reason: "override_rejected",
      }),
    ).rejects.toThrow(/not found/i);
  });

  it("skip Payment type=REFUND o senza stripeChargeId", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const booking = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      status: "CANCELLED",
    });
    // Payment con type=REFUND (sibling) + uno senza chargeId (manual cash).
    await db.payment.create({
      data: {
        bookingId: booking.id,
        amount: "500.00",
        type: "REFUND",
        method: "STRIPE",
        status: "SUCCEEDED",
        stripeChargeId: "ch_sibling", // anche con charge, type=REFUND skip
        processedAt: new Date(),
      },
    });
    await db.payment.create({
      data: {
        bookingId: booking.id,
        amount: "300.00",
        type: "FULL",
        method: "CASH",
        status: "SUCCEEDED",
        // nessun stripeChargeId
        processedAt: new Date(),
      },
    });

    const { postCommitCancelBooking } = await import(
      "@/lib/booking/post-commit-cancel"
    );
    const res = await postCommitCancelBooking({
      bookingId: booking.id,
      actorUserId: null,
      reason: "override_approved",
    });

    expect(res.refundsAttempted).toBe(0);
    expect(refundPaymentMock).not.toHaveBeenCalled();
  });

  it("residual=0 (charge gia' rimborsato upstream): skip refund call, marca REFUNDED", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const booking = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      status: "CANCELLED",
    });
    const payment = await db.payment.create({
      data: {
        bookingId: booking.id,
        amount: "500.00",
        type: "FULL",
        method: "STRIPE",
        status: "SUCCEEDED",
        stripeChargeId: "ch_already_refunded",
        processedAt: new Date(),
      },
    });

    getChargeRefundStateMock.mockResolvedValueOnce({
      totalCents: 50000,
      refundedCents: 50000,
      residualCents: 0,
    });

    const { postCommitCancelBooking } = await import(
      "@/lib/booking/post-commit-cancel"
    );
    const res = await postCommitCancelBooking({
      bookingId: booking.id,
      actorUserId: null,
      reason: "override_rejected",
    });

    expect(res.refundsAttempted).toBe(1);
    expect(res.refundsSucceeded).toBe(1);
    expect(refundPaymentMock).not.toHaveBeenCalled(); // skip se residual=0

    const reloaded = await db.payment.findUnique({ where: { id: payment.id } });
    expect(reloaded?.status).toBe("REFUNDED");
  });

  it("throws se booking status != CANCELLED (race window guard)", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const booking = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "2000.00",
      status: "CONFIRMED", // NOT cancelled
    });

    const { postCommitCancelBooking } = await import(
      "@/lib/booking/post-commit-cancel"
    );
    await expect(
      postCommitCancelBooking({
        bookingId: booking.id,
        actorUserId: null,
        reason: "override_rejected",
      }),
    ).rejects.toThrow(/status CONFIRMED, expected CANCELLED/);
  });
});
