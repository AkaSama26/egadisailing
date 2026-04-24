import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  checkOverrideEligibility,
  type OverrideEligibilityInput,
} from "@/lib/booking/override-eligibility";

const baseInput: OverrideEligibilityInput = {
  newBookingRevenue: new Decimal("2000.00"),
  conflictingBookings: [],
  experienceDate: new Date("2026-08-15"),
  today: new Date("2026-07-25"),
};

describe("checkOverrideEligibility", () => {
  it("zero conflitti → status normal", () => {
    const result = checkOverrideEligibility(baseInput);
    expect(result.status).toBe("normal");
    expect(result.conflictingBookingIds).toEqual([]);
  });

  it("boat-block presente → blocked/boat_block (anche se revenue OK)", () => {
    const result = checkOverrideEligibility({
      ...baseInput,
      conflictingBookings: [
        { id: "b1", revenue: new Decimal("500"), isAdminBlock: true },
      ],
    });
    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.reason).toBe("boat_block");
      expect(result.conflictingBookingIds).toEqual(["b1"]);
    }
  });

  it("esperienza a 14 gg → blocked/within_15_day_cutoff", () => {
    const result = checkOverrideEligibility({
      ...baseInput,
      experienceDate: new Date("2026-08-08"), // 14 giorni dopo 2026-07-25
      conflictingBookings: [
        { id: "b1", revenue: new Decimal("500"), isAdminBlock: false },
      ],
    });
    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.reason).toBe("within_15_day_cutoff");
    }
  });

  it("esperienza a 15 gg esatti → blocked (cutoff strict `> 15`)", () => {
    const result = checkOverrideEligibility({
      ...baseInput,
      experienceDate: new Date("2026-08-09"), // 15 giorni dopo 2026-07-25
      conflictingBookings: [
        { id: "b1", revenue: new Decimal("500"), isAdminBlock: false },
      ],
    });
    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.reason).toBe("within_15_day_cutoff");
    }
  });

  it("revenue pari → blocked/insufficient_revenue", () => {
    const result = checkOverrideEligibility({
      ...baseInput,
      conflictingBookings: [
        { id: "b1", revenue: new Decimal("2000"), isAdminBlock: false },
      ],
    });
    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.reason).toBe("insufficient_revenue");
    }
  });

  it("revenue nuovo superiore → override_request", () => {
    const result = checkOverrideEligibility({
      ...baseInput,
      newBookingRevenue: new Decimal("3000"),
      conflictingBookings: [
        { id: "b1", revenue: new Decimal("2000"), isAdminBlock: false },
      ],
    });
    expect(result.status).toBe("override_request");
    if (result.status === "override_request") {
      expect(result.conflictingBookingIds).toEqual(["b1"]);
      expect(result.conflictingRevenueTotal.toString()).toBe("2000");
      expect(result.dropDeadAt).toEqual(new Date("2026-07-31")); // 2026-08-15 - 15d
    }
  });
});
