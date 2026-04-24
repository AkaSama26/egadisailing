import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface OverrideAdminRequestedProps {
  confirmationCode: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startDate: string;
  numPeople: number;
  newRevenue: string;
  conflictRevenue: string;
  conflictSources: string[];
  dropDeadAt: string;
  adminDetailUrl: string;
}

export function overrideAdminRequestedTemplate(
  data: OverrideAdminRequestedProps,
): { subject: string; html: string; text: string } {
  const delta = (parseFloat(data.newRevenue) - parseFloat(data.conflictRevenue)).toFixed(2);
  const subject = `[ADMIN] Override request ${data.confirmationCode} — delta +€${delta}`;
  const body = `
    <p>Nuova richiesta di override ricevuta:</p>
    <ul>
      <li>Codice: <strong>${escapeHtml(data.confirmationCode)}</strong></li>
      <li>Cliente: ${escapeHtml(data.customerName)} (${escapeHtml(data.customerEmail)})</li>
      <li>Servizio: ${escapeHtml(data.serviceName)}</li>
      <li>Data: <strong>${escapeHtml(data.startDate)}</strong> &middot; ${data.numPeople} persone</li>
      <li>Revenue nuovo: <strong>&euro; ${escapeHtml(data.newRevenue)}</strong></li>
      <li>Revenue conflict: &euro; ${escapeHtml(data.conflictRevenue)}</li>
      <li>Delta approvando: <strong>+&euro; ${escapeHtml(delta)}</strong></li>
      <li>Canali conflict: ${escapeHtml(data.conflictSources.join(", ") || "—")}</li>
      <li>Drop-dead: ${escapeHtml(data.dropDeadAt)}</li>
    </ul>
    <p><a href="${safeUrl(data.adminDetailUrl)}">Apri nel pannello admin</a></p>
    <p>Azione richiesta entro 72 ore.</p>
  `;
  const text = `[ADMIN] Override request ${data.confirmationCode}. Cliente: ${data.customerName}. Revenue nuovo: €${data.newRevenue} vs conflict €${data.conflictRevenue} (delta +€${delta}). Apri: ${data.adminDetailUrl}`;
  return { subject, html: emailLayout({ heading: subject, bodyHtml: body }), text };
}
