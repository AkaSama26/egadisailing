import { describe, test, expect } from "vitest";
import crypto from "node:crypto";
import { verifyBokunWebhook } from "./webhook-verifier";

const SECRET = "test-webhook-secret";

function makeSignedHeaders(
  payload: Record<string, string>,
  secret: string = SECRET,
): Record<string, string> {
  const concatenated = Object.entries(payload)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const hmac = crypto.createHmac("sha256", secret).update(concatenated).digest("hex");
  return { ...payload, "x-bokun-hmac": hmac };
}

describe("verifyBokunWebhook", () => {
  test("accepts correctly signed request", () => {
    const hdrs = makeSignedHeaders({
      "x-bokun-apikey": "abc",
      "x-bokun-vendor-id": "123",
      "x-bokun-topic": "bookings/create",
    });
    expect(verifyBokunWebhook(hdrs, SECRET)).toBe(true);
  });

  test("rejects missing hmac header", () => {
    const hdrs = {
      "x-bokun-apikey": "abc",
      "x-bokun-topic": "bookings/create",
    };
    expect(verifyBokunWebhook(hdrs, SECRET)).toBe(false);
  });

  test("rejects wrong hmac", () => {
    const hdrs = {
      "x-bokun-apikey": "abc",
      "x-bokun-hmac": "0".repeat(64),
    };
    expect(verifyBokunWebhook(hdrs, SECRET)).toBe(false);
  });

  test("rejects signature with wrong secret", () => {
    const hdrs = makeSignedHeaders({ "x-bokun-topic": "x" }, "another-secret");
    expect(verifyBokunWebhook(hdrs, SECRET)).toBe(false);
  });

  test("ignores non-bokun headers for signing", () => {
    const hdrs = makeSignedHeaders({
      "x-bokun-topic": "bookings/update",
    });
    expect(
      verifyBokunWebhook({ ...hdrs, "x-other-header": "value", "content-type": "json" }, SECRET),
    ).toBe(true);
  });

  test("handles uppercase header names (normalizes to lowercase)", () => {
    const hdrs = makeSignedHeaders({ "x-bokun-topic": "bookings/create" });
    const upperMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(hdrs)) upperMap[k.toUpperCase()] = v;
    // verifyBokunWebhook normalizes via toLowerCase() on each key, so this should still verify
    expect(verifyBokunWebhook(upperMap, SECRET)).toBe(true);
  });

  test("rejects tampered value", () => {
    const hdrs = makeSignedHeaders({ "x-bokun-topic": "bookings/create" });
    hdrs["x-bokun-topic"] = "bookings/cancel";
    expect(verifyBokunWebhook(hdrs, SECRET)).toBe(false);
  });
});
