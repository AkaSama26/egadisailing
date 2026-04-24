import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface OverrideRejectedWinnerProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  refundAmount: string;
  alternativeDates: string[];
  bookingPortalUrl: string;
  contactEmail: string;
}

export function overrideRejectedWinnerTemplate(
  data: OverrideRejectedWinnerProps,
): { subject: string; html: string; text: string } {
  const subject = `Prenotazione ${data.confirmationCode} non confermata`;
  const altList = data.alternativeDates.length > 0
    ? `<p>Date alternative disponibili:</p><ul>${data.alternativeDates
        .map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
    : "";
  const body = `
    <p>Ciao ${escapeHtml(data.customerName)},</p>
    <p>Ci dispiace comunicarti che la tua richiesta di prenotazione per
      <strong>${escapeHtml(data.serviceName)}</strong> del
      <strong>${escapeHtml(data.startDate)}</strong> non e' stata confermata.</p>
    <p>Riceverai il rimborso completo di &euro; <strong>${escapeHtml(data.refundAmount)}</strong>
    sulla tua carta di credito entro 5-10 giorni lavorativi.</p>
    ${altList}
    <p>Per qualsiasi domanda: <a href="mailto:${escapeHtml(data.contactEmail)}">${escapeHtml(data.contactEmail)}</a></p>
    <p><a href="${safeUrl(data.bookingPortalUrl)}">Area prenotazioni</a></p>
  `;
  const text = `Ciao ${data.customerName}, prenotazione ${data.confirmationCode} NON confermata. Rimborso € ${data.refundAmount} in 5-10gg. Alternative: ${data.alternativeDates.join(", ")}`;
  return { subject, html: emailLayout({ heading: subject, bodyHtml: body }), text };
}
