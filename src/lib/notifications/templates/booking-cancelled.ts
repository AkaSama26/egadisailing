import { escapeHtml } from "@/lib/html-escape";

export interface BookingCancelledPayload {
  confirmationCode: string;
  customerName: string;
  serviceName: string;
  startDate: string;
  source: string;
  reason?: string;
  refundAmount?: string;
}

export function bookingCancelledTemplate(payload: BookingCancelledPayload) {
  const subject = `Prenotazione cancellata · ${payload.confirmationCode}`;
  const refundLine = payload.refundAmount
    ? `<p><strong>Refund:</strong> ${escapeHtml(payload.refundAmount)}</p>`
    : "";
  const reasonLine = payload.reason
    ? `<p><em>${escapeHtml(payload.reason)}</em></p>`
    : "";
  const html = `
    <h2>Prenotazione cancellata</h2>
    <p><strong>${escapeHtml(payload.confirmationCode)}</strong> · source ${escapeHtml(payload.source)}</p>
    <p>${escapeHtml(payload.customerName)} — ${escapeHtml(payload.serviceName)} del ${escapeHtml(payload.startDate)}</p>
    ${refundLine}
    ${reasonLine}
  `;
  const telegram = `<b>Prenotazione cancellata</b>\n${escapeHtml(payload.confirmationCode)} · ${escapeHtml(payload.source)}\n${escapeHtml(payload.customerName)} · ${escapeHtml(payload.startDate)}${payload.refundAmount ? `\nRefund: ${escapeHtml(payload.refundAmount)}` : ""}`;
  return { subject, html, telegram };
}
