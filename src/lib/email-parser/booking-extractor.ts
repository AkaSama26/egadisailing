export type CharterPlatform = "SAMBOAT" | "CLICKANDBOAT" | "NAUTAL";
export type CharterBookingStatus = "CONFIRMED" | "CANCELLED";

export interface ExtractedCharterBooking {
  platformBookingRef: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone?: string;
  customerNationality?: string;
  startDate: Date;
  endDate: Date;
  totalAmountCents: number;
  currency: string;
  boatName?: string;
  rawEmailSubject: string;
  // Nuovo in P4 round 8: il parser dichiara esplicitamente se l'email
  // rappresenta una conferma o una cancellazione. Default CONFIRMED.
  status: CharterBookingStatus;
}

/**
 * Rileva keyword di cancellazione nell'email. Coverage best-effort su IT/EN/FR/ES.
 * Se true → importCharterBooking passa a CANCELLED + releaseDates.
 */
export function detectCancellationKeywords(text: string, subject: string): boolean {
  const haystack = `${subject}\n${text}`.toLowerCase();
  return (
    /cancel+ed|cancell?a(tion|ta|to|zione)|annull[ae]|stornier(t|ung)|storno|anulaci[oó]n|anul[ae]d[oa]/i.test(
      haystack,
    ) ||
    /refund(ed)?|rimborsat[oa]|remboursement|reembolso/i.test(haystack)
  );
}

export interface ParsableEmail {
  subject: string;
  html: string | null;
  text: string | null;
}

export interface CharterParser {
  platform: CharterPlatform;
  senderDomains: string[]; // es. ["samboat.com", "samboat.fr"]
  parse(email: ParsableEmail): ExtractedCharterBooking | null;
}

// Cap anti-ReDoS / anti-HTML-bomb: i template SamBoat/Click&Boat/Nautal
// sono tipicamente < 15KB. 200KB e' overkill con margine.
export const MAX_PARSER_TEXT_LENGTH = 200_000;

/** Helper condivisi usati dai parser — tutti pure functions testabili. */

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parsa "dd/mm/yyyy" o "YYYY-MM-DD" in Date UTC midnight.
 *
 * Assume STRICT dd/mm (formato EU) — la charter platform e' italiana/europea.
 * Rifiuta m>12 per non interpretare silently `07/15/2026` (US mm/dd) come
 * `15 luglio 2027` (Date.UTC normalizza overflow month).
 *
 * Round-trip validation: `new Date(Y, M, D)` normalizza date invalide (es.
 * `31/02/2026` diventa `3 marzo 2026`). Controlliamo che i componenti
 * escano identici a quelli inseriti.
 */
export function parseFlexibleDate(s: string): Date | null {
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return buildValidatedDate(+y, +m, +d);
  }
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    if (+m > 12 || +m < 1 || +d > 31 || +d < 1) return null;
    return buildValidatedDate(+y, +m, +d);
  }
  return null;
}

function buildValidatedDate(year: number, month: number, day: number): Date | null {
  if (year < 2020 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null; // 31/02 → Date normalizza silently, qui rigettiamo.
  }
  return d;
}

/**
 * Converte stringhe monetarie in cents integer. Gestisce i formati reali:
 *   - "1234.50"    → 123450 (decimale US)
 *   - "1234,50"    → 123450 (decimale EU no separatore migliaia)
 *   - "1.234,50"   → 123450 (EU con punto migliaia)
 *   - "1,234.50"   → 123450 (US con virgola migliaia)
 *   - "1.234"      → 123400 (EU migliaia no decimali — bug finding round P4)
 *   - "1234"       → 123400 (integer)
 *
 * Heuristica sul separatore: se ci sono 3 cifre esatte dopo l'ULTIMO
 * separatore, e' un thousands (no decimali). Altrimenti e' un decimale.
 * Rifiuta valori negativi o non-finite. Ritorna null su garbage.
 */
export function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/[^0-9.,]/g, "");
  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  const hasDot = lastDot >= 0;
  const hasComma = lastComma >= 0;

  let integerPart: string;
  let fractionPart: string;

  if (hasDot && hasComma) {
    // Entrambi: l'ultimo e' il separatore decimale.
    const decSep = lastDot > lastComma ? "." : ",";
    const thousandSep = decSep === "." ? "," : ".";
    const stripped = cleaned.split(thousandSep).join("");
    const parts = stripped.split(decSep);
    integerPart = parts[0];
    fractionPart = (parts[1] ?? "").slice(0, 2).padEnd(2, "0");
  } else if (hasDot || hasComma) {
    const sep = hasDot ? "." : ",";
    const parts = cleaned.split(sep);
    const last = parts[parts.length - 1];
    // 3 cifre dopo l'ultimo separatore + nessun altro separatore → thousands.
    // Es: "1.234" (EU) = 1234, "1,234" (US) = 1234.
    const isThousands = parts.length === 2 && last.length === 3;
    if (isThousands) {
      integerPart = parts.join("");
      fractionPart = "00";
    } else {
      integerPart = parts.slice(0, -1).join("");
      fractionPart = last.slice(0, 2).padEnd(2, "0");
    }
  } else {
    integerPart = cleaned;
    fractionPart = "00";
  }

  if (!/^\d+$/.test(integerPart) || !/^\d+$/.test(fractionPart)) return null;
  const cents = parseInt(integerPart, 10) * 100 + parseInt(fractionPart, 10);
  if (!Number.isFinite(cents) || cents < 0) return null;
  return cents;
}
