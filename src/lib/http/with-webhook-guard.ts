import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { getClientIp, normalizeIpForRateLimit } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import type { RateLimitScope } from "@/lib/channels";

const DEFAULT_MAX_BODY_BYTES = 1 * 1024 * 1024; // 1MB
const DEFAULT_RATE_LIMIT_PER_MIN = 60;

export interface WebhookGuardConfig {
  /** Rate-limit scope (per-IP, fail-closed). */
  scope: RateLimitScope;
  /** Max requests per minute per-IP (default 60). */
  rateLimitPerMin?: number;
  /** Max body size bytes (default 1MB). */
  maxBodyBytes?: number;
  /** Webhook label per logging (es. "bokun"). */
  label: string;
}

export interface WebhookHandlerCtx {
  /** Body raw (Buffer) — usato per HMAC verify bit-exact. */
  body: Buffer;
  /** Request headers. */
  headers: Headers;
  /** IP raw (per log diagnostico HMAC fail). */
  ip: string;
}

/**
 * HOF per webhook routes (Bokun, Boataround). Standardizza:
 *  - rate-limit per-IP normalizzato (R25-A3-A1 IPv6 /64 fix), fail-closed
 *    (R28-CRIT-3: HMAC verify CPU-bound + Redis outage = DoS amplification)
 *  - body-cap pre-check via Content-Length + post-read fallback
 *    (R25-A3-C3: anti-DoS HMAC compute con body 100MB+)
 *  - arrayBuffer → Buffer (preserva BOM/charset per HMAC bit-exact)
 *  - body-too-large → ValidationError 400 (NON 413: contract attuale dei
 *    test integration `expect(res.status).toBe(400)`)
 *
 * Stripe webhook NON usa questo: SDK constructEvent gestisce body+sig+
 * tolerance + parse JSON e aggiungere rate-limit altererebbe il delivery
 * semantica del provider.
 *
 * Handler riceve `{body: Buffer, headers, ip}` post-validazione struttura.
 * Signature verify + dedup + import logic resta nel handler caller-specific.
 */
export function withWebhookGuard<T>(
  config: WebhookGuardConfig,
  handler: (ctx: WebhookHandlerCtx) => Promise<T | Response>,
) {
  return withErrorHandler(async (req: Request) => {
    const ip = getClientIp(req.headers);

    // R25-A3-A1: normalize IPv6 /64 prima del rate-limit. R28-CRIT-3:
    // failOpen=false — webhook HMAC verify e' CPU-bound, durante Redis
    // outage attaccante con firme random flood 10k req/s → cascading
    // failure. Provider OTA retry finche' Redis torna up.
    await enforceRateLimit({
      identifier: normalizeIpForRateLimit(ip),
      scope: config.scope,
      limit: config.rateLimitPerMin ?? DEFAULT_RATE_LIMIT_PER_MIN,
      windowSeconds: 60,
      failOpen: false,
    });

    const maxBytes = config.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;

    // Content-Length check veloce pre-read.
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength > maxBytes) {
      throw new ValidationError(`Body too large (${contentLength} > ${maxBytes})`);
    }

    // arrayBuffer per preservare bytes raw (HMAC bit-exact, BOM/charset).
    const arrayBuf = await req.arrayBuffer();
    if (arrayBuf.byteLength > maxBytes) {
      logger.warn(
        { ip, byteLength: arrayBuf.byteLength, maxBytes, label: config.label },
        "webhook body exceeded max bytes after read",
      );
      throw new ValidationError(`Body too large`);
    }

    const body = Buffer.from(arrayBuf);
    const result = await handler({ body, headers: req.headers, ip });
    // Handler puo' tornare un Response (es. early return) o un payload da
    // wrappare in NextResponse.json.
    if (result instanceof Response) return result;
    return NextResponse.json(result);
  });
}
