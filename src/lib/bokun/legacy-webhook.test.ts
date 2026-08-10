import { describe, expect, test } from "vitest";
import { ValidationError } from "@/lib/errors";
import {
  deriveBokunLegacyWebhookAuth,
  extractLegacyBokunBookingId,
  inferLegacyBokunTopic,
  verifyBokunLegacyWebhookAuth,
} from "./legacy-webhook";

const SECRET = "legacy-webhook-secret-at-least-32-characters";

describe("Bokun legacy webhook helpers", () => {
  test("derives and verifies a stable HMAC credential", () => {
    const auth = deriveBokunLegacyWebhookAuth(SECRET);

    expect(auth).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyBokunLegacyWebhookAuth(auth, SECRET)).toBe(true);
    expect(
      verifyBokunLegacyWebhookAuth(auth, `${SECRET}-different`),
    ).toBe(false);
  });

  test.each([null, "", "not-hex", "a".repeat(63), "a".repeat(65)])(
    "rejects malformed auth %j",
    (auth) => {
      expect(verifyBokunLegacyWebhookAuth(auth, SECRET)).toBe(false);
    },
  );

  test("extracts a numeric root bookingId", () => {
    expect(
      extractLegacyBokunBookingId({
        bookingId: 99802913,
        customer: { email: "not-used@example.test" },
      }),
    ).toBe("99802913");
  });

  test("supports a nested booking shape", () => {
    expect(
      extractLegacyBokunBookingId({
        booking: { id: "99802913" },
      }),
    ).toBe("99802913");
  });

  test("supports a Bokun global booking ID without trusting other fields", () => {
    expect(
      extractLegacyBokunBookingId({
        bookingId: "Qm9va2luZzozNzY0OA",
      }),
    ).toBe("37648");
  });

  test.each([null, {}, { bookingId: "../admin" }])(
    "rejects a payload without a usable ID: %j",
    (payload) => {
      expect(() => extractLegacyBokunBookingId(payload)).toThrow(
        ValidationError,
      );
    },
  );

  test("maps cancellation status and treats other updates generically", () => {
    expect(inferLegacyBokunTopic({ status: "CANCELLED" })).toBe(
      "bookings/cancel",
    );
    expect(inferLegacyBokunTopic({ status: "CONFIRMED" })).toBe(
      "bookings/update",
    );
  });
});
