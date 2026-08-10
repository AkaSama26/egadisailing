import crypto from "node:crypto";

/**
 * Verifica HMAC-SHA256 di un webhook Bokun.
 *
 * Algoritmo:
 * 1. Raccogli tutti gli header `x-bokun-*` ECCETTO `x-bokun-hmac`
 * 2. Lowercase nomi + sort alphabetical
 * 3. Concatena come `name1=value1&name2=value2&...`
 * 4. HMAC-SHA256 con `secret`
 * 5. Accetta sia hex sia base64, entrambi documentati da Bokun
 * 6. Confronta con header `x-bokun-hmac` (timing-safe)
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
  const computedBuf = crypto.createHmac("sha256", secret).update(stringToSign).digest();

  // La documentazione descrive la firma come base64 ma mostra un esempio hex.
  // Supportiamo entrambi senza indebolire il confronto sui 32 byte SHA-256.
  let receivedBuf: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(received)) {
    receivedBuf = Buffer.from(received, "hex");
  } else if (
    /^[A-Za-z0-9+/]+={0,2}$/.test(received) &&
    received.length % 4 === 0
  ) {
    receivedBuf = Buffer.from(received, "base64");
  } else {
    // Nome reason mantenuto per compatibilita' con alert e test storici.
    return { ok: false, reason: "not-hex" };
  }

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
