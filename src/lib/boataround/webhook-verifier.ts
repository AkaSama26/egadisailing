import crypto from "node:crypto";

/**
 * Boataround firma i webhook con HMAC-SHA256 sul RAW body, header
 * `x-boataround-signature` in base64. Se in futuro la doc specifica un
 * prefisso (es. `sha256=`), estendere qui.
 *
 * Timing-safe compare per non leakare informazioni via side-channel.
 *
 * Accetta `Buffer` come body per coprire body con BOM/charset non-UTF-8:
 * `req.text()` decodifica UTF-8 e puo' divergere dai bytes che Boataround
 * ha firmato. Il caller dovrebbe passare `Buffer.from(await req.arrayBuffer())`.
 */
export function verifyBoataroundWebhook(
  rawBody: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  // Reject multi-value signature (fetch concatena header duplicati con ", ").
  if (signature.includes(",")) return false;
  const bodyBuf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
  const expected = crypto.createHmac("sha256", secret).update(bodyBuf).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
