import { describe, expect, it } from "vitest";
import { computeCustomerCancellationPolicy } from "./cancellation-policy";

describe("computeCustomerCancellationPolicy", () => {
  const now = new Date("2026-04-26T10:00:00Z");

  it.each([
    ["31 giorni prima", "2026-05-27", "FULL_REFUND", "1", "0"],
    ["30 giorni prima", "2026-05-26", "FULL_REFUND", "1", "0"],
    ["29 giorni prima", "2026-05-25", "HALF_REFUND", "0.5", "0.5"],
    ["15 giorni prima", "2026-05-11", "HALF_REFUND", "0.5", "0.5"],
    ["14 giorni prima", "2026-05-10", "NO_REFUND", "0", "1"],
    ["1 giorno prima", "2026-04-27", "NO_REFUND", "0", "1"],
    ["giorno della partenza", "2026-04-26", "NO_REFUND", "0", "1"],
  ])(
    "%s calcola band e moltiplicatori",
    (_label, startDate, expectedBand, expectedRefund, expectedRetention) => {
      const policy = computeCustomerCancellationPolicy(new Date(startDate), now);

      expect(policy.band).toBe(expectedBand);
      expect(policy.refundMultiplier.toString()).toBe(expectedRefund);
      expect(policy.retentionMultiplier.toString()).toBe(expectedRetention);
    },
  );
});
