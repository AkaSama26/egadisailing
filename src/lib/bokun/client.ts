import { signBokunRequest, type BokunCredentials } from "./signer";
import { BokunApiError } from "./errors";
import { logger } from "@/lib/logger";

export interface BokunClientConfig {
  apiUrl: string;
  credentials: BokunCredentials;
}

export type BokunHttpMethod = "GET" | "POST" | "PUT" | "DELETE";

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;
const UPSTREAM_BODY_PREVIEW_CHARS = 500;

export class BokunClient {
  constructor(private config: BokunClientConfig) {}

  async request<T>(
    method: BokunHttpMethod,
    pathAndQuery: string,
    body?: unknown,
  ): Promise<T> {
    let lastError: BokunApiError | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const signed = signBokunRequest(method, pathAndQuery, this.config.credentials);
      const requestHeaders: Record<string, string> = { ...signed };
      if (body !== undefined) requestHeaders["Content-Type"] = "application/json;charset=UTF-8";
      const init: RequestInit = {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      };

      const url = `${this.config.apiUrl}${pathAndQuery}`;
      const start = Date.now();
      let res: Response;
      try {
        res = await fetch(url, init);
      } catch (err) {
        // Network-level failure (DNS, socket reset). Retry.
        lastError = new BokunApiError(
          `${method} ${pathAndQuery} network error`,
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
        logger.debug({ method, path: pathAndQuery, status: res.status, durMs }, "Bokun API request");
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) return (await res.json()) as T;
        return (await res.text()) as unknown as T;
      }

      const text = await res.text();
      const bodyPreview = text.slice(0, UPSTREAM_BODY_PREVIEW_CHARS);
      lastError = new BokunApiError(
        `${method} ${pathAndQuery} failed`,
        res.status,
        bodyPreview,
      );

      const isRetryable = res.status === 429 || res.status >= 500;
      if (isRetryable && attempt < MAX_RETRIES - 1) {
        const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
        logger.warn(
          { method, path: pathAndQuery, status: res.status, durMs, attempt, retryAfter },
          "Bokun API retryable error",
        );
        await sleep(retryAfter ?? backoffMs(attempt));
        continue;
      }

      logger.error(
        { method, path: pathAndQuery, status: res.status, durMs, upstreamBody: bodyPreview },
        "Bokun API error",
      );
      throw lastError;
    }

    // MAX_RETRIES exhausted with a retryable error
    throw lastError ?? new BokunApiError(`${method} ${pathAndQuery} failed`, 0);
  }
}

function backoffMs(attempt: number): number {
  return RETRY_BASE_MS * 2 ** attempt;
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
