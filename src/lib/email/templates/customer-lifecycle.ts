import { emailLayout, escapeHtml, safeUrl } from "./_layout";
import { PUBLIC_REVIEW_LINKS } from "@/lib/public-reviews";
import { emailGreeting, resolveEmailLocale } from "./locale";

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
  locale?: string | null;
}

export function customerCancellationTemplate(data: CustomerCancellationData) {
  const locale = resolveEmailLocale(data.locale);
  const subject =
    locale === "en"
      ? `Booking cancelled · ${data.confirmationCode}`
      : locale === "es"
        ? `Reserva cancelada · ${data.confirmationCode}`
        : locale === "fr"
          ? `Réservation annulée · ${data.confirmationCode}`
          : `Prenotazione cancellata · ${data.confirmationCode}`;
  const refundBlock = data.refundAmount
    ? `<p><strong>${
        locale === "en"
          ? "Expected refund"
          : locale === "es"
            ? "Reembolso previsto"
            : locale === "fr"
              ? "Remboursement prévu"
              : "Rimborso previsto"
      }:</strong> ${escapeHtml(data.refundAmount)}</p>`
    : `<p>${
        locale === "en"
          ? "If a refund is due, we will contact you with the operational details."
          : locale === "es"
            ? "Si corresponde un reembolso, te contactaremos con los detalles operativos."
            : locale === "fr"
              ? "Si un remboursement est prévu, nous vous contacterons avec les détails pratiques."
              : "Se e' previsto un rimborso, ti contatteremo con i dettagli operativi."
      }</p>`;
  const retainedBlock = data.retainedAmount
    ? `<p><strong>${
        locale === "en"
          ? "Amount retained according to policy"
          : locale === "es"
            ? "Importe retenido según la política"
            : locale === "fr"
              ? "Montant retenu selon la politique"
              : "Importo trattenuto secondo policy"
      }:</strong> ${escapeHtml(data.retainedAmount)}</p>`
    : "";
  const policyBlock = data.policyLabel
    ? `<p style="color:#6b7280;font-size:14px;">${
        locale === "en"
          ? "Policy applied"
          : locale === "es"
            ? "Política aplicada"
            : locale === "fr"
              ? "Politique appliquée"
              : "Policy applicata"
      }: ${escapeHtml(data.policyLabel)}</p>`
    : "";
  const html = emailLayout({
    locale,
    heading:
      locale === "en"
        ? "Booking cancelled"
        : locale === "es"
          ? "Reserva cancelada"
          : locale === "fr"
            ? "Réservation annulée"
            : "Prenotazione cancellata",
    bodyHtml: `
      <p>${escapeHtml(emailGreeting(locale, data.customerName))}</p>
      <p>${
        locale === "en"
          ? `booking <strong>${escapeHtml(data.confirmationCode)}</strong> for <strong>${escapeHtml(data.serviceName)}</strong> on <strong>${escapeHtml(data.startDate)}</strong> has been cancelled.`
          : locale === "es"
            ? `la reserva <strong>${escapeHtml(data.confirmationCode)}</strong> para <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong> ha sido cancelada.`
            : locale === "fr"
              ? `la réservation <strong>${escapeHtml(data.confirmationCode)}</strong> pour <strong>${escapeHtml(data.serviceName)}</strong> du <strong>${escapeHtml(data.startDate)}</strong> a été annulée.`
              : `la prenotazione <strong>${escapeHtml(data.confirmationCode)}</strong> per <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong> e' stata cancellata.`
      }</p>
      ${refundBlock}
      ${retainedBlock}
      ${policyBlock}
      <p>${
        locale === "en"
          ? `For any question, reply to this email or write to ${escapeHtml(data.contactEmail)}.`
          : locale === "es"
            ? `Para cualquier duda, responde a este email o escribe a ${escapeHtml(data.contactEmail)}.`
            : locale === "fr"
              ? `Pour toute question, répondez à cet email ou écrivez à ${escapeHtml(data.contactEmail)}.`
              : `Per qualsiasi dubbio puoi rispondere a questa email o scrivere a ${escapeHtml(data.contactEmail)}.`
      }</p>
    `,
    ctaText:
      locale === "en"
        ? "Open booking area"
        : locale === "es"
          ? "Abrir área de reservas"
          : locale === "fr"
            ? "Ouvrir l'espace réservation"
            : "Apri area prenotazioni",
    ctaUrl: data.bookingPortalUrl,
  });
  const text = `${emailGreeting(locale, data.customerName)}
${subject}: ${data.serviceName} ${data.startDate}.
${data.refundAmount ? `${locale === "it" ? "Rimborso previsto" : locale === "es" ? "Reembolso previsto" : locale === "fr" ? "Remboursement prévu" : "Expected refund"}: ${data.refundAmount}\n` : ""}${data.retainedAmount ? `${locale === "it" ? "Importo trattenuto" : locale === "es" ? "Importe retenido" : locale === "fr" ? "Montant retenu" : "Amount retained"}: ${data.retainedAmount}\n` : ""}${data.policyLabel ? `Policy: ${data.policyLabel}\n` : ""}${locale === "it" ? "Area prenotazioni" : locale === "es" ? "Área de reservas" : locale === "fr" ? "Espace réservation" : "Booking area"}: ${data.bookingPortalUrl}`;
  return { subject, html, text };
}

export interface RefundReceiptData {
  customerName: string;
  confirmationCode: string;
  refundAmount: string;
  refundType: "full" | "partial";
  bookingPortalUrl: string;
  locale?: string | null;
}

export function refundReceiptTemplate(data: RefundReceiptData) {
  const locale = resolveEmailLocale(data.locale);
  const refundKind =
    locale === "en"
      ? data.refundType === "full" ? "full" : "partial"
      : locale === "es"
        ? data.refundType === "full" ? "completo" : "parcial"
        : locale === "fr"
          ? data.refundType === "full" ? "complet" : "partiel"
          : data.refundType === "full" ? "completo" : "parziale";
  const subject =
    locale === "en"
      ? `${refundKind[0].toUpperCase()}${refundKind.slice(1)} refund · ${data.confirmationCode}`
      : locale === "es"
        ? `Reembolso ${refundKind} · ${data.confirmationCode}`
        : locale === "fr"
          ? `Remboursement ${refundKind} · ${data.confirmationCode}`
          : `Rimborso ${refundKind} · ${data.confirmationCode}`;
  const html = emailLayout({
    locale,
    heading:
      locale === "en"
        ? "Refund processed"
        : locale === "es"
          ? "Reembolso procesado"
          : locale === "fr"
            ? "Remboursement traité"
            : "Rimborso elaborato",
    bodyHtml: `
      <p>${escapeHtml(emailGreeting(locale, data.customerName))}</p>
      <p>${
        locale === "en"
          ? `we have processed a ${refundKind} refund for booking <strong>${escapeHtml(data.confirmationCode)}</strong>.`
          : locale === "es"
            ? `hemos procesado un reembolso ${refundKind} para la reserva <strong>${escapeHtml(data.confirmationCode)}</strong>.`
            : locale === "fr"
              ? `nous avons traité un remboursement ${refundKind} pour la réservation <strong>${escapeHtml(data.confirmationCode)}</strong>.`
              : `abbiamo elaborato un rimborso ${refundKind} per la prenotazione <strong>${escapeHtml(data.confirmationCode)}</strong>.`
      }</p>
      <p><strong>${
        locale === "en"
          ? "Refunded amount"
          : locale === "es"
            ? "Importe reembolsado"
            : locale === "fr"
              ? "Montant remboursé"
              : "Importo rimborsato"
      }:</strong> ${escapeHtml(data.refundAmount)}</p>
      <p style="color:#6b7280;font-size:14px;">${
        locale === "en"
          ? "Credit times depend on your card bank, usually 5-10 business days."
          : locale === "es"
            ? "El plazo de abono depende del banco de tu tarjeta, normalmente 5-10 días laborables."
            : locale === "fr"
              ? "Le délai de crédit dépend de la banque de votre carte, généralement 5 à 10 jours ouvrables."
              : "I tempi di accredito dipendono dalla banca della carta, di solito 5-10 giorni lavorativi."
      }</p>
    `,
    ctaText:
      locale === "en"
        ? "Open booking area"
        : locale === "es"
          ? "Abrir área de reservas"
          : locale === "fr"
            ? "Ouvrir l'espace réservation"
            : "Apri area prenotazioni",
    ctaUrl: data.bookingPortalUrl,
  });
  const text = `${subject}: ${data.refundAmount}. ${locale === "it" ? "Area prenotazioni" : locale === "es" ? "Área de reservas" : locale === "fr" ? "Espace réservation" : "Booking area"}: ${data.bookingPortalUrl}`;
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
  locale?: string | null;
}

export function changeRequestReceivedTemplate(data: ChangeRequestData) {
  const locale = resolveEmailLocale(data.locale);
  const subject =
    locale === "en"
      ? `Date change request received · ${data.confirmationCode}`
      : locale === "es"
        ? `Solicitud de cambio de fecha recibida · ${data.confirmationCode}`
        : locale === "fr"
          ? `Demande de changement de date reçue · ${data.confirmationCode}`
          : `Richiesta cambio data ricevuta · ${data.confirmationCode}`;
  const html = emailLayout({
    locale,
    heading:
      locale === "en"
        ? "Date change request received"
        : locale === "es"
          ? "Solicitud de cambio de fecha recibida"
          : locale === "fr"
            ? "Demande de changement de date reçue"
            : "Richiesta cambio data ricevuta",
    bodyHtml: `
      <p>${escapeHtml(emailGreeting(locale, data.customerName))}</p>
      <p>${
        locale === "en"
          ? `we have received your date change request for <strong>${escapeHtml(data.serviceName)}</strong>.`
          : locale === "es"
            ? `hemos recibido tu solicitud de cambio de fecha para <strong>${escapeHtml(data.serviceName)}</strong>.`
            : locale === "fr"
              ? `nous avons reçu votre demande de changement de date pour <strong>${escapeHtml(data.serviceName)}</strong>.`
              : `abbiamo ricevuto la tua richiesta di cambio data per <strong>${escapeHtml(data.serviceName)}</strong>.`
      }</p>
      <p>${
        locale === "en"
          ? "From"
          : locale === "es"
            ? "De"
            : locale === "fr"
              ? "Du"
              : "Da"
      } <strong>${escapeHtml(data.originalDate)}</strong> ${
        locale === "fr" ? "au" : locale === "en" ? "to" : "a"
      } <strong>${escapeHtml(data.requestedDate)}</strong>.</p>
      <p>${
        locale === "en"
          ? "We will send you a confirmation as soon as the team has checked availability and operations."
          : locale === "es"
            ? "Te enviaremos una confirmación en cuanto el equipo haya verificado disponibilidad y operativa."
            : locale === "fr"
              ? "Nous vous enverrons une confirmation dès que l'équipe aura vérifié les disponibilités et l'organisation."
              : "Ti invieremo una conferma appena lo staff avra' verificato disponibilita' e operativita'."
      }</p>
    `,
    ctaText:
      locale === "en"
        ? "Open booking area"
        : locale === "es"
          ? "Abrir área de reservas"
          : locale === "fr"
            ? "Ouvrir l'espace réservation"
            : "Apri area prenotazioni",
    ctaUrl: data.bookingPortalUrl,
  });
  const text = `${subject}: ${data.originalDate} -> ${data.requestedDate}.`;
  return { subject, html, text };
}

export function changeRequestApprovedTemplate(data: ChangeRequestData) {
  const locale = resolveEmailLocale(data.locale);
  const subject =
    locale === "en"
      ? `Date change approved · ${data.confirmationCode}`
      : locale === "es"
        ? `Cambio de fecha aprobado · ${data.confirmationCode}`
        : locale === "fr"
          ? `Changement de date approuvé · ${data.confirmationCode}`
          : `Cambio data approvato · ${data.confirmationCode}`;
  const html = emailLayout({
    locale,
    heading:
      locale === "en"
        ? "Date change approved"
        : locale === "es"
          ? "Cambio de fecha aprobado"
          : locale === "fr"
            ? "Changement de date approuvé"
            : "Cambio data approvato",
    bodyHtml: `
      <p>${escapeHtml(emailGreeting(locale, data.customerName))}</p>
      <p>${
        locale === "en"
          ? `the date change for booking <strong>${escapeHtml(data.confirmationCode)}</strong> has been approved.`
          : locale === "es"
            ? `el cambio de fecha de la reserva <strong>${escapeHtml(data.confirmationCode)}</strong> ha sido aprobado.`
            : locale === "fr"
              ? `le changement de date de la réservation <strong>${escapeHtml(data.confirmationCode)}</strong> a été approuvé.`
              : `il cambio data della prenotazione <strong>${escapeHtml(data.confirmationCode)}</strong> e' stato approvato.`
      }</p>
      <p>${
        locale === "en"
          ? "New date"
          : locale === "es"
            ? "Nueva fecha"
            : locale === "fr"
              ? "Nouvelle date"
              : "Nuova data"
      }: <strong>${escapeHtml(data.requestedDate)}</strong>.</p>
    `,
    ctaText:
      locale === "en"
        ? "Open booking area"
        : locale === "es"
          ? "Abrir área de reservas"
          : locale === "fr"
            ? "Ouvrir l'espace réservation"
            : "Apri area prenotazioni",
    ctaUrl: data.bookingPortalUrl,
  });
  const text = `${subject}. ${locale === "it" ? "Nuova data" : locale === "es" ? "Nueva fecha" : locale === "fr" ? "Nouvelle date" : "New date"}: ${data.requestedDate}.`;
  return { subject, html, text };
}

export function changeRequestRejectedTemplate(data: ChangeRequestData) {
  const locale = resolveEmailLocale(data.locale);
  const subject =
    locale === "en"
      ? `Date change unavailable · ${data.confirmationCode}`
      : locale === "es"
        ? `Cambio de fecha no disponible · ${data.confirmationCode}`
        : locale === "fr"
          ? `Changement de date non disponible · ${data.confirmationCode}`
          : `Cambio data non disponibile · ${data.confirmationCode}`;
  const note = data.adminNote
    ? `<p><strong>${locale === "en" ? "Team note" : locale === "es" ? "Nota del equipo" : locale === "fr" ? "Note de l'équipe" : "Nota staff"}:</strong> ${escapeHtml(data.adminNote)}</p>`
    : "";
  const html = emailLayout({
    locale,
    heading:
      locale === "en"
        ? "Date change unavailable"
        : locale === "es"
          ? "Cambio de fecha no disponible"
          : locale === "fr"
            ? "Changement de date non disponible"
            : "Cambio data non disponibile",
    bodyHtml: `
      <p>${escapeHtml(emailGreeting(locale, data.customerName))}</p>
      <p>${
        locale === "en"
          ? `we cannot confirm the requested date change for booking <strong>${escapeHtml(data.confirmationCode)}</strong>.`
          : locale === "es"
            ? `no podemos confirmar el cambio de fecha solicitado para la reserva <strong>${escapeHtml(data.confirmationCode)}</strong>.`
            : locale === "fr"
              ? `nous ne pouvons pas confirmer le changement de date demandé pour la réservation <strong>${escapeHtml(data.confirmationCode)}</strong>.`
              : `non possiamo confermare il cambio data richiesto per la prenotazione <strong>${escapeHtml(data.confirmationCode)}</strong>.`
      }</p>
      <p>${
        locale === "en"
          ? "Requested date"
          : locale === "es"
            ? "Fecha solicitada"
            : locale === "fr"
              ? "Date demandée"
              : "Data richiesta"
      }: <strong>${escapeHtml(data.requestedDate)}</strong>.</p>
      ${note}
      <p>${
        locale === "en"
          ? "Your booking remains valid on the original date"
          : locale === "es"
            ? "Tu reserva sigue siendo válida en la fecha original"
            : locale === "fr"
              ? "Votre réservation reste valable à la date initiale"
              : "La prenotazione resta valida sulla data originale"
      }: <strong>${escapeHtml(data.originalDate)}</strong>.</p>
    `,
    ctaText:
      locale === "en"
        ? "Open booking area"
        : locale === "es"
          ? "Abrir área de reservas"
          : locale === "fr"
            ? "Ouvrir l'espace réservation"
            : "Apri area prenotazioni",
    ctaUrl: data.bookingPortalUrl,
  });
  const text = `${subject}. ${locale === "it" ? "Data originale confermata" : locale === "es" ? "Fecha original confirmada" : locale === "fr" ? "Date initiale confirmée" : "Original date confirmed"}: ${data.originalDate}.${data.adminNote ? ` ${locale === "it" ? "Nota staff" : locale === "es" ? "Nota del equipo" : locale === "fr" ? "Note de l'équipe" : "Team note"}: ${data.adminNote}` : ""}`;
  return { subject, html, text };
}

export interface ContactAutoReplyData {
  customerName: string;
  subject: string;
  locale?: "it" | "en" | "es" | "fr";
}

export function contactAutoReplyTemplate(data: ContactAutoReplyData) {
  const isEn = data.locale === "en";
  const isEs = data.locale === "es";
  const isFr = data.locale === "fr";
  const subject = isEs
    ? "Mensaje recibido · Egadisailing"
    : isFr
      ? "Message reçu · Egadisailing"
    : isEn
      ? "Message received · Egadisailing"
      : "Messaggio ricevuto · Egadisailing";
  const html = emailLayout({
    locale: data.locale,
    heading: isEs ? "Mensaje recibido" : isFr ? "Message reçu" : isEn ? "Message received" : "Messaggio ricevuto",
    bodyHtml: isEs
      ? `
        <p>Hola ${escapeHtml(data.customerName)},</p>
        <p>hemos recibido tu mensaje: <strong>${escapeHtml(data.subject)}</strong>.</p>
        <p>Te responderemos lo antes posible, normalmente en 24 horas.</p>
      `
      : isFr
      ? `
        <p>Bonjour ${escapeHtml(data.customerName)},</p>
        <p>nous avons reçu votre message : <strong>${escapeHtml(data.subject)}</strong>.</p>
        <p>Nous répondrons dès que possible, généralement sous 24 heures.</p>
      `
      : isEn
      ? `
        <p>Hello ${escapeHtml(data.customerName)},</p>
        <p>we have received your message: <strong>${escapeHtml(data.subject)}</strong>.</p>
        <p>We will reply as soon as possible, usually within 24 hours.</p>
      `
      : `
        <p>Ciao ${escapeHtml(data.customerName)},</p>
        <p>abbiamo ricevuto il tuo messaggio: <strong>${escapeHtml(data.subject)}</strong>.</p>
        <p>Ti risponderemo appena possibile, normalmente entro 24 ore.</p>
      `,
  });
  const text = isEs
    ? `Hola ${data.customerName}, hemos recibido tu mensaje: ${data.subject}. Te responderemos en 24 horas.`
    : isFr
    ? `Bonjour ${data.customerName}, nous avons reçu votre message : ${data.subject}. Nous répondrons sous 24 heures.`
    : isEn
    ? `Hello ${data.customerName}, we have received your message: ${data.subject}. We will reply within 24 hours.`
    : `Ciao ${data.customerName}, abbiamo ricevuto il tuo messaggio: ${data.subject}. Ti risponderemo entro 24 ore.`;
  return { subject, html, text };
}

export interface PreDepartureReminderData {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  balanceAmount?: string;
  ticketUrl: string;
  locale?: string | null;
}

export function preDepartureReminderTemplate(data: PreDepartureReminderData) {
  const locale = resolveEmailLocale(data.locale);
  const subject =
    locale === "en"
      ? `Departure reminder · ${data.confirmationCode}`
      : locale === "es"
        ? `Recordatorio de salida · ${data.confirmationCode}`
        : locale === "fr"
          ? `Rappel de départ · ${data.confirmationCode}`
          : `Promemoria partenza · ${data.confirmationCode}`;
  const balance = data.balanceAmount
    ? `<p><strong>${
        locale === "en"
          ? "Balance to be paid on site"
          : locale === "es"
            ? "Saldo pendiente a pagar en el lugar"
            : locale === "fr"
              ? "Solde à régler sur place"
              : "Saldo da pagare in loco"
      }:</strong> ${escapeHtml(data.balanceAmount)}.</p>`
    : "";
  const html = emailLayout({
    locale,
    heading:
      locale === "en"
        ? "See you on board soon"
        : locale === "es"
          ? "Nos vemos pronto a bordo"
          : locale === "fr"
            ? "À très vite à bord"
            : "Ci vediamo presto a bordo",
    bodyHtml: `
      <p>${escapeHtml(emailGreeting(locale, data.customerName))}</p>
      <p>${
        locale === "en"
          ? `your experience <strong>${escapeHtml(data.serviceName)}</strong> is scheduled for <strong>${escapeHtml(data.startDate)}</strong>.`
          : locale === "es"
            ? `tu experiencia <strong>${escapeHtml(data.serviceName)}</strong> está prevista para el <strong>${escapeHtml(data.startDate)}</strong>.`
            : locale === "fr"
              ? `votre expérience <strong>${escapeHtml(data.serviceName)}</strong> est prévue le <strong>${escapeHtml(data.startDate)}</strong>.`
              : `la tua esperienza <strong>${escapeHtml(data.serviceName)}</strong> e' prevista per <strong>${escapeHtml(data.startDate)}</strong>.`
      }</p>
      ${balance}
      <p>${
        locale === "en"
          ? "Bring swimwear, sunscreen, an ID document and your QR ticket. We recommend arriving a little early."
          : locale === "es"
            ? "Trae bañador, crema solar, documento de identidad y tu billete QR. Te recomendamos llegar con un poco de antelación."
            : locale === "fr"
              ? "Prévoyez maillot de bain, crème solaire, pièce d'identité et billet QR. Nous vous conseillons d'arriver un peu en avance."
              : "Porta costume, crema solare, documento e il biglietto QR. Ti consigliamo di arrivare con anticipo."
      }</p>
    `,
    ctaText:
      locale === "en"
        ? "Open ticket"
        : locale === "es"
          ? "Abrir billete"
          : locale === "fr"
            ? "Ouvrir le billet"
            : "Apri biglietto",
    ctaUrl: data.ticketUrl,
  });
  const text = `${subject}: ${data.serviceName} ${data.startDate}.${data.balanceAmount ? ` ${locale === "it" ? "Saldo in loco" : locale === "es" ? "Saldo en el lugar" : locale === "fr" ? "Solde sur place" : "On-site balance"}: ${data.balanceAmount}.` : ""} ${locale === "it" ? "Biglietto" : locale === "es" ? "Billete" : locale === "fr" ? "Billet" : "Ticket"}: ${data.ticketUrl}`;
  return { subject, html, text };
}

export interface ReviewRequestData {
  customerName: string;
  serviceName: string;
  googleReviewUrl?: string;
  tripadvisorReviewUrl?: string;
  locale?: string | null;
}

export function reviewRequestTemplate(data: ReviewRequestData) {
  const locale = resolveEmailLocale(data.locale);
  const subject =
    locale === "en"
      ? "How was your time on board?"
      : locale === "es"
        ? "¿Cómo fue la experiencia a bordo?"
        : locale === "fr"
          ? "Comment s'est passée votre sortie à bord ?"
          : `Com'e' andata a bordo?`;
  const googleReviewUrl = data.googleReviewUrl ?? PUBLIC_REVIEW_LINKS.google;
  const tripadvisorReviewUrl = data.tripadvisorReviewUrl ?? PUBLIC_REVIEW_LINKS.tripadvisor;
  const html = emailLayout({
    locale,
    heading:
      locale === "en"
        ? "Thank you for coming on board"
        : locale === "es"
          ? "Gracias por subir a bordo"
          : locale === "fr"
            ? "Merci d'être montés à bord"
            : "Grazie per essere saliti a bordo",
    bodyHtml: `
      <p>${escapeHtml(emailGreeting(locale, data.customerName))}</p>
      <p>${
        locale === "en"
          ? `we hope your <strong>${escapeHtml(data.serviceName)}</strong> experience was special.`
          : locale === "es"
            ? `esperamos que la experiencia <strong>${escapeHtml(data.serviceName)}</strong> haya sido especial.`
            : locale === "fr"
              ? `nous espérons que l'expérience <strong>${escapeHtml(data.serviceName)}</strong> a été spéciale.`
              : `speriamo che l'esperienza <strong>${escapeHtml(data.serviceName)}</strong> sia stata speciale.`
      }</p>
      <p>${
        locale === "en"
          ? "A review helps us a lot to make Egadisailing known. You can leave it wherever you prefer:"
          : locale === "es"
            ? "Una reseña nos ayuda muchísimo a dar a conocer Egadisailing. Puedes dejarla donde prefieras:"
            : locale === "fr"
              ? "Un avis nous aide beaucoup à faire connaître Egadisailing. Vous pouvez le laisser où vous préférez :"
              : "Una recensione ci aiuta moltissimo a far conoscere Egadisailing. Puoi lasciarla dove preferisci:"
      }</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 22px 0 10px;">
        <tr>
          <td align="center" style="padding: 0 0 12px;">
            <a href="${safeUrl(googleReviewUrl)}" style="display: inline-block; min-width: 220px; background: #0c3d5e; color: #ffffff; padding: 13px 22px; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 14px; line-height: 1.2;">
              ${locale === "en" ? "Review us on Google" : locale === "es" ? "Déjanos una reseña en Google" : locale === "fr" ? "Laisser un avis sur Google" : "Recensisci su Google"}
            </a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0 0 12px;">
            <a href="${safeUrl(tripadvisorReviewUrl)}" style="display: inline-block; min-width: 220px; background: #d97706; color: #ffffff; padding: 13px 22px; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 14px; line-height: 1.2;">
              ${locale === "en" ? "Review us on Tripadvisor" : locale === "es" ? "Déjanos una reseña en Tripadvisor" : locale === "fr" ? "Laisser un avis sur Tripadvisor" : "Recensisci su Tripadvisor"}
            </a>
          </td>
        </tr>
      </table>
    `,
  });
  const text =
    locale === "en"
      ? `Thank you for coming on board. You can leave a review on Google: ${googleReviewUrl} or on Tripadvisor: ${tripadvisorReviewUrl}`
      : locale === "es"
        ? `Gracias por subir a bordo. Puedes dejar una reseña en Google: ${googleReviewUrl} o en Tripadvisor: ${tripadvisorReviewUrl}`
        : locale === "fr"
          ? `Merci d'être montés à bord. Vous pouvez laisser un avis sur Google : ${googleReviewUrl} ou sur Tripadvisor : ${tripadvisorReviewUrl}`
          : `Grazie per essere saliti a bordo. Puoi lasciare una recensione su Google: ${googleReviewUrl} oppure su Tripadvisor: ${tripadvisorReviewUrl}`;
  return { subject, html, text };
}
