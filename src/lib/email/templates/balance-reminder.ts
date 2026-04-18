import { emailLayout, escapeHtml } from "./_layout";

export interface BalanceReminderData {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  balanceAmount: string;
  paymentLinkUrl: string;
}

export function balanceReminderTemplate(data: BalanceReminderData) {
  const subject = `Promemoria saldo · ${data.confirmationCode} Egadisailing`;
  const html = emailLayout({
    heading: `Ciao ${escapeHtml(data.customerName)}, manca solo il saldo`,
    bodyHtml: `
      <p>La tua esperienza <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong> si avvicina.</p>
      <p><strong>Saldo da versare: ${escapeHtml(data.balanceAmount)}</strong></p>
      <p>Puoi pagare online in pochi secondi cliccando qui sotto:</p>
      <p style="color: #6b7280; font-size: 14px;">
        In alternativa, puoi saldare in contanti o via POS al momento dell'imbarco.
      </p>
    `,
    ctaText: "Paga il saldo",
    ctaUrl: data.paymentLinkUrl,
  });

  const text = `${data.customerName}, manca il saldo per ${data.serviceName} del ${data.startDate}.
Saldo da versare: ${data.balanceAmount}
Paga online: ${data.paymentLinkUrl}
Oppure in contanti/POS all'imbarco.`;

  return { subject, html, text };
}
