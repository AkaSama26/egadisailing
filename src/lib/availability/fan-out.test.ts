import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bokunAdd: vi.fn().mockResolvedValue(undefined),
  boataroundAdd: vi.fn().mockResolvedValue(undefined),
  manualAdd: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/env", () => ({ env: { BOATAROUND_SYNC_ENABLED: false } }));
vi.mock("@/lib/queue", () => ({
  availBokunQueue: () => ({ add: mocks.bokunAdd }),
  availBoataroundQueue: () => ({ add: mocks.boataroundAdd }),
  availManualQueue: () => ({ add: mocks.manualAdd }),
}));

import { fanOutAvailability } from "./fan-out";

describe("fanOutAvailability feature gates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("non crea backlog Boataround quando il circuito e' disabilitato", async () => {
    await fanOutAvailability({
      boatId: "boat-1",
      date: "2026-08-01",
      status: "BLOCKED",
      sourceChannel: "DIRECT",
    });

    expect(mocks.boataroundAdd).not.toHaveBeenCalled();
    expect(mocks.bokunAdd).toHaveBeenCalledTimes(1);
    // CLICKANDBOAT e NAUTAL condividono la queue manuale.
    expect(mocks.manualAdd).toHaveBeenCalledTimes(2);
  });
});
