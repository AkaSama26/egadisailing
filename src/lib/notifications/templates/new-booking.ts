import { escapeHtml } from "@/lib/html-escape";
import { safePlain } from "./_shared";

export interface NewBookingPayload {
  source: string;
  confirmationCode: string;
  customerName: string;
  serviceName: string;
  startDate: string;
  numPeople: number;
  totalPrice: string;
  paymentType?: string;
  paidAmount?: string;
  balanceAmount?: string;
}

// R22-A2-MEDIA-1: strip \r\n da user-input per plain text fallback (in _shared).

export function newBookingTemplate(payload: NewBookingPayload) {
  const subject = `Nuova prenotazione ${payload.source} · ${payload.confirmationCode}`;
  const paymentType = payload.paymentType ?? "Da verificare";
  const paidAmount = payload.paidAmount ?? "Da verificare";
  const balanceAmount = payload.balanceAmount ?? "Da verificare";
  const rows: Array<[string, string]> = [
    ["Numero prenotazione", payload.confirmationCode],
    ["Tipo prenotazione", payload.serviceName],
    ["Canale", payload.source],
    ["Cliente", payload.customerName],
    ["Data", payload.startDate],
    ["Persone", String(payload.numPeople)],
    ["Costo prenotazione", payload.totalPrice],
    ["Tipo pagamento", paymentType],
    ["Pagato", paidAmount],
    ["Rimanente da pagare", balanceAmount],
  ];

  const htmlRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 8px 12px 8px 0; color: #6b7280; vertical-align: top;"><strong>${escapeHtml(label)}</strong></td>
          <td style="padding: 8px 0; color: #111827; vertical-align: top;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const html = `
    <h2>Nuova prenotazione ${escapeHtml(payload.source)}</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <tbody>${htmlRows}
      </tbody>
    </table>
  `;
  // R22-A2-ALTA-1: plain text fallback obbligatorio (Gmail SPAM score,
  // Apple Mail only-HTML warning, screen reader admin leggibile).
  const text = [
    `Nuova prenotazione ${safePlain(payload.source)}`,
    ...rows.map(([label, value]) => `${label}: ${safePlain(value)}`),
  ].join("\n");
  const telegram = [
    `<b>Nuova prenotazione ${escapeHtml(payload.source)}</b>`,
    `Numero: ${escapeHtml(payload.confirmationCode)}`,
    `Tipo: ${escapeHtml(payload.serviceName)}`,
    `Cliente: ${escapeHtml(payload.customerName)} · ${payload.numPeople} pax`,
    `Data: ${escapeHtml(payload.startDate)}`,
    `Costo: ${escapeHtml(payload.totalPrice)}`,
    `Pagato: ${escapeHtml(paymentType)} · ${escapeHtml(paidAmount)}`,
    `Saldo: ${escapeHtml(balanceAmount)}`,
  ].join("\n");
  return { subject, html, text, telegram };
}
