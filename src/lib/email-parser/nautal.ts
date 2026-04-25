import type { CharterParser } from "./booking-extractor";
import { parseCharterEmail } from "./parse-charter-email";

/**
 * Parser per email Nautal. Template ES/IT/EN con range combinato
 * "Del/From/Dal X al/to/till Y".
 */
export const nautalParser: CharterParser = {
  platform: "NAUTAL",
  senderDomains: ["nautal.com", "nautal.es", "nautal.it", "nautal.fr"],

  parse(email) {
    return parseCharterEmail(email, {
      platform: "NAUTAL",
      senderDomains: this.senderDomains,
      regexes: {
        ref: /(?:Reserva|Booking|Prenotazione)\s+(?:n°|#|ID)[:\s]*([A-Z0-9\-]{1,64})/i,
        customerName:
          /(?:Cliente|Guest|Ospite)[:\s]+([A-Za-zÀ-ÿ\-']+)\s+([A-Za-zÀ-ÿ\-']+)/i,
        dateRange:
          /(?:Del|From|Dal)[:\s]+(\d{2}\/\d{2}\/\d{4})\s+(?:al|to|till)\s+(\d{2}\/\d{2}\/\d{4})/i,
        amount: /(?:Total|Totale)[:\s]+(?:€|EUR)?\s*([\d.,]+)/i,
      },
    });
  },
};
