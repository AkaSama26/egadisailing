import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  serviceFindMany: vi.fn(),
  queueAdd: vi.fn(),
  quotePrice: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: { BOKUN_PRICING_SYNC_ENABLED: false },
}));
vi.mock("@/lib/db", () => ({
  db: { service: { findMany: mocks.serviceFindMany } },
}));
vi.mock("@/lib/queue", () => ({
  pricingBokunQueue: () => ({ add: mocks.queueAdd }),
}));
vi.mock("@/lib/pricing/service", () => ({ quotePrice: mocks.quotePrice }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import { scheduleBokunPricingSync } from "./bokun-sync";

describe("scheduleBokunPricingSync feature gate", () => {
  it("non legge prezzi e non crea job quando il circuito e' disabilitato", async () => {
    await scheduleBokunPricingSync({ dates: [new Date("2026-08-14T00:00:00Z")] });

    expect(mocks.serviceFindMany).not.toHaveBeenCalled();
    expect(mocks.quotePrice).not.toHaveBeenCalled();
    expect(mocks.queueAdd).not.toHaveBeenCalled();
  });
});
