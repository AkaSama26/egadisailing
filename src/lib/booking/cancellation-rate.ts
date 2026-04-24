"use server";

/**
 * STUB — Real implementation in Task 2.9ter.
 * Rolling cancellation rate per-channel negli ultimi N giorni.
 * Usata da approveOverride per hard-block se > OVERRIDE_CANCELLATION_RATE_HARD_BLOCK.
 */
export async function computeCancellationRate(
  _channel: string,
  _windowDays: number,
): Promise<{ rate: number; overrideCancellations: number; totalBookings: number }> {
  // Stub: sempre 0% per Task 2.4. Real impl in Task 2.9ter.
  return { rate: 0, overrideCancellations: 0, totalBookings: 0 };
}
