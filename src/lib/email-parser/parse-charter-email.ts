import { normalizeEmail } from "@/lib/email-normalize";
import {
  MAX_PARSER_TEXT_LENGTH,
  detectCancellationKeywords,
  parseAmountToCents,
  parseFlexibleDate,
  stripHtml,
  type CharterPlatform,
  type ExtractedCharterBooking,
  type ParsableEmail,
} from "./booking-extractor";

/**
 * Configurazione parser per una platform charter. Un parser e' definito
 * dalle sue regex e dai domini email del mittente.
 *
 * Regex shape — ogni espressione DEVE avere uno o due capture group:
 *   - `ref`: 1 capture (booking reference id)
 *   - `customerName`: 2 capture (firstName, lastName) — split via regex
 *   - `customerEmail`: optional, default generic email regex
 *   - `dateRange`: 2 capture (startDate, endDate) — usato quando il template
 *     ha "From X to Y" su singola linea (Click&Boat / Nautal)
 *   - `startDate` + `endDate`: 1 capture each — usato quando il template
 *     ha date separate (SamBoat "Check-in: X / Check-out: Y")
 *   - `amount`: 1 capture (raw numeric string parsato da `parseAmountToCents`)
 *
 * Esattamente uno tra `dateRange` e (`startDate`+`endDate`) deve essere fornito.
 */
export interface CharterParserConfig {
  platform: CharterPlatform;
  /** Domini in From header che matchano questa platform. */
  senderDomains: string[];
  regexes: {
    ref: RegExp;
    customerName: RegExp;
    customerEmail?: RegExp;
    /** Mutex con `startDate`+`endDate`: 2 capture su singola riga. */
    dateRange?: RegExp;
    /** Mutex con `dateRange`: 1 capture ciascuno (template a campi separati). */
    startDate?: RegExp;
    endDate?: RegExp;
    amount: RegExp;
  };
}

/**
 * Generic charter email parser. Caller fornisce `config` con regexes
 * platform-specific; helper estrae fields + esegue validation comune.
 *
 * Returns `null` se anche un solo field obbligatorio non e' parseable —
 * email resta UNSEEN per review manuale.
 *
 * Replaces ~50-80 LoC duplicated extraction across samboat/clickandboat/nautal
 * parsers.
 */
export function parseCharterEmail(
  email: ParsableEmail,
  config: CharterParserConfig,
): ExtractedCharterBooking | null {
  const rawText = email.text ?? stripHtml(email.html ?? "");
  if (rawText.length > MAX_PARSER_TEXT_LENGTH) return null;
  const text = rawText;

  const refMatch = text.match(config.regexes.ref);
  const nameMatch = text.match(config.regexes.customerName);
  const emailRegex = config.regexes.customerEmail ?? /[\w.\-+]+@[\w.\-]+\.\w{2,}/;
  const emailMatch = text.match(emailRegex);
  const amountMatch = text.match(config.regexes.amount);

  if (!refMatch || !nameMatch || !emailMatch || !amountMatch) {
    return null;
  }

  // Date extraction: dateRange (combined) OR startDate+endDate (separate)
  let startDateRaw: string | undefined;
  let endDateRaw: string | undefined;
  if (config.regexes.dateRange) {
    const dateMatch = text.match(config.regexes.dateRange);
    if (!dateMatch) return null;
    startDateRaw = dateMatch[1];
    endDateRaw = dateMatch[2];
  } else if (config.regexes.startDate && config.regexes.endDate) {
    const startMatch = text.match(config.regexes.startDate);
    const endMatch = text.match(config.regexes.endDate);
    if (!startMatch || !endMatch) return null;
    startDateRaw = startMatch[1];
    endDateRaw = endMatch[1];
  } else {
    throw new Error(
      "CharterParserConfig: must provide either `dateRange` or both `startDate` + `endDate` regexes",
    );
  }

  if (!startDateRaw || !endDateRaw) return null;
  const startDate = parseFlexibleDate(startDateRaw);
  const endDate = parseFlexibleDate(endDateRaw);
  const totalAmountCents = parseAmountToCents(amountMatch[1]);
  if (!startDate || !endDate || totalAmountCents === null) return null;

  return {
    platformBookingRef: refMatch[1],
    customerFirstName: nameMatch[1],
    customerLastName: nameMatch[2],
    customerEmail: normalizeEmail(emailMatch[0]),
    startDate,
    endDate,
    totalAmountCents,
    currency: "EUR",
    rawEmailSubject: email.subject,
    status: detectCancellationKeywords(text, email.subject) ? "CANCELLED" : "CONFIRMED",
  };
}
