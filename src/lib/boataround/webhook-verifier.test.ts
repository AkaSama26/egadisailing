import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { verifyBoataroundWebhook } from "./webhook-verifier";

const SECRET = "test-secret-min-32-chars-for-safety";

function sign(body: string): string {
  return crypto.createHmac("sha256", SECRET).update(body).digest("base64");
}

describe("verifyBoataroundWebhook", () => {
  it("accepts valid HMAC-SHA256 signature", () => {
    const body = '{"type":"booking.created","bookingId":"abc"}';
    expect(verifyBoataroundWebhook(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects tampered body", () => {
    const body = '{"type":"booking.created","bookingId":"abc"}';
    const sig = sign(body);
    expect(verifyBoataroundWebhook(body + "tampered", sig, SECRET)).toBe(false);
  });

  it("rejects wrong secret", () => {
    const body = "x";
    expect(verifyBoataroundWebhook(body, sign(body), "other-secret")).toBe(false);
  });

  it("rejects empty signature or secret", () => {
    expect(verifyBoataroundWebhook("x", "", SECRET)).toBe(false);
    expect(verifyBoataroundWebhook("x", "sig", "")).toBe(false);
  });

  it("rejects signature of wrong length without throwing", () => {
    expect(verifyBoataroundWebhook("x", "too-short", SECRET)).toBe(false);
  });
});
