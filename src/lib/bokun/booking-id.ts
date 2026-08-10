import { ValidationError } from "@/lib/errors";

const NUMERIC_BOOKING_ID = /^[1-9]\d*$/;
const BASE64_GLOBAL_ID = /^[A-Za-z0-9+/_-]+={0,2}$/;
const MAX_WEBHOOK_ID_LENGTH = 128;

/**
 * Converte l'ID globale GraphQL inviato dai webhook Bokun nel corrispondente
 * ID numerico accettato dal Booking REST API legacy.
 *
 * Bokun documenta gli ID webhook nel formato base64 di `Booking:<id>` (es.
 * `Qm9va2luZzozNzY0OA`), mentre `/booking.json/booking/:id` accetta soltanto
 * l'ID numerico. Gli ID numerici provenienti dalla reconciliation restano
 * invariati.
 *
 * Il decode e' volutamente stretto: niente valori opachi, prefissi diversi o
 * caratteri fuori base64. In questo modo il risultato puo' essere usato come
 * segmento path REST senza ampliare la superficie SSRF/path-traversal.
 *
 * @throws ValidationError se l'ID non e' numerico o un global ID `Booking:`
 *   riconosciuto.
 */
export function toBokunRestBookingId(bookingId: string | number): string {
  if (typeof bookingId === "number") {
    if (Number.isSafeInteger(bookingId) && bookingId > 0) return String(bookingId);
    throw new ValidationError("Invalid Bokun bookingId");
  }

  const raw = bookingId.trim();
  if (NUMERIC_BOOKING_ID.test(raw)) return raw;
  if (
    raw.length === 0 ||
    raw.length > MAX_WEBHOOK_ID_LENGTH ||
    !BASE64_GLOBAL_ID.test(raw)
  ) {
    throw new ValidationError("Invalid Bokun webhook bookingId");
  }

  // Accetta sia base64 standard sia base64url e padding omesso, come negli
  // esempi ufficiali Bokun.
  const standardBase64 = raw.replace(/-/g, "+").replace(/_/g, "/");
  if (standardBase64.length % 4 === 1) {
    throw new ValidationError("Invalid Bokun webhook bookingId");
  }
  const padded = standardBase64.padEnd(
    standardBase64.length + ((4 - (standardBase64.length % 4)) % 4),
    "=",
  );
  const decoded = Buffer.from(padded, "base64").toString("utf8");
  const match = /^Booking:([1-9]\d*)$/.exec(decoded);
  if (!match) {
    throw new ValidationError("Unsupported Bokun webhook bookingId");
  }

  return match[1]!;
}
