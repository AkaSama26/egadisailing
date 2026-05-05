export const PUBLIC_DISABLED_BOOKING_SERVICE_IDS = new Set<string>([
  "boat-shared-morning",
  "boat-shared-afternoon",
]);

export function isPublicBookingServiceEnabled(serviceId: string): boolean {
  return !PUBLIC_DISABLED_BOOKING_SERVICE_IDS.has(serviceId);
}
