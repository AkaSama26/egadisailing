import { escapeHtml } from "@/lib/html-escape";
import { safePlain } from "./_shared";

export interface PaymentFailedPayload {
  confirmationCode: string;
  customerName: string;
  serviceName: string;
  startDate: string;
  amount: string;
  reason: string;
}

// R27-CRIT-4: template generico per PAYMENT_FAILED. Primo consumer:
// chargeback/dispute Stripe. Sara' riusato per payment_intent.payment_failed
// terminal + SEPA async_payment_failed quando/se aggiunti.

export function paymentFailedTemplate(payload: PaymentFailedPayload) {
  const subject = `Pagamento problema · ${payload.confirmationCode}`;
  const html = `
    <h2 style="color:#b91c1c">Pagamento: azione admin richiesta</h2>
    <p><strong>${escapeHtml(payload.confirmationCode)}</strong></p>
    <p>${escapeHtml(payload.customerName)} — ${escapeHtml(payload.serviceName)} del ${escapeHtml(payload.startDate)}</p>
    <p><strong>Importo:</strong> ${escapeHtml(payload.amount)}</p>
    <p><strong>Dettaglio:</strong> ${escapeHtml(payload.reason)}</p>
    <p><a href="https://dashboard.stripe.com/">Dashboard Stripe</a></p>
  `;
  const text = [
    "PAGAMENTO — azione admin richiesta",
    `${safePlain(payload.confirmationCode)}`,
    `${safePlain(payload.customerName)} — ${safePlain(payload.serviceName)} del ${safePlain(payload.startDate)}`,
    `Importo: ${safePlain(payload.amount)}`,
    `Dettaglio: ${safePlain(payload.reason)}`,
  ].join("\n");
  const telegram = `<b>⚠️ Pagamento problema</b>\n${escapeHtml(payload.confirmationCode)}\n${escapeHtml(payload.customerName)} · ${escapeHtml(payload.startDate)}\nImporto: ${escapeHtml(payload.amount)}\n${escapeHtml(payload.reason)}`;
  return { subject, html, text, telegram };
}
