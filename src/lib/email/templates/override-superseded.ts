import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface OverrideSupersededProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  refundAmount: string;
  alternativeDates: string[];
  bookingPortalUrl: string;
}

export function overrideSupersededTemplate(
  data: OverrideSupersededProps,
): { subject: string; html: string; text: string } {
  const subject = `Prenotazione ${data.confirmationCode} non disponibile`;
  const altList = data.alternativeDates.length > 0
    ? `<p>Date alternative:</p><ul>${data.alternativeDates
        .map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
    : "";
  const body = `
    <p>Ciao ${escapeHtml(data.customerName)},</p>
    <p>Purtroppo un'altra richiesta sullo stesso slot e' arrivata prima della tua.
    La tua prenotazione per <strong>${escapeHtml(data.serviceName)}</strong> del
    <strong>${escapeHtml(data.startDate)}</strong> (codice
    <strong>${escapeHtml(data.confirmationCode)}</strong>) e' stata automaticamente annullata.</p>
    <p>Riceverai il rimborso completo di &euro; <strong>${escapeHtml(data.refundAmount)}</strong>
    entro 5-10 giorni lavorativi.</p>
    ${altList}
    <p><a href="${safeUrl(data.bookingPortalUrl)}">Area prenotazioni</a></p>
  `;
  const text = `Prenotazione ${data.confirmationCode} superseded. Rimborso € ${data.refundAmount}.`;
  return { subject, html: emailLayout({ heading: subject, bodyHtml: body }), text };
}
