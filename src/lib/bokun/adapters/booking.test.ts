import { describe, expect, it } from "vitest";
import { mapStatus } from "./booking";

describe("mapStatus", () => {
  it("maps CONFIRMED and ARRIVED to CONFIRMED", () => {
    expect(mapStatus("CONFIRMED")).toBe("CONFIRMED");
    expect(mapStatus("confirmed")).toBe("CONFIRMED");
    expect(mapStatus("ARRIVED")).toBe("CONFIRMED");
  });

  it("maps cancel-like states to CANCELLED", () => {
    expect(mapStatus("CANCELLED")).toBe("CANCELLED");
    expect(mapStatus("REJECTED")).toBe("CANCELLED");
    expect(mapStatus("ABORTED")).toBe("CANCELLED");
    expect(mapStatus("TIMEOUT")).toBe("CANCELLED");
    expect(mapStatus("ABANDONED")).toBe("CANCELLED");
    expect(mapStatus("EXPIRED")).toBe("CANCELLED");
  });

  it("maps REFUNDED correctly (not CANCELLED)", () => {
    expect(mapStatus("REFUNDED")).toBe("REFUNDED");
  });

  it("maps REQUESTED/PENDING/CART/QUOTE to PENDING", () => {
    expect(mapStatus("REQUESTED")).toBe("PENDING");
    expect(mapStatus("PENDING")).toBe("PENDING");
    expect(mapStatus("CART")).toBe("PENDING");
    expect(mapStatus("QUOTE")).toBe("PENDING");
  });

  it("throws on unknown status instead of defaulting silently", () => {
    expect(() => mapStatus("WEIRD_NEW_STATE")).toThrow(/Unknown Bokun booking status/);
  });

  it("does NOT collapse substring matches into CANCELLED (no NOT_CANCELLED trap)", () => {
    // Status che contengono 'CANCEL' come substring devono fallire invece
    // di mappare silenziosamente — il vecchio bug `includes("CANCEL")`
    // avrebbe trattato NOT_CANCELLED come CANCELLED.
    expect(() => mapStatus("NOT_CANCELLED")).toThrow();
    expect(() => mapStatus("CANCELLATION_PENDING")).toThrow();
  });
});
