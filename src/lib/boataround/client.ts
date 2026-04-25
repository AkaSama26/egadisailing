import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { BoataroundApiError } from "./errors";
import { fetchWithRetry } from "@/lib/http/with-retry";

export type BoataroundHttpMethod = "GET" | "POST" | "PUT" | "DELETE";

const UPSTREAM_BODY_PREVIEW_CHARS = 500;

/**
 * Client HTTP per Boataround Partner API.
 *
 * Stesso pattern del BokunClient post-round-7: retry esponenziale con jitter
 * (anti thundering-herd), onora `Retry-After`, AbortSignal.timeout per
 * impedire hang infiniti, body preview troncato + redacted nei log. Il core
 * retry/backoff/timeout vive in `@/lib/http/with-retry`.
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
    const url = `${this.apiUrl}${path}`;
    const headers: Record<string, string> = {
      "x-application-token": this.token,
      accept: "application/json",
    };
    if (body !== undefined) headers["content-type"] = "application/json";

    const init: RequestInit = {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };

    const start = Date.now();
    let res: Response;
    try {
      res = await fetchWithRetry(url, {
        init,
        logCtx: { channel: "BOATAROUND", method, path },
      });
    } catch (err) {
      // Network-level failure post-retries. Wrap in BoataroundApiError(0).
      throw new BoataroundApiError(
        `${method} ${path} network error`,
        0,
        (err as Error).message,
      );
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
    logger.error(
      { method, path, status: res.status, durMs, upstreamBody: preview },
      "Boataround API error",
    );
    throw new BoataroundApiError(`${method} ${path} failed`, res.status, preview);
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
