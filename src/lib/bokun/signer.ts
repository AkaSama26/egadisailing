import crypto from "node:crypto";

export interface BokunCredentials {
  accessKey: string;
  secretKey: string;
}

export interface SignedHeaders {
  "X-Bokun-Date": string;
  "X-Bokun-AccessKey": string;
  "X-Bokun-Signature": string;
}

/**
 * Formatta una Date come 'yyyy-MM-dd HH:mm:ss' UTC — formato richiesto
 * dall'API Bokun per il header X-Bokun-Date.
 */
export function bokunDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/**
 * Firma una request REST Bokun: `date + accessKey + METHOD + pathAndQuery`,
 * HMAC-SHA1 con secretKey, output base64.
 *
 * Restituisce i 3 header da aggiungere alla request HTTP.
 */
export function signBokunRequest(
  method: string,
  pathAndQuery: string,
  credentials: BokunCredentials,
  date: Date = new Date(),
): SignedHeaders {
  const dateStr = bokunDate(date);
  const stringToSign = `${dateStr}${credentials.accessKey}${method.toUpperCase()}${pathAndQuery}`;
  const signature = crypto
    .createHmac("sha1", credentials.secretKey)
    .update(stringToSign, "utf8")
    .digest("base64");

  return {
    "X-Bokun-Date": dateStr,
    "X-Bokun-AccessKey": credentials.accessKey,
    "X-Bokun-Signature": signature,
  };
}
