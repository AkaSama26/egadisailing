import { emailLayout, escapeHtml } from "./_layout";

export function otpEmailTemplate(code: string): { subject: string; html: string; text: string } {
  const safeCode = escapeHtml(code);
  const subject = "Codice per recuperare la prenotazione · Egadisailing";
  const html = emailLayout({
    heading: "Recupero prenotazione",
    bodyHtml: `
      <p>Usa questo codice per accedere alla tua area prenotazioni:</p>
      <div style="font-size: 42px; letter-spacing: 12px; font-weight: bold; text-align: center; background: #f9fafb; padding: 20px; border-radius: 8px; color: #0c3d5e; margin: 24px 0; font-family: monospace;">
        ${safeCode}
      </div>
      <p>
        Dopo l'accesso potrai aprire il biglietto QR, cambiare data gratuitamente
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
Dopo l'accesso puoi aprire il biglietto QR, cambiare data gratuitamente e richiedere cancellazione o rimborso secondo la policy.
Non condividerlo con nessuno.`;
  return { subject, html, text };
}
