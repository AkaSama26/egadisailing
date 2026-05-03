export interface ControlRoomTaskCounts {
  openBalanceCount: number;
  pendingAlertCount: number;
  failedEmailCount: number;
  pendingChangeRequestCount: number;
  pendingOverrideCount: number;
  weatherWatchCount: number;
}

export function summarizeControlRoomTasks(counts: ControlRoomTaskCounts): number {
  return (
    counts.openBalanceCount +
    counts.pendingAlertCount +
    counts.failedEmailCount +
    counts.pendingChangeRequestCount +
    counts.pendingOverrideCount +
    counts.weatherWatchCount
  );
}
