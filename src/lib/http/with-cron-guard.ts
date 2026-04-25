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
  /**
   * Soft timeout (ms). Quando set, l'handler riceve `shouldStop()` da chiamare
   * tra iterations di un batch loop. Il guard NON interrompe forzatamente — e'
   * responsabilita' dell'handler controllare e break/early-return.
   * Pattern R28-ALTA-3 (pending-gc / bokun-reconciliation / stripe-reconciliation).
   */
  runBudgetMs?: number;
}

export interface CronHandlerCtx {
  /** True quando runBudgetMs e' superato. Handler dovrebbe fare break su batch loop. */
  shouldStop: () => boolean;
  /** Tempo elapsed dall'inizio handler (ms). */
  elapsedMs: () => number;
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
 * Quando `runBudgetMs` e' set, l'handler riceve `ctx.shouldStop()` per
 * controllare il soft-timeout dentro batch loops (pattern R28-ALTA-3).
 */
export function withCronGuard<T>(
  config: CronGuardConfig,
  handler: (req: Request, ctx: CronHandlerCtx) => Promise<T>,
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

    const startedAt = Date.now();
    const ctx: CronHandlerCtx = {
      elapsedMs: () => Date.now() - startedAt,
      shouldStop: () =>
        config.runBudgetMs !== undefined &&
        Date.now() - startedAt > config.runBudgetMs,
    };

    try {
      const result = await handler(req, ctx);
      return NextResponse.json(result);
    } finally {
      await releaseLease(lease);
    }
  });
}
