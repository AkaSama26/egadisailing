// R29-AUDIT-FIX2/R30-BIZ: i pacchetti venduti come barca intera devono
// occupare lo slot del mezzo. I tour condivisi SOCIAL_BOATING e BOAT_SHARED
// possono invece coesistere sulla stessa giornata.
export const BOAT_EXCLUSIVE_SERVICE_TYPES = [
  "EXCLUSIVE_EXPERIENCE",
  "CABIN_CHARTER",
  "BOAT_EXCLUSIVE",
] as const;

export function isBoatExclusiveServiceType(type: string): boolean {
  return (BOAT_EXCLUSIVE_SERVICE_TYPES as readonly string[]).includes(type);
}
