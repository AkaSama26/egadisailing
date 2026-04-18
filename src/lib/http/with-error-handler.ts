import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { AppError, RateLimitError } from "@/lib/errors";
import { UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";

type Handler = (req: Request, ...args: unknown[]) => Promise<Response>;

/**
 * Wraps an App Router API handler:
 * - Attaches a requestId (from client or generated) to every request
 * - Maps AppError → toClientJSON + statusCode + rate-limit headers
 * - Maps ZodError → 400 with issues
 * - Other errors → 500 generic (stack only in log)
 * - Always echoes back `X-Request-Id` header for correlation
 */
export function withErrorHandler<H extends Handler>(handler: H): H {
  return (async (req, ...args) => {
    const requestId =
      req.headers.get("x-request-id") ?? crypto.randomUUID();
    const reqLogger = logger.child({ requestId, url: req.url });

    try {
      const res = await handler(req, ...args);
      res.headers.set("x-request-id", requestId);
      return res;
    } catch (err) {
      if (err instanceof AppError) {
        const headers: Record<string, string> = { "x-request-id": requestId };
        if (err instanceof RateLimitError) {
          const retry = err.context.retryAfterSeconds;
          if (typeof retry === "number") {
            headers["retry-after"] = String(retry);
          }
        }
        return NextResponse.json(
          { error: err.toClientJSON() },
          { status: err.statusCode, headers },
        );
      }
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", issues: err.issues } },
          { status: 400, headers: { "x-request-id": requestId } },
        );
      }
      reqLogger.error({ err }, "Unhandled route error");
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", requestId } },
        { status: 500, headers: { "x-request-id": requestId } },
      );
    }
  }) as H;
}

/**
 * Authorize a request using a shared secret header (timing-safe).
 * Throws UnauthorizedError if missing/invalid.
 */
export function requireBearerSecret(req: Request, expected: string): void {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }
  const provided = header.slice("Bearer ".length);
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) {
    throw new UnauthorizedError("Invalid token");
  }
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    throw new UnauthorizedError("Invalid token");
  }
}
