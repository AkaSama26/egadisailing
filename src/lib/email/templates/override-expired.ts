import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface OverrideExpiredProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  refundAmount: string;
  alternativeDates: string[];
  bookingPortalUrl: string;
}

export function overrideExpiredTemplate(
  data: OverrideExpiredProps,
): { subject: string; html: string; text: string } {
  const subject = `Prenotazione ${data.confirmationCode} scaduta`;
  const altList = data.alternativeDates.length > 0
    ? `<p>Date alternative:</p><ul>${data.alternativeDates
        .map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
    : "";
  const body = `
    <p>Ciao ${escapeHtml(data.customerName)},</p>
    <p>Non abbiamo potuto confermare la tua prenotazione <strong>${escapeHtml(data.confirmationCode)}</strong>
    per <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong>
    entro il termine previsto. Il rimborso completo di &euro; <strong>${escapeHtml(data.refundAmount)}</strong>
    e' stato avviato (5-10 giorni lavorativi).</p>
    ${altList}
    <p><a href="${safeUrl(data.bookingPortalUrl)}">Area prenotazioni</a></p>
  `;
  const text = `Prenotazione ${data.confirmationCode} scaduta. Rimborso € ${data.refundAmount}. Alternative: ${data.alternativeDates.join(", ")}`;
  return { subject, html: emailLayout({ heading: subject, bodyHtml: body }), text };
}
