import { logger } from "@/lib/logger";

/**
 * Core retry/backoff/timeout helper estratto da BokunClient + BoataroundClient.
 *
 * Caller-specific concerns (HMAC signing, auth headers, body serialization,
 * error class wrapping, response shape parsing) restano nel client wrapper.
 * Open-Meteo / Telegram / Brevo fetch resta separato (low complexity, semantica
 * differente — non vale l'astrazione).
 *
 * Design notes:
 * - Backoff esponenziale `base * 2^attempt + random(0, jitter)` anti
 *   thundering-herd quando N worker vedono 429/5xx insieme.
 * - `Retry-After` parsato in secondi numerici O HTTP-date, capped a
 *   `MAX_BACKOFF_MS` per evitare upstream con header esagerati.
 * - `AbortSignal.timeout(timeoutMs)` per evitare hang infiniti che tengono
 *   un worker BullMQ occupato.
 * - Status retryable: 408 (timeout), 429 (rate-limit), 500/502/503/504.
 *   404/401/400 e altri 4xx tornano la response al caller (non retryable —
 *   semantica business).
 * - `initBuilder` callback chiamato fresh per attempt: necessario per Bokun
 *   che firma con timestamp-nonce per request (signature stale tra attempts).
 */

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_BASE_MS = 500;
const DEFAULT_JITTER_MS = 500;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BACKOFF_MS = 10_000;

const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export type RetryInitBuilder = (attempt: number) => RequestInit;

export interface FetchWithRetryOpts {
  /** Init options statici (signal viene sovrascritto per attempt). Mutually
   *  exclusive con `initBuilder`. */
  init?: RequestInit;
  /** Callback per costruire init fresh ad ogni attempt (es. Bokun re-sign). */
  initBuilder?: RetryInitBuilder;
  /** Max attempts totali (default 3). */
  maxRetries?: number;
  /** Backoff base ms (default 500). */
  backoffBaseMs?: number;
  /** Jitter ms (random 0..N aggiunto a ogni retry, default 500). */
  jitterMs?: number;
  /** Per-attempt timeout via AbortSignal.timeout (default 15s). */
  timeoutMs?: number;
  /** Custom log context (es. {channel: "BOKUN", method, path}). */
  logCtx?: Record<string, unknown>;
}

/**
 * Fetch wrapper con retry/backoff/timeout/Retry-After handling.
 *
 * Caller responsabile dell'idempotenza HTTP per i metodi non-GET. Bokun/
 * Boataround usano semantica idempotente (PUT availability, GET booking).
 *
 * Ritorna l'ultima Response (anche non-2xx se attempts esauriti) — il caller
 * decide come mappare lo status finale al proprio error class.
 *
 * Throws solo su errori network non-retryable o su MAX_RETRIES esauriti
 * con sole eccezioni network (mai con 5xx — quello e' Response al caller).
 */
export async function fetchWithRetry(
  url: string,
  opts: FetchWithRetryOpts = {},
): Promise<Response> {
  const {
    init,
    initBuilder,
    maxRetries = DEFAULT_MAX_RETRIES,
    backoffBaseMs = DEFAULT_BACKOFF_BASE_MS,
    jitterMs = DEFAULT_JITTER_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    logCtx = {},
  } = opts;

  if (init && initBuilder) {
    throw new Error("fetchWithRetry: pass either `init` or `initBuilder`, not both");
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const baseInit = initBuilder ? initBuilder(attempt) : init ?? {};
    try {
      const res = await fetch(url, {
        ...baseInit,
        signal: AbortSignal.timeout(timeoutMs),
      });

      const isRetryable = RETRY_STATUSES.has(res.status);
      if (isRetryable && attempt < maxRetries - 1) {
        const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
        const delay = Math.min(
          retryAfter ?? computeBackoff(attempt, backoffBaseMs, jitterMs),
          DEFAULT_MAX_BACKOFF_MS,
        );
        logger.warn(
          { ...logCtx, status: res.status, attempt, delay },
          "fetchWithRetry: retrying after retryable status",
        );
        await sleep(delay);
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        const delay = Math.min(
          computeBackoff(attempt, backoffBaseMs, jitterMs),
          DEFAULT_MAX_BACKOFF_MS,
        );
        logger.warn(
          { ...logCtx, err, attempt, delay },
          "fetchWithRetry: retrying after fetch error",
        );
        await sleep(delay);
        continue;
      }
    }
  }

  // Esauriti i tentativi con un'eccezione network — propaga.
  throw lastError ?? new Error("fetchWithRetry: exhausted retries with no error captured");
}

/** Backoff esponenziale con jitter uniformemente distribuito in [0, jitterMs]. */
function computeBackoff(attempt: number, baseMs: number, jitterMs: number): number {
  return baseMs * Math.pow(2, attempt) + Math.random() * jitterMs;
}

/** Parsa header `Retry-After` (RFC 7231): numero secondi O HTTP-date. */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, DEFAULT_MAX_BACKOFF_MS);
  }
  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    if (diff > 0) return Math.min(diff, DEFAULT_MAX_BACKOFF_MS);
    return 0;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
