import { emailLayout, escapeHtml, safeUrl } from "./_layout";

// R29-#2: template customer "overbooking apology" — hooked in
// cancelBooking quando il booking cancellato ha un ManualAlert
// CROSS_OTA_DOUBLE_BOOKING correlato. Prima: customer "perdente"
// riceveva solo la cancellazione generica "Your booking was
// cancelled" senza contesto → reputation damage + rischio legale
// (doppia vendita). Ora: scusa formale + refund info +
// date alternative + contatto diretto WhatsApp/email.
export interface OverbookingApologyData {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  refundAmount: string;
  contactEmail: string;
  contactPhone?: string;
  bookingUrl: string;
}

export function overbookingApologyTemplate(data: OverbookingApologyData) {
  const subject = `Ci scusiamo — prenotazione ${data.confirmationCode} annullata · Egadisailing`;
  const phoneLine = data.contactPhone
    ? `<p><strong>Telefono/WhatsApp:</strong> <a href="tel:${escapeHtml(data.contactPhone)}">${escapeHtml(data.contactPhone)}</a></p>`
    : "";
  const html = emailLayout({
    heading: `Ci dispiace sinceramente, ${escapeHtml(data.customerName)}`,
    bodyHtml: `
      <p>
        A causa di un problema di sincronizzazione tra i nostri canali di
        vendita, la tua prenotazione <strong>${escapeHtml(data.confirmationCode)}</strong>
        per <strong>${escapeHtml(data.serviceName)}</strong> del
        <strong>${escapeHtml(data.startDate)}</strong> e' stata annullata
        perche' lo stesso slot risultava gia' venduto su un altro canale.
      </p>
      <p>
        Questo e' un nostro errore e ce ne assumiamo la piena responsabilita'.
      </p>
      <p>
        <strong>Rimborso processato:</strong> ${escapeHtml(data.refundAmount)} —
        vedrai l'importo rientrare sulla tua carta entro 5-10 giorni lavorativi,
        a seconda della tua banca.
      </p>
      <h3 style="margin-top:24px">Come possiamo rimediare</h3>
      <p>
        Siamo a tua disposizione per trovare una data alternativa. Contattaci
        direttamente e ti risponderemo entro poche ore (anche weekend) con le
        date disponibili piu' vicine.
      </p>
      <p><strong>Email diretta:</strong> <a href="mailto:${escapeHtml(data.contactEmail)}">${escapeHtml(data.contactEmail)}</a></p>
      ${phoneLine}
      <p style="color: #6b7280; font-size: 14px; margin-top:24px">
        Se vuoi verificare lo stato del rimborso o consultare i dettagli, puoi
        usare il link di recupero qui sotto.
      </p>
    `,
    ctaText: "Verifica stato rimborso",
    ctaUrl: data.bookingUrl,
  });

  const text = `${data.customerName}, ci dispiace.

A causa di un problema di sincronizzazione tra i nostri canali, la prenotazione ${data.confirmationCode} per ${data.serviceName} del ${data.startDate} e' stata annullata.

Rimborso processato: ${data.refundAmount} (5-10 giorni lavorativi sulla tua carta).

Contattaci per trovare una data alternativa:
Email: ${data.contactEmail}${data.contactPhone ? `\nTelefono/WhatsApp: ${data.contactPhone}` : ""}

Verifica stato: ${data.bookingUrl}`;

  return { subject, html, text };
}
