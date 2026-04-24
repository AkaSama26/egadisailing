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
});
