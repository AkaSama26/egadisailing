import { emailLayout, escapeHtml } from "./_layout";
import { resolveEmailLocale } from "./locale";

export interface BalanceReminderData {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  balanceAmount: string;
  locale?: string | null;
}

export function balanceReminderTemplate(data: BalanceReminderData) {
  const locale = resolveEmailLocale(data.locale);
  const subject =
    locale === "en"
      ? `On-site balance reminder · ${data.confirmationCode} Egadisailing`
      : locale === "es"
        ? `Recordatorio de saldo en el lugar · ${data.confirmationCode} Egadisailing`
        : locale === "fr"
          ? `Rappel du solde sur place · ${data.confirmationCode} Egadisailing`
          : locale === "de"
            ? `Erinnerung an Restzahlung vor Ort · ${data.confirmationCode} Egadisailing`
          : `Promemoria saldo in loco · ${data.confirmationCode} Egadisailing`;
  const heading =
    locale === "en"
      ? `Hello ${escapeHtml(data.customerName)}, only the balance is left`
      : locale === "es"
        ? `Hola ${escapeHtml(data.customerName)}, solo falta el saldo`
        : locale === "fr"
          ? `Bonjour ${escapeHtml(data.customerName)}, il ne reste que le solde`
          : locale === "de"
            ? `Guten Tag ${escapeHtml(data.customerName)}, es fehlt nur noch der Restbetrag`
          : `Ciao ${escapeHtml(data.customerName)}, manca solo il saldo`;
  const body =
    locale === "en"
      ? `
      <p>Your experience <strong>${escapeHtml(data.serviceName)}</strong> on <strong>${escapeHtml(data.startDate)}</strong> is getting closer.</p>
      <p><strong>Balance to be paid on site: ${escapeHtml(data.balanceAmount)}</strong></p>
      <p style="color: #6b7280; font-size: 14px;">The remaining balance is paid on site before departure.</p>
    `
      : locale === "es"
        ? `
      <p>Tu experiencia <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong> se acerca.</p>
      <p><strong>Saldo pendiente a pagar en el lugar: ${escapeHtml(data.balanceAmount)}</strong></p>
      <p style="color: #6b7280; font-size: 14px;">El saldo restante se paga en el lugar antes de la salida.</p>
    `
        : locale === "fr"
          ? `
      <p>Votre expérience <strong>${escapeHtml(data.serviceName)}</strong> du <strong>${escapeHtml(data.startDate)}</strong> approche.</p>
      <p><strong>Solde à régler sur place : ${escapeHtml(data.balanceAmount)}</strong></p>
      <p style="color: #6b7280; font-size: 14px;">Le solde restant est réglé sur place avant le départ.</p>
    `
          : locale === "de"
            ? `
      <p>Ihr Erlebnis <strong>${escapeHtml(data.serviceName)}</strong> am <strong>${escapeHtml(data.startDate)}</strong> rückt näher.</p>
      <p><strong>Restbetrag vor Ort zu zahlen: ${escapeHtml(data.balanceAmount)}</strong></p>
      <p style="color: #6b7280; font-size: 14px;">Der verbleibende Restbetrag wird vor Ort vor der Abfahrt bezahlt.</p>
    `
          : `
      <p>La tua esperienza <strong>${escapeHtml(data.serviceName)}</strong> del <strong>${escapeHtml(data.startDate)}</strong> si avvicina.</p>
      <p><strong>Saldo da pagare in loco: ${escapeHtml(data.balanceAmount)}</strong></p>
      <p style="color: #6b7280; font-size: 14px;">Il saldo restante si paga in loco prima della partenza.</p>
    `;
  const html = emailLayout({
    locale,
    heading,
    bodyHtml: body,
  });

  const text =
    locale === "en"
      ? `${data.customerName}, the balance is due for ${data.serviceName} on ${data.startDate}.\nBalance to be paid on site: ${data.balanceAmount}\nThe remaining balance is paid on site before departure.`
      : locale === "es"
        ? `${data.customerName}, falta el saldo para ${data.serviceName} del ${data.startDate}.\nSaldo pendiente a pagar en el lugar: ${data.balanceAmount}\nEl saldo restante se paga en el lugar antes de la salida.`
        : locale === "fr"
          ? `${data.customerName}, il reste le solde pour ${data.serviceName} du ${data.startDate}.\nSolde à régler sur place : ${data.balanceAmount}\nLe solde restant est réglé sur place avant le départ.`
          : locale === "de"
            ? `${data.customerName}, für ${data.serviceName} am ${data.startDate} ist noch der Restbetrag offen.\nRestbetrag vor Ort zu zahlen: ${data.balanceAmount}\nDer verbleibende Restbetrag wird vor Ort vor der Abfahrt bezahlt.`
          : `${data.customerName}, manca il saldo per ${data.serviceName} del ${data.startDate}.\nSaldo da pagare in loco: ${data.balanceAmount}\nIl saldo restante si paga in loco prima della partenza.`;

  return { subject, html, text };
}
