import crypto from "node:crypto";

/**
 * Boataround firma i webhook con HMAC-SHA256 sul RAW body, header
 * `x-boataround-signature` in base64. Se in futuro la doc specifica un
 * prefisso (es. `sha256=`), estendere qui.
 *
 * Timing-safe compare per non leakare informazioni via side-channel.
 */
export function verifyBoataroundWebhook(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
