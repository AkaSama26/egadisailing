import { escapeHtml } from "@/lib/html-escape";

export interface WeatherAlertPayload {
  confirmationCode: string;
  customerName: string;
  serviceName: string;
  startDate: string;
  risk: string;
  reasons: string[];
}

// R22-A2-MEDIA-1: strip \r\n da user-input per plain text fallback.
function safePlain(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
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
  // R22-A2-ALTA-1: plain text fallback.
  const text = [
    `Rischio meteo ${safePlain(payload.risk)}`,
    `${safePlain(payload.confirmationCode)} · ${safePlain(payload.customerName)}`,
    `${safePlain(payload.serviceName)} del ${safePlain(payload.startDate)}`,
    ...payload.reasons.map((r) => `- ${safePlain(r)}`),
    "",
    "Valuta riprogrammazione o comunicazione al cliente.",
  ].join("\n");
  const telegram = `<b>Meteo ${escapeHtml(payload.risk)}</b>\n${escapeHtml(payload.confirmationCode)} · ${escapeHtml(payload.customerName)}\n${escapeHtml(payload.serviceName)} · ${escapeHtml(payload.startDate)}\n${payload.reasons.map((r) => escapeHtml(r)).join(", ")}`;
  return { subject, html, text, telegram };
}
