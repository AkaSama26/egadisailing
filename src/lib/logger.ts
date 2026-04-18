import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";
const isTest = process.env.NODE_ENV === "test";

/**
 * Campi sempre redatti. Estendere quando si introducono nuovi secret/PII.
 * Il pattern supporta wildcard al primo livello e path nidificati.
 */
const REDACT_PATHS = [
  // Headers
  "req.headers.authorization",
  "req.headers.cookie",
  "*.headers.authorization",
  "*.headers.cookie",
  // Secrets
  "*.password",
  "*.passwordHash",
  "*.token",
  "*.tokenHash",
  "*.codeHash",
  "*.secret",
  "*.apiKey",
  "*.api_key",
  // External provider details
  "*.stripeSecretKey",
  "*.stripePaymentIntentId",
  "*.stripeChargeId",
  "*.rawPayload",
];

/**
 * Convenzioni di livello:
 * - trace/debug: sviluppo, output verboso (es. self-echo detection)
 * - info: eventi business side-effect (booking created, availability updated)
 * - warn: situazioni recuperabili (rate limit triggerato, retry in corso)
 * - error: richiede intervento (webhook signature invalid, provider down)
 * - fatal: crash imminente
 */

// Reuse across HMR reloads in dev to avoid accumulating pino transports.
const globalForLogger = globalThis as unknown as { __logger__?: pino.Logger };

export const logger: pino.Logger =
  globalForLogger.__logger__ ??
  pino({
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    transport:
      isDev && !isTest
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss.l",
              ignore: "pid,hostname",
            },
          }
        : undefined,
    base: {
      app: "egadisailing",
      env: process.env.NODE_ENV ?? "development",
    },
    redact: {
      paths: REDACT_PATHS,
      censor: "[REDACTED]",
    },
  });

if (isDev) globalForLogger.__logger__ = logger;

export function childLogger(context: Record<string, unknown>): pino.Logger {
  return logger.child(context);
}
