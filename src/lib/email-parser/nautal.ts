import {
  parseAmountToCents,
  parseFlexibleDate,
  stripHtml,
  type CharterParser,
} from "./booking-extractor";

export const nautalParser: CharterParser = {
  platform: "NAUTAL",
  senderDomains: ["nautal.com", "nautal.es", "nautal.it", "nautal.fr"],

  parse(email) {
    const text = email.text ?? stripHtml(email.html ?? "");

    const refMatch = text.match(
      /(?:Reserva|Booking|Prenotazione)\s+(?:n°|#|ID)[:\s]*([A-Z0-9\-]+)/i,
    );
    const nameMatch = text.match(
      /(?:Cliente|Guest|Ospite)[:\s]+([A-Za-zÀ-ÿ\-']+)\s+([A-Za-zÀ-ÿ\-']+)/i,
    );
    const emailMatch = text.match(/[\w.\-+]+@[\w.\-]+\.\w{2,}/);
    const dateMatch = text.match(
      /(?:Del|From|Dal)[:\s]+(\d{2}\/\d{2}\/\d{4})\s+(?:al|to|till)\s+(\d{2}\/\d{2}\/\d{4})/i,
    );
    const amountMatch = text.match(/(?:Total|Totale)[:\s]+(?:€|EUR)?\s*([\d.,]+)/i);

    if (!refMatch || !nameMatch || !emailMatch || !dateMatch || !amountMatch) return null;

    const startDate = parseFlexibleDate(dateMatch[1]);
    const endDate = parseFlexibleDate(dateMatch[2]);
    const totalAmountCents = parseAmountToCents(amountMatch[1]);
    if (!startDate || !endDate || totalAmountCents === null) return null;

    return {
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
  },
};
