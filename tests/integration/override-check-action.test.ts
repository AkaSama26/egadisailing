import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { seedBoatAndService, seedBooking } from "../helpers/seed-override";

// Mock headers (Next.js 16 async)
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "1.2.3.4" }),
}));

// Mock rate-limit (always pass)
vi.mock("@/lib/rate-limit/service", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(undefined),
}));

let db: Awaited<ReturnType<typeof setupTestDb>>;
vi.mock("@/lib/db", () => ({
  get db() {
    return db;
  },
}));

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  process.env.FEATURE_OVERRIDE_ENABLED = "true";
  vi.resetModules();
});

describe("checkOverrideEligibilityAction", () => {
  it("no conflict → status normal", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const { checkOverrideEligibilityAction } = await import(
      "@/lib/booking/override-check-action"
    );
    const res = await checkOverrideEligibilityAction({
      boatId: boat.id,
      serviceId: service.id,
      startDate: "2026-09-01",
      endDate: "2026-09-01",
      numPax: 2,
    });
    expect(res.status).toBe("normal");
  });

  it("feature flag OFF → status blocked/feature_disabled", async () => {
    process.env.FEATURE_OVERRIDE_ENABLED = "false";
    vi.resetModules();
    const { boat, service } = await seedBoatAndService(db);
    const { checkOverrideEligibilityAction } = await import(
      "@/lib/booking/override-check-action"
    );
    const res = await checkOverrideEligibilityAction({
      boatId: boat.id,
      serviceId: service.id,
      startDate: "2026-09-01",
      endDate: "2026-09-01",
      numPax: 2,
    });
    expect(res.status).toBe("blocked");
    if (res.status === "blocked") {
      expect(res.reason).toBe("feature_disabled");
    }
  });

  it("scenario 2 — override_request (revenue nuovo > conflict, > 15gg)", async () => {
    const { boat, service } = await seedBoatAndService(db, {
      pricePerPerson: "750.00",
    });
    await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "500.00",
      status: "CONFIRMED",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-01"),
    });
    const { checkOverrideEligibilityAction } = await import(
      "@/lib/booking/override-check-action"
    );
    const res = await checkOverrideEligibilityAction({
      boatId: boat.id,
      serviceId: service.id,
      startDate: "2026-09-01",
      endDate: "2026-09-01",
      numPax: 10, // BOAT_EXCLUSIVE e' PER_PACKAGE: 750 > 500 → eligible
    });
    expect(res.status).toBe("override_request");
    if (res.status === "override_request") {
      expect(res.conflictingBookingIds).toHaveLength(1);
      expect(res.conflictingRevenueTotal.toString()).toBe("500");
    }
  });

  it("booking BOKUN sovrapposto → blocked external_booking anche se revenue nuovo > conflict", async () => {
    const { boat, service } = await seedBoatAndService(db);
    await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "500.00",
      status: "CONFIRMED",
      source: "BOKUN",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-01"),
    });
    const { checkOverrideEligibilityAction } = await import(
      "@/lib/booking/override-check-action"
    );
    const res = await checkOverrideEligibilityAction({
      boatId: boat.id,
      serviceId: service.id,
      startDate: "2026-09-01",
      endDate: "2026-09-01",
      numPax: 10,
    });
    expect(res.status).toBe("blocked");
    if (res.status === "blocked") {
      expect(res.reason).toBe("external_booking");
    }
  });

  it("scenario 3 — blocked insufficient_revenue", async () => {
    const { boat, service } = await seedBoatAndService(db);
    await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "5000.00",
      status: "CONFIRMED",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-01"),
    });
    const { checkOverrideEligibilityAction } = await import(
      "@/lib/booking/override-check-action"
    );
    const res = await checkOverrideEligibilityAction({
      boatId: boat.id,
      serviceId: service.id,
      startDate: "2026-09-01",
      endDate: "2026-09-01",
      numPax: 2, // pricing 2 × 250 = 500 < 5000 → blocked
    });
    expect(res.status).toBe("blocked");
    if (res.status === "blocked") {
      expect(res.reason).toBe("insufficient_revenue");
    }
  });

  it("scenario 4 — blocked within_15_day_cutoff", async () => {
    const { boat, service } = await seedBoatAndService(db);
    // Data a 10 giorni da now → cutoff scatta
    const in10Days = new Date();
    in10Days.setUTCHours(0, 0, 0, 0);
    in10Days.setUTCDate(in10Days.getUTCDate() + 10);
    await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "500.00",
      status: "CONFIRMED",
      startDate: in10Days,
      endDate: in10Days,
    });
    const { checkOverrideEligibilityAction } = await import(
      "@/lib/booking/override-check-action"
    );
    const res = await checkOverrideEligibilityAction({
      boatId: boat.id,
      serviceId: service.id,
      startDate: in10Days.toISOString().slice(0, 10),
      endDate: in10Days.toISOString().slice(0, 10),
      numPax: 10, // revenue superiore MA cutoff vince
    });
    expect(res.status).toBe("blocked");
    if (res.status === "blocked") {
      expect(res.reason).toBe("within_15_day_cutoff");
    }
  });

  it("scenario 5 — blocked boat_block (admin manual block)", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const d = new Date("2026-09-01");
    await db.boatAvailability.create({
      data: {
        boatId: boat.id,
        date: d,
        status: "BLOCKED",
        lockedByBookingId: null, // admin block (no booking owner)
      },
    });
    const { checkOverrideEligibilityAction } = await import(
      "@/lib/booking/override-check-action"
    );
    const res = await checkOverrideEligibilityAction({
      boatId: boat.id,
      serviceId: service.id,
      startDate: "2026-09-01",
      endDate: "2026-09-01",
      numPax: 10,
    });
    expect(res.status).toBe("blocked");
    if (res.status === "blocked") {
      expect(res.reason).toBe("boat_block");
    }
  });
});
