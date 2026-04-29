import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { installRedisMock, resetRedisMock } from "../helpers/redis-mock";
import type { BokunBookingSummary } from "@/lib/bokun/types";

const availBokunAdd = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "job-bokun" }));
const availBoataroundAdd = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "job-boat" }));
const availManualAdd = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "job-manual" }));

let testPrisma: Awaited<ReturnType<typeof setupTestDb>>;
vi.mock("@/lib/db", () => ({
  get db() {
    return testPrisma;
  },
}));

vi.mock("@/lib/queue", () => ({
  getRedisConnection: () => installRedisMock(),
  syncQueue: () => ({ add: availBokunAdd }),
  availBokunQueue: () => ({ add: availBokunAdd }),
  availBoataroundQueue: () => ({ add: availBoataroundAdd }),
  availManualQueue: () => ({ add: availManualAdd }),
  pricingBokunQueue: () => ({ add: vi.fn() }),
  emailTransactionalQueue: () => ({ add: vi.fn() }),
  bookingBokunQueue: () => ({ add: vi.fn() }),
  getQueue: () => ({ add: vi.fn() }),
  QUEUE_NAMES: {
    AVAIL_BOKUN: "sync.avail.bokun",
    AVAIL_BOATAROUND: "sync.avail.boataround",
    AVAIL_MANUAL: "sync.avail.manual",
    PRICING_BOKUN: "sync.pricing.bokun",
      EMAIL_TRANSACTIONAL: "email.transactional",
    BOOKING_BOKUN: "sync.booking.bokun",
  },
  ALL_QUEUE_NAMES: [
    "sync.avail.bokun",
    "sync.avail.boataround",
    "sync.avail.manual",
    "sync.pricing.bokun",
    "sync.booking.bokun",
  ],
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatchNotification: vi.fn().mockResolvedValue({ anyOk: true, results: [] }),
  defaultNotificationChannels: () => [],
  toDispatchResult: (result: unknown) => result,
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

async function seedMappedService() {
  const boat = await db.boat.create({
    data: {
      id: "trim-test",
      name: "Trim Test",
      type: "TRIMARAN",
      description: "Test",
      amenities: [],
      images: [],
    },
  });
  const service = await db.service.create({
    data: {
      id: "svc-bokun",
      boatId: boat.id,
      name: "Gourmet",
      type: "EXCLUSIVE_EXPERIENCE",
      durationType: "FULL_DAY",
      durationHours: 8,
      capacityMax: 20,
      defaultPaymentSchedule: "FULL",
      priority: 8,
      pricingUnit: "PER_PACKAGE",
      bokunProductId: "prod-gourmet",
      active: true,
    },
  });
  await db.pricingPeriod.create({
    data: {
      serviceId: service.id,
      label: "Test 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      pricePerPerson: "1200.00",
      year: 2026,
    },
  });
  return { boat, service };
}

function bokunBooking(overrides: Partial<BokunBookingSummary> = {}): BokunBookingSummary {
  return {
    id: 1001,
    productId: "prod-gourmet",
    confirmationCode: "BKN1001",
    productConfirmationCode: "PROD1001",
    status: "CONFIRMED",
    channelName: "BOKUN_MAIN",
    startDate: "2026-07-15",
    endDate: "2026-07-15",
    numPeople: 6,
    totalPrice: 1200,
    currency: "EUR",
    mainContactDetails: {
      firstName: "Mario",
      lastName: "Rossi",
      email: "mario@example.com",
      phoneNumber: "+39 123",
      country: "IT",
      language: "it",
    },
    passengers: [],
    ...overrides,
  };
}

describe("Bokun import hardening", () => {
  it("update con nuova data libera la vecchia cella owned e blocca la nuova", async () => {
    const { boat } = await seedMappedService();
    const { importBokunBooking } = await import("@/lib/bokun/adapters/booking");
    const { syncBookingAvailability } = await import("@/lib/bokun/sync-availability");

    const created = await importBokunBooking(bokunBooking());
    await syncBookingAvailability(created);

    const updated = await importBokunBooking(
      bokunBooking({ startDate: "2026-07-16", endDate: "2026-07-16" }),
    );
    await syncBookingAvailability(updated);

    const oldCell = await db.boatAvailability.findUnique({
      where: { boatId_date: { boatId: boat.id, date: new Date("2026-07-15") } },
    });
    const newCell = await db.boatAvailability.findUnique({
      where: { boatId_date: { boatId: boat.id, date: new Date("2026-07-16") } },
    });

    expect(oldCell?.status).toBe("AVAILABLE");
    expect(oldCell?.lockedByBookingId).toBeNull();
    expect(newCell?.status).toBe("BLOCKED");
    expect(newCell?.lockedByBookingId).toBe(created.bookingId);
  });

  it("cancel Bokun non libera una cella posseduta da un altro booking", async () => {
    const { boat, service } = await seedMappedService();
    const customer = await db.customer.create({
      data: { email: "direct@example.com", firstName: "D", lastName: "X" },
    });
    const direct = await db.booking.create({
      data: {
        confirmationCode: "DIRECT01",
        source: "DIRECT",
        customerId: customer.id,
        serviceId: service.id,
        boatId: boat.id,
        startDate: new Date("2026-07-15"),
        endDate: new Date("2026-07-15"),
        numPeople: 2,
        totalPrice: "1200.00",
        status: "CONFIRMED",
      },
    });
    const { blockDates } = await import("@/lib/availability/service");
    await blockDates(boat.id, new Date("2026-07-15"), new Date("2026-07-15"), "DIRECT", direct.id);

    const { importBokunBooking } = await import("@/lib/bokun/adapters/booking");
    const { syncBookingAvailability } = await import("@/lib/bokun/sync-availability");
    const cancelled = await importBokunBooking(bokunBooking({ status: "CANCELLED" }));
    await syncBookingAvailability(cancelled);

    const cell = await db.boatAvailability.findUnique({
      where: { boatId_date: { boatId: boat.id, date: new Date("2026-07-15") } },
    });
    expect(cell?.status).toBe("BLOCKED");
    expect(cell?.lockedByBookingId).toBe(direct.id);
  });

  it("booking Bokun multi-prodotto crea ManualAlert e non crea Booking locale", async () => {
    const { boat } = await seedMappedService();
    const { importBokunBooking } = await import("@/lib/bokun/adapters/booking");

    const imported = await importBokunBooking(
      bokunBooking({ experienceBookings: [{ id: 1 }, { id: 2 }] }),
    );

    expect(imported.mode).toBe("skipped");
    await expect(db.booking.count()).resolves.toBe(0);
    const alerts = await db.manualAlert.findMany({ where: { channel: "BOKUN" } });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].boatId).toBe(boat.id);
  });

  it("EXCLUSIVE_EXPERIENCE usa prezzo pacchetto, non moltiplica per persone", async () => {
    const { service } = await seedMappedService();
    const { quotePrice } = await import("@/lib/pricing/service");

    const quote = await quotePrice(service.id, new Date("2026-07-15"), 6);

    expect(quote.pricingUnit).toBe("PER_PACKAGE");
    expect(quote.totalPrice.toString()).toBe("1200");
  });
});
