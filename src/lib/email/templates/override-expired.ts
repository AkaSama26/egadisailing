import { emailLayout, escapeHtml, safeUrl } from "./_layout";
import { resolveEmailLocale } from "./locale";

export interface OverrideExpiredProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  refundAmount: string;
  alternativeDates: string[];
  bookingPortalUrl: string;
  locale?: string | null;
}

export function overrideExpiredTemplate(
  data: OverrideExpiredProps,
): { subject: string; html: string; text: string } {
  const locale = resolveEmailLocale(data.locale);
  const subject =
    locale === "en"
      ? `Booking ${data.confirmationCode} expired`
      : locale === "es"
        ? `Reserva ${data.confirmationCode} caducada`
        : locale === "fr"
          ? `Réservation ${data.confirmationCode} expirée`
          : locale === "de"
            ? `Buchung ${data.confirmationCode} abgelaufen`
          : `Prenotazione ${data.confirmationCode} scaduta`;
  const altTitle =
    locale === "en"
      ? "Alternative dates:"
      : locale === "es"
        ? "Fechas alternativas:"
        : locale === "fr"
          ? "Dates alternatives :"
          : locale === "de"
            ? "Alternative Termine:"
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
          : locale === "de"
            ? `Guten Tag ${escapeHtml(data.customerName)},`
          : `Ciao ${escapeHtml(data.customerName)},`;
  const message =
    locale === "en"
      ? `We could not confirm your booking <strong>${escapeHtml(data.confirmationCode)}</strong> for <strong>${escapeHtml(data.serviceName)}</strong> on <strong>${escapeHtml(data.startDate)}</strong> within the expected time. The full refund of <strong>${escapeHtml(data.refundAmount)}</strong> has been started (5-10 business days).`
      : locale === "es"
        ? `No hemos podido confirmar tu reserva <strong>${escapeHtml(data.confirmationCode)}</strong> para <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong> dentro del plazo previsto. Hemos iniciado el reembolso completo de <strong>${escapeHtml(data.refundAmount)}</strong> (5-10 días laborables).`
        : locale === "fr"
          ? `Nous n'avons pas pu confirmer votre réservation <strong>${escapeHtml(data.confirmationCode)}</strong> pour <strong>${escapeHtml(data.serviceName)}</strong> du <strong>${escapeHtml(data.startDate)}</strong> dans le délai prévu. Le remboursement complet de <strong>${escapeHtml(data.refundAmount)}</strong> a été lancé (5 à 10 jours ouvrables).`
          : locale === "de"
            ? `Wir konnten Ihre Buchung <strong>${escapeHtml(data.confirmationCode)}</strong> für <strong>${escapeHtml(data.serviceName)}</strong> am <strong>${escapeHtml(data.startDate)}</strong> nicht innerhalb der vorgesehenen Zeit bestätigen. Die vollständige Erstattung von <strong>${escapeHtml(data.refundAmount)}</strong> wurde veranlasst (5-10 Werktage).`
          : `Non abbiamo potuto confermare la tua prenotazione <strong>${escapeHtml(data.confirmationCode)}</strong> per <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong> entro il termine previsto. Il rimborso completo di <strong>${escapeHtml(data.refundAmount)}</strong> e' stato avviato (5-10 giorni lavorativi).`;
  const portal =
    locale === "en"
      ? "Booking area"
      : locale === "es"
        ? "Área de reservas"
        : locale === "fr"
          ? "Espace réservation"
          : locale === "de"
            ? "Buchungsbereich"
          : "Area prenotazioni";
  const body = `
    <p>${greeting}</p>
    <p>${message}</p>
    ${altList}
    <p><a href="${safeUrl(data.bookingPortalUrl)}">${portal}</a></p>
  `;
  const text = `${subject}. ${locale === "it" ? "Rimborso" : locale === "es" ? "Reembolso" : locale === "fr" ? "Remboursement" : locale === "de" ? "Erstattung" : "Refund"}: ${data.refundAmount}. ${altTitle} ${data.alternativeDates.join(", ")}`;
  return { subject, html: emailLayout({ locale, heading: subject, bodyHtml: body }), text };
}
