import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface BookingConfirmationData {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  numPeople: number;
  totalPrice: string;
  paidAmount: string;
  balanceAmount?: string;
  recoveryUrl: string;
  ticketUrl?: string;
}

export function bookingConfirmationTemplate(data: BookingConfirmationData) {
  const subject = `Conferma prenotazione ${data.confirmationCode} · Egadisailing`;
  const ticketHref = data.ticketUrl ? safeUrl(data.ticketUrl) : undefined;
  const hasSafeTicketUrl = Boolean(ticketHref && ticketHref !== "#");
  const balanceBlock = data.balanceAmount
    ? `<p style="color: #c2410c;"><strong>Saldo da versare:</strong> ${escapeHtml(data.balanceAmount)}<br>
         Ti invieremo un link per il pagamento 7 giorni prima dell'esperienza.</p>`
    : "";
  const ticketBlock = hasSafeTicketUrl
    ? `<p><strong>Biglietto QR:</strong> <a href="${ticketHref}">${ticketHref}</a></p>`
    : "";
  const html = emailLayout({
    heading: `Ciao ${escapeHtml(data.customerName)}, prenotazione confermata!`,
    bodyHtml: `
      <p><strong>Codice prenotazione:</strong> ${escapeHtml(data.confirmationCode)}</p>
      <p><strong>Esperienza:</strong> ${escapeHtml(data.serviceName)}</p>
      <p><strong>Data:</strong> ${escapeHtml(data.startDate)}</p>
      <p><strong>Persone:</strong> ${data.numPeople}</p>
      <p><strong>Totale:</strong> ${escapeHtml(data.totalPrice)}</p>
      <p><strong>Gia' pagato:</strong> ${escapeHtml(data.paidAmount)}</p>
      ${balanceBlock}
      ${ticketBlock}
      <p style="color: #6b7280; font-size: 14px;">
        Per gestire la prenotazione, vai su
        <a href="${safeUrl(data.recoveryUrl)}">${escapeHtml(data.recoveryUrl)}</a>
        e inserisci la tua email.
      </p>
    `,
    ctaText: hasSafeTicketUrl ? "Apri biglietto QR" : "Gestisci la prenotazione",
    ctaUrl: hasSafeTicketUrl ? ticketHref : data.recoveryUrl,
  });

  const text = `${data.customerName}, prenotazione confermata!
Codice: ${data.confirmationCode}
Esperienza: ${data.serviceName}
Data: ${data.startDate}
Persone: ${data.numPeople}
Totale: ${data.totalPrice}
Pagato: ${data.paidAmount}
${data.balanceAmount ? `Saldo: ${data.balanceAmount}\n` : ""}${hasSafeTicketUrl ? `Biglietto QR: ${data.ticketUrl}\n` : ""}Gestisci: ${data.recoveryUrl}`;

  return { subject, html, text };
}
