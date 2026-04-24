import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { seedBoatAndService } from "../helpers/seed-override";

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
});
