import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/env";

let initialized = false;

/**
 * Inizializza Sentry se DSN configurato. Idempotent — chiamabile da
 * `instrumentation.ts` al boot.
 *
 * Policy:
 * - DSN non settato → no-op (dev/staging senza observability).
 * - `tracesSampleRate: 0.1` — 10% delle tracce (evita bill fuori controllo).
 * - PII redaction: sendDefaultPii=false + beforeSend custom strip campi
 *   sensibili (email/firstName/lastName/phone/ipAddress).
 * - Release tag da GIT_SHA se disponibile (build-time) per correlare errori
 *   alla release specifica.
 */
export function initSentry(context: "server" | "edge" | "client"): void {
  if (initialized) return;
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    release: env.SENTRY_RELEASE ?? process.env.GIT_SHA?.slice(0, 7),
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    // PII filter analogo a REDACT_PATHS pino (coerenza tra log + Sentry).
    beforeSend(event) {
      // Strip PII dal request context (headers, body).
      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers["cookie"];
          delete event.request.headers["authorization"];
        }
        if (typeof event.request.data === "object" && event.request.data !== null) {
          const data = event.request.data as Record<string, unknown>;
          for (const key of [
            "email",
            "firstName",
            "lastName",
            "phone",
            "ipAddress",
            "password",
            "token",
          ]) {
            if (key in data) data[key] = "[REDACTED]";
          }
        }
      }
      // Strip user object (default Sentry include email/id/ip_address).
      if (event.user) {
        event.user = { id: event.user.id }; // solo id, no email/ip
      }
      return event;
    },
    // Ignora errori "attesi" (ValidationError 400, RateLimitError 429) — non
    // sono bug da investigare, sono comportamento normale.
    ignoreErrors: [
      "ValidationError",
      "RateLimitError",
      "UnauthorizedError",
      "ForbiddenError",
      "NotFoundError",
      "ConflictError",
    ],
    // Tag ogni evento con context (server/edge/client) per filtering UI.
    initialScope: { tags: { runtime: context } },
  });

  initialized = true;
}

/**
 * Capture manuale di un errore (da usare in `withErrorHandler` branch 500).
 * No-op se Sentry non inizializzato.
 */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(err, { extra: context });
}
