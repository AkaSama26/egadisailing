/**
 * Integration test — createPendingDirectBooking race + overlap (R7+R20).
 *
 * Scenari:
 *  1. Advisory lock: 2 richieste concorrenti stesso slot → solo 1 crea
 *     booking, secondo ConflictError.
 *  2. Pre-check #1 BoatAvailability BLOCKED → ConflictError.
 *  3. Pre-check #2 Booking overlap PENDING/CONFIRMED → ConflictError.
 *  4. R20-A1-1: retry-window self-cliente PENDING esclusione → stesso
 *     customer retry entro 44min supera pre-check (vecchio PENDING ignorato).
 *  5. GDPR consent mancante → ValidationError.
 *  6. numPeople > capacityMax → ValidationError.
 *  7. startDate passato (R22-P2-MEDIA-2 parseDateLikelyLocalDay) → Validation.
 *  8. WEEK booking non-sabato → ValidationError.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { installRedisMock, resetRedisMock } from "../helpers/redis-mock";

let testPrisma: Awaited<ReturnType<typeof setupTestDb>>;
vi.mock("@/lib/db", () => ({
  get db() {
    return testPrisma;
  },
}));

vi.mock("@/lib/queue", () => ({
  getRedisConnection: () => installRedisMock(),
  syncQueue: () => ({ add: vi.fn() }),
  availBokunQueue: () => ({ add: vi.fn() }),
  availBoataroundQueue: () => ({ add: vi.fn() }),
  availManualQueue: () => ({ add: vi.fn() }),
  pricingBokunQueue: () => ({ add: vi.fn() }),
  getQueue: () => ({ add: vi.fn() }),
  QUEUE_NAMES: {
    AVAIL_BOKUN: "sync.avail.bokun",
    AVAIL_BOATAROUND: "sync.avail.boataround",
    AVAIL_MANUAL: "sync.avail.manual",
    PRICING_BOKUN: "sync.pricing.bokun",
  },
  ALL_QUEUE_NAMES: [
    "sync.avail.bokun",
    "sync.avail.boataround",
    "sync.avail.manual",
    "sync.pricing.bokun",
  ],
}));

// Mock Stripe createPaymentIntent per non colpire Stripe real.
vi.mock("@/lib/stripe/payment-intents", () => ({
  createPaymentIntent: vi.fn().mockImplementation(async () => ({
    paymentIntentId: `pi_${Math.random().toString(36).slice(2)}`,
    clientSecret: "pi_test_secret",
  })),
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
  await resetRedisMock();
  vi.clearAllMocks();
});

async function seedServiceSocial() {
  const boat = await db.boat.create({
    data: {
      id: "b-social",
      name: "B",
      type: "TRIMARAN",
      description: "t",
      amenities: [],
      images: [],
    },
  });
  const service = await db.service.create({
    data: {
      id: "s-social",
      boatId: boat.id,
      name: "Social Day",
      type: "SOCIAL_BOATING",
      durationType: "FULL_DAY",
      durationHours: 8,
      capacityMax: 20,
      minPaying: 1, // 1 per test (default SOCIAL would be 11)
      defaultPaymentSchedule: "FULL",
      active: true,
    },
  });
  await db.pricingPeriod.create({
    data: {
      serviceId: service.id,
      label: "Test 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      pricePerPerson: "100.00",
      year: 2026,
    },
  });
  return { boat, service };
}

const baseInput = (overrides: Record<string, unknown> = {}) => ({
  serviceId: "s-social",
  startDate: new Date("2026-07-15T00:00:00.000Z"),
  numPeople: 2,
  customer: {
    email: "mario@example.com",
    firstName: "Mario",
    lastName: "Rossi",
    phone: "+39 123",
    nationality: "IT",
    language: "it",
  },
  paymentSchedule: "FULL" as const,
  consent: {
    privacyAccepted: true,
    termsAccepted: true,
    policyVersion: "1.0",
    ipAddress: "1.2.3.4",
    userAgent: "Mozilla/5.0",
  },
  ...overrides,
});

describe("createPendingDirectBooking (R7+R20 fixes)", () => {
  it("caso base: booking + customer + directBooking + consentRecord creati", async () => {
    await seedServiceSocial();
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );

    const res = await createPendingDirectBooking(baseInput());
    expect(res.bookingId).toBeDefined();
    // Formato confirmation code: alfanumerico 8+ chars, eventuale prefix
    // o suffix (helper in booking/helpers.ts). Check non-vuoto + ragionevole.
    expect(res.confirmationCode).toMatch(/^[A-Z0-9-]+$/);
    expect(res.confirmationCode.length).toBeGreaterThanOrEqual(6);

    const booking = await db.booking.findUnique({
      where: { id: res.bookingId },
      include: { directBooking: true, customer: true },
    });
    expect(booking?.status).toBe("PENDING");
    expect(booking?.source).toBe("DIRECT");
    expect(booking?.directBooking).not.toBeNull();
    expect(booking?.customer.email).toBe("mario@example.com");

    const consents = await db.consentRecord.findMany({
      where: { bookingId: res.bookingId },
    });
    expect(consents).toHaveLength(1);
    expect(consents[0].privacyAccepted).toBe(true);
  });

  it("R7 pre-check #2: booking overlap CONFIRMED → ConflictError", async () => {
    const { service, boat } = await seedServiceSocial();
    // Seed un booking CONFIRMED esistente stesso slot.
    const customer = await db.customer.create({
      data: { email: "other@example.com", firstName: "O", lastName: "X" },
    });
    await db.booking.create({
      data: {
        confirmationCode: "EXIST001",
        source: "DIRECT",
        customerId: customer.id,
        serviceId: service.id,
        boatId: boat.id,
        startDate: new Date("2026-07-15"),
        endDate: new Date("2026-07-15"),
        numPeople: 2,
        totalPrice: "200.00",
        status: "CONFIRMED",
        directBooking: {
          create: { paymentSchedule: "FULL", stripePaymentIntentId: "pi_existing" },
        },
      },
    });

    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );
    await expect(createPendingDirectBooking(baseInput())).rejects.toThrow(
      /not available|overlap/i,
    );
  });

  it("R20-A1-1 retry-window: stesso customer entro 44min → auto-cancel del vecchio PENDING", async () => {
    await seedServiceSocial();
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );

    // Primo tentativo (nessun PI ancora attach-ato dal wizard).
    const r1 = await createPendingDirectBooking(baseInput());
    expect(r1.bookingId).toBeDefined();

    // Secondo tentativo stesso customer, stesso slot, subito dopo
    // (simulating card_declined retry flow). R26-P4: il vecchio PENDING
    // senza PI e' ownRetriable → atomically cancelled in tx.
    const r2 = await createPendingDirectBooking(baseInput());
    expect(r2.bookingId).toBeDefined();
    expect(r2.bookingId).not.toBe(r1.bookingId);

    // 1 solo PENDING attivo (il nuovo); il vecchio e' CANCELLED.
    const pending = await db.booking.count({
      where: { customerId: { not: undefined }, status: "PENDING" },
    });
    expect(pending).toBe(1);
    const oldBooking = await db.booking.findUnique({
      where: { id: r1.bookingId },
      select: { status: true },
    });
    expect(oldBooking?.status).toBe("CANCELLED");
  });

  it("advisory lock: 2 richieste concorrenti → solo 1 crea, altro ConflictError", async () => {
    const { service, boat } = await seedServiceSocial();
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );

    // Pre-seed BoatAvailability BLOCKED per un'altra fetta — il pre-check #1
    // scatta sul secondo booking dopo che il primo ha CONFIRMED (blockDates).
    // Per testare advisory lock-isolated, simulo 2 customer diversi
    // contemporaneamente — dovrebbero entrambi superare pre-check #1 ma il
    // pre-check #2 (overlap Booking) detecta l'altro PENDING.

    const inputA = baseInput({
      customer: {
        email: "a@example.com",
        firstName: "A",
        lastName: "X",
        phone: "",
        nationality: "IT",
        language: "it",
      },
    });
    const inputB = baseInput({
      customer: {
        email: "b@example.com",
        firstName: "B",
        lastName: "Y",
        phone: "",
        nationality: "IT",
        language: "it",
      },
    });

    const [rA, rB] = await Promise.allSettled([
      createPendingDirectBooking(inputA),
      createPendingDirectBooking(inputB),
    ]);

    const fulfilled = [rA, rB].filter((r) => r.status === "fulfilled");
    const rejected = [rA, rB].filter((r) => r.status === "rejected");

    // Advisory lock serializza; pre-check #2 vede PENDING dell'altro →
    // esattamente 1 success + 1 ConflictError.
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toMatch(
      /not available|overlap/i,
    );

    // 1 solo booking PENDING in DB.
    const pendings = await db.booking.count({
      where: { boatId: boat.id, serviceId: service.id, status: "PENDING" },
    });
    expect(pendings).toBe(1);
  });

  it("consent privacy=false → ValidationError", async () => {
    await seedServiceSocial();
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );
    await expect(
      createPendingDirectBooking(
        baseInput({
          consent: {
            privacyAccepted: false,
            termsAccepted: true,
            policyVersion: "1.0",
            ipAddress: "1.2.3.4",
            userAgent: "Mozilla/5.0",
          },
        }),
      ),
    ).rejects.toThrow(/privacy|termini/i);
  });

  it("numPeople > capacityMax → ValidationError", async () => {
    await seedServiceSocial();
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );
    await expect(
      createPendingDirectBooking(baseInput({ numPeople: 100 })),
    ).rejects.toThrow(/numPeople/i);
  });

  it("R22-P2-MEDIA-2: startDate nel passato → ValidationError", async () => {
    await seedServiceSocial();
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );
    await expect(
      createPendingDirectBooking(
        baseInput({ startDate: new Date("2020-01-01") }),
      ),
    ).rejects.toThrow(/past/i);
  });
});
