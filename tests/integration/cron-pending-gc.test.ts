/**
 * Integration test — pending-gc cron.
 *
 * Scenari:
 *  1. Booking PENDING > 45min → cancel PI + release + status CANCELLED.
 *  2. Booking PENDING < 45min → non toccato.
 *  3. Booking gia' CONFIRMED/CANCELLED → non toccato.
 *  4. Booking non-DIRECT source → non toccato (cron opera solo su DIRECT).
 *  5. cancelPaymentIntent errore Stripe → logged ma non blocca il batch.
 *  6. Lease concurrency: 2 run paralleli → secondo skip `concurrent_run`.
 *  7. Senza Bearer → 401 UnauthorizedError (via withErrorHandler).
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
    AVAIL_BOKUN: "sync:avail:bokun",
    AVAIL_BOATAROUND: "sync:avail:boataround",
    AVAIL_MANUAL: "sync:avail:manual",
    PRICING_BOKUN: "sync:pricing:bokun",
  },
  ALL_QUEUE_NAMES: [
    "sync:avail:bokun",
    "sync:avail:boataround",
    "sync:avail:manual",
    "sync:pricing:bokun",
  ],
}));

const cancelPaymentIntentMock = vi.fn().mockResolvedValue({
  id: "pi_mock",
  status: "canceled",
});
vi.mock("@/lib/stripe/payment-intents", () => ({
  cancelPaymentIntent: cancelPaymentIntentMock,
  refundPayment: vi.fn(),
  createPaymentIntent: vi.fn(),
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

async function seedPendingBooking(opts: {
  createdAtMinutesAgo: number;
  status?: "PENDING" | "CONFIRMED" | "CANCELLED";
  source?: "DIRECT" | "BOKUN";
  piId?: string;
  confirmationCode?: string;
  customerEmail?: string;
}) {
  const boat = await db.boat.upsert({
    where: { id: "gc-boat" },
    create: {
      id: "gc-boat",
      name: "B",
      type: "TRIMARAN",
      description: "t",
      amenities: [],
      images: [],
    },
    update: {},
  });
  const service = await db.service.upsert({
    where: { id: "gc-service" },
    create: {
      id: "gc-service",
      boatId: boat.id,
      name: "S",
      type: "SOCIAL_BOATING",
      durationType: "FULL_DAY",
      durationHours: 8,
      capacityMax: 20,
      defaultPaymentSchedule: "FULL",
      active: true,
    },
    update: {},
  });
  const customer = await db.customer.create({
    data: {
      email: opts.customerEmail ?? `c${Math.random().toString(36).slice(2)}@ex.com`,
      firstName: "C",
      lastName: "X",
    },
  });
  const code = opts.confirmationCode ?? `GC${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const createdAt = new Date(Date.now() - opts.createdAtMinutesAgo * 60 * 1000);
  return db.booking.create({
    data: {
      confirmationCode: code,
      source: opts.source ?? "DIRECT",
      customerId: customer.id,
      serviceId: service.id,
      boatId: boat.id,
      startDate: new Date("2026-07-15"),
      endDate: new Date("2026-07-15"),
      numPeople: 2,
      totalPrice: "200.00",
      status: opts.status ?? "PENDING",
      createdAt,
      directBooking:
        (opts.source ?? "DIRECT") === "DIRECT"
          ? {
              create: {
                paymentSchedule: "FULL",
                stripePaymentIntentId: opts.piId ?? null,
              },
            }
          : undefined,
    },
  });
}

function makeReq(auth = true): Request {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = `Bearer ${process.env.CRON_SECRET ?? "test-cron"}`;
  return new Request("http://localhost/api/cron/pending-gc", {
    method: "GET",
    headers,
  });
}

describe("pending-gc cron", () => {
  it("PENDING > 45min → cancel PI + release + CANCELLED", async () => {
    const booking = await seedPendingBooking({
      createdAtMinutesAgo: 60,
      piId: "pi_stale_1",
    });
    // Seed cell BLOCKED che il cron deve release.
    await db.boatAvailability.create({
      data: {
        boatId: booking.boatId,
        date: booking.startDate,
        status: "BLOCKED",
        lockedByBookingId: booking.id,
      },
    });

    const { GET } = await import("@/app/api/cron/pending-gc/route");
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scanned).toBe(1);
    expect(body.cancelled).toBe(1);
    expect(body.piCancelled).toBe(1);

    // cancelPaymentIntent chiamato.
    expect(cancelPaymentIntentMock).toHaveBeenCalledWith("pi_stale_1");

    // Booking → CANCELLED.
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("CANCELLED");

    // Availability released (AVAILABLE + null lockedByBookingId).
    const cell = await db.boatAvailability.findUniqueOrThrow({
      where: {
        boatId_date: { boatId: booking.boatId, date: booking.startDate },
      },
    });
    expect(cell.status).toBe("AVAILABLE");
    expect(cell.lockedByBookingId).toBeNull();
  });

  it("PENDING < 45min (30min) → non toccato", async () => {
    const booking = await seedPendingBooking({
      createdAtMinutesAgo: 30,
      piId: "pi_fresh_1",
    });

    const { GET } = await import("@/app/api/cron/pending-gc/route");
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.scanned).toBe(0);
    expect(body.cancelled).toBe(0);

    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("PENDING");
    expect(cancelPaymentIntentMock).not.toHaveBeenCalled();
  });

  it("CONFIRMED → non toccato anche se vecchio", async () => {
    const booking = await seedPendingBooking({
      createdAtMinutesAgo: 120,
      status: "CONFIRMED",
      piId: "pi_confirmed",
    });

    const { GET } = await import("@/app/api/cron/pending-gc/route");
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.scanned).toBe(0);

    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("CONFIRMED");
  });

  it("source != DIRECT → non toccato (Bokun hub gestisce upstream)", async () => {
    const boat = await db.boat.create({
      data: {
        id: "bkn-boat",
        name: "B",
        type: "TRIMARAN",
        description: "t",
        amenities: [],
        images: [],
      },
    });
    const service = await db.service.create({
      data: {
        id: "bkn-service",
        boatId: boat.id,
        name: "S",
        type: "SOCIAL_BOATING",
        durationType: "FULL_DAY",
        durationHours: 8,
        capacityMax: 20,
        defaultPaymentSchedule: "FULL",
        active: true,
      },
    });
    const customer = await db.customer.create({
      data: { email: "bkn@ex.com", firstName: "C", lastName: "X" },
    });
    const booking = await db.booking.create({
      data: {
        confirmationCode: "BKN-STALE",
        source: "BOKUN",
        customerId: customer.id,
        serviceId: service.id,
        boatId: boat.id,
        startDate: new Date("2026-07-15"),
        endDate: new Date("2026-07-15"),
        numPeople: 2,
        totalPrice: "200.00",
        status: "PENDING",
        createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1h fa
      },
    });

    const { GET } = await import("@/app/api/cron/pending-gc/route");
    const res = await GET(makeReq());
    const body = await res.json();
    // Source=BOKUN → filtered out.
    expect(body.scanned).toBe(0);

    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("PENDING");
  });

  it("cancelPaymentIntent error → logged ma continue batch", async () => {
    cancelPaymentIntentMock.mockRejectedValueOnce(new Error("Stripe 500"));

    const booking = await seedPendingBooking({
      createdAtMinutesAgo: 60,
      piId: "pi_fail",
    });

    const { GET } = await import("@/app/api/cron/pending-gc/route");
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // Booking comunque cancellato (PI cancel e' best-effort, DB cancel e' autoritativo).
    expect(body.cancelled).toBe(1);

    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("CANCELLED");
  });

  it("lease: 2 run concorrenti → secondo skip concurrent_run", async () => {
    // Pre-acquire lease manualmente.
    const { tryAcquireLease } = await import("@/lib/lease/redis-lease");
    const held = await tryAcquireLease("cron:pending-gc", 60);
    expect(held).not.toBeNull();

    const { GET } = await import("@/app/api/cron/pending-gc/route");
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.skipped).toBe("concurrent_run");
  });

  it("no Bearer → 401 UnauthorizedError", async () => {
    const { GET } = await import("@/app/api/cron/pending-gc/route");
    const res = await GET(makeReq(false));
    expect(res.status).toBe(401);
  });
});
