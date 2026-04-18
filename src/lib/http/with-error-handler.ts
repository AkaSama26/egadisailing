import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

type Handler = (req: Request, ...args: unknown[]) => Promise<Response>;

/**
 * Wraps an App Router API handler, mapping known error types to proper
 * HTTP responses. Use this for every POST/GET under src/app/api/.
 *
 * - AppError → toClientJSON() + statusCode
 * - ZodError → 400 with issues
 * - other → 500 generic (stack in log only)
 */
export function withErrorHandler<H extends Handler>(handler: H): H {
  return (async (req, ...args) => {
    try {
      return await handler(req, ...args);
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json({ error: err.toClientJSON() }, { status: err.statusCode });
      }
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", issues: err.issues } },
          { status: 400 },
        );
      }
      logger.error({ err, url: req.url }, "Unhandled route error");
      return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
    }
  }) as H;
}

/**
 * Authorize a request using a shared secret header. Timing-safe comparison.
 * Throws UnauthorizedError if missing/invalid.
 */
import crypto from "node:crypto";
import { UnauthorizedError } from "@/lib/errors";

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
