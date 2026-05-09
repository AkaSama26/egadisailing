import { emailLayout, escapeHtml } from "./_layout";
import { resolveEmailLocale } from "./locale";

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
  locale?: string | null;
}

export function overbookingApologyTemplate(data: OverbookingApologyData) {
  const locale = resolveEmailLocale(data.locale);
  const subject =
    locale === "en"
      ? `our apologies for booking ${data.confirmationCode} · Egadisailing`
      : locale === "es"
        ? `disculpas por la reserva ${data.confirmationCode} · Egadisailing`
        : locale === "fr"
          ? `nos excuses pour la réservation ${data.confirmationCode} · Egadisailing`
          : locale === "de"
            ? `Entschuldigung zur Buchung ${data.confirmationCode} · Egadisailing`
          : `ci scusiamo per la prenotazione ${data.confirmationCode} · Egadisailing`;
  const phoneLine = data.contactPhone
    ? `<p><strong>${locale === "en" ? "Phone/WhatsApp" : locale === "es" ? "Teléfono/WhatsApp" : locale === "fr" ? "Téléphone/WhatsApp" : locale === "de" ? "Telefon/WhatsApp" : "Telefono/WhatsApp"}:</strong> ${escapeHtml(data.contactPhone)}</p>`
    : "";

  const refundHtml =
    data.refundChannel === "stripe"
      ? locale === "en"
        ? `<p><strong>Refund processed:</strong> ${escapeHtml(data.refundAmount)} — the amount will return to your card within 5-10 business days, depending on your bank.</p>`
        : locale === "es"
          ? `<p><strong>Reembolso procesado:</strong> ${escapeHtml(data.refundAmount)} — verás el importe de vuelta en tu tarjeta en 5-10 días laborables, según tu banco.</p>`
          : locale === "fr"
            ? `<p><strong>Remboursement traité :</strong> ${escapeHtml(data.refundAmount)} — le montant sera recrédité sur votre carte sous 5 à 10 jours ouvrables, selon votre banque.</p>`
            : locale === "de"
              ? `<p><strong>Erstattung veranlasst:</strong> ${escapeHtml(data.refundAmount)} — der Betrag wird je nach Bank innerhalb von 5-10 Werktagen auf Ihre Karte zurückgebucht.</p>`
            : `<p><strong>Rimborso processato:</strong> ${escapeHtml(data.refundAmount)} — vedrai l'importo rientrare sulla tua carta entro 5-10 giorni lavorativi, a seconda della tua banca.</p>`
      : locale === "en"
        ? `<p><strong>Refund:</strong> we will contact you by email or phone within 24 hours to arrange the refund or offer a credit for an alternative date.</p>`
        : locale === "es"
          ? `<p><strong>Reembolso:</strong> te contactaremos por email o teléfono en 24 horas para gestionar el reembolso u ofrecerte un crédito para una fecha alternativa.</p>`
          : locale === "fr"
            ? `<p><strong>Remboursement :</strong> nous vous contacterons par email ou téléphone sous 24 heures pour organiser le remboursement ou vous proposer un avoir pour une autre date.</p>`
            : locale === "de"
              ? `<p><strong>Erstattung:</strong> Wir kontaktieren Sie innerhalb von 24 Stunden per E-Mail oder Telefon, um die Erstattung zu organisieren oder ein Guthaben für einen alternativen Termin anzubieten.</p>`
            : `<p><strong>Rimborso:</strong> ti contatteremo entro 24 ore via email o telefono per gestire il rimborso, oppure per offrirti un credito utilizzabile su una data alternativa.</p>`;

  const voucherHtml = data.voucherSoftText
    ? `<p><em>${escapeHtml(data.voucherSoftText)}</em></p>`
    : "";
  const rebookingHtml =
    data.rebookingSuggestions && data.rebookingSuggestions.length > 0
      ? `<p>${locale === "en" ? "Alternative dates" : locale === "es" ? "Fechas alternativas" : locale === "fr" ? "Dates alternatives" : locale === "de" ? "Alternative Termine" : "Date alternative"}:<br>${data.rebookingSuggestions.map((d) => escapeHtml(d)).join("<br>")}</p>`
      : "";

  const html = emailLayout({
    locale,
    heading:
      locale === "en"
        ? `We are truly sorry, ${escapeHtml(data.customerName)}`
        : locale === "es"
          ? `Lo sentimos de verdad, ${escapeHtml(data.customerName)}`
          : locale === "fr"
            ? `Nous sommes sincèrement désolés, ${escapeHtml(data.customerName)}`
            : locale === "de"
              ? `Es tut uns sehr leid, ${escapeHtml(data.customerName)}`
            : `Ci dispiace sinceramente, ${escapeHtml(data.customerName)}`,
    bodyHtml: `
      <p>
        ${
          locale === "en"
            ? `We are sorry to let you know that, after the operational availability check, we cannot confirm booking <strong>${escapeHtml(data.confirmationCode)}</strong> for <strong>${escapeHtml(data.serviceName)}</strong> on <strong>${escapeHtml(data.startDate)}</strong>.`
            : locale === "es"
              ? `Sentimos comunicarte que, tras la verificación operativa de disponibilidad, no podemos confirmar la reserva <strong>${escapeHtml(data.confirmationCode)}</strong> para <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong>.`
              : locale === "fr"
                ? `Nous sommes désolés de vous informer qu'après la vérification opérationnelle des disponibilités, nous ne pouvons pas confirmer la réservation <strong>${escapeHtml(data.confirmationCode)}</strong> pour <strong>${escapeHtml(data.serviceName)}</strong> du <strong>${escapeHtml(data.startDate)}</strong>.`
                : locale === "de"
                  ? `Nach der operativen Verfügbarkeitsprüfung können wir die Buchung <strong>${escapeHtml(data.confirmationCode)}</strong> für <strong>${escapeHtml(data.serviceName)}</strong> am <strong>${escapeHtml(data.startDate)}</strong> leider nicht bestätigen.`
                : `Ci dispiace comunicarti che, a seguito della verifica operativa sulla disponibilita', non possiamo confermare la prenotazione <strong>${escapeHtml(data.confirmationCode)}</strong> per <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong>.`
        }
      </p>
      <p>
        ${
          locale === "en"
            ? "We sincerely apologize for the inconvenience: we want to handle this in the simplest and fastest way possible."
            : locale === "es"
              ? "Te pedimos sinceras disculpas por las molestias: queremos resolverlo de la forma más sencilla y rápida posible."
              : locale === "fr"
                ? "Nous vous présentons nos sincères excuses pour ce désagrément : nous souhaitons gérer la situation de la manière la plus simple et rapide possible."
                : locale === "de"
                  ? "Wir entschuldigen uns aufrichtig für die Unannehmlichkeiten und möchten die Situation so einfach und schnell wie möglich lösen."
                : "Ci scusiamo sinceramente per il disagio: vogliamo gestire la situazione nel modo piu' semplice e rapido possibile."
        }
      </p>
      ${refundHtml}
      ${voucherHtml}${rebookingHtml}
      <h3 style="margin-top:24px">${
        locale === "en"
          ? "How we can help"
          : locale === "es"
            ? "Cómo podemos ayudar"
            : locale === "fr"
              ? "Comment nous pouvons vous aider"
              : locale === "de"
                ? "Wie wir helfen können"
              : "Come possiamo rimediare"
      }</h3>
      <p>
        ${
          locale === "en"
            ? "We are available to help you find an alternative date. Contact us directly and we will reply within a few hours with the best available options."
            : locale === "es"
              ? "Estamos a tu disposición para encontrar una fecha alternativa. Contáctanos directamente y te responderemos en pocas horas con las mejores disponibilidades."
              : locale === "fr"
                ? "Nous sommes à votre disposition pour trouver une date alternative. Contactez-nous directement et nous vous répondrons sous quelques heures avec les disponibilités les plus adaptées."
                : locale === "de"
                  ? "Wir unterstützen Sie gern dabei, einen alternativen Termin zu finden. Kontaktieren Sie uns direkt und wir antworten innerhalb weniger Stunden mit den besten verfügbaren Optionen."
                : "Siamo a tua disposizione per trovare una data alternativa. Contattaci direttamente e ti risponderemo entro poche ore con le disponibilita' piu' adatte."
        }
      </p>
      <p><strong>${locale === "en" ? "Direct email" : locale === "es" ? "Email directo" : locale === "fr" ? "Email direct" : locale === "de" ? "Direkte E-Mail" : "Email diretta"}:</strong> <a href="mailto:${escapeHtml(data.contactEmail)}">${escapeHtml(data.contactEmail)}</a></p>
      ${phoneLine}
      <p style="color: #6b7280; font-size: 14px; margin-top:24px">
        ${
          locale === "en"
            ? "You can use the link below to check your booking details."
            : locale === "es"
              ? "Puedes usar el enlace de abajo para consultar los detalles de tu reserva."
              : locale === "fr"
                ? "Vous pouvez utiliser le lien ci-dessous pour consulter les détails de votre réservation."
                : locale === "de"
                  ? "Über den Link unten können Sie Ihre Buchungsdetails prüfen."
                : "Per consultare i dettagli della prenotazione, puoi usare il link qui sotto."
        }
      </p>
    `,
    ctaText:
      locale === "en"
        ? "Booking details"
        : locale === "es"
          ? "Detalles de la reserva"
          : locale === "fr"
            ? "Détails de la réservation"
            : locale === "de"
              ? "Buchungsdetails"
            : "Dettagli prenotazione",
    ctaUrl: data.bookingUrl,
  });

  const refundText =
    data.refundChannel === "stripe"
      ? locale === "en"
        ? `Refund processed: ${data.refundAmount} (5-10 business days on your card).`
        : locale === "es"
          ? `Reembolso procesado: ${data.refundAmount} (5-10 días laborables en tu tarjeta).`
          : locale === "fr"
            ? `Remboursement traité : ${data.refundAmount} (5 à 10 jours ouvrables sur votre carte).`
            : locale === "de"
              ? `Erstattung veranlasst: ${data.refundAmount} (5-10 Werktage auf Ihrer Karte).`
            : `Rimborso processato: ${data.refundAmount} (5-10 giorni lavorativi sulla tua carta).`
      : locale === "en"
        ? `Refund: we will contact you within 24 hours to arrange the refund or a credit for an alternative date.`
        : locale === "es"
          ? `Reembolso: te contactaremos en 24 horas para gestionar el reembolso o un crédito para una fecha alternativa.`
          : locale === "fr"
            ? `Remboursement : nous vous contacterons sous 24 heures pour organiser le remboursement ou un avoir pour une autre date.`
            : locale === "de"
              ? `Erstattung: Wir kontaktieren Sie innerhalb von 24 Stunden, um die Erstattung oder ein Guthaben für einen alternativen Termin zu organisieren.`
            : `Rimborso: ti contatteremo entro 24 ore per gestire il rimborso o il credito per una data alternativa.`;

  const voucherText = data.voucherSoftText ? `\n\n${data.voucherSoftText}` : "";
  const rebookingText =
    data.rebookingSuggestions && data.rebookingSuggestions.length > 0
      ? `\n\n${locale === "en" ? "Alternatives" : locale === "es" ? "Alternativas" : locale === "fr" ? "Alternatives" : locale === "de" ? "Alternativen" : "Alternative"}: ${data.rebookingSuggestions.join(", ")}`
      : "";

  const text =
    locale === "en"
      ? `${data.customerName}, we are sorry.

We cannot confirm booking ${data.confirmationCode} for ${data.serviceName} on ${data.startDate} after the operational availability check.

${refundText}${voucherText}${rebookingText}

Contact us to find an alternative date:
Email: ${data.contactEmail}${data.contactPhone ? `\nPhone/WhatsApp: ${data.contactPhone}` : ""}

Details: ${data.bookingUrl}`
      : locale === "es"
        ? `${data.customerName}, lo sentimos.

No podemos confirmar la reserva ${data.confirmationCode} para ${data.serviceName} del ${data.startDate} tras la verificación operativa de disponibilidad.

${refundText}${voucherText}${rebookingText}

Contáctanos para encontrar una fecha alternativa:
Email: ${data.contactEmail}${data.contactPhone ? `\nTeléfono/WhatsApp: ${data.contactPhone}` : ""}

Detalles: ${data.bookingUrl}`
        : locale === "fr"
          ? `${data.customerName}, nous sommes désolés.

Nous ne pouvons pas confirmer la réservation ${data.confirmationCode} pour ${data.serviceName} du ${data.startDate} après la vérification opérationnelle des disponibilités.

${refundText}${voucherText}${rebookingText}

Contactez-nous pour trouver une date alternative :
Email: ${data.contactEmail}${data.contactPhone ? `\nTéléphone/WhatsApp: ${data.contactPhone}` : ""}

Détails : ${data.bookingUrl}`
          : locale === "de"
            ? `${data.customerName}, es tut uns leid.

Nach der operativen Verfügbarkeitsprüfung können wir die Buchung ${data.confirmationCode} für ${data.serviceName} am ${data.startDate} leider nicht bestätigen.

${refundText}${voucherText}${rebookingText}

Kontaktieren Sie uns, damit wir einen alternativen Termin finden:
E-Mail: ${data.contactEmail}${data.contactPhone ? `\nTelefon/WhatsApp: ${data.contactPhone}` : ""}

Details: ${data.bookingUrl}`
          : `${data.customerName}, ci dispiace.

Non possiamo confermare la prenotazione ${data.confirmationCode} per ${data.serviceName} del ${data.startDate} dopo la verifica operativa sulla disponibilita'.

${refundText}${voucherText}${rebookingText}

Contattaci per trovare una data alternativa:
Email: ${data.contactEmail}${data.contactPhone ? `\nTelefono/WhatsApp: ${data.contactPhone}` : ""}

Dettagli: ${data.bookingUrl}`;

  return { subject, html, text };
}
