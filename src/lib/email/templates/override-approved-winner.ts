import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface OverrideApprovedWinnerProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  numPeople: number;
  bookingPortalUrl: string;
  contactPhone: string;
}

export function overrideApprovedWinnerTemplate(
  data: OverrideApprovedWinnerProps,
): { subject: string; html: string; text: string } {
  const subject = `Prenotazione confermata — ${data.confirmationCode}`;
  const body = `
    <p>Ottime notizie, ${escapeHtml(data.customerName)}!</p>
    <p>La tua prenotazione e' stata <strong>confermata</strong>.</p>
    <ul>
      <li>Servizio: ${escapeHtml(data.serviceName)}</li>
      <li>Data: <strong>${escapeHtml(data.startDate)}</strong></li>
      <li>Persone: ${data.numPeople}</li>
      <li>Codice: <strong>${escapeHtml(data.confirmationCode)}</strong></li>
    </ul>
    <p>Ci vediamo a bordo. Per qualsiasi domanda chiamaci al <strong>${escapeHtml(data.contactPhone)}</strong>.</p>
    <p><a href="${safeUrl(data.bookingPortalUrl)}">Gestisci la prenotazione</a></p>
  `;
  const text = `Ciao ${data.customerName}, prenotazione ${data.confirmationCode} CONFERMATA.\nData: ${data.startDate}\nPortale: ${data.bookingPortalUrl}`;
  return { subject, html: emailLayout({ heading: subject, bodyHtml: body }), text };
}
