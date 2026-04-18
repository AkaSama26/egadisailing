/**
 * Serializzatore iCalendar conforme RFC 5545 (subset).
 *
 * Implementazione leggera: tutti i PRODID configurabili, escape testo,
 * DTSTART/DTEND in VALUE=DATE (all-day), DTSTAMP in UTC.
 *
 * Usiamo questo invece di `ics` / `ical-generator`:
 *   - Controllo totale dell'output
 *   - No dipendenze transitive (audit Round 4 flaggava supply chain)
 *   - Testabile pure
 */

export interface IcalEvent {
  uid: string;
  summary: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  lastModified?: Date;
}

export interface IcalOptions {
  prodId: string;
  name: string;
  events: IcalEvent[];
}

const CRLF = "\r\n";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function formatDateTime(d: Date): string {
  return (
    formatDate(d) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Escape RFC 5545 §3.3.11. Ordine critico: il backslash PRIMA di tutto per
 * non ri-escapare i marker che introduciamo.
 */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * RFC 5545 §3.1 limita le linee a 75 ottetti: se superano, split con CRLF + space.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let remaining = line;
  chunks.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    chunks.push(" " + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return chunks.join(CRLF);
}

export function generateIcal(options: IcalOptions): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${options.prodId}`,
    `X-WR-CALNAME:${escapeText(options.name)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of options.events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${formatDateTime(ev.lastModified ?? new Date())}`);
    lines.push(`DTSTART;VALUE=DATE:${formatDate(ev.startDate)}`);
    // RFC 5545: DTEND e' EXCLUSIVE per VALUE=DATE. Cliente prenota 15-22 luglio
    // (inclusive) → DTEND = 23 luglio. iCal consumers (SamBoat/ical readers)
    // si aspettano questa convenzione.
    const endExclusive = new Date(ev.endDate.getTime() + 24 * 60 * 60 * 1000);
    lines.push(`DTEND;VALUE=DATE:${formatDate(endExclusive)}`);
    lines.push(foldLine(`SUMMARY:${escapeText(ev.summary)}`));
    if (ev.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeText(ev.description)}`));
    }
    lines.push("TRANSP:OPAQUE");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join(CRLF) + CRLF;
}
