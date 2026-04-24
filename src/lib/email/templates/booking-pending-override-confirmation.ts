import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface OverridePendingConfirmationProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  numPeople: number;
  amountPaid: string;
  bookingPortalUrl: string;
}

export function bookingPendingOverrideConfirmationTemplate(
  data: OverridePendingConfirmationProps,
): { subject: string; html: string; text: string } {
  const subject = `Richiesta prenotazione ricevuta — ${data.confirmationCode}`;
  const body = `
    <p>Ciao ${escapeHtml(data.customerName)},</p>
    <p>Abbiamo ricevuto la tua prenotazione per:</p>
    <ul>
      <li>Servizio: <strong>${escapeHtml(data.serviceName)}</strong></li>
      <li>Data: <strong>${escapeHtml(data.startDate)}</strong></li>
      <li>Persone: ${data.numPeople}</li>
      <li>Totale pagato: &euro; ${escapeHtml(data.amountPaid)}</li>
      <li>Codice: <strong>${escapeHtml(data.confirmationCode)}</strong></li>
    </ul>
    <p><strong>Stato: In attesa di conferma</strong></p>
    <p>Lo staff conferma la tua prenotazione entro 72 ore. In caso di non conferma ti rimborseremo automaticamente senza alcun costo.</p>
    <p>Puoi visualizzare lo stato in qualsiasi momento su:
      <a href="${safeUrl(data.bookingPortalUrl)}">Area prenotazioni</a>
    </p>
  `;
  const text = `Ciao ${data.customerName},\n\nPrenotazione ricevuta: ${data.confirmationCode}\nServizio: ${data.serviceName}\nData: ${data.startDate}\nTotale: € ${data.amountPaid}\n\nStato: In attesa di conferma.\nTi confermiamo entro 72h. Portale: ${data.bookingPortalUrl}\n`;
  return {
    subject,
    html: emailLayout({ heading: subject, bodyHtml: body }),
    text,
  };
}
