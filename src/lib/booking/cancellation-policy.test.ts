import { describe, expect, it } from "vitest";
import { computeCustomerCancellationPolicy } from "./cancellation-policy";

describe("computeCustomerCancellationPolicy", () => {
  const now = new Date("2026-04-26T10:00:00Z");

  it(">= 15 giorni prima: rimborso completo", () => {
    const policy = computeCustomerCancellationPolicy(new Date("2026-05-11"), now);
    expect(policy.band).toBe("FULL_REFUND");
    expect(policy.refundMultiplier.toString()).toBe("1");
  });

  it("da 7 a 14 giorni prima: rimborso 50%", () => {
    const policy = computeCustomerCancellationPolicy(new Date("2026-05-05"), now);
    expect(policy.band).toBe("HALF_REFUND");
    expect(policy.refundMultiplier.toString()).toBe("0.5");
    expect(policy.retentionMultiplier.toString()).toBe("0.5");
  });

  it("< 7 giorni prima: nessun rimborso", () => {
    const policy = computeCustomerCancellationPolicy(new Date("2026-05-02"), now);
    expect(policy.band).toBe("NO_REFUND");
    expect(policy.refundMultiplier.toString()).toBe("0");
  });
});

