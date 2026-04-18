import { escapeHtml } from "@/lib/html-escape";

export interface WeatherAlertPayload {
  confirmationCode: string;
  customerName: string;
  serviceName: string;
  startDate: string;
  risk: string;
  reasons: string[];
}

export function weatherAlertTemplate(payload: WeatherAlertPayload) {
  const subject = `Alert meteo ${payload.risk} · ${payload.confirmationCode}`;
  const reasonsList = payload.reasons
    .map((r) => `<li>${escapeHtml(r)}</li>`)
    .join("");
  const html = `
    <h2>Rischio meteo ${escapeHtml(payload.risk)}</h2>
    <p><strong>${escapeHtml(payload.confirmationCode)}</strong> · ${escapeHtml(payload.customerName)}</p>
    <p>${escapeHtml(payload.serviceName)} del ${escapeHtml(payload.startDate)}</p>
    <ul>${reasonsList}</ul>
    <p>Valuta riprogrammazione o comunicazione al cliente.</p>
  `;
  const telegram = `<b>Meteo ${escapeHtml(payload.risk)}</b>\n${escapeHtml(payload.confirmationCode)} · ${escapeHtml(payload.customerName)}\n${escapeHtml(payload.serviceName)} · ${escapeHtml(payload.startDate)}\n${payload.reasons.map((r) => escapeHtml(r)).join(", ")}`;
  return { subject, html, telegram };
}
