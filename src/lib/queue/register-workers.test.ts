import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bokunAvailability: vi.fn(),
  bokunBooking: vi.fn(),
  bokunPricing: vi.fn(),
  boataroundAvailability: vi.fn(),
  manualAlert: vi.fn(),
  transactionalEmail: vi.fn(),
}));

vi.mock("./workers/bokun-availability-worker", () => ({
  startBokunAvailabilityWorker: mocks.bokunAvailability,
}));
vi.mock("./workers/bokun-booking-worker", () => ({
  startBokunBookingWorker: mocks.bokunBooking,
}));
vi.mock("./workers/bokun-pricing-worker", () => ({
  startBokunPricingWorker: mocks.bokunPricing,
}));
vi.mock("./workers/boataround-availability-worker", () => ({
  startBoataroundAvailabilityWorker: mocks.boataroundAvailability,
}));
vi.mock("./workers/manual-alert-worker", () => ({
  startManualAlertWorker: mocks.manualAlert,
}));
vi.mock("./workers/transactional-email-worker", () => ({
  startTransactionalEmailWorker: mocks.transactionalEmail,
}));
vi.mock("@/lib/env", () => ({
  env: {
    BOKUN_PRICING_SYNC_ENABLED: false,
    BOATAROUND_SYNC_ENABLED: false,
  },
}));
vi.mock("./index", () => ({
  getRegisteredWorkers: () => [],
  getRedisConnection: () => ({ quit: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock("@/lib/db", () => ({
  db: { $disconnect: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("registerQueueWorkers feature gates", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("non avvia i worker pricing Bokun e Boataround quando disabilitati", async () => {
    const state = globalThis as typeof globalThis & {
      __workersRegistered__?: boolean;
      __shutdownHandlerRegistered__?: boolean;
      __shuttingDown__?: boolean;
    };
    delete state.__workersRegistered__;
    delete state.__shutdownHandlerRegistered__;
    delete state.__shuttingDown__;
    const processOn = vi.spyOn(process, "on").mockImplementation(() => process);

    const { registerQueueWorkers } = await import("./register-workers");
    registerQueueWorkers();

    expect(mocks.bokunPricing).not.toHaveBeenCalled();
    expect(mocks.boataroundAvailability).not.toHaveBeenCalled();
    expect(mocks.bokunAvailability).toHaveBeenCalledOnce();
    expect(mocks.bokunBooking).toHaveBeenCalledOnce();
    expect(mocks.manualAlert).toHaveBeenCalledOnce();
    expect(mocks.transactionalEmail).toHaveBeenCalledOnce();
    expect(processOn).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
    expect(processOn).toHaveBeenCalledWith("SIGINT", expect.any(Function));
  });
});
