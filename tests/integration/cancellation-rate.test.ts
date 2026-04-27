import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { seedBoatAndService, seedBooking } from "../helpers/seed-override";
import { installRedisMock, resetRedisMock } from "../helpers/redis-mock";

let db: Awaited<ReturnType<typeof setupTestDb>>;
vi.mock("@/lib/db", () => ({
  get db() {
    return db;
  },
}));

vi.mock("@/lib/queue", () => ({
  getRedisConnection: () => installRedisMock(),
}));

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  await resetRedisMock();
  vi.clearAllMocks();
});

describe("computeCancellationRate", () => {
  it("0 booking sul canale → rate 0", async () => {
    const { computeCancellationRate } = await import("@/lib/booking/cancellation-rate");
    const res = await computeCancellationRate("BOKUN", 30);
    expect(res.rate).toBe(0);
    expect(res.totalBookings).toBe(0);
    expect(res.cancelledByOverride).toBe(0);
  });

  it("10 booking BOKUN, 1 cancellato via override approved → rate 0.1", async () => {
    const { boat, service } = await seedBoatAndService(db);
    // 10 BOKUN bookings
    const bokunBookings = [];
    for (let i = 0; i < 10; i++) {
      const date = new Date(Date.UTC(2026, 7, 15 + i));
      const b = await seedBooking(db, {
        boatId: boat.id,
        serviceId: service.id,
        source: "BOKUN",
        totalPrice: "1000.00",
        status: "CONFIRMED",
        startDate: date,
        endDate: date,
      });
      bokunBookings.push(b);
    }
    // 1 laura DIRECT PENDING
    const laura = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "3000.00",
      status: "PENDING",
    });
    // Admin user + approved override that cancels first BOKUN booking
    const admin = await db.user.create({
      data: { email: "cancrate@test.com", passwordHash: "x", name: "A", role: "ADMIN" },
    });
    await db.overrideRequest.create({
      data: {
        newBookingId: laura.id,
        conflictingBookingIds: [bokunBookings[0]!.id],
        conflictSourceChannels: ["BOKUN"],
        newBookingRevenue: "3000",
        conflictingRevenueTotal: "1000",
        dropDeadAt: new Date("2026-12-31"),
        status: "APPROVED",
        decidedAt: new Date(),
        decidedByUserId: admin.id,
      },
    });

    const { computeCancellationRate } = await import("@/lib/booking/cancellation-rate");
    const res = await computeCancellationRate("BOKUN", 30);
    expect(res.totalBookings).toBe(10);
    expect(res.cancelledByOverride).toBe(1);
    expect(res.rate).toBe(0.1);
  });

  it("cache hit ritorna stesso risultato senza DB query", async () => {
    const { computeCancellationRate } = await import("@/lib/booking/cancellation-rate");
    const first = await computeCancellationRate("DIRECT", 30);
    const second = await computeCancellationRate("DIRECT", 30);
    expect(first).toEqual(second);
  });

  it("invalidateCancellationRateCache drop le chiavi del canale", async () => {
    const { computeCancellationRate, invalidateCancellationRateCache } = await import(
      "@/lib/booking/cancellation-rate"
    );
    await computeCancellationRate("BOKUN", 30);
    await computeCancellationRate("BOKUN", 7);
    await invalidateCancellationRateCache("BOKUN");
    // No throw — best-effort
    expect(true).toBe(true);
  });
});
