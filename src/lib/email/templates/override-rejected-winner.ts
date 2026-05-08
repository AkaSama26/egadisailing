import { emailLayout, escapeHtml, safeUrl } from "./_layout";
import { emailGreeting, resolveEmailLocale } from "./locale";

export interface OverrideRejectedWinnerProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  refundAmount: string;
  alternativeDates: string[];
  bookingPortalUrl: string;
  contactEmail: string;
  locale?: string | null;
}

export function overrideRejectedWinnerTemplate(
  data: OverrideRejectedWinnerProps,
): { subject: string; html: string; text: string } {
  const locale = resolveEmailLocale(data.locale);
  const subject =
    locale === "en"
      ? `Booking ${data.confirmationCode} not confirmed`
      : locale === "es"
        ? `Reserva ${data.confirmationCode} no confirmada`
        : locale === "fr"
          ? `Réservation ${data.confirmationCode} non confirmée`
          : `Prenotazione ${data.confirmationCode} non confermata`;
  const altTitle =
    locale === "en"
      ? "Available alternative dates:"
      : locale === "es"
        ? "Fechas alternativas disponibles:"
        : locale === "fr"
          ? "Dates alternatives disponibles :"
          : "Date alternative disponibili:";
  const altList = data.alternativeDates.length > 0
    ? `<p>${altTitle}</p><ul>${data.alternativeDates
        .map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
    : "";
  const bodyCopy =
    locale === "en"
      ? {
          greeting: emailGreeting(locale, data.customerName),
          message: `We are sorry to let you know that your booking request for <strong>${escapeHtml(data.serviceName)}</strong> on <strong>${escapeHtml(data.startDate)}</strong> could not be confirmed.`,
          refund: `You will receive a full refund of <strong>${escapeHtml(data.refundAmount)}</strong> on your card within 5-10 business days.`,
          contact: "For any question:",
          portal: "Booking area",
        }
      : locale === "es"
        ? {
            greeting: emailGreeting(locale, data.customerName),
            message: `Sentimos comunicarte que tu solicitud de reserva para <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong> no ha sido confirmada.`,
            refund: `Recibirás el reembolso completo de <strong>${escapeHtml(data.refundAmount)}</strong> en tu tarjeta en un plazo de 5-10 días laborables.`,
            contact: "Para cualquier duda:",
            portal: "Área de reservas",
          }
        : locale === "fr"
          ? {
              greeting: emailGreeting(locale, data.customerName),
              message: `Nous sommes désolés de vous informer que votre demande de réservation pour <strong>${escapeHtml(data.serviceName)}</strong> du <strong>${escapeHtml(data.startDate)}</strong> n'a pas pu être confirmée.`,
              refund: `Vous recevrez le remboursement complet de <strong>${escapeHtml(data.refundAmount)}</strong> sur votre carte sous 5 à 10 jours ouvrables.`,
              contact: "Pour toute question :",
              portal: "Espace réservation",
            }
          : {
              greeting: emailGreeting(locale, data.customerName),
              message: `Ci dispiace comunicarti che la tua richiesta di prenotazione per <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong> non e' stata confermata.`,
              refund: `Riceverai il rimborso completo di <strong>${escapeHtml(data.refundAmount)}</strong> sulla tua carta di credito entro 5-10 giorni lavorativi.`,
              contact: "Per qualsiasi domanda:",
              portal: "Area prenotazioni",
            };
  const body = `
    <p>${escapeHtml(bodyCopy.greeting)}</p>
    <p>${bodyCopy.message}</p>
    <p>${bodyCopy.refund}</p>
    ${altList}
    <p>${bodyCopy.contact} <a href="mailto:${escapeHtml(data.contactEmail)}">${escapeHtml(data.contactEmail)}</a></p>
    <p><a href="${safeUrl(data.bookingPortalUrl)}">${bodyCopy.portal}</a></p>
  `;
  const text = `${emailGreeting(locale, data.customerName)} ${subject}. ${bodyCopy.refund.replace(/<[^>]*>/g, "")} ${altTitle} ${data.alternativeDates.join(", ")}`;
  return { subject, html: emailLayout({ locale, heading: subject, bodyHtml: body }), text };
}
