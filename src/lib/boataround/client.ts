import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { BoataroundApiError } from "./errors";

export type BoataroundHttpMethod = "GET" | "POST" | "PUT" | "DELETE";

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;
const RETRY_JITTER_MS = 500;
const UPSTREAM_BODY_PREVIEW_CHARS = 500;
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Client HTTP per Boataround Partner API.
 *
 * Stesso pattern del BokunClient post-round-7: retry esponenziale con jitter
 * (anti thundering-herd), onora `Retry-After`, AbortSignal.timeout per
 * impedire hang infiniti, body preview troncato + redacted nei log.
 */
export class BoataroundClient {
  constructor(
    private apiUrl: string,
    private token: string,
  ) {}

  async request<T>(
    method: BoataroundHttpMethod,
    path: string,
    body?: unknown,
  ): Promise<T> {
    let lastError: BoataroundApiError | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const headers: Record<string, string> = {
        "x-application-token": this.token,
        accept: "application/json",
      };
      if (body !== undefined) headers["content-type"] = "application/json";

      const init: RequestInit = {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      };

      const url = `${this.apiUrl}${path}`;
      const start = Date.now();
      let res: Response;
      try {
        res = await fetch(url, init);
      } catch (err) {
        lastError = new BoataroundApiError(
          `${method} ${path} network error`,
          0,
          (err as Error).message,
        );
        if (attempt < MAX_RETRIES - 1) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw lastError;
      }
      const durMs = Date.now() - start;

      if (res.ok) {
        logger.debug({ method, path, status: res.status, durMs }, "Boataround API request");
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) return (await res.json()) as T;
        return (await res.text()) as unknown as T;
      }

      const text = await res.text();
      const preview = text.slice(0, UPSTREAM_BODY_PREVIEW_CHARS);
      lastError = new BoataroundApiError(`${method} ${path} failed`, res.status, preview);

      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < MAX_RETRIES - 1) {
        const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
        logger.warn(
          { method, path, status: res.status, durMs, attempt, retryAfter },
          "Boataround API retryable error",
        );
        await sleep(retryAfter ?? backoffMs(attempt));
        continue;
      }
      logger.error(
        { method, path, status: res.status, durMs, upstreamBody: preview },
        "Boataround API error",
      );
      throw lastError;
    }
    throw lastError ?? new BoataroundApiError(`${method} ${path} failed`, 0);
  }
}

let _client: BoataroundClient | null = null;

export function boataroundClient(): BoataroundClient {
  if (!_client) {
    if (!env.BOATAROUND_API_TOKEN) {
      throw new Error("BOATAROUND_API_TOKEN not configured");
    }
    _client = new BoataroundClient(env.BOATAROUND_API_URL, env.BOATAROUND_API_TOKEN);
  }
  return _client;
}

export function isBoataroundConfigured(): boolean {
  return Boolean(env.BOATAROUND_API_TOKEN && env.BOATAROUND_WEBHOOK_SECRET);
}

function backoffMs(attempt: number): number {
  return RETRY_BASE_MS * 2 ** attempt + Math.random() * RETRY_JITTER_MS;
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 10_000);
  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return diff > 0 ? Math.min(diff, 10_000) : 0;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
