import { describe, expect, test } from "vitest";
import { buildAnalyticsTransactionId } from "./transaction-id";

describe("buildAnalyticsTransactionId", () => {
  test("creates a stable non-raw short hash", () => {
    const id = buildAnalyticsTransactionId("booking_123");
    expect(id).toMatch(/^[a-f0-9]{16}$/);
    expect(buildAnalyticsTransactionId("booking_123")).toBe(id);
    expect(id).not.toContain("booking_123");
  });
});
