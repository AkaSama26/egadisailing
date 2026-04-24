// src/lib/booking/override-types.ts
// NOTA: non importiamo BookingSource da Prisma — definiamo union esplicito
// per conflictSourceChannels (sottoinsieme dei source validi come "conflict origin").

// Canali validi come conflictSourceChannels nel DB
export type ConflictSourceChannel =
  | "DIRECT"
  | "BOKUN"
  | "BOATAROUND"
  | "SAMBOAT"
  | "CLICKANDBOAT"
  | "NAUTAL";

export const OTA_CHANNELS: readonly ConflictSourceChannel[] = [
  "BOKUN",
  "BOATAROUND",
  "SAMBOAT",
  "CLICKANDBOAT",
  "NAUTAL",
] as const;

export function isOtaChannel(ch: ConflictSourceChannel): boolean {
  return OTA_CHANNELS.includes(ch);
}

// DTO per workflow checklist OTA admin (§7.2bis)
export interface OtaConfirmation {
  conflictBookingId: string;    // Booking.id
  channel: ConflictSourceChannel;
  externalRef: string;           // bokunBookingId / etc
  panelOpened: boolean;          // checkbox 1
  upstreamCancelled: boolean;    // checkbox 2
  refundVerified: boolean;       // checkbox 3
  adminDeclared: boolean;        // checkbox 4
}

export function isOtaConfirmationComplete(c: OtaConfirmation): boolean {
  return c.panelOpened && c.upstreamCancelled && c.refundVerified && c.adminDeclared;
}
