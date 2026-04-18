export type CharterPlatform = "SAMBOAT" | "CLICKANDBOAT" | "NAUTAL";

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

/** Parsa "dd/mm/yyyy" o "YYYY-MM-DD" in Date UTC midnight. */
export function parseFlexibleDate(s: string): Date | null {
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return new Date(Date.UTC(+y, +m - 1, +d));
  }
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return new Date(Date.UTC(+y, +m - 1, +d));
  }
  return null;
}

/**
 * Converte "1.234,50" / "1,234.50" / "1234.50" in cents integer (50 cent).
 * Ritorna null se non parsabile.
 */
export function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/[^0-9.,]/g, "");
  if (!cleaned) return null;
  // Se contiene sia `.` che `,`, assumiamo formato europeo: `.` migliaia, `,` decimale.
  let normalized = cleaned;
  if (cleaned.includes(".") && cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",") && !cleaned.includes(".")) {
    normalized = cleaned.replace(",", ".");
  }
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
