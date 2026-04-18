export interface BookingConfirmationData {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  numPeople: number;
  totalPrice: string;
  paidAmount: string;
  balanceAmount?: string;
  recoveryUrl: string;
}

export function bookingConfirmationTemplate(data: BookingConfirmationData) {
  const subject = `Conferma prenotazione ${data.confirmationCode} · Egadisailing`;
  const balanceBlock = data.balanceAmount
    ? `<p style="color: #c2410c;"><strong>Saldo da versare:</strong> ${data.balanceAmount}<br>
         Ti invieremo un link per il pagamento 7 giorni prima dell'esperienza.</p>`
    : "";
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 24px;">
        <div style="max-width: 560px; margin: auto; background: white; padding: 32px; border-radius: 12px;">
          <h2 style="color: #0c3d5e; margin-top: 0;">Ciao ${data.customerName}, prenotazione confermata!</h2>
          <p><strong>Codice prenotazione:</strong> ${data.confirmationCode}</p>
          <p><strong>Esperienza:</strong> ${data.serviceName}</p>
          <p><strong>Data:</strong> ${data.startDate}</p>
          <p><strong>Persone:</strong> ${data.numPeople}</p>
          <p><strong>Totale:</strong> ${data.totalPrice}</p>
          <p><strong>Già pagato:</strong> ${data.paidAmount}</p>
          ${balanceBlock}
          <div style="margin: 32px 0; text-align: center;">
            <a href="${data.recoveryUrl}" style="display: inline-block; background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: bold;">
              Gestisci la prenotazione
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Per accedere alla tua prenotazione, inserisci la tua email su
            <a href="${data.recoveryUrl}">${data.recoveryUrl}</a> e riceverai un codice di verifica.
          </p>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}
