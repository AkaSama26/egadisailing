export type SyncJobType =
  | "availability.update"
  | "pricing.bokun.sync"
  | "booking.webhook.process"
  | "otp.cleanup";

export interface AvailabilityUpdateJob {
  boatId: string;
  date: string; // ISO date
  status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
  originBookingId?: string;
  sourceChannel: string;
}

export interface BokunPricingSyncJob {
  pricingPeriodId?: string;
  hotDayRuleId?: string;
  serviceId: string;
  date: string;
  amount: string; // decimal as string
}

export interface BookingWebhookJob {
  channel: "BOKUN" | "BOATAROUND";
  externalBookingId: string;
  rawPayload: Record<string, unknown>;
}

export type JobPayload =
  | AvailabilityUpdateJob
  | BokunPricingSyncJob
  | BookingWebhookJob
  | Record<string, never>;
