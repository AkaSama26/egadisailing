import { signBokunRequest, type BokunCredentials } from "./signer";
import { BokunApiError } from "./errors";
import { logger } from "@/lib/logger";
import { fetchWithRetry } from "@/lib/http/with-retry";

export interface BokunClientConfig {
  apiUrl: string;
  credentials: BokunCredentials;
}

export type BokunHttpMethod = "GET" | "POST" | "PUT" | "DELETE";

const UPSTREAM_BODY_PREVIEW_CHARS = 500;

export class BokunClient {
  constructor(private config: BokunClientConfig) {}

  /**
   * Esegue una request firmata Bokun. Il signing usa un timestamp-nonce
   * per request, quindi ogni retry ri-firma con timestamp corrente
   * (signature stale tra attempt = 401 upstream).
   *
   * Ritorna il body parsato (JSON o text). Su 4xx non-retryable o 5xx
   * dopo attempts esauriti throw `BokunApiError`. Errori network wrappati
   * in `BokunApiError(0)` per consistency con behavior pre-refactor.
   */
  async request<T>(
    method: BokunHttpMethod,
    pathAndQuery: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.config.apiUrl}${pathAndQuery}`;
    const start = Date.now();

    let res: Response;
    try {
      res = await fetchWithRetry(url, {
        logCtx: { channel: "BOKUN", method, path: pathAndQuery },
        // initBuilder per re-firma per attempt (timestamp-nonce stale tra retry).
        initBuilder: () => {
          const signed = signBokunRequest(method, pathAndQuery, this.config.credentials);
          const headers: Record<string, string> = { ...signed };
          if (body !== undefined) headers["Content-Type"] = "application/json;charset=UTF-8";
          return {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
          };
        },
      });
    } catch (err) {
      // Network-level failure (DNS, socket reset, timeout) post-retries.
      // Wrap in BokunApiError(0) per consistency con behavior pre-refactor.
      throw new BokunApiError(
        `${method} ${pathAndQuery} network error`,
        0,
        (err as Error).message,
      );
    }

    const durMs = Date.now() - start;

    if (res.ok) {
      logger.debug({ method, path: pathAndQuery, status: res.status, durMs }, "Bokun API request");
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) return (await res.json()) as T;
      return (await res.text()) as unknown as T;
    }

    // Non-ok dopo attempts esauriti (o 4xx non-retryable). Wrap in BokunApiError
    // con body preview troncato + redacted nei log.
    const text = await res.text();
    const bodyPreview = text.slice(0, UPSTREAM_BODY_PREVIEW_CHARS);
    logger.error(
      { method, path: pathAndQuery, status: res.status, durMs, upstreamBody: bodyPreview },
      "Bokun API error",
    );
    throw new BokunApiError(`${method} ${pathAndQuery} failed`, res.status, bodyPreview);
  }
}
