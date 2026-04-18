import { describe, test, expect } from "vitest";
import { bokunDate, signBokunRequest } from "./signer";

const CREDS = {
  accessKey: "de235a6a15c340b6b1e1cb5f3687d04a",
  secretKey: "test-secret",
};

describe("bokunDate", () => {
  test("formats as 'YYYY-MM-DD HH:mm:ss' in UTC", () => {
    const d = new Date(Date.UTC(2013, 10, 9, 14, 33, 46));
    expect(bokunDate(d)).toBe("2013-11-09 14:33:46");
  });

  test("pads single-digit components", () => {
    const d = new Date(Date.UTC(2026, 0, 5, 3, 7, 9));
    expect(bokunDate(d)).toBe("2026-01-05 03:07:09");
  });
});

describe("signBokunRequest", () => {
  const fixed = new Date(Date.UTC(2013, 10, 9, 14, 33, 46));

  test("produces deterministic signature for same input", () => {
    const a = signBokunRequest("POST", "/activity.json/search", CREDS, fixed);
    const b = signBokunRequest("POST", "/activity.json/search", CREDS, fixed);
    expect(a["X-Bokun-Signature"]).toBe(b["X-Bokun-Signature"]);
  });

  test("different method produces different signature", () => {
    const post = signBokunRequest("POST", "/activity.json/search", CREDS, fixed);
    const get = signBokunRequest("GET", "/activity.json/search", CREDS, fixed);
    expect(post["X-Bokun-Signature"]).not.toBe(get["X-Bokun-Signature"]);
  });

  test("different path produces different signature", () => {
    const a = signBokunRequest("POST", "/a", CREDS, fixed);
    const b = signBokunRequest("POST", "/b", CREDS, fixed);
    expect(a["X-Bokun-Signature"]).not.toBe(b["X-Bokun-Signature"]);
  });

  test("different date produces different signature", () => {
    const a = signBokunRequest("POST", "/x", CREDS, fixed);
    const b = signBokunRequest("POST", "/x", CREDS, new Date(Date.UTC(2013, 10, 9, 14, 33, 47)));
    expect(a["X-Bokun-Signature"]).not.toBe(b["X-Bokun-Signature"]);
  });

  test("returns all 3 required headers", () => {
    const sig = signBokunRequest("GET", "/x", CREDS, fixed);
    expect(sig["X-Bokun-Date"]).toBe("2013-11-09 14:33:46");
    expect(sig["X-Bokun-AccessKey"]).toBe(CREDS.accessKey);
    expect(sig["X-Bokun-Signature"]).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});
