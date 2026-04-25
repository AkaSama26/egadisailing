import { logger } from "@/lib/logger";

/**
 * Discriminated union per "partial-failure" results across the codebase.
 *
 * Sostituisce shape duplicate per ogni feature:
 *   - {refundsFailed[], emailOk} (post-commit-cancel)
 *   - {refundErrors[], emailsSent, emailsFailed} (approveOverride)
 *   - {emailOk, telegramOk, anyOk, skipped} (dispatcher)
 *   - {expired, refundFailures, emailFailures} (expireDropDeadRequests)
 *
 * NOTA: migrazione conservativa — solo 2 siti in questa fase. Altri siti
 * hanno API publica gia' usata; fanno propria valutazione caso-per-caso
 * (Phase 8+ candidates).
 */

export interface PartialError {
  /** Identifier (paymentId, channelName, recipient) per tracing. */
  id: string;
  /** Human-readable error message. */
  message: string;
  /** Optional category per metrics. */
  kind?: "refund" | "email" | "telegram" | "release" | "audit" | "other";
}

/** Discriminated union: ok | partial | failed. */
export type Outcome<T = void> =
  | { status: "ok"; data: T }
  | { status: "partial"; data: T; errors: PartialError[] }
  | { status: "failed"; errors: PartialError[] };

/** Helper constructors. */
export const ok = <T>(data: T): Outcome<T> => ({ status: "ok", data });
export const partial = <T>(data: T, errors: PartialError[]): Outcome<T> => ({
  status: "partial",
  data,
  errors,
});
export const failed = <T = never>(errors: PartialError[]): Outcome<T> => ({
  status: "failed",
  errors,
});

/** True se ok OR partial. */
export function isSuccessful<T>(
  outcome: Outcome<T>,
): outcome is
  | { status: "ok"; data: T }
  | { status: "partial"; data: T; errors: PartialError[] } {
  return outcome.status !== "failed";
}

/**
 * Helper per fire-and-forget async cleanup che logga la ragione invece di
 * silently swallow. Sostituisce pattern duplicato `.catch(() => null)`.
 *
 * Uso:
 *   void someAsyncCleanup().catch(swallow("post-commit cancel-PI", { piId }));
 *
 * R14 dispatcher placebo bug-class: silent swallow di errori dispatch
 * notification → marker scritto come "ok" anche su Brevo down → alert loss.
 * Forzando log a debug-level evita la silent regression class.
 */
export function swallow(
  reason: string,
  context: Record<string, unknown> = {},
): (err: unknown) => void {
  return (err: unknown) => {
    logger.debug(
      {
        reason,
        err: err instanceof Error ? err.message : String(err),
        ...context,
      },
      "swallow: silenced async error",
    );
  };
}
