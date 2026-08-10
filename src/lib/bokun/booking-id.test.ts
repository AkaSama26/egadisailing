import { describe, expect, test } from "vitest";
import { ValidationError } from "@/lib/errors";
import { toBokunRestBookingId } from "./booking-id";

describe("toBokunRestBookingId", () => {
  test("keeps numeric REST IDs unchanged", () => {
    expect(toBokunRestBookingId(99802913)).toBe("99802913");
    expect(toBokunRestBookingId("99802913")).toBe("99802913");
  });

  test("decodes the global webhook ID from the official Bokun example", () => {
    expect(toBokunRestBookingId("Qm9va2luZzozNzY0OA")).toBe("37648");
  });

  test("accepts standard base64 padding and base64url", () => {
    const padded = Buffer.from("Booking:99802913", "utf8").toString("base64");
    const base64Url = padded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    expect(toBokunRestBookingId(padded)).toBe("99802913");
    expect(toBokunRestBookingId(base64Url)).toBe("99802913");
  });

  test("rejects a different GraphQL resource type", () => {
    const experienceId = Buffer.from("ExperienceBooking:99802913", "utf8").toString("base64");
    expect(() => toBokunRestBookingId(experienceId)).toThrow(ValidationError);
  });

  test.each(["../booking/1", "not-an-opaque-id", "", 0, -1, 1.5])(
    "rejects malformed ID %j",
    (value) => {
      expect(() => toBokunRestBookingId(value)).toThrow(ValidationError);
    },
  );
});
