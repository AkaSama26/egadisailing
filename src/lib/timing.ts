/**
 * Centralized timing constants — registry per TTL Redis cache, lease durations,
 * rate-limit windows, run-budget cron, max retries. Riduce magic-numbers
 * scattered su 12+ files.
 *
 * Usage:
 *   import { TTL, RL_WINDOW, RUN_BUDGET } from "@/lib/timing";
 *   await redis.set(key, value, "EX", TTL.CANCELLATION_RATE);
 */

/** Time-to-live durations in seconds (Redis cache + leases). */
export const TTL = {
  /** Cancellation-rate per-channel cache (60s). */
  CANCELLATION_RATE: 60,
  /** Weather forecast cache (6h). */
  WEATHER_FORECAST: 6 * 60 * 60,
  /** Weather fetch lease (stampede protection, 30s). */
  WEATHER_FETCH_LEASE: 30,
  /** Bokun service cache (60s). */
  BOKUN_SERVICE_CACHE: 60,
  /** Stripe reconciliation cursor (7 days). */
  STRIPE_RECONCILIATION_CURSOR: 7 * 24 * 60 * 60,
  /** Cron lease durations (vary per cron). */
  CRON_LEASE_OVERRIDE_RECONCILE: 5 * 60,
  CRON_LEASE_OVERRIDE_REMINDERS: 10 * 60,
  CRON_LEASE_OVERRIDE_DROPDEAD: 10 * 60,
  CRON_LEASE_REFUND_RETRY: 10 * 60,
  CRON_LEASE_EMAIL_OUTBOX: 5 * 60,
  CRON_LEASE_PENDING_GC: 5 * 60,
  CRON_LEASE_RECONCILIATION: 10 * 60,
} as const;

/** Time-to-live durations in milliseconds (in-memory + Date arithmetic). */
export const TTL_MS = {
  /** Direct booking retry window (15min). */
  DIRECT_RETRY_WINDOW: 15 * 60 * 1000,
  /** Pending GC cutoff (45min). */
  PENDING_GC_CUTOFF: 45 * 60 * 1000,
  /** Balance link expiry (6h). */
  BALANCE_LINK_EXPIRY: 6 * 60 * 60 * 1000,
  /** Override reminder cooldown (24h). */
  OVERRIDE_REMINDER_COOLDOWN: 24 * 60 * 60 * 1000,
  /** OTP request lifetime (15min). */
  OTP_LIFETIME: 15 * 60 * 1000,
  /** Customer session lifetime (90 days). */
  SESSION_LIFETIME: 90 * 24 * 60 * 60 * 1000,
} as const;

/** Rate-limit window seconds (windowSeconds param of enforceRateLimit). */
export const RL_WINDOW = {
  /** 1 minute (per-IP burst limits). */
  MIN: 60,
  /** 15 minutes. */
  QUARTER_HOUR: 15 * 60,
  /** 1 hour (per-email/per-user OTP limits). */
  HOUR: 3600,
  /** 24 hours (daily quotas). */
  DAY: 86400,
} as const;

/** Cron run-budget durations in milliseconds (soft-timeout per iteration). */
export const RUN_BUDGET = {
  /** 4 minutes — pending-gc, refund-retry. */
  STANDARD: 4 * 60 * 1000,
  /** 6 minutes — bokun-reconciliation, stripe-reconciliation (multi-page). */
  EXTENDED: 6 * 60 * 1000,
} as const;

/** Max iteration counts for cursor-based cron loops. */
export const MAX_BATCHES = {
  /** Pending-GC, retention. */
  STANDARD: 20,
  /** Bokun/Stripe reconciliation pagination. */
  RECONCILIATION: 100,
} as const;

/** Max retry attempts for various external calls. */
export const MAX_RETRIES = {
  /** fetchWithRetry default (Bokun + Boataround). */
  FETCH: 3,
  /** Stripe SDK retry budget. */
  STRIPE: 1,
} as const;
