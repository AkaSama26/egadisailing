"use server";

/**
 * STUB — Real implementation in Task 2.9bis.
 * Verifica che un booking OTA conflittuale sia effettivamente CANCELLED upstream
 * (Bokun webhook arrivato dopo che admin ha cancellato manualmente su Viator).
 */
export async function isUpstreamCancelled(
  _conflictId: string,
  _channel: string,
): Promise<boolean> {
  // Stub: sempre true per Task 2.4. Real impl in Task 2.9bis.
  return true;
}
