import crypto from "node:crypto";

/**
 * Verifica HMAC-SHA256 di un webhook Bokun.
 *
 * Algoritmo:
 * 1. Raccogli tutti gli header `x-bokun-*` ECCETTO `x-bokun-hmac`
 * 2. Lowercase nomi + sort alphabetical
 * 3. Concatena come `name1=value1&name2=value2&...`
 * 4. HMAC-SHA256 con `secret`, output hex
 * 5. Confronta con header `x-bokun-hmac` (timing-safe)
 *
 * Restituisce false in caso di: signature mancante, lunghezza disallineata,
 * hmac non valido. Loggato dal caller (non qui — no log su secret material).
 */
export function verifyBokunWebhook(
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): boolean {
  const received = headerValue(headers, "x-bokun-hmac");
  if (!received) return false;

  const bokunHeaders: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (!lower.startsWith("x-bokun-")) continue;
    if (lower === "x-bokun-hmac") continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (v === undefined) continue;
    bokunHeaders.push([lower, v]);
  }

  bokunHeaders.sort(([a], [b]) => a.localeCompare(b));
  const stringToSign = bokunHeaders.map(([k, v]) => `${k}=${v}`).join("&");
  const computed = crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");

  try {
    const receivedBuf = Buffer.from(received, "hex");
    const computedBuf = Buffer.from(computed, "hex");
    if (receivedBuf.length !== computedBuf.length) return false;
    return crypto.timingSafeEqual(receivedBuf, computedBuf);
  } catch {
    return false;
  }
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) {
      return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
    }
  }
  return null;
}
