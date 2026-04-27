import type { Channel } from "@/lib/channels";

/**
 * Tutti i job passano per un discriminated union `type`.
 * Il worker pattern-matcha su `type` e ottiene payload tipizzato.
 */

export type JobType =
  | "availability.update"
  | "pricing.bokun.sync"
  | "booking.webhook.process"
  | "otp.cleanup";

export interface AvailabilityUpdateJobPayload {
  boatId: string;
  date: string; // ISO YYYY-MM-DD
  status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
  targetChannel: Channel;
  originBookingId?: string;
}

export interface BokunPricingSyncPayload {
  pricingPeriodId?: string;
  hotDayRuleId?: string;
  serviceId: string;
  date: string;
  amount: string; // Decimal as string to avoid precision loss
}

export interface BookingWebhookPayload {
  provider: Extract<Channel, "BOKUN" | "BOATAROUND">;
  eventId: string;
  topic: string;
  bookingId: string;
  experienceBookingId?: string;
  receivedAt: string;
}

export interface OtpCleanupPayload {
  // no-op: cleanup legge tutto il DB
}

export type Job =
  | { type: "availability.update"; data: AvailabilityUpdateJobPayload }
  | { type: "pricing.bokun.sync"; data: BokunPricingSyncPayload }
  | { type: "booking.webhook.process"; data: BookingWebhookPayload }
  | { type: "otp.cleanup"; data: OtpCleanupPayload };

export type JobPayloadFor<T extends JobType> = Extract<Job, { type: T }>["data"];
