import { emailLayout, escapeHtml, safeUrl } from "./_layout";
import { resolveEmailLocale } from "./locale";

export interface OverrideSupersededProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  refundAmount: string;
  alternativeDates: string[];
  bookingPortalUrl: string;
  locale?: string | null;
}

export function overrideSupersededTemplate(
  data: OverrideSupersededProps,
): { subject: string; html: string; text: string } {
  const locale = resolveEmailLocale(data.locale);
  const subject =
    locale === "en"
      ? `Booking ${data.confirmationCode} no longer available`
      : locale === "es"
        ? `Reserva ${data.confirmationCode} no disponible`
        : locale === "fr"
          ? `Réservation ${data.confirmationCode} non disponible`
          : `Prenotazione ${data.confirmationCode} non disponibile`;
  const altTitle =
    locale === "en"
      ? "Alternative dates:"
      : locale === "es"
        ? "Fechas alternativas:"
        : locale === "fr"
          ? "Dates alternatives :"
          : "Date alternative:";
  const altList = data.alternativeDates.length > 0
    ? `<p>${altTitle}</p><ul>${data.alternativeDates
        .map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
    : "";
  const greeting =
    locale === "en"
      ? `Hello ${escapeHtml(data.customerName)},`
      : locale === "es"
        ? `Hola ${escapeHtml(data.customerName)},`
        : locale === "fr"
          ? `Bonjour ${escapeHtml(data.customerName)},`
          : `Ciao ${escapeHtml(data.customerName)},`;
  const message =
    locale === "en"
      ? `Following the final operational availability check, we are sorry to let you know that we cannot confirm your booking for <strong>${escapeHtml(data.serviceName)}</strong> on <strong>${escapeHtml(data.startDate)}</strong> (code <strong>${escapeHtml(data.confirmationCode)}</strong>).`
      : locale === "es"
        ? `Tras la verificación operativa final de disponibilidad, sentimos comunicarte que no podemos confirmar tu reserva para <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong> (código <strong>${escapeHtml(data.confirmationCode)}</strong>).`
        : locale === "fr"
          ? `Après la vérification opérationnelle finale des disponibilités, nous sommes désolés de vous informer que nous ne pouvons pas confirmer votre réservation pour <strong>${escapeHtml(data.serviceName)}</strong> du <strong>${escapeHtml(data.startDate)}</strong> (code <strong>${escapeHtml(data.confirmationCode)}</strong>).`
          : `Ci dispiace comunicarti che, a seguito della verifica operativa sulla disponibilita', non possiamo confermare la tua prenotazione per <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong> (codice <strong>${escapeHtml(data.confirmationCode)}</strong>).`;
  const refund =
    locale === "en"
      ? `You will receive the full refund of <strong>${escapeHtml(data.refundAmount)}</strong> within 5-10 business days.`
      : locale === "es"
        ? `Recibirás el reembolso completo de <strong>${escapeHtml(data.refundAmount)}</strong> en un plazo de 5-10 días laborables.`
        : locale === "fr"
          ? `Vous recevrez le remboursement complet de <strong>${escapeHtml(data.refundAmount)}</strong> sous 5 à 10 jours ouvrables.`
          : `Riceverai il rimborso completo di <strong>${escapeHtml(data.refundAmount)}</strong> entro 5-10 giorni lavorativi.`;
  const portal =
    locale === "en"
      ? "Booking area"
      : locale === "es"
        ? "Área de reservas"
        : locale === "fr"
          ? "Espace réservation"
          : "Area prenotazioni";
  const body = `
    <p>${greeting}</p>
    <p>${message}</p>
    <p>${refund}</p>
    ${altList}
    <p><a href="${safeUrl(data.bookingPortalUrl)}">${portal}</a></p>
  `;
  const text = `${subject}. ${locale === "it" ? "Rimborso" : locale === "es" ? "Reembolso" : locale === "fr" ? "Remboursement" : "Refund"}: ${data.refundAmount}.`;
  return { subject, html: emailLayout({ locale, heading: subject, bodyHtml: body }), text };
}
