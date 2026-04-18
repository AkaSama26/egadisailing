import { signBokunRequest, type BokunCredentials } from "./signer";
import { BokunApiError } from "./errors";
import { logger } from "@/lib/logger";

export interface BokunClientConfig {
  apiUrl: string;
  credentials: BokunCredentials;
}

export type BokunHttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export class BokunClient {
  constructor(private config: BokunClientConfig) {}

  async request<T>(
    method: BokunHttpMethod,
    pathAndQuery: string,
    body?: unknown,
  ): Promise<T> {
    const signed = signBokunRequest(method, pathAndQuery, this.config.credentials);
    const requestHeaders: Record<string, string> = { ...signed };
    const init: RequestInit = { method, headers: requestHeaders };
    if (body !== undefined) {
      requestHeaders["Content-Type"] = "application/json;charset=UTF-8";
      init.body = JSON.stringify(body);
    }

    const url = `${this.config.apiUrl}${pathAndQuery}`;
    const start = Date.now();
    const res = await fetch(url, init);
    const durMs = Date.now() - start;

    if (!res.ok) {
      const text = await res.text();
      logger.error(
        { method, path: pathAndQuery, status: res.status, durMs, upstreamBody: text },
        "Bokun API error",
      );
      throw new BokunApiError(`${method} ${pathAndQuery} failed`, res.status, text);
    }

    logger.debug({ method, path: pathAndQuery, status: res.status, durMs }, "Bokun API request");
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }
}
