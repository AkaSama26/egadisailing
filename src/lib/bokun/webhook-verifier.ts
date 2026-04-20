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
 * Ritorna esito tipato (non boolean) per permettere al caller di distinguere
 * brute-force attack (signature malformata) vs config drift (length mismatch)
 * vs HMAC genuino sbagliato. R25-A3-A3: catch-all mascherava il signale
 * operations.
 */
export type BokunVerifyResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "not-hex" | "length-mismatch" | "hmac-mismatch" };

export function verifyBokunWebhookResult(
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): BokunVerifyResult {
  const received = headerValue(headers, "x-bokun-hmac");
  if (!received) return { ok: false, reason: "missing" };

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

  // R25-A3-A3: check hex format explicit invece di affidarsi al catch di
  // `Buffer.from(..., "hex")`. Buffer.from con hex invalid non throws — ritorna
  // buffer troncato o vuoto → length-mismatch ambiguous. Regex esplicita.
  if (!/^[0-9a-fA-F]+$/.test(received)) {
    return { ok: false, reason: "not-hex" };
  }

  const receivedBuf = Buffer.from(received, "hex");
  const computedBuf = Buffer.from(computed, "hex");
  if (receivedBuf.length !== computedBuf.length) {
    return { ok: false, reason: "length-mismatch" };
  }
  return crypto.timingSafeEqual(receivedBuf, computedBuf)
    ? { ok: true }
    : { ok: false, reason: "hmac-mismatch" };
}

/**
 * Wrapper boolean per retrocompatibilita' con caller esistenti. Nuovi
 * caller dovrebbero usare `verifyBokunWebhookResult` per logging ricco.
 */
export function verifyBokunWebhook(
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): boolean {
  return verifyBokunWebhookResult(headers, secret).ok;
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
