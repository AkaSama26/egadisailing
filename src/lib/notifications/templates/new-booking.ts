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

export function newBookingTemplate(payload: NewBookingPayload) {
  const subject = `Nuova prenotazione ${payload.source} · ${payload.confirmationCode}`;
  const html = `
    <h2>Nuova prenotazione ${escapeHtml(payload.source)}</h2>
    <p><strong>${escapeHtml(payload.confirmationCode)}</strong></p>
    <p>${escapeHtml(payload.customerName)} · ${payload.numPeople} persone</p>
    <p>${escapeHtml(payload.serviceName)} · ${escapeHtml(payload.startDate)}</p>
    <p><strong>Totale:</strong> ${escapeHtml(payload.totalPrice)}</p>
  `;
  const telegram = `<b>Nuova prenotazione ${escapeHtml(payload.source)}</b>\n${escapeHtml(payload.confirmationCode)}\n${escapeHtml(payload.customerName)} · ${payload.numPeople} pax\n${escapeHtml(payload.serviceName)} · ${escapeHtml(payload.startDate)}\n<b>${escapeHtml(payload.totalPrice)}</b>`;
  return { subject, html, telegram };
}
