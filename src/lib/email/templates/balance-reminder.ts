import { emailLayout, escapeHtml } from "./_layout";

export interface BalanceReminderData {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  balanceAmount: string;
}

export function balanceReminderTemplate(data: BalanceReminderData) {
  const subject = `Promemoria saldo in loco · ${data.confirmationCode} Egadisailing`;
  const html = emailLayout({
    heading: `Ciao ${escapeHtml(data.customerName)}, manca solo il saldo`,
    bodyHtml: `
      <p>La tua esperienza <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong> si avvicina.</p>
      <p><strong>Saldo da pagare in loco: ${escapeHtml(data.balanceAmount)}</strong></p>
      <p style="color: #6b7280; font-size: 14px;">
        Il saldo restante si paga solamente in loco prima della partenza. Contanti preferiti.
      </p>
    `,
  });

  const text = `${data.customerName}, manca il saldo per ${data.serviceName} del ${data.startDate}.
Saldo da pagare in loco: ${data.balanceAmount}
Il saldo restante si paga solamente in loco prima della partenza. Contanti preferiti.`;

  return { subject, html, text };
}
