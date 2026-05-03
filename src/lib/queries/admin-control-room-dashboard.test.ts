import { describe, expect, it } from "vitest";
import { summarizeControlRoomTasks } from "./admin-control-room-dashboard-helpers";

describe("summarizeControlRoomTasks", () => {
  it("sums every actionable dashboard bucket", () => {
    expect(
      summarizeControlRoomTasks({
        openBalanceCount: 2,
        pendingAlertCount: 3,
        failedEmailCount: 1,
        pendingChangeRequestCount: 4,
        pendingOverrideCount: 5,
        weatherWatchCount: 6,
      }),
    ).toBe(21);
  });
});
