import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";
import type { RateLimitScope } from "@/lib/channels";
import type { LeaseKey } from "@/lib/lease/keys";

export interface CronGuardConfig {
  /** Scope rate-limit (gia' definito in RATE_LIMIT_SCOPES) */
  scope: RateLimitScope;
  /** Lease key Redis (LEASE_KEYS) */
  leaseKey: LeaseKey;
  /** TTL lease in secondi (tipicamente 5-10 min) */
  leaseTtlSeconds: number;
  /** Rate-limit cap per-minute (default 10) */
  rateLimitPerMin?: number;
}

/**
 * Higher-order function che applica il pattern standard cron route:
 * 1. withErrorHandler (mapping AppError → HTTP)
 * 2. requireBearerSecret (Bearer CRON_SECRET) — PRIMA del rate-limit (R13-C2)
 * 3. enforceRateLimit (global, fail-open)
 * 4. tryAcquireLease single-flight multi-replica
 * 5. Esegue handler dentro try/finally
 *
 * Restituisce 200 con risultato handler, o `{skipped: "already-running"}` se
 * il lease e' gia' acquisito da un altro pod.
 *
 * TODO: migrate pending-gc, weather-check, stripe-reconciliation,
 * bokun-reconciliation, retention, balance-reminders, email-parser a
 * withCronGuard (Fase 2 deferred).
 */
export function withCronGuard<T>(
  config: CronGuardConfig,
  handler: (req: Request) => Promise<T>,
) {
  return withErrorHandler(async (req: Request) => {
    requireBearerSecret(req, env.CRON_SECRET);
    await enforceRateLimit({
      identifier: "global",
      scope: config.scope,
      limit: config.rateLimitPerMin ?? 10,
      windowSeconds: 60,
      failOpen: true,
    });

    const lease = await tryAcquireLease(config.leaseKey, config.leaseTtlSeconds);
    if (!lease) {
      return NextResponse.json({ skipped: "already-running" });
    }
    try {
      const result = await handler(req);
      return NextResponse.json(result);
    } finally {
      await releaseLease(lease);
    }
  });
}
