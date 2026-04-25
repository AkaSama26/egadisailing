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
  // Upstream bodies possono contenere PII / segreti — redacted e troncati.
  "*.upstreamBody",
  "*.responseBody",
  "*.body",
  // Prisma error.meta puo' contenere valori PII (target delle unique, ecc).
  "*.meta",
  "err.meta",
  // R14-Area1: PII GDPR art. 4(1) — mai in chiaro nei log aggregati.
  "*.email",
  "*.to",
  "*.customerEmail",
  "*.recipientEmail",
  "*.customer.email",
  "*.firstName",
  "*.lastName",
  "*.customerName",
  "*.phone",
  "*.ipAddress",
  "*.ip",
  "*.context.to",
  "*.context.email",
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

/**
 * Logger child con context bound. Convenzione: ogni modulo lib dovrebbe
 * esportare `const log = childLogger("module-name")` per surface-level
 * grep su production traces (pino emette `module: "module-name"` come field).
 *
 * Overload:
 *  - `childLogger("notifications/dispatcher")` → bind {module: "..."}
 *  - `childLogger({ module: "x", requestId: "..." })` → bind arbitrary fields
 */
export function childLogger(moduleName: string): pino.Logger;
export function childLogger(context: Record<string, unknown>): pino.Logger;
export function childLogger(arg: string | Record<string, unknown>): pino.Logger {
  if (typeof arg === "string") return logger.child({ module: arg });
  return logger.child(arg);
}

/**
 * Helper per loggare errori in modo strutturato + safe (no stack truncation
 * silente). Uso:
 *   logError(err, "Failed to refund payment", { paymentId, bookingId });
 *
 * Output coerente: {errCode, errMessage, errStack, ...ctx}.
 * Risolve drift R14-deferred (cron files truncavano `(err as Error).message`).
 */
export function logError(
  err: unknown,
  msg: string,
  ctx: Record<string, unknown> = {},
): void {
  const e = err instanceof Error ? err : new Error(String(err));
  logger.error(
    {
      errCode: (e as Error & { code?: string }).code,
      errMessage: e.message,
      errStack: e.stack?.slice(0, 2000),
      ...ctx,
    },
    msg,
  );
}
