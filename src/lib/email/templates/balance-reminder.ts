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
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 24px;">
        <div style="max-width: 560px; margin: auto; background: white; padding: 32px; border-radius: 12px;">
          <h2 style="color: #0c3d5e; margin-top: 0;">Ciao ${data.customerName}, manca solo il saldo</h2>
          <p>La tua esperienza <strong>${data.serviceName}</strong> del <strong>${data.startDate}</strong> si avvicina.</p>
          <p><strong>Saldo da versare: ${data.balanceAmount}</strong></p>
          <p>Puoi pagare online in pochi secondi cliccando qui sotto:</p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="${data.paymentLinkUrl}" style="display: inline-block; background: #d97706; color: white; padding: 14px 28px; text-decoration: none; border-radius: 9999px; font-weight: bold; font-size: 16px;">
              Paga il saldo
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            In alternativa, puoi saldare in contanti o via POS al momento dell'imbarco.
          </p>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}
