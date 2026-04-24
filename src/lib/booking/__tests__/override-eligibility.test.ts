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
});
