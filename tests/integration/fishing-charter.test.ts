/**
 * Integration test — fishing charter catalog/service wiring.
 *
 * Covers the new `fishing-full-day` BOAT_EXCLUSIVE package:
 * - seasonal ServicePrice rows are PER_PACKAGE and not multiplied by guests
 * - capacityMax=4 is enforced by direct booking creation
 * - availability hold touches only the dedicated fishing RIB boat
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
    "email.transactional",
  ],
}));

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

async function seedFishingCatalog() {
  await db.boat.createMany({
    data: [
      {
        id: "trimarano",
        name: "Trimarano",
        type: "TRIMARAN",
        description: "Control boat",
        amenities: [],
        images: [],
      },
      {
        id: "boat",
        name: "Cigala",
        type: "MOTORBOAT",
        description: "Control boat",
        amenities: [],
        images: [],
      },
      {
        id: "fishing-rib",
        name: "Gommone Pesca",
        type: "RIB",
        description: "Gommone dedicato al charter di pesca alle Egadi.",
        amenities: ["professional_fishing_gear", "safety_equipment"],
        images: ["/images/boats/fishing-rib/fishing-rib-hero.webp"],
      },
    ],
  });

  const service = await db.service.create({
    data: {
      id: "fishing-full-day",
      name: "Charter di pesca alle Egadi",
      type: "BOAT_EXCLUSIVE",
      boatId: "fishing-rib",
      durationType: "FULL_DAY",
      durationHours: 8,
      capacityMax: 4,
      minPaying: 1,
      defaultPaymentSchedule: "DEPOSIT_BALANCE",
      defaultDepositPercentage: 30,
      priority: 3,
      pricingUnit: "PER_PACKAGE",
      active: true,
    },
  });

  await db.season.createMany({
    data: [
      {
        year: 2026,
        key: "low",
        label: "Low",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-05-31"),
        priceBucket: "LOW",
      },
      {
        year: 2026,
        key: "mid",
        label: "Mid",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-07-14"),
        priceBucket: "MID",
      },
      {
        year: 2026,
        key: "high",
        label: "High",
        startDate: new Date("2026-07-15"),
        endDate: new Date("2026-08-31"),
        priceBucket: "HIGH",
      },
    ],
  });

  await db.servicePrice.createMany({
    data: [
      {
        id: "sp-2026-fishing-low",
        serviceId: service.id,
        year: 2026,
        priceBucket: "LOW",
        durationDays: null,
        amount: "800.00",
        pricingUnit: "PER_PACKAGE",
      },
      {
        id: "sp-2026-fishing-mid",
        serviceId: service.id,
        year: 2026,
        priceBucket: "MID",
        durationDays: null,
        amount: "1000.00",
        pricingUnit: "PER_PACKAGE",
      },
      {
        id: "sp-2026-fishing-high",
        serviceId: service.id,
        year: 2026,
        priceBucket: "HIGH",
        durationDays: null,
        amount: "1000.00",
        pricingUnit: "PER_PACKAGE",
      },
    ],
  });

  return service;
}

const bookingInput = (overrides: Record<string, unknown> = {}) => ({
  serviceId: "fishing-full-day",
  startDate: new Date("2026-06-20T00:00:00.000Z"),
  numPeople: 4,
  customer: {
    email: "fishing@example.com",
    firstName: "Fishing",
    lastName: "Guest",
    phone: "+39 123",
    nationality: "IT",
    language: "it",
  },
  paymentSchedule: "DEPOSIT_BALANCE" as const,
  consent: {
    privacyAccepted: true,
    termsAccepted: true,
    policyVersion: "1.0",
    ipAddress: "1.2.3.4",
    userAgent: "Mozilla/5.0",
  },
  ...overrides,
});

describe("fishing-full-day package", () => {
  it("quotes LOW/MID/HIGH seasonal prices as package totals", async () => {
    await seedFishingCatalog();
    const { quotePrice } = await import("@/lib/pricing/service");

    const low = await quotePrice("fishing-full-day", new Date("2026-04-10"), 1);
    const mid = await quotePrice("fishing-full-day", new Date("2026-06-20"), 4);
    const high = await quotePrice("fishing-full-day", new Date("2026-08-10"), 2);

    expect(low.pricingUnit).toBe("PER_PACKAGE");
    expect(low.totalPrice.toString()).toBe("800");
    expect(low.priceBucket).toBe("LOW");
    expect(mid.totalPrice.toString()).toBe("1000");
    expect(mid.priceBucket).toBe("MID");
    expect(high.totalPrice.toString()).toBe("1000");
    expect(high.priceBucket).toBe("HIGH");
  });

  it("allows 1-4 people and rejects 5 people by capacityMax", async () => {
    await seedFishingCatalog();
    const { createPendingDirectBooking } = await import("@/lib/booking/create-direct");

    await expect(
      createPendingDirectBooking(
        bookingInput({
          startDate: new Date("2026-06-21T00:00:00.000Z"),
          numPeople: 1,
          customer: { ...bookingInput().customer, email: "fishing-one@example.com" },
        }),
      ),
    ).resolves.toMatchObject({
      totalAmountCents: 100_000,
      depositAmountCents: 30_000,
      balanceAmountCents: 70_000,
    });

    await expect(
      createPendingDirectBooking(
        bookingInput({
          startDate: new Date("2026-06-22T00:00:00.000Z"),
          numPeople: 4,
          customer: { ...bookingInput().customer, email: "fishing-four@example.com" },
        }),
      ),
    ).resolves.toMatchObject({
      totalAmountCents: 100_000,
      depositAmountCents: 30_000,
      balanceAmountCents: 70_000,
    });

    await expect(
      createPendingDirectBooking(
        bookingInput({
          startDate: new Date("2026-06-23T00:00:00.000Z"),
          numPeople: 5,
          customer: { ...bookingInput().customer, email: "fishing-five@example.com" },
        }),
      ),
    ).rejects.toThrow(/numPeople out of range/i);
  });

  it("blocks only the dedicated fishing RIB availability cell", async () => {
    await seedFishingCatalog();
    const { createPendingDirectBooking } = await import("@/lib/booking/create-direct");
    const { applyDirectBookingAvailabilityHold } = await import(
      "@/lib/booking/direct-availability-hold"
    );
    const date = new Date("2026-06-24T00:00:00.000Z");

    const created = await createPendingDirectBooking(
      bookingInput({
        startDate: date,
        customer: { ...bookingInput().customer, email: "fishing-hold@example.com" },
      }),
    );
    await applyDirectBookingAvailabilityHold(created.bookingId);

    const cells = await db.boatAvailability.findMany({
      where: { date },
      orderBy: { boatId: "asc" },
    });
    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({
      boatId: "fishing-rib",
      status: "BLOCKED",
      lockedByBookingId: created.bookingId,
    });
  });
});
