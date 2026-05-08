import { emailLayout, escapeHtml } from "./_layout";

export function otpEmailTemplate(
  code: string,
  locale?: string | null,
): { subject: string; html: string; text: string } {
  const safeCode = escapeHtml(code);
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  if (isEs) {
    const subject = "Código para recuperar tu reserva · Egadisailing";
    const html = emailLayout({
      heading: "Recuperar reserva",
      bodyHtml: `
        <p>Usa este código para acceder a tu área de reservas:</p>
        <div style="font-size: 42px; letter-spacing: 12px; font-weight: bold; text-align: center; background: #f9fafb; padding: 20px; border-radius: 8px; color: #0c3d5e; margin: 24px 0; font-family: monospace;">
          ${safeCode}
        </div>
        <p>
          Después de iniciar sesión, podrás abrir el billete QR, solicitar un cambio de fecha
          y solicitar cancelación o reembolso según la política.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          El código es válido durante 15 minutos. No lo compartas con nadie.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
          Si no solicitaste este código, ignora este email.
        </p>
      `,
    });
    const text = `Código de recuperación de reserva Egadisailing: ${code}
Válido durante 15 minutos.
Después de iniciar sesión, podrás abrir el billete QR, solicitar un cambio de fecha y solicitar cancelación o reembolso según la política.
No lo compartas con nadie.`;
    return { subject, html, text };
  }
  if (isEn) {
    const subject = "Code to recover your booking · Egadisailing";
    const html = emailLayout({
      heading: "Booking recovery",
      bodyHtml: `
        <p>Use this code to access your booking area:</p>
        <div style="font-size: 42px; letter-spacing: 12px; font-weight: bold; text-align: center; background: #f9fafb; padding: 20px; border-radius: 8px; color: #0c3d5e; margin: 24px 0; font-family: monospace;">
          ${safeCode}
        </div>
        <p>
          After signing in, you can open the QR ticket, request a date change
          and request cancellation or refund according to the policy.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          The code is valid for 15 minutes. Do not share it with anyone.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
          If you did not request this code, ignore this email.
        </p>
      `,
    });
    const text = `Egadisailing booking recovery code: ${code}
Valid for 15 minutes.
After signing in, you can open the QR ticket, request a date change and request cancellation or refund according to the policy.
Do not share it with anyone.`;
    return { subject, html, text };
  }
  if (isFr) {
    const subject = "Code pour retrouver votre réservation · Egadisailing";
    const html = emailLayout({
      heading: "Retrouver la réservation",
      bodyHtml: `
        <p>Utilisez ce code pour accéder à votre espace réservation :</p>
        <div style="font-size: 42px; letter-spacing: 12px; font-weight: bold; text-align: center; background: #f9fafb; padding: 20px; border-radius: 8px; color: #0c3d5e; margin: 24px 0; font-family: monospace;">
          ${safeCode}
        </div>
        <p>
          Après connexion, vous pourrez ouvrir le billet QR, demander un changement de date
          et demander une annulation ou un remboursement selon la policy.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Le code est valable 15 minutes. Ne le partagez avec personne.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
          Si vous n'avez pas demandé ce code, ignorez cet email.
        </p>
      `,
    });
    const text = `Code de récupération de réservation Egadisailing : ${code}
Valable 15 minutes.
Après connexion, vous pourrez ouvrir le billet QR, demander un changement de date et demander annulation ou remboursement selon la policy.
Ne le partagez avec personne.`;
    return { subject, html, text };
  }

  const subject = "Codice per recuperare la prenotazione · Egadisailing";
  const html = emailLayout({
    heading: "Recupero prenotazione",
    bodyHtml: `
      <p>Usa questo codice per accedere alla tua area prenotazioni:</p>
      <div style="font-size: 42px; letter-spacing: 12px; font-weight: bold; text-align: center; background: #f9fafb; padding: 20px; border-radius: 8px; color: #0c3d5e; margin: 24px 0; font-family: monospace;">
        ${safeCode}
      </div>
      <p>
        Dopo l'accesso potrai aprire il biglietto QR, richiedere cambio data
        e richiedere cancellazione o rimborso secondo la policy.
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        Il codice e' valido per 15 minuti. Non condividerlo con nessuno.
      </p>
      <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
        Se non hai richiesto questo codice, ignora questa email.
      </p>
    `,
  });
  const text = `Codice recupero prenotazione Egadisailing: ${code}
Valido per 15 minuti.
Dopo l'accesso puoi aprire il biglietto QR, richiedere cambio data e richiedere cancellazione o rimborso secondo la policy.
Non condividerlo con nessuno.`;
  return { subject, html, text };
}
