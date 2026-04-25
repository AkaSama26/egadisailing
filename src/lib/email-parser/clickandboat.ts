import type { CharterParser } from "./booking-extractor";
import { parseCharterEmail } from "./parse-charter-email";

/**
 * Parser per email Click&Boat. Template usa range combinato "From X to Y".
 */
export const clickandboatParser: CharterParser = {
  platform: "CLICKANDBOAT",
  senderDomains: ["clickandboat.com", "click-and-boat.com"],

  parse(email) {
    return parseCharterEmail(email, {
      platform: "CLICKANDBOAT",
      senderDomains: this.senderDomains,
      regexes: {
        ref: /(?:Reservation|Booking)\s+(?:n°|#|ID)[:\s]*([A-Z0-9\-]{1,64})/i,
        customerName:
          /(?:Client|Guest|Tenant|Locataire)[:\s]+([A-Za-zÀ-ÿ\-']+)\s+([A-Za-zÀ-ÿ\-']+)/i,
        dateRange:
          /(?:From|Du|Dal)[:\s]+(\d{2}\/\d{2}\/\d{4})\s+(?:to|au|al)\s+(\d{2}\/\d{2}\/\d{4})/i,
        amount: /(?:Total|Montant)[:\s]+(?:€|EUR)?\s*([\d.,]+)/i,
      },
    });
  },
};
