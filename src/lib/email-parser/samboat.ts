import {
  parseAmountToCents,
  parseFlexibleDate,
  stripHtml,
  type CharterParser,
  type ExtractedCharterBooking,
} from "./booking-extractor";

/**
 * Parser per email SamBoat.
 *
 * I template SamBoat cambiano frequentemente: se il parse fallisce torna
 * `null` e il dispatcher logga la riga per review manuale (no auto-block
 * di availability con dati incompleti).
 */
export const samboatParser: CharterParser = {
  platform: "SAMBOAT",
  senderDomains: ["samboat.com", "samboat.fr", "samboat.it", "samboat.es"],

  parse(email) {
    const text = email.text ?? stripHtml(email.html ?? "");

    const refMatch = text.match(/Booking\s+(?:ref|n°|id|number)[:\s]+([A-Z0-9\-]+)/i);
    const nameMatch = text.match(
      /(?:Guest|Client)[:\s]+([A-Za-zÀ-ÿ\-']+)\s+([A-Za-zÀ-ÿ\-']+)/i,
    );
    const emailMatch = text.match(/[\w.\-+]+@[\w.\-]+\.\w{2,}/);
    const startMatch = text.match(
      /(?:From|Check[- ]in)[:\s]+(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i,
    );
    const endMatch = text.match(
      /(?:To|Check[- ]out)[:\s]+(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i,
    );
    const amountMatch = text.match(/(?:Total|Amount|Price)[:\s]+(?:€|EUR)?\s*([\d.,]+)/i);

    if (!refMatch || !nameMatch || !emailMatch || !startMatch || !endMatch || !amountMatch) {
      return null;
    }
    const startDate = parseFlexibleDate(startMatch[1]);
    const endDate = parseFlexibleDate(endMatch[1]);
    const totalAmountCents = parseAmountToCents(amountMatch[1]);
    if (!startDate || !endDate || totalAmountCents === null) return null;

    const result: ExtractedCharterBooking = {
      platformBookingRef: refMatch[1],
      customerFirstName: nameMatch[1],
      customerLastName: nameMatch[2],
      customerEmail: emailMatch[0],
      startDate,
      endDate,
      totalAmountCents,
      currency: "EUR",
      rawEmailSubject: email.subject,
    };
    return result;
  },
};
