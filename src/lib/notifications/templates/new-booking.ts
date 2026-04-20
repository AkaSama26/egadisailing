import { escapeHtml } from "@/lib/html-escape";

export interface NewBookingPayload {
  source: string;
  confirmationCode: string;
  customerName: string;
  serviceName: string;
  startDate: string;
  numPeople: number;
  totalPrice: string;
}

// R22-A2-MEDIA-1: strip \r\n da user-input per plain text fallback.
function safePlain(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}

export function newBookingTemplate(payload: NewBookingPayload) {
  const subject = `Nuova prenotazione ${payload.source} · ${payload.confirmationCode}`;
  const html = `
    <h2>Nuova prenotazione ${escapeHtml(payload.source)}</h2>
    <p><strong>${escapeHtml(payload.confirmationCode)}</strong></p>
    <p>${escapeHtml(payload.customerName)} · ${payload.numPeople} persone</p>
    <p>${escapeHtml(payload.serviceName)} · ${escapeHtml(payload.startDate)}</p>
    <p><strong>Totale:</strong> ${escapeHtml(payload.totalPrice)}</p>
  `;
  // R22-A2-ALTA-1: plain text fallback obbligatorio (Gmail SPAM score,
  // Apple Mail only-HTML warning, screen reader admin leggibile).
  const text = [
    `Nuova prenotazione ${safePlain(payload.source)}`,
    safePlain(payload.confirmationCode),
    `${safePlain(payload.customerName)} · ${payload.numPeople} pax`,
    `${safePlain(payload.serviceName)} · ${safePlain(payload.startDate)}`,
    `Totale: ${safePlain(payload.totalPrice)}`,
  ].join("\n");
  const telegram = `<b>Nuova prenotazione ${escapeHtml(payload.source)}</b>\n${escapeHtml(payload.confirmationCode)}\n${escapeHtml(payload.customerName)} · ${payload.numPeople} pax\n${escapeHtml(payload.serviceName)} · ${escapeHtml(payload.startDate)}\n<b>${escapeHtml(payload.totalPrice)}</b>`;
  return { subject, html, text, telegram };
}
