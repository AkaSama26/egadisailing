import { emailLayout, escapeHtml, safeUrl } from "./_layout";
import { emailGreeting, resolveEmailLocale } from "./locale";

export interface OverrideApprovedWinnerProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  numPeople: number;
  bookingPortalUrl: string;
  contactPhone: string;
  locale?: string | null;
}

export function overrideApprovedWinnerTemplate(
  data: OverrideApprovedWinnerProps,
): { subject: string; html: string; text: string } {
  const locale = resolveEmailLocale(data.locale);
  const subject =
    locale === "en"
      ? `Booking confirmed — ${data.confirmationCode}`
      : locale === "es"
        ? `Reserva confirmada — ${data.confirmationCode}`
        : locale === "fr"
          ? `Réservation confirmée — ${data.confirmationCode}`
          : `Prenotazione confermata — ${data.confirmationCode}`;
  const labels = {
    service: locale === "en" ? "Service" : locale === "es" ? "Servicio" : locale === "fr" ? "Service" : "Servizio",
    date: locale === "en" ? "Date" : locale === "es" ? "Fecha" : locale === "fr" ? "Date" : "Data",
    people: locale === "en" ? "Guests" : locale === "es" ? "Personas" : locale === "fr" ? "Personnes" : "Persone",
    code: locale === "en" ? "Code" : locale === "es" ? "Código" : locale === "fr" ? "Code" : "Codice",
    cta: locale === "en" ? "Manage booking" : locale === "es" ? "Gestionar reserva" : locale === "fr" ? "Gérer la réservation" : "Gestisci la prenotazione",
  };
  const intro =
    locale === "en"
      ? "Great news"
      : locale === "es"
        ? "Buenas noticias"
        : locale === "fr"
          ? "Bonne nouvelle"
          : "Ottime notizie";
  const confirmed =
    locale === "en"
      ? "Your booking has been confirmed."
      : locale === "es"
        ? "Tu reserva ha sido confirmada."
        : locale === "fr"
          ? "Votre réservation a été confirmée."
          : "La tua prenotazione e' stata confermata.";
  const closing =
    locale === "en"
      ? `See you on board. For any question, call us at`
      : locale === "es"
        ? `Nos vemos a bordo. Para cualquier duda, llámanos al`
        : locale === "fr"
          ? `Nous vous attendons à bord. Pour toute question, appelez-nous au`
          : `Ci vediamo a bordo. Per qualsiasi domanda chiamaci al`;
  const body = `
    <p>${intro}, ${escapeHtml(data.customerName)}!</p>
    <p>${confirmed}</p>
    <ul>
      <li>${labels.service}: ${escapeHtml(data.serviceName)}</li>
      <li>${labels.date}: <strong>${escapeHtml(data.startDate)}</strong></li>
      <li>${labels.people}: ${data.numPeople}</li>
      <li>${labels.code}: <strong>${escapeHtml(data.confirmationCode)}</strong></li>
    </ul>
    <p>${closing} <strong>${escapeHtml(data.contactPhone)}</strong>.</p>
    <p><a href="${safeUrl(data.bookingPortalUrl)}">${labels.cta}</a></p>
  `;
  const text = `${emailGreeting(locale, data.customerName)} ${subject}.\n${labels.date}: ${data.startDate}\n${labels.cta}: ${data.bookingPortalUrl}`;
  return { subject, html: emailLayout({ locale, heading: subject, bodyHtml: body }), text };
}
