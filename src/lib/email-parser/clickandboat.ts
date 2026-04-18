import {
  parseAmountToCents,
  parseFlexibleDate,
  stripHtml,
  type CharterParser,
} from "./booking-extractor";

export const clickandboatParser: CharterParser = {
  platform: "CLICKANDBOAT",
  senderDomains: ["clickandboat.com", "click-and-boat.com"],

  parse(email) {
    const text = email.text ?? stripHtml(email.html ?? "");

    const refMatch = text.match(/(?:Reservation|Booking)\s+(?:n°|#|ID)[:\s]*([A-Z0-9\-]+)/i);
    const nameMatch = text.match(
      /(?:Client|Guest|Tenant|Locataire)[:\s]+([A-Za-zÀ-ÿ\-']+)\s+([A-Za-zÀ-ÿ\-']+)/i,
    );
    const emailMatch = text.match(/[\w.\-+]+@[\w.\-]+\.\w{2,}/);
    const dateMatch = text.match(
      /(?:From|Du|Dal)[:\s]+(\d{2}\/\d{2}\/\d{4})\s+(?:to|au|al)\s+(\d{2}\/\d{2}\/\d{4})/i,
    );
    const amountMatch = text.match(/(?:Total|Montant)[:\s]+(?:€|EUR)?\s*([\d.,]+)/i);

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
