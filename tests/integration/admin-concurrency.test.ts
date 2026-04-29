/**
 * Integration test — admin concurrency fixes (R25 + R26).
 *
 * Scenari coperti:
 *  1. R25-A2-C1: concurrent cancelBooking su stesso bookingId → lease Redis
 *     blocca secondo admin con ConflictError; solo 1 refundPayment chiamata.
 *  2. R25-A2-A3: concurrent resolveManualAlert updateMany claim → solo 1
 *     audit log, secondo skip silenzioso.
 *  3. R25-A2-A4: upsertPricingPeriod overlap check in tx + advisory lock →
 *     2 admin che creano period overlapping contemporaneamente, solo 1
 *     passa, secondo ValidationError.
 *  4. R23-S-CRITICA-2: onChargeRefunded dual-write — sibling Payment REFUND
 *     creato invece di overwrite original su partial refund.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { installRedisMock, resetRedisMock } from "../helpers/redis-mock";

// Shared prisma test instance — mock @/lib/db PRIMA di import modules.
let testPrisma: Awaited<ReturnType<typeof setupTestDb>>;
vi.mock("@/lib/db", () => ({
  get db() {
    return testPrisma;
  },
}));

// Redis mock share across lease + rate-limit.
vi.mock("@/lib/queue", () => {
  const mockQueue = () => ({ add: vi.fn().mockResolvedValue({ id: "job-mock" }) });
  return {
    getRedisConnection: () => installRedisMock(),
    syncQueue: mockQueue,
    availBokunQueue: mockQueue,
    availBoataroundQueue: mockQueue,
    availManualQueue: mockQueue,
    pricingBokunQueue: mockQueue,
    emailTransactionalQueue: mockQueue,
    getQueue: mockQueue,
    QUEUE_NAMES: {
      AVAIL_BOKUN: "sync.avail.bokun",
      AVAIL_BOATAROUND: "sync.avail.boataround",
      AVAIL_MANUAL: "sync.avail.manual",
      PRICING_BOKUN: "sync.pricing.bokun",
      EMAIL_TRANSACTIONAL: "email.transactional",
    },
    ALL_QUEUE_NAMES: [
      "sync.avail.bokun",
      "sync.avail.boataround",
      "sync.avail.manual",
      "sync.pricing.bokun",
    ],
  };
});

// Stripe helpers — track call count per concurrency assertion.
const refundPaymentMock = vi.fn().mockResolvedValue({ id: "re_mocked", status: "succeeded" });
const cancelPaymentIntentMock = vi
  .fn()
  .mockResolvedValue({ id: "pi_mocked", status: "canceled" });
// R27-CRIT-3: `getChargeRefundState` ritorna il residuo non ancora rimborsato
// via `stripe.charges.retrieve`. Mock default: intero charge come residuo
// (nessun partial refund upstream) → rimborsa tutto il Payment.
const getChargeRefundStateMock = vi.fn().mockResolvedValue({
  totalCents: 20000,
  refundedCents: 0,
  residualCents: 20000,
});
vi.mock("@/lib/stripe/payment-intents", () => ({
  refundPayment: refundPaymentMock,
  cancelPaymentIntent: cancelPaymentIntentMock,
  createPaymentIntent: vi.fn(),
  getChargeRefundState: getChargeRefundStateMock,
}));

vi.mock("@/lib/email/brevo", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatchNotification: vi.fn().mockResolvedValue({
    emailOk: true,
    telegramOk: false,
    anyOk: true,
    skipped: false,
  }),
  defaultNotificationChannels: vi.fn().mockReturnValue(["EMAIL"]),
}));

// Admin helpers — skip NextAuth session requireAdmin via env.
vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ userId: "test-admin-user" }),
}));

// revalidatePath è server-side Next helper — no-op in test.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Bokun pricing sync — skip external worker (non impatta test admin actions).
vi.mock("@/lib/pricing/bokun-sync", () => ({
  scheduleBokunPricingSync: vi.fn().mockResolvedValue(undefined),
}));

let db: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => {
  db = await setupTestDb();
  testPrisma = db;
  // test-admin-user deve esistere per FK auditLog.userId.
  await db.user.upsert({
    where: { id: "test-admin-user" },
    create: {
      id: "test-admin-user",
      email: "admin@test.local",
      passwordHash: "test",
      name: "Test Admin",
      role: "ADMIN",
    },
    update: {},
  });
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  await resetRedisMock();
  // ricrea user dopo truncate.
  await db.user.create({
    data: {
      id: "test-admin-user",
      email: "admin@test.local",
      passwordHash: "test",
      name: "Test Admin",
      role: "ADMIN",
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

async function seedBookingForCancel() {
  const boat = await db.boat.create({
    data: {
      id: "test-boat",
      name: "Test Boat",
      type: "TRIMARAN",
      description: "t",
      amenities: [],
      images: [],
    },
  });
  const service = await db.service.create({
    data: {
      id: "test-service",
      boatId: boat.id,
      name: "Test",
      type: "SOCIAL_BOATING",
      durationType: "FULL_DAY",
      durationHours: 8,
      capacityMax: 20,
      minPaying: 1,
      defaultPaymentSchedule: "FULL",
      active: true,
    },
  });
  const customer = await db.customer.create({
    data: { email: "c@example.com", firstName: "C", lastName: "X" },
  });
  const booking = await db.booking.create({
    data: {
      confirmationCode: "CONC1234",
      source: "DIRECT",
      customerId: customer.id,
      serviceId: service.id,
      boatId: boat.id,
      startDate: new Date("2026-07-15"),
      endDate: new Date("2026-07-15"),
      numPeople: 4,
      totalPrice: "400.00",
      status: "CONFIRMED",
      directBooking: {
        create: { paymentSchedule: "FULL", stripePaymentIntentId: "pi_conc" },
      },
      payments: {
        create: {
          amount: "400.00",
          type: "FULL",
          method: "STRIPE",
          status: "SUCCEEDED",
          stripeChargeId: "ch_conc_test",
          processedAt: new Date(),
        },
      },
    },
  });
  return { boat, service, customer, booking };
}

describe("R25-A2-C1: concurrent cancelBooking race", () => {
  it("2 admin concurrent cancel → 1 refund + 1 ConflictError, booking CANCELLED", async () => {
    const { booking } = await seedBookingForCancel();
    const { cancelBooking } = await import(
      "@/app/admin/(dashboard)/prenotazioni/actions"
    );

    const results = await Promise.allSettled([
      cancelBooking(booking.id),
      cancelBooking(booking.id),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Almeno uno deve fulfilled; idealmente uno succ + uno rejected con
    // ConflictError "gia' in corso". In caso di race fine (lease acquisito
    // in tempo diverso) entrambi possono fulfilled se secondo e' idempotent
    // (booking gia' CANCELLED check a inizio doCancelBooking).
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    // Invariante chiave: refund chiamato UNA VOLTA sola.
    // Senza il lease, entrambi i rami chiamavano stripe.refunds.create →
    // prima OK, seconda `charge_already_refunded` → errore.
    expect(refundPaymentMock).toHaveBeenCalledTimes(1);

    // Se secondo admin ha conflitto, verifica messaggio.
    if (rejected.length > 0) {
      const err = (rejected[0] as PromiseRejectedResult).reason;
      expect(err.message).toMatch(/gia' in corso|in corso/i);
    }

    // Booking deve essere CANCELLED (non REFUNDED perche' admin flow non
    // updata booking status a REFUNDED, solo a CANCELLED).
    const final = await db.booking.findUnique({ where: { id: booking.id } });
    expect(final?.status).toBe("CANCELLED");

    // Payment originale: REFUNDED. Sibling REFUND row creata.
    const payments = await db.payment.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: "asc" },
    });
    expect(payments.length).toBe(2); // original + REFUND sibling
    const refundRow = payments.find((p) => p.type === "REFUND");
    expect(refundRow).toBeDefined();
    expect(refundRow?.status).toBe("REFUNDED");
    expect(refundRow?.stripeChargeId).toBeNull();
    expect(refundRow?.stripeRefundId).toBeNull();
  }, 15_000);
});

describe("R25-A2-A3: resolveManualAlert updateMany guard", () => {
  it("2 resolve concorrenti → solo 1 audit log scritto", async () => {
    const { createManualAlert, resolveManualAlert } = await import(
      "@/lib/charter/manual-alerts"
    );
    await db.boat.create({
      data: {
        id: "alert-boat",
        name: "B",
        type: "TRIMARAN",
        description: "t",
        amenities: [],
        images: [],
      },
    });
    await createManualAlert({
      channel: "CLICKANDBOAT",
      boatId: "alert-boat",
      date: new Date("2026-07-20"),
      action: "BLOCK",
    });
    const alert = await db.manualAlert.findFirstOrThrow({
      where: { status: "PENDING" },
    });

    const [r1, r2] = await Promise.allSettled([
      resolveManualAlert(alert.id, "test-admin-user"),
      resolveManualAlert(alert.id, "test-admin-user"),
    ]);
    expect(r1.status).toBe("fulfilled");
    expect(r2.status).toBe("fulfilled");

    const auditRows = await db.auditLog.findMany({
      where: { action: "RESOLVE_MANUAL_ALERT", entityId: alert.id },
    });
    // Senza updateMany claim, ambedue scrivevano → count=2. Con claim solo 1.
    expect(auditRows).toHaveLength(1);

    const finalAlert = await db.manualAlert.findUnique({ where: { id: alert.id } });
    expect(finalAlert?.status).toBe("RESOLVED");
  });
});

describe("R25-A2-A4: upsertPricingPeriod overlap check in tx", () => {
  it("2 admin concurrent create overlapping period → 1 succ + 1 ValidationError", async () => {
    const boat = await db.boat.create({
      data: {
        id: "price-boat",
        name: "B",
        type: "TRIMARAN",
        description: "t",
        amenities: [],
        images: [],
      },
    });
    const service = await db.service.create({
      data: {
        id: "price-service",
        boatId: boat.id,
        name: "S",
        type: "BOAT_EXCLUSIVE",
        durationType: "FULL_DAY",
        durationHours: 8,
        capacityMax: 10,
        defaultPaymentSchedule: "FULL",
        active: true,
      },
    });

    const { upsertPricingPeriod } = await import(
      "@/app/admin/(dashboard)/prezzi/actions"
    );

    // Phase 6: action migrated to withAdminAction → returns {ok:true|false}
    // tuple instead of throw. Test asserts on the tuple shape.
    const results = await Promise.all([
      upsertPricingPeriod({
        serviceId: service.id,
        label: "Estate A",
        startDate: "2026-06-01",
        endDate: "2026-09-30",
        pricePerPerson: 100,
        year: 2026,
      }),
      upsertPricingPeriod({
        serviceId: service.id,
        label: "Estate B",
        startDate: "2026-07-01",
        endDate: "2026-08-31",
        pricePerPerson: 150,
        year: 2026,
      }),
    ]);

    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    // Advisory lock serializza dentro tx → esattamente 1 succ + 1 overlap.
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    const failedResult = failed[0];
    if (failedResult.ok) throw new Error("unreachable");
    expect(failedResult.message).toMatch(/Overlap/i);

    // DB deve avere 1 sola PricingPeriod per il service.
    const periods = await db.pricingPeriod.findMany({
      where: { serviceId: service.id },
    });
    expect(periods).toHaveLength(1);
  });
});
