import type { CharterParser } from "./booking-extractor";
import { parseCharterEmail } from "./parse-charter-email";

/**
 * Parser per email SamBoat.
 *
 * Template SamBoat usa campi separati "Check-in: X" / "Check-out: Y".
 * Se il parse fallisce torna `null` e il dispatcher logga per review
 * manuale (no auto-block con dati incompleti).
 *
 * Text cap anti-ReDoS: 200KB (gestito in `parse-charter-email`).
 */
export const samboatParser: CharterParser = {
  platform: "SAMBOAT",
  senderDomains: ["samboat.com", "samboat.fr", "samboat.it", "samboat.es"],

  parse(email) {
    return parseCharterEmail(email, {
      platform: "SAMBOAT",
      senderDomains: this.senderDomains,
      regexes: {
        ref: /Booking\s+(?:ref|n°|id|number)[:\s]+([A-Z0-9\-]{1,64})/i,
        customerName: /(?:Guest|Client)[:\s]+([A-Za-zÀ-ÿ\-']+)\s+([A-Za-zÀ-ÿ\-']+)/i,
        startDate: /(?:From|Check[- ]in)[:\s]+(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i,
        endDate: /(?:To|Check[- ]out)[:\s]+(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i,
        amount: /(?:Total|Amount|Price)[:\s]+(?:€|EUR)?\s*([\d.,]+)/i,
      },
    });
  },
};
