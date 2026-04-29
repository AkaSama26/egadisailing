import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface CustomerCancellationData {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  refundAmount?: string;
  retainedAmount?: string;
  policyLabel?: string;
  bookingPortalUrl: string;
  contactEmail: string;
}

export function customerCancellationTemplate(data: CustomerCancellationData) {
  const subject = `Prenotazione cancellata · ${data.confirmationCode}`;
  const refundBlock = data.refundAmount
    ? `<p><strong>Rimborso previsto:</strong> ${escapeHtml(data.refundAmount)}</p>`
    : `<p>Se e' previsto un rimborso, ti contatteremo con i dettagli operativi.</p>`;
  const retainedBlock = data.retainedAmount
    ? `<p><strong>Importo trattenuto secondo policy:</strong> ${escapeHtml(data.retainedAmount)}</p>`
    : "";
  const policyBlock = data.policyLabel
    ? `<p style="color:#6b7280;font-size:14px;">Policy applicata: ${escapeHtml(data.policyLabel)}</p>`
    : "";
  const html = emailLayout({
    heading: "Prenotazione cancellata",
    bodyHtml: `
      <p>Ciao ${escapeHtml(data.customerName)},</p>
      <p>la prenotazione <strong>${escapeHtml(data.confirmationCode)}</strong> per
      <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong>
      e' stata cancellata.</p>
      ${refundBlock}
      ${retainedBlock}
      ${policyBlock}
      <p>Per qualsiasi dubbio puoi rispondere a questa email o scrivere a ${escapeHtml(data.contactEmail)}.</p>
    `,
    ctaText: "Apri area prenotazioni",
    ctaUrl: data.bookingPortalUrl,
  });
  const text = `Ciao ${data.customerName},
la prenotazione ${data.confirmationCode} per ${data.serviceName} del ${data.startDate} e' stata cancellata.
${data.refundAmount ? `Rimborso previsto: ${data.refundAmount}\n` : ""}${data.retainedAmount ? `Importo trattenuto: ${data.retainedAmount}\n` : ""}${data.policyLabel ? `Policy: ${data.policyLabel}\n` : ""}Area prenotazioni: ${data.bookingPortalUrl}`;
  return { subject, html, text };
}

export interface RefundReceiptData {
  customerName: string;
  confirmationCode: string;
  refundAmount: string;
  refundType: "full" | "partial";
  bookingPortalUrl: string;
}

export function refundReceiptTemplate(data: RefundReceiptData) {
  const subject = `Rimborso ${data.refundType === "full" ? "completo" : "parziale"} · ${data.confirmationCode}`;
  const html = emailLayout({
    heading: "Rimborso elaborato",
    bodyHtml: `
      <p>Ciao ${escapeHtml(data.customerName)},</p>
      <p>abbiamo elaborato un rimborso ${data.refundType === "full" ? "completo" : "parziale"}
      per la prenotazione <strong>${escapeHtml(data.confirmationCode)}</strong>.</p>
      <p><strong>Importo rimborsato:</strong> ${escapeHtml(data.refundAmount)}</p>
      <p style="color:#6b7280;font-size:14px;">I tempi di accredito dipendono dalla banca della carta, di solito 5-10 giorni lavorativi.</p>
    `,
    ctaText: "Apri area prenotazioni",
    ctaUrl: data.bookingPortalUrl,
  });
  const text = `Rimborso elaborato per ${data.confirmationCode}: ${data.refundAmount}. Area prenotazioni: ${data.bookingPortalUrl}`;
  return { subject, html, text };
}

export interface ChangeRequestData {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  originalDate: string;
  requestedDate: string;
  bookingPortalUrl: string;
  adminNote?: string;
}

export function changeRequestReceivedTemplate(data: ChangeRequestData) {
  const subject = `Richiesta cambio data ricevuta · ${data.confirmationCode}`;
  const html = emailLayout({
    heading: "Richiesta cambio data ricevuta",
    bodyHtml: `
      <p>Ciao ${escapeHtml(data.customerName)},</p>
      <p>abbiamo ricevuto la tua richiesta di cambio data per
      <strong>${escapeHtml(data.serviceName)}</strong>.</p>
      <p>Da <strong>${escapeHtml(data.originalDate)}</strong> a <strong>${escapeHtml(data.requestedDate)}</strong>.</p>
      <p>Ti invieremo una conferma appena lo staff avra' verificato disponibilita' e operativita'.</p>
    `,
    ctaText: "Apri area prenotazioni",
    ctaUrl: data.bookingPortalUrl,
  });
  const text = `Richiesta cambio data ricevuta per ${data.confirmationCode}: ${data.originalDate} -> ${data.requestedDate}.`;
  return { subject, html, text };
}

export function changeRequestApprovedTemplate(data: ChangeRequestData) {
  const subject = `Cambio data approvato · ${data.confirmationCode}`;
  const html = emailLayout({
    heading: "Cambio data approvato",
    bodyHtml: `
      <p>Ciao ${escapeHtml(data.customerName)},</p>
      <p>il cambio data della prenotazione <strong>${escapeHtml(data.confirmationCode)}</strong>
      e' stato approvato.</p>
      <p>Nuova data: <strong>${escapeHtml(data.requestedDate)}</strong>.</p>
    `,
    ctaText: "Apri area prenotazioni",
    ctaUrl: data.bookingPortalUrl,
  });
  const text = `Cambio data approvato per ${data.confirmationCode}. Nuova data: ${data.requestedDate}.`;
  return { subject, html, text };
}

export function changeRequestRejectedTemplate(data: ChangeRequestData) {
  const subject = `Cambio data non disponibile · ${data.confirmationCode}`;
  const note = data.adminNote ? `<p><strong>Nota staff:</strong> ${escapeHtml(data.adminNote)}</p>` : "";
  const html = emailLayout({
    heading: "Cambio data non disponibile",
    bodyHtml: `
      <p>Ciao ${escapeHtml(data.customerName)},</p>
      <p>non possiamo confermare il cambio data richiesto per la prenotazione
      <strong>${escapeHtml(data.confirmationCode)}</strong>.</p>
      <p>Data richiesta: <strong>${escapeHtml(data.requestedDate)}</strong>.</p>
      ${note}
      <p>La prenotazione resta valida sulla data originale: <strong>${escapeHtml(data.originalDate)}</strong>.</p>
    `,
    ctaText: "Apri area prenotazioni",
    ctaUrl: data.bookingPortalUrl,
  });
  const text = `Cambio data non disponibile per ${data.confirmationCode}. Data originale confermata: ${data.originalDate}.${data.adminNote ? ` Nota staff: ${data.adminNote}` : ""}`;
  return { subject, html, text };
}

export interface ContactAutoReplyData {
  customerName: string;
  subject: string;
}

export function contactAutoReplyTemplate(data: ContactAutoReplyData) {
  const subject = `Messaggio ricevuto · Egadisailing`;
  const html = emailLayout({
    heading: "Messaggio ricevuto",
    bodyHtml: `
      <p>Ciao ${escapeHtml(data.customerName)},</p>
      <p>abbiamo ricevuto il tuo messaggio: <strong>${escapeHtml(data.subject)}</strong>.</p>
      <p>Ti risponderemo appena possibile, normalmente entro 24 ore.</p>
    `,
  });
  const text = `Ciao ${data.customerName}, abbiamo ricevuto il tuo messaggio: ${data.subject}. Ti risponderemo entro 24 ore.`;
  return { subject, html, text };
}

export interface PreDepartureReminderData {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  balanceAmount?: string;
  ticketUrl: string;
}

export function preDepartureReminderTemplate(data: PreDepartureReminderData) {
  const subject = `Promemoria partenza · ${data.confirmationCode}`;
  const balance = data.balanceAmount
    ? `<p><strong>Saldo da pagare in loco:</strong> ${escapeHtml(data.balanceAmount)}. Contanti preferiti.</p>`
    : "";
  const html = emailLayout({
    heading: "Ci vediamo presto a bordo",
    bodyHtml: `
      <p>Ciao ${escapeHtml(data.customerName)},</p>
      <p>la tua esperienza <strong>${escapeHtml(data.serviceName)}</strong> e' prevista per
      <strong>${escapeHtml(data.startDate)}</strong>.</p>
      ${balance}
      <p>Porta costume, crema solare, documento e il biglietto QR. Ti consigliamo di arrivare con anticipo.</p>
    `,
    ctaText: "Apri biglietto",
    ctaUrl: data.ticketUrl,
  });
  const text = `Promemoria partenza ${data.confirmationCode}: ${data.serviceName} ${data.startDate}.${data.balanceAmount ? ` Saldo in loco: ${data.balanceAmount}.` : ""} Biglietto: ${data.ticketUrl}`;
  return { subject, html, text };
}

export interface ReviewRequestData {
  customerName: string;
  serviceName: string;
  reviewUrl: string;
}

export function reviewRequestTemplate(data: ReviewRequestData) {
  const subject = `Com'e' andata a bordo?`;
  const html = emailLayout({
    heading: "Grazie per essere saliti a bordo",
    bodyHtml: `
      <p>Ciao ${escapeHtml(data.customerName)},</p>
      <p>speriamo che l'esperienza <strong>${escapeHtml(data.serviceName)}</strong> sia stata speciale.</p>
      <p>Una recensione ci aiuta moltissimo a far conoscere Egadisailing.</p>
    `,
    ctaText: "Lascia una recensione",
    ctaUrl: safeUrl(data.reviewUrl),
  });
  const text = `Grazie per essere saliti a bordo. Puoi lasciare una recensione qui: ${data.reviewUrl}`;
  return { subject, html, text };
}
