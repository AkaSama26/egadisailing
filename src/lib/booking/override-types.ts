// src/lib/booking/override-types.ts
// NOTA: non importiamo BookingSource da Prisma — definiamo union esplicito
// per conflictSourceChannels (sottoinsieme dei source validi come "conflict origin").

import { z } from "zod";

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

// =====================================================================
// Zod schemas — single source of truth per Server Actions admin
// override approve/reject. Mantenere allineato con OtaConfirmation DTO.
// =====================================================================

export const otaConfirmationSchema = z.object({
  conflictId: z.string(),
  conflictBookingId: z.string().optional(),
  channel: z.string(),
  externalRef: z.string(),
  panelOpened: z.boolean(),
  upstreamCancelled: z.boolean(),
  refundVerified: z.boolean(),
  adminDeclared: z.boolean(),
});

export const approveOverrideSchema = z.object({
  requestId: z.string().min(1),
  notes: z.string().max(500).optional(),
  otaConfirmations: z.array(otaConfirmationSchema).optional().default([]),
});

export const rejectOverrideSchema = z.object({
  requestId: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export type OtaConfirmationInput = z.infer<typeof otaConfirmationSchema>;
export type ApproveOverrideInput = z.infer<typeof approveOverrideSchema>;
export type RejectOverrideInput = z.infer<typeof rejectOverrideSchema>;
