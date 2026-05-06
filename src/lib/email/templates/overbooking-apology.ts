import { emailLayout, escapeHtml } from "./_layout";

// Template cliente per annullamento con assistenza: il testo resta
// intenzionalmente generico e non espone dettagli interni di gestione.
//
// R29-AUDIT-FIX-UX: refund channel condizionale per pagamenti online
// e pagamenti gestiti fuori dal checkout.
export type RefundChannel = "stripe" | "offline";

export interface OverbookingApologyData {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  /** Importo formattato (es. "€400,00") solo se refundChannel="stripe".
   *  Per "offline", il testo e' generico — non usare questo campo. */
  refundAmount: string;
  refundChannel: RefundChannel;
  contactEmail: string;
  contactPhone?: string;
  bookingUrl: string;
  /** Optional soft-voucher text (Task 4.6). E.g. "2 drink gratis a bordo". */
  voucherSoftText?: string;
  /** Optional alternative dates suggestions (Task 4.6). ISO yyyy-mm-dd. */
  rebookingSuggestions?: string[];
}

export function overbookingApologyTemplate(data: OverbookingApologyData) {
  const subject = `Aggiornamento prenotazione ${data.confirmationCode} · Egadisailing`;
  const phoneLine = data.contactPhone
    ? `<p><strong>Telefono/WhatsApp:</strong> ${escapeHtml(data.contactPhone)}</p>`
    : "";

  const refundHtml =
    data.refundChannel === "stripe"
      ? `<p>
          <strong>Rimborso processato:</strong> ${escapeHtml(data.refundAmount)} —
          vedrai l'importo rientrare sulla tua carta entro 5-10 giorni lavorativi,
          a seconda della tua banca.
        </p>`
      : `<p>
          <strong>Rimborso:</strong> ti contatteremo entro 24 ore via email o
          telefono per gestire il rimborso, oppure per offrirti un credito
          utilizzabile su una data alternativa.
        </p>`;

  const voucherHtml = data.voucherSoftText
    ? `<p><em>${escapeHtml(data.voucherSoftText)}</em></p>`
    : "";
  const rebookingHtml =
    data.rebookingSuggestions && data.rebookingSuggestions.length > 0
      ? `<p>Date alternative:<br>${data.rebookingSuggestions.map((d) => escapeHtml(d)).join("<br>")}</p>`
      : "";

  const html = emailLayout({
    heading: `Ci dispiace sinceramente, ${escapeHtml(data.customerName)}`,
    bodyHtml: `
      <p>
        Ci dispiace comunicarti che, a seguito della verifica operativa sulla
        disponibilita', non possiamo confermare la prenotazione
        <strong>${escapeHtml(data.confirmationCode)}</strong> per
        <strong>${escapeHtml(data.serviceName)}</strong> del
        <strong>${escapeHtml(data.startDate)}</strong>.
      </p>
      <p>
        Ci scusiamo sinceramente per il disagio: vogliamo gestire la situazione
        nel modo piu' semplice e rapido possibile.
      </p>
      ${refundHtml}
      ${voucherHtml}${rebookingHtml}
      <h3 style="margin-top:24px">Come possiamo rimediare</h3>
      <p>
        Siamo a tua disposizione per trovare una data alternativa. Contattaci
        direttamente e ti risponderemo entro poche ore con le disponibilita'
        piu' adatte.
      </p>
      <p><strong>Email diretta:</strong> <a href="mailto:${escapeHtml(data.contactEmail)}">${escapeHtml(data.contactEmail)}</a></p>
      ${phoneLine}
      <p style="color: #6b7280; font-size: 14px; margin-top:24px">
        Per consultare i dettagli della prenotazione, puoi usare il link qui
        sotto.
      </p>
    `,
    ctaText: "Dettagli prenotazione",
    ctaUrl: data.bookingUrl,
  });

  const refundText =
    data.refundChannel === "stripe"
      ? `Rimborso processato: ${data.refundAmount} (5-10 giorni lavorativi sulla tua carta).`
      : `Rimborso: ti contatteremo entro 24 ore per gestire il rimborso o il credito per una data alternativa.`;

  const voucherText = data.voucherSoftText ? `\n\n${data.voucherSoftText}` : "";
  const rebookingText =
    data.rebookingSuggestions && data.rebookingSuggestions.length > 0
      ? `\n\nAlternative: ${data.rebookingSuggestions.join(", ")}`
      : "";

  const text = `${data.customerName}, ci dispiace.

Non possiamo confermare la prenotazione ${data.confirmationCode} per ${data.serviceName} del ${data.startDate} dopo la verifica operativa sulla disponibilita'.

${refundText}${voucherText}${rebookingText}

Contattaci per trovare una data alternativa:
Email: ${data.contactEmail}${data.contactPhone ? `\nTelefono/WhatsApp: ${data.contactPhone}` : ""}

Dettagli: ${data.bookingUrl}`;

  return { subject, html, text };
}
