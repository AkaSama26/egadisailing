import { describe, expect, it } from "vitest";
import { createQueueJobIdentity, queueExecutionJobId } from "./job-identity";

describe("queue job identity", () => {
  it("mantiene il logical key ma genera execution id sempre nuovi", () => {
    const first = createQueueJobIdentity("availability:boat:2026-08-01:BOKUN");
    const second = createQueueJobIdentity("availability:boat:2026-08-01:BOKUN");
    expect(first.logicalKey).toBe(second.logicalKey);
    expect(first.executionId).not.toBe(second.executionId);
    expect(queueExecutionJobId(first)).not.toBe(queueExecutionJobId(second));
    expect(queueExecutionJobId(first)).toMatch(/^exec-[0-9a-f-]{36}$/);
  });
});
