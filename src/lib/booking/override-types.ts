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

// =====================================================================
// Internal DTO Zod schema — strict shape per workflow checklist OTA admin (§7.2bis).
// `OtaConfirmation` (interface) e' derivata via `z.infer` per eliminare drift.
// =====================================================================

export const otaConfirmationInternalSchema = z.object({
  conflictBookingId: z.string(),                       // Booking.id
  channel: z.enum(["DIRECT", "BOKUN", "BOATAROUND", "SAMBOAT", "CLICKANDBOAT", "NAUTAL"]),
  externalRef: z.string(),                              // bokunBookingId / etc
  panelOpened: z.boolean(),                             // checkbox 1
  upstreamCancelled: z.boolean(),                       // checkbox 2
  refundVerified: z.boolean(),                          // checkbox 3
  adminDeclared: z.boolean(),                           // checkbox 4
});

// DTO interno usato da approveOverride() — single source of truth derivata da Zod.
export type OtaConfirmation = z.infer<typeof otaConfirmationInternalSchema>;

export function isOtaConfirmationComplete(c: OtaConfirmation): boolean {
  return c.panelOpened && c.upstreamCancelled && c.refundVerified && c.adminDeclared;
}

// =====================================================================
// Wire schemas — Server Action input contract (client checkbox UI).
// Differiscono dall'internal DTO per due motivi:
//  - client invia `conflictId` (legacy nome del campo nel form), interno usa `conflictBookingId`
//  - `channel: z.string()` permissivo perche' il server fa narrowing al map
// L'action layer (actions.ts) traduce wire → internal via mapping esplicito.
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
