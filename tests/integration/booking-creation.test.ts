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
  emailTransactionalQueue: () => ({ add: vi.fn() }),
  getQueue: () => ({ add: vi.fn() }),
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

// R28-CRIT-1/R30-BIZ: helper per test che assumono conflict-on-overlap.
// Con SOCIAL_BOATING il pre-check #2 e' asimmetrico (non blocca shared-on-shared),
// quindi test di retry-window / advisory-lock / overlap devono usare un pacchetto
// venduto come barca intera.
async function seedServiceExclusive(
  overrides: {
    serviceId?: string;
    serviceName?: string;
    serviceType?: "CABIN_CHARTER" | "EXCLUSIVE_EXPERIENCE" | "BOAT_EXCLUSIVE";
    capacityMax?: number;
    durationType?: "FULL_DAY" | "WEEK";
    durationHours?: number;
  } = {},
) {
  const boat = await db.boat.create({
    data: {
      id: "b-exclusive",
      name: "B-excl",
      type: "TRIMARAN",
      description: "t",
      amenities: [],
      images: [],
    },
  });
  const service = await db.service.create({
    data: {
      id: overrides.serviceId ?? "s-exclusive",
      boatId: boat.id,
      name: overrides.serviceName ?? "Cabin charter",
      type: overrides.serviceType ?? "CABIN_CHARTER",
      durationType: overrides.durationType ?? "FULL_DAY",
      durationHours: overrides.durationHours ?? 8,
      capacityMax: overrides.capacityMax ?? 8,
      minPaying: 1,
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

const exclusiveInput = (overrides: Record<string, unknown> = {}) => ({
  ...baseInput(),
  serviceId: "s-exclusive",
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

  it("checkout diretto: acconto 30% server-side anche se il client prova a cambiarlo", async () => {
    await seedServiceSocial();
    await db.service.update({
      where: { id: "s-social" },
      data: { defaultPaymentSchedule: "DEPOSIT_BALANCE", defaultDepositPercentage: 30 },
    });
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );

    const res = await createPendingDirectBooking(
      baseInput({
        paymentSchedule: "DEPOSIT_BALANCE",
        depositPercentage: 1,
      }),
    );

    expect(res.totalAmountCents).toBe(20_000);
    expect(res.depositAmountCents).toBe(6_000);
    expect(res.upfrontAmountCents).toBe(6_000);
    expect(res.balanceAmountCents).toBe(14_000);
  });

  it("charter: durationDays definisce il range, prezzo legacy fallback fisso", async () => {
    await seedServiceExclusive();
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );

    const res = await createPendingDirectBooking(
      exclusiveInput({ durationDays: 5, numPeople: 8 }),
    );

    expect(res.totalAmountCents).toBe(10_000);
    const booking = await db.booking.findUniqueOrThrow({
      where: { id: res.bookingId },
    });
    expect(booking.totalPrice.toString()).toBe("100");
    expect(booking.endDate.toISOString().slice(0, 10)).toBe("2026-07-19");
  });

  it("R7 pre-check #2: booking overlap CONFIRMED → ConflictError (CABIN_CHARTER)", async () => {
    // R28-CRIT-1: pre-check #2 blocca overlap solo su CABIN_CHARTER/BOAT_EXCLUSIVE;
    // SOCIAL_BOATING permette cohabitation (capacity-check separato).
    const { service, boat } = await seedServiceExclusive();
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
    await expect(createPendingDirectBooking(exclusiveInput())).rejects.toThrow(
      /not available|overlap/i,
    );
  });

  it("R30-BIZ: Exclusive Experience/Gourmet e' pacchetto barca intera e blocca overlap", async () => {
    const { service, boat } = await seedServiceExclusive({
      serviceName: "Gourmet Experience",
      serviceType: "EXCLUSIVE_EXPERIENCE",
      capacityMax: 20,
    });
    const customer = await db.customer.create({
      data: { email: "gourmet-existing@example.com", firstName: "G", lastName: "X" },
    });
    await db.booking.create({
      data: {
        confirmationCode: "GOURM001",
        source: "DIRECT",
        customerId: customer.id,
        serviceId: service.id,
        boatId: boat.id,
        startDate: new Date("2026-07-15"),
        endDate: new Date("2026-07-15"),
        numPeople: 12,
        totalPrice: "1200.00",
        status: "CONFIRMED",
        directBooking: {
          create: { paymentSchedule: "FULL", stripePaymentIntentId: "pi_existing_gourmet" },
        },
      },
    });

    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );
    await expect(
      createPendingDirectBooking(exclusiveInput({ numPeople: 4 })),
    ).rejects.toThrow(/not available|overlap/i);
  });

  it("R30: conflict BOKUN non crea opportunita' di override anche con feature enabled", async () => {
    process.env.FEATURE_OVERRIDE_ENABLED = "true";
    vi.resetModules();
    const { service, boat } = await seedServiceExclusive();
    const customer = await db.customer.create({
      data: { email: "ota@example.com", firstName: "Ota", lastName: "Guest" },
    });
    await db.booking.create({
      data: {
        confirmationCode: "BOKUN001",
        source: "BOKUN",
        customerId: customer.id,
        serviceId: service.id,
        boatId: boat.id,
        startDate: new Date("2026-07-15"),
        endDate: new Date("2026-07-15"),
        numPeople: 2,
        totalPrice: "200.00",
        status: "CONFIRMED",
      },
    });

    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );
    await expect(
      createPendingDirectBooking(exclusiveInput({ numPeople: 8 })),
    ).rejects.toThrow(/external_booking|not available/i);

    await expect(db.overrideRequest.count()).resolves.toBe(0);
  });

  it("R28-C1: SOCIAL_BOATING overlap permesso (shared cohabitation)", async () => {
    const { service, boat } = await seedServiceSocial();
    const customer = await db.customer.create({
      data: { email: "other@example.com", firstName: "O", lastName: "X" },
    });
    await db.booking.create({
      data: {
        confirmationCode: "EXIST002",
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
          create: { paymentSchedule: "FULL", stripePaymentIntentId: "pi_existing_soc" },
        },
      },
    });

    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );
    // Cliente nuovo social tour stesso giorno → OK (non più rigettato come pre-R28).
    const res = await createPendingDirectBooking(baseInput());
    expect(res.bookingId).toBeDefined();
  });

  async function seedBoatCatalog() {
    const boat = await db.boat.create({
      data: {
        id: "boat",
        name: "Barca",
        type: "MOTORBOAT",
        description: "t",
        amenities: [],
        images: [],
      },
    });
    const services = await Promise.all([
      db.service.create({
        data: {
          id: "boat-shared-full-day",
          boatId: boat.id,
          name: "Shared full",
          type: "BOAT_SHARED",
          durationType: "FULL_DAY",
          durationHours: 8,
          capacityMax: 12,
          minPaying: 1,
          defaultPaymentSchedule: "FULL",
          pricingUnit: "PER_PERSON",
          active: true,
        },
      }),
      db.service.create({
        data: {
          id: "boat-shared-morning",
          boatId: boat.id,
          name: "Shared morning",
          type: "BOAT_SHARED",
          durationType: "HALF_DAY_MORNING",
          durationHours: 4,
          capacityMax: 12,
          minPaying: 1,
          defaultPaymentSchedule: "FULL",
          pricingUnit: "PER_PERSON",
          active: true,
        },
      }),
      db.service.create({
        data: {
          id: "boat-shared-afternoon",
          boatId: boat.id,
          name: "Shared afternoon",
          type: "BOAT_SHARED",
          durationType: "HALF_DAY_AFTERNOON",
          durationHours: 4,
          capacityMax: 12,
          minPaying: 1,
          defaultPaymentSchedule: "FULL",
          pricingUnit: "PER_PERSON",
          active: true,
        },
      }),
      db.service.create({
        data: {
          id: "boat-exclusive-full-day",
          boatId: boat.id,
          name: "Exclusive full",
          type: "BOAT_EXCLUSIVE",
          durationType: "FULL_DAY",
          durationHours: 8,
          capacityMax: 12,
          defaultPaymentSchedule: "FULL",
          pricingUnit: "PER_PACKAGE",
          active: true,
        },
      }),
    ]);
    for (const service of services) {
      await db.pricingPeriod.create({
        data: {
          serviceId: service.id,
          label: "Test 2026",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-12-31"),
          pricePerPerson: service.pricingUnit === "PER_PACKAGE" ? "1200.00" : "100.00",
          year: 2026,
        },
      });
    }
    return { boat, sharedFull: services[0], sharedMorning: services[1], sharedAfternoon: services[2], exclusiveFull: services[3] };
  }

  async function seedActiveBoatBooking(opts: {
    serviceId: string;
    boatId: string;
    numPeople: number;
    source?: "DIRECT" | "BOKUN";
    code: string;
  }) {
    const customer = await db.customer.create({
      data: {
        email: `${opts.code.toLowerCase()}@example.com`,
        firstName: "Boat",
        lastName: "Guest",
      },
    });
    return db.booking.create({
      data: {
        confirmationCode: opts.code,
        source: opts.source ?? "DIRECT",
        customerId: customer.id,
        serviceId: opts.serviceId,
        boatId: opts.boatId,
        startDate: new Date("2026-07-15"),
        endDate: new Date("2026-07-15"),
        numPeople: opts.numPeople,
        totalPrice: "100.00",
        status: "CONFIRMED",
        claimsAvailability: true,
        exclusiveSlot: false,
      },
    });
  }

  it("barca shared full-day somma posti fino a 12", async () => {
    const { boat, sharedFull } = await seedBoatCatalog();
    await seedActiveBoatBooking({
      boatId: boat.id,
      serviceId: sharedFull.id,
      numPeople: 8,
      code: "BFULL08",
    });
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );

    await expect(
      createPendingDirectBooking(baseInput({ serviceId: sharedFull.id, numPeople: 4 })),
    ).resolves.toMatchObject({ bookingId: expect.any(String) });
    await expect(
      createPendingDirectBooking(baseInput({
        serviceId: sharedFull.id,
        numPeople: 5,
        customer: { ...baseInput().customer, email: "too-many@example.com" },
      })),
    ).rejects.toThrow(/capacity/i);
  });

  it("barca morning e afternoon hanno capacita' separate", async () => {
    const { boat, sharedMorning, sharedAfternoon } = await seedBoatCatalog();
    await seedActiveBoatBooking({
      boatId: boat.id,
      serviceId: sharedMorning.id,
      numPeople: 12,
      code: "BMORN12",
    });
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );

    await expect(
      createPendingDirectBooking(baseInput({
        serviceId: sharedAfternoon.id,
        numPeople: 12,
        customer: { ...baseInput().customer, email: "afternoon@example.com" },
      })),
    ).resolves.toMatchObject({ bookingId: expect.any(String) });
  });

  it("barca half-day usa il proprio prezzo configurato, senza derivazione 75%", async () => {
    const { sharedMorning } = await seedBoatCatalog();
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );

    const res = await createPendingDirectBooking(baseInput({
      serviceId: sharedMorning.id,
      numPeople: 2,
      customer: { ...baseInput().customer, email: "half-price@example.com" },
    }));

    expect(res.totalAmountCents).toBe(20_000);
  });

  it("barca exclusive e' prezzo pacchetto e non moltiplica per persone", async () => {
    const { exclusiveFull } = await seedBoatCatalog();
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );

    const res = await createPendingDirectBooking(baseInput({
      serviceId: exclusiveFull.id,
      numPeople: 10,
      customer: { ...baseInput().customer, email: "package@example.com" },
    }));

    expect(res.totalAmountCents).toBe(120_000);
  });

  it("checkout hold: barca shared marca PARTIALLY_BOOKED e viene rilasciata su cleanup", async () => {
    const { boat, sharedFull } = await seedBoatCatalog();
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );
    const {
      applyDirectBookingAvailabilityHold,
      attachPaymentIntentToPendingDirectBooking,
      cancelPendingDirectBookingAndReleaseHold,
    } = await import("@/lib/booking/direct-availability-hold");

    const res = await createPendingDirectBooking(baseInput({
      serviceId: sharedFull.id,
      numPeople: 4,
      customer: { ...baseInput().customer, email: "hold-shared@example.com" },
    }));

    await applyDirectBookingAvailabilityHold(res.bookingId);
    await attachPaymentIntentToPendingDirectBooking({
      bookingId: res.bookingId,
      paymentIntentId: "pi_hold_shared",
    });

    await expect(
      db.boatAvailability.findUnique({
        where: { boatId_date: { boatId: boat.id, date: new Date("2026-07-15") } },
      }),
    ).resolves.toMatchObject({
      status: "PARTIALLY_BOOKED",
      lockedByBookingId: null,
    });
    await expect(
      db.directBooking.findUnique({ where: { bookingId: res.bookingId } }),
    ).resolves.toMatchObject({ stripePaymentIntentId: "pi_hold_shared" });

    await cancelPendingDirectBookingAndReleaseHold({
      bookingId: res.bookingId,
      reason: "test_cleanup",
    });

    await expect(
      db.booking.findUnique({ where: { id: res.bookingId } }),
    ).resolves.toMatchObject({ status: "CANCELLED" });
    await expect(
      db.boatAvailability.findUnique({
        where: { boatId_date: { boatId: boat.id, date: new Date("2026-07-15") } },
      }),
    ).resolves.toMatchObject({ status: "AVAILABLE" });
  });

  it("checkout hold: exclusive blocca la data con owner booking", async () => {
    const { boat, exclusiveFull } = await seedBoatCatalog();
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );
    const { applyDirectBookingAvailabilityHold } = await import(
      "@/lib/booking/direct-availability-hold"
    );

    const res = await createPendingDirectBooking(baseInput({
      serviceId: exclusiveFull.id,
      numPeople: 10,
      customer: { ...baseInput().customer, email: "hold-exclusive@example.com" },
    }));
    await applyDirectBookingAvailabilityHold(res.bookingId);

    await expect(
      db.boatAvailability.findUnique({
        where: { boatId_date: { boatId: boat.id, date: new Date("2026-07-15") } },
      }),
    ).resolves.toMatchObject({
      status: "BLOCKED",
      lockedByBookingId: res.bookingId,
    });
  });

  it("barca half-day non puo' scavalcare un full-day DIRECT gia' in priorita'", async () => {
    const { boat, sharedFull, sharedMorning } = await seedBoatCatalog();
    await seedActiveBoatBooking({
      boatId: boat.id,
      serviceId: sharedFull.id,
      numPeople: 6,
      code: "BFULL06",
    });
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );

    await expect(
      createPendingDirectBooking(baseInput({
        serviceId: sharedMorning.id,
        numPeople: 2,
        customer: { ...baseInput().customer, email: "morning-subordinate@example.com" },
      })),
    ).rejects.toThrow(/full-day|full_day_priority/i);
  });

  it("barca DIRECT contro BOKUN mostra blocco operativo senza override", async () => {
    process.env.FEATURE_OVERRIDE_ENABLED = "true";
    vi.resetModules();
    const { boat, sharedFull, exclusiveFull } = await seedBoatCatalog();
    await seedActiveBoatBooking({
      boatId: boat.id,
      serviceId: sharedFull.id,
      numPeople: 8,
      source: "BOKUN",
      code: "BBOKUN08",
    });
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );

    await expect(
      createPendingDirectBooking(baseInput({
        serviceId: exclusiveFull.id,
        numPeople: 10,
        customer: { ...baseInput().customer, email: "exclusive-vs-bokun@example.com" },
      })),
    ).rejects.toMatchObject({
      context: expect.objectContaining({
        overrideReason: "external_booking",
        externalTicketsToRefundManually: 8,
      }),
    });
    await expect(db.overrideRequest.count()).resolves.toBe(0);
  });

  it("barca full-day exclusive contro half-day DIRECT crea override request", async () => {
    process.env.FEATURE_OVERRIDE_ENABLED = "true";
    vi.resetModules();
    const { boat, sharedMorning, sharedAfternoon, exclusiveFull } = await seedBoatCatalog();
    await seedActiveBoatBooking({
      boatId: boat.id,
      serviceId: sharedMorning.id,
      numPeople: 6,
      code: "BMORN06",
    });
    await seedActiveBoatBooking({
      boatId: boat.id,
      serviceId: sharedAfternoon.id,
      numPeople: 6,
      code: "BAFT06",
    });
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );

    const res = await createPendingDirectBooking(baseInput({
      serviceId: exclusiveFull.id,
      numPeople: 10,
      customer: { ...baseInput().customer, email: "exclusive@example.com" },
    }));
    expect(res.overrideRequest?.requestId).toBeDefined();
  });

  it("R20-A1-1 retry-window: stesso customer entro 44min → auto-cancel del vecchio PENDING (exclusive)", async () => {
    // R28-CRIT-1: il retry-window partitioning scatta solo quando il pre-check
    // #2 trova conflitto (CABIN_CHARTER/BOAT_EXCLUSIVE). Per SOCIAL_BOATING il
    // vecchio PENDING e' "overlap permesso" quindi non entra ne' in blocker
    // ne' in ownRetriable → 2 PENDING coesistono (valido per social tour).
    await seedServiceExclusive();
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );

    const r1 = await createPendingDirectBooking(exclusiveInput());
    expect(r1.bookingId).toBeDefined();

    // Secondo tentativo stesso customer, stesso slot, subito dopo
    // (simulating card_declined retry flow). R26-P4: il vecchio PENDING
    // senza PI e' ownRetriable → atomically cancelled in tx.
    const r2 = await createPendingDirectBooking(exclusiveInput());
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

  it("advisory lock: 2 richieste concorrenti → solo 1 crea, altro ConflictError (exclusive)", async () => {
    // R28-CRIT-1: concorrenza con conflict detection richiede CABIN_CHARTER.
    // Social permette cohabitation → entrambi succedono.
    const { service, boat } = await seedServiceExclusive();
    const { createPendingDirectBooking } = await import(
      "@/lib/booking/create-direct"
    );

    // Pre-seed BoatAvailability BLOCKED per un'altra fetta — il pre-check #1
    // scatta sul secondo booking dopo che il primo ha CONFIRMED (blockDates).
    // Per testare advisory lock-isolated, simulo 2 customer diversi
    // contemporaneamente — dovrebbero entrambi superare pre-check #1 ma il
    // pre-check #2 (overlap Booking) detecta l'altro PENDING.

    const inputA = exclusiveInput({
      customer: {
        email: "a@example.com",
        firstName: "A",
        lastName: "X",
        phone: "+39 111",
        nationality: "IT",
        language: "it",
      },
    });
    const inputB = exclusiveInput({
      customer: {
        email: "b@example.com",
        firstName: "B",
        lastName: "Y",
        phone: "+39 222",
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
