export function otpEmailTemplate(code: string): { subject: string; html: string; text: string } {
  const subject = "Il tuo codice Egadisailing";
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 24px;">
        <div style="max-width: 480px; margin: auto; background: white; padding: 32px; border-radius: 12px;">
          <h2 style="color: #0c3d5e; margin-top: 0;">Il tuo codice di accesso</h2>
          <p>Usa questo codice per accedere alla tua prenotazione:</p>
          <div style="font-size: 42px; letter-spacing: 12px; font-weight: bold; text-align: center; background: #f9fafb; padding: 20px; border-radius: 8px; color: #0c3d5e; margin: 24px 0;">
            ${code}
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Il codice è valido per 15 minuti. Non condividerlo con nessuno.
          </p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
            Se non hai richiesto questo codice, ignora questa email.
          </p>
        </div>
      </body>
    </html>
  `;
  const text = `Il tuo codice Egadisailing: ${code}\nValido per 15 minuti.\nNon condividerlo con nessuno.`;
  return { subject, html, text };
}
