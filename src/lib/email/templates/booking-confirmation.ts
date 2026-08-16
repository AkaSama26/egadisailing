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

const MEETING_POINT_MAP_URL = "https://maps.app.goo.gl/g1SYWfksRB7aExbm7";

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
            : locale === "de"
              ? `Buchungsbestätigung ${data.confirmationCode} · Egadisailing`
            : `Conferma prenotazione ${data.confirmationCode} · Egadisailing`,
    heading:
      locale === "en"
        ? `Booking confirmed!`
        : locale === "es"
          ? `¡Reserva confirmada!`
          : locale === "fr"
            ? `Réservation confirmée !`
            : locale === "de"
              ? `Buchung bestätigt!`
            : `prenotazione confermata!`,
    code:
      locale === "en"
        ? "Booking code"
        : locale === "es"
          ? "Código de reserva"
          : locale === "fr"
            ? "Code de réservation"
            : locale === "de"
              ? "Buchungscode"
            : "Codice prenotazione",
    experience:
      locale === "en"
        ? "Experience"
        : locale === "es"
          ? "Experiencia"
          : locale === "fr"
            ? "Expérience"
            : locale === "de"
              ? "Erlebnis"
            : "Esperienza",
    date: locale === "en" ? "Date" : locale === "es" ? "Fecha" : locale === "fr" ? "Date" : locale === "de" ? "Datum" : "Data",
    people:
      locale === "en"
        ? "Guests"
        : locale === "es"
          ? "Personas"
          : locale === "fr"
            ? "Personnes"
            : locale === "de"
              ? "Gäste"
            : "Persone",
    total: locale === "en" ? "Total" : locale === "es" ? "Total" : locale === "fr" ? "Total" : locale === "de" ? "Gesamt" : "Totale",
    paid:
      locale === "en"
        ? "Already paid"
        : locale === "es"
          ? "Ya pagado"
          : locale === "fr"
            ? "Déjà payé"
            : locale === "de"
              ? "Bereits bezahlt"
            : "Gia' pagato",
    balance:
      locale === "en"
        ? "Balance to be paid on site"
        : locale === "es"
          ? "Saldo pendiente a pagar en el lugar"
          : locale === "fr"
            ? "Solde à régler sur place"
            : locale === "de"
              ? "Restbetrag vor Ort zu zahlen"
            : "Saldo da pagare in loco",
    balanceNote:
      locale === "en"
        ? "The remaining balance is paid on site before departure."
        : locale === "es"
          ? "El saldo restante se paga en el lugar antes de la salida."
          : locale === "fr"
            ? "Le solde restant est réglé sur place avant le départ."
            : locale === "de"
              ? "Der verbleibende Restbetrag wird vor Ort vor der Abfahrt bezahlt."
            : "Il saldo restante si paga in loco prima della partenza.",
    ticket: locale === "en" ? "QR ticket" : locale === "es" ? "Billete QR" : locale === "fr" ? "Billet QR" : locale === "de" ? "QR-Ticket" : "Biglietto QR",
    manage:
      locale === "en"
        ? "To manage your booking, go to"
        : locale === "es"
          ? "Para gestionar tu reserva, entra en"
          : locale === "fr"
            ? "Pour gérer votre réservation, rendez-vous sur"
            : locale === "de"
              ? "Um Ihre Buchung zu verwalten, öffnen Sie"
            : "Per gestire la prenotazione, vai su",
    emailInstruction:
      locale === "en"
        ? "and enter your email address."
        : locale === "es"
          ? "e introduce tu email."
          : locale === "fr"
            ? "et saisissez votre adresse email."
            : locale === "de"
              ? "und geben Sie Ihre E-Mail-Adresse ein."
            : "e inserisci la tua email.",
    ticketCta:
      locale === "en"
        ? "Open QR ticket"
        : locale === "es"
          ? "Abrir billete QR"
          : locale === "fr"
            ? "Ouvrir le billet QR"
            : locale === "de"
              ? "QR-Ticket öffnen"
            : "Apri biglietto QR",
    manageCta:
      locale === "en"
        ? "Manage booking"
        : locale === "es"
          ? "Gestionar reserva"
          : locale === "fr"
            ? "Gérer la réservation"
            : locale === "de"
              ? "Buchung verwalten"
            : "Gestisci la prenotazione",
    meetingPoint:
      locale === "en"
        ? "Meeting point"
        : locale === "es"
          ? "Punto de encuentro"
          : locale === "fr"
            ? "Point de rendez-vous"
            : locale === "de"
              ? "Treffpunkt"
              : "Punto di incontro",
    meetingInstructions:
      locale === "en"
        ? "Please arrive at 9:00 AM on the departure day and ask for Nicolò Genna from Egadisailing."
        : locale === "es"
          ? "Preséntate a las 9:00 del día de salida y pregunta por Nicolò Genna de Egadisailing."
          : locale === "fr"
            ? "Présentez-vous à 9 h 00 le jour du départ et demandez Nicolò Genna d’Egadisailing."
            : locale === "de"
              ? "Bitte finden Sie sich am Abreisetag um 9:00 Uhr dort ein und fragen Sie nach Nicolò Genna von Egadisailing."
              : "Presentati alle ore 9:00 del giorno di partenza e chiedi di Nicolò Genna di Egadisailing.",
    mapCta:
      locale === "en"
        ? "Open in Google Maps"
        : locale === "es"
          ? "Abrir en Google Maps"
          : locale === "fr"
            ? "Ouvrir dans Google Maps"
            : locale === "de"
              ? "In Google Maps öffnen"
              : "Apri in Google Maps",
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
      <div style="margin: 22px 0; padding: 18px; background: #f0f9ff; border-left: 4px solid #0369a1; border-radius: 8px;">
        <p><strong>${copy.meetingPoint}:</strong> Marina Vento di Maestrale</p>
        <p>${copy.meetingInstructions}</p>
        <p style="margin-bottom: 0;"><a href="${safeUrl(MEETING_POINT_MAP_URL)}">${copy.mapCta}</a></p>
      </div>
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
${data.balanceAmount ? `${copy.balance}: ${data.balanceAmount}.\n` : ""}${copy.meetingPoint}: Marina Vento di Maestrale
${copy.meetingInstructions}
${copy.mapCta}: ${MEETING_POINT_MAP_URL}
${hasSafeTicketUrl ? `${copy.ticket}: ${data.ticketUrl}\n` : `${copy.manageCta}: ${data.recoveryUrl}`}`;

  return { subject, html, text };
}
