import { emailLayout, escapeHtml, safeUrl } from "./_layout";
import { emailGreeting, resolveEmailLocale } from "./locale";

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
  ticketUrl?: string;
  locale?: string | null;
}

export function bookingConfirmationTemplate(data: BookingConfirmationData) {
  const locale = resolveEmailLocale(data.locale);
  const copy = {
    subject:
      locale === "en"
        ? `Booking confirmation ${data.confirmationCode} · Egadisailing`
        : locale === "es"
          ? `Confirmación de reserva ${data.confirmationCode} · Egadisailing`
          : locale === "fr"
            ? `Confirmation de réservation ${data.confirmationCode} · Egadisailing`
            : `Conferma prenotazione ${data.confirmationCode} · Egadisailing`,
    heading:
      locale === "en"
        ? `Booking confirmed!`
        : locale === "es"
          ? `¡Reserva confirmada!`
          : locale === "fr"
            ? `Réservation confirmée !`
            : `prenotazione confermata!`,
    code:
      locale === "en"
        ? "Booking code"
        : locale === "es"
          ? "Código de reserva"
          : locale === "fr"
            ? "Code de réservation"
            : "Codice prenotazione",
    experience:
      locale === "en"
        ? "Experience"
        : locale === "es"
          ? "Experiencia"
          : locale === "fr"
            ? "Expérience"
            : "Esperienza",
    date: locale === "en" ? "Date" : locale === "es" ? "Fecha" : locale === "fr" ? "Date" : "Data",
    people:
      locale === "en"
        ? "Guests"
        : locale === "es"
          ? "Personas"
          : locale === "fr"
            ? "Personnes"
            : "Persone",
    total: locale === "en" ? "Total" : locale === "es" ? "Total" : locale === "fr" ? "Total" : "Totale",
    paid:
      locale === "en"
        ? "Already paid"
        : locale === "es"
          ? "Ya pagado"
          : locale === "fr"
            ? "Déjà payé"
            : "Gia' pagato",
    balance:
      locale === "en"
        ? "Balance to be paid on site"
        : locale === "es"
          ? "Saldo pendiente a pagar en el lugar"
          : locale === "fr"
            ? "Solde à régler sur place"
            : "Saldo da pagare in loco",
    balanceNote:
      locale === "en"
        ? "The remaining balance is paid on site before departure."
        : locale === "es"
          ? "El saldo restante se paga en el lugar antes de la salida."
          : locale === "fr"
            ? "Le solde restant est réglé sur place avant le départ."
            : "Il saldo restante si paga in loco prima della partenza.",
    ticket: locale === "en" ? "QR ticket" : locale === "es" ? "Billete QR" : locale === "fr" ? "Billet QR" : "Biglietto QR",
    manage:
      locale === "en"
        ? "To manage your booking, go to"
        : locale === "es"
          ? "Para gestionar tu reserva, entra en"
          : locale === "fr"
            ? "Pour gérer votre réservation, rendez-vous sur"
            : "Per gestire la prenotazione, vai su",
    emailInstruction:
      locale === "en"
        ? "and enter your email address."
        : locale === "es"
          ? "e introduce tu email."
          : locale === "fr"
            ? "et saisissez votre adresse email."
            : "e inserisci la tua email.",
    ticketCta:
      locale === "en"
        ? "Open QR ticket"
        : locale === "es"
          ? "Abrir billete QR"
          : locale === "fr"
            ? "Ouvrir le billet QR"
            : "Apri biglietto QR",
    manageCta:
      locale === "en"
        ? "Manage booking"
        : locale === "es"
          ? "Gestionar reserva"
          : locale === "fr"
            ? "Gérer la réservation"
            : "Gestisci la prenotazione",
  };
  const subject = copy.subject;
  const ticketHref = data.ticketUrl ? safeUrl(data.ticketUrl) : undefined;
  const hasSafeTicketUrl = Boolean(ticketHref && ticketHref !== "#");
  const balanceBlock = data.balanceAmount
    ? `<p style="color: #c2410c;"><strong>${copy.balance}:</strong> ${escapeHtml(data.balanceAmount)}<br>
         ${copy.balanceNote}</p>`
    : "";
  const ticketBlock = hasSafeTicketUrl
    ? `<p><strong>${copy.ticket}:</strong> <a href="${ticketHref}">${ticketHref}</a></p>`
    : "";
  const html = emailLayout({
    locale,
    heading:
      locale === "it"
        ? `Ciao ${escapeHtml(data.customerName)}, ${copy.heading}`
        : `${emailGreeting(locale, escapeHtml(data.customerName))} ${copy.heading}`,
    bodyHtml: `
      <p><strong>${copy.code}:</strong> ${escapeHtml(data.confirmationCode)}</p>
      <p><strong>${copy.experience}:</strong> ${escapeHtml(data.serviceName)}</p>
      <p><strong>${copy.date}:</strong> ${escapeHtml(data.startDate)}</p>
      <p><strong>${copy.people}:</strong> ${data.numPeople}</p>
      <p><strong>${copy.total}:</strong> ${escapeHtml(data.totalPrice)}</p>
      <p><strong>${copy.paid}:</strong> ${escapeHtml(data.paidAmount)}</p>
      ${balanceBlock}
      ${ticketBlock}
      <p style="color: #6b7280; font-size: 14px;">
        ${copy.manage}
        <a href="${safeUrl(data.recoveryUrl)}">${escapeHtml(data.recoveryUrl)}</a>
        ${copy.emailInstruction}
      </p>
    `,
    ctaText: hasSafeTicketUrl ? copy.ticketCta : copy.manageCta,
    ctaUrl: hasSafeTicketUrl ? ticketHref : data.recoveryUrl,
  });

  const text = `${emailGreeting(locale, data.customerName)} ${copy.heading}
${copy.code}: ${data.confirmationCode}
${copy.experience}: ${data.serviceName}
${copy.date}: ${data.startDate}
${copy.people}: ${data.numPeople}
${copy.total}: ${data.totalPrice}
${copy.paid}: ${data.paidAmount}
${data.balanceAmount ? `${copy.balance}: ${data.balanceAmount}.\n` : ""}${hasSafeTicketUrl ? `${copy.ticket}: ${data.ticketUrl}\n` : `${copy.manageCta}: ${data.recoveryUrl}`}`;

  return { subject, html, text };
}
