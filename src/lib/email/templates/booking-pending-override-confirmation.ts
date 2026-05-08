import { emailLayout, escapeHtml, safeUrl } from "./_layout";
import { emailGreeting, resolveEmailLocale } from "./locale";

export interface OverridePendingConfirmationProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  numPeople: number;
  amountPaid: string;
  bookingPortalUrl: string;
  locale?: string | null;
}

export function bookingPendingOverrideConfirmationTemplate(
  data: OverridePendingConfirmationProps,
): { subject: string; html: string; text: string } {
  const locale = resolveEmailLocale(data.locale);
  const copy = {
    subject:
      locale === "en"
        ? `Booking request received — ${data.confirmationCode}`
        : locale === "es"
          ? `Solicitud de reserva recibida — ${data.confirmationCode}`
          : locale === "fr"
            ? `Demande de réservation reçue — ${data.confirmationCode}`
            : `Richiesta prenotazione ricevuta — ${data.confirmationCode}`,
    intro:
      locale === "en"
        ? "We have received your booking for:"
        : locale === "es"
          ? "Hemos recibido tu reserva para:"
          : locale === "fr"
            ? "Nous avons reçu votre réservation pour :"
            : "Abbiamo ricevuto la tua prenotazione per:",
    service:
      locale === "en"
        ? "Service"
        : locale === "es"
          ? "Servicio"
          : locale === "fr"
            ? "Service"
            : "Servizio",
    date: locale === "en" ? "Date" : locale === "es" ? "Fecha" : locale === "fr" ? "Date" : "Data",
    people:
      locale === "en"
        ? "Guests"
        : locale === "es"
          ? "Personas"
          : locale === "fr"
            ? "Personnes"
            : "Persone",
    paid:
      locale === "en"
        ? "Total paid"
        : locale === "es"
          ? "Total pagado"
          : locale === "fr"
            ? "Total payé"
            : "Totale pagato",
    code:
      locale === "en"
        ? "Code"
        : locale === "es"
          ? "Código"
          : locale === "fr"
            ? "Code"
            : "Codice",
    status:
      locale === "en"
        ? "Status: awaiting confirmation"
        : locale === "es"
          ? "Estado: pendiente de confirmación"
          : locale === "fr"
            ? "Statut : en attente de confirmation"
            : "Stato: In attesa di conferma",
    timing:
      locale === "en"
        ? "The team will confirm your booking within 72 hours. If we cannot confirm it, we will refund you automatically at no cost."
        : locale === "es"
          ? "El equipo confirmará tu reserva en un plazo de 72 horas. Si no podemos confirmarla, te reembolsaremos automáticamente sin ningún coste."
          : locale === "fr"
            ? "L'équipe confirmera votre réservation sous 72 heures. Si nous ne pouvons pas la confirmer, vous serez remboursé automatiquement sans frais."
            : "Lo staff conferma la tua prenotazione entro 72 ore. In caso di non conferma ti rimborseremo automaticamente senza alcun costo.",
    portal:
      locale === "en"
        ? "You can check the status at any time in your booking area:"
        : locale === "es"
          ? "Puedes consultar el estado en cualquier momento en tu área de reservas:"
          : locale === "fr"
            ? "Vous pouvez consulter le statut à tout moment dans votre espace réservation :"
            : "Puoi visualizzare lo stato in qualsiasi momento su:",
    portalLabel:
      locale === "en"
        ? "Booking area"
        : locale === "es"
          ? "Área de reservas"
          : locale === "fr"
            ? "Espace réservation"
            : "Area prenotazioni",
  };
  const subject = copy.subject;
  const body = `
    <p>${escapeHtml(emailGreeting(locale, data.customerName))}</p>
    <p>${copy.intro}</p>
    <ul>
      <li>${copy.service}: <strong>${escapeHtml(data.serviceName)}</strong></li>
      <li>${copy.date}: <strong>${escapeHtml(data.startDate)}</strong></li>
      <li>${copy.people}: ${data.numPeople}</li>
      <li>${copy.paid}: ${escapeHtml(data.amountPaid)}</li>
      <li>${copy.code}: <strong>${escapeHtml(data.confirmationCode)}</strong></li>
    </ul>
    <p><strong>${copy.status}</strong></p>
    <p>${copy.timing}</p>
    <p>${copy.portal}
      <a href="${safeUrl(data.bookingPortalUrl)}">${copy.portalLabel}</a>
    </p>
  `;
  const text = `${emailGreeting(locale, data.customerName)}

${copy.subject}
${copy.service}: ${data.serviceName}
${copy.date}: ${data.startDate}
${copy.paid}: ${data.amountPaid}

${copy.status}
${copy.timing}
${copy.portalLabel}: ${data.bookingPortalUrl}
`;
  return {
    subject,
    html: emailLayout({ locale, heading: subject, bodyHtml: body }),
    text,
  };
}
