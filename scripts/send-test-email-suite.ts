import "dotenv/config";
import { sendEmailWithResult } from "../src/lib/email/brevo";
import { emailLayout, escapeHtml, safeUrl } from "../src/lib/email/templates/_layout";
import { balanceReminderTemplate } from "../src/lib/email/templates/balance-reminder";
import { bookingConfirmationTemplate } from "../src/lib/email/templates/booking-confirmation";
import { bookingPendingOverrideConfirmationTemplate } from "../src/lib/email/templates/booking-pending-override-confirmation";
import {
  changeRequestApprovedTemplate,
  changeRequestReceivedTemplate,
  changeRequestRejectedTemplate,
  contactAutoReplyTemplate,
  customerCancellationTemplate,
  preDepartureReminderTemplate,
  refundReceiptTemplate,
  reviewRequestTemplate,
} from "../src/lib/email/templates/customer-lifecycle";
import { otpEmailTemplate } from "../src/lib/email/templates/otp";
import { overbookingApologyTemplate } from "../src/lib/email/templates/overbooking-apology";
import { overrideAdminRequestedTemplate } from "../src/lib/email/templates/override-admin-requested";
import { overrideApprovedWinnerTemplate } from "../src/lib/email/templates/override-approved-winner";
import { overrideExpiredTemplate } from "../src/lib/email/templates/override-expired";
import { overrideReconcileFailedAdminTemplate } from "../src/lib/email/templates/override-reconcile-failed-admin";
import { overrideRejectedWinnerTemplate } from "../src/lib/email/templates/override-rejected-winner";
import { overrideSupersededTemplate } from "../src/lib/email/templates/override-superseded";
import { bookingCancelledTemplate } from "../src/lib/notifications/templates/booking-cancelled";
import { doubleBookingTemplate } from "../src/lib/notifications/templates/double-booking";
import { newBookingTemplate } from "../src/lib/notifications/templates/new-booking";
import { paymentFailedTemplate } from "../src/lib/notifications/templates/payment-failed";
import { syncFailureTemplate } from "../src/lib/notifications/templates/sync-failure";
import { weatherAlertTemplate } from "../src/lib/notifications/templates/weather-alert";

type Role = "UTENTE" | "ADMIN";
type Rendered = { subject: string; html: string; text?: string };
type TestEmail = {
  role: Role;
  key: string;
  rendered: Rendered;
  replyTo?: { email: string; name?: string };
};

const recipient = process.argv[2] ?? process.env.TEST_EMAIL_TO;
const filter = process.env.TEST_EMAIL_FILTER ?? process.argv[3];

if (!recipient) {
  console.error("Usage: TEST_EMAIL_TO=you@example.com tsx scripts/send-test-email-suite.ts");
  process.exit(1);
}

const appUrl = process.env.APP_URL ?? "https://egadisailing.com";
const customerName = "Antonio Marino";
const serviceName = "Esperienza Gourmet";
const startDate = "13/05/2026";
const portalUrl = `${appUrl}/it/recupera-prenotazione`;
const ticketUrl = `${appUrl}/it/ticket/ES-TEST01`;
const adminUrl = `${appUrl}/admin/prenotazioni/test`;

function normalize(rendered: Rendered): Rendered {
  return {
    ...rendered,
    html: rendered.html.includes("<html")
      ? rendered.html
      : emailLayout({ heading: rendered.subject, bodyHtml: rendered.html }),
  };
}

function inlineTemplate(subject: string, bodyHtml: string, text: string): Rendered {
  return { subject, html: emailLayout({ heading: subject, bodyHtml }), text };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const emails: TestEmail[] = [
  {
    role: "UTENTE",
    key: "otp-recupero-prenotazione",
    rendered: otpEmailTemplate("123456"),
  },
  {
    role: "UTENTE",
    key: "conferma-prenotazione",
    rendered: bookingConfirmationTemplate({
      customerName,
      confirmationCode: "ES-TEST01",
      serviceName,
      startDate,
      numPeople: 2,
      totalPrice: "2.000,00 EUR - IVA inclusa",
      paidAmount: "600,00 EUR - IVA inclusa",
      balanceAmount: "1.400,00 EUR - IVA inclusa",
      recoveryUrl: portalUrl,
      ticketUrl,
    }),
  },
  {
    role: "UTENTE",
    key: "promemoria-saldo",
    rendered: balanceReminderTemplate({
      customerName,
      confirmationCode: "ES-TEST02",
      serviceName,
      startDate: "12/05/2026",
      balanceAmount: "1.400,00 EUR - IVA inclusa",
    }),
  },
  {
    role: "UTENTE",
    key: "prenotazione-in-attesa-conferma",
    rendered: bookingPendingOverrideConfirmationTemplate({
      customerName,
      confirmationCode: "ES-TEST03",
      serviceName,
      startDate: "14/05/2026",
      numPeople: 4,
      amountPaid: "600,00",
      bookingPortalUrl: portalUrl,
    }),
  },
  {
    role: "UTENTE",
    key: "cancellazione-cliente",
    rendered: customerCancellationTemplate({
      customerName,
      confirmationCode: "ES-TEST04",
      serviceName,
      startDate: "15/05/2026",
      refundAmount: "600,00 EUR",
      retainedAmount: "0,00 EUR",
      policyLabel: "Cancellazione gratuita entro i termini previsti",
      bookingPortalUrl: portalUrl,
      contactEmail: "info@egadisailing.com",
    }),
  },
  {
    role: "UTENTE",
    key: "ricevuta-rimborso-completo",
    rendered: refundReceiptTemplate({
      customerName,
      confirmationCode: "ES-TEST05",
      refundAmount: "600,00 EUR",
      refundType: "full",
      bookingPortalUrl: portalUrl,
    }),
  },
  {
    role: "UTENTE",
    key: "ricevuta-rimborso-parziale",
    rendered: refundReceiptTemplate({
      customerName,
      confirmationCode: "ES-TEST06",
      refundAmount: "250,00 EUR",
      refundType: "partial",
      bookingPortalUrl: portalUrl,
    }),
  },
  {
    role: "UTENTE",
    key: "richiesta-cambio-data-ricevuta",
    rendered: changeRequestReceivedTemplate({
      customerName,
      confirmationCode: "ES-TEST07",
      serviceName,
      originalDate: "13/05/2026",
      requestedDate: "18/05/2026",
      bookingPortalUrl: portalUrl,
    }),
  },
  {
    role: "UTENTE",
    key: "cambio-data-approvato",
    rendered: changeRequestApprovedTemplate({
      customerName,
      confirmationCode: "ES-TEST08",
      serviceName,
      originalDate: "13/05/2026",
      requestedDate: "18/05/2026",
      bookingPortalUrl: portalUrl,
    }),
  },
  {
    role: "UTENTE",
    key: "cambio-data-rifiutato",
    rendered: changeRequestRejectedTemplate({
      customerName,
      confirmationCode: "ES-TEST09",
      serviceName,
      originalDate: "13/05/2026",
      requestedDate: "18/05/2026",
      bookingPortalUrl: portalUrl,
      adminNote: "Data non operativa per condizioni meteo previste.",
    }),
  },
  {
    role: "UTENTE",
    key: "auto-reply-contatti",
    rendered: contactAutoReplyTemplate({
      customerName,
      subject: "Informazioni esperienza gourmet",
    }),
  },
  {
    role: "UTENTE",
    key: "promemoria-partenza",
    rendered: preDepartureReminderTemplate({
      customerName,
      confirmationCode: "ES-TEST10",
      serviceName,
      startDate: "Domani, 10:00",
      balanceAmount: "1.400,00 EUR",
      ticketUrl,
    }),
  },
  {
    role: "UTENTE",
    key: "richiesta-recensione",
    rendered: reviewRequestTemplate({
      customerName,
      serviceName,
    }),
  },
  {
    role: "UTENTE",
    key: "prenotazione-confermata",
    rendered: overrideApprovedWinnerTemplate({
      customerName,
      confirmationCode: "ES-TEST11",
      serviceName,
      startDate: "19/05/2026",
      numPeople: 3,
      bookingPortalUrl: portalUrl,
      contactPhone: "+39 345 971 0696",
    }),
  },
  {
    role: "UTENTE",
    key: "prenotazione-non-confermata-verifica",
    rendered: overrideRejectedWinnerTemplate({
      customerName,
      confirmationCode: "ES-TEST12",
      serviceName,
      startDate: "20/05/2026",
      refundAmount: "600,00",
      alternativeDates: ["21/05/2026", "22/05/2026"],
      bookingPortalUrl: portalUrl,
      contactEmail: "info@egadisailing.com",
    }),
  },
  {
    role: "UTENTE",
    key: "prenotazione-non-confermata-termine",
    rendered: overrideExpiredTemplate({
      customerName,
      confirmationCode: "ES-TEST13",
      serviceName,
      startDate: "20/05/2026",
      refundAmount: "600,00",
      alternativeDates: ["23/05/2026", "24/05/2026"],
      bookingPortalUrl: portalUrl,
    }),
  },
  {
    role: "UTENTE",
    key: "prenotazione-non-confermata",
    rendered: overrideSupersededTemplate({
      customerName,
      confirmationCode: "ES-TEST14",
      serviceName,
      startDate: "20/05/2026",
      refundAmount: "600,00",
      alternativeDates: ["25/05/2026"],
      bookingPortalUrl: portalUrl,
    }),
  },
  {
    role: "UTENTE",
    key: "prenotazione-annullata-rimborso-online",
    rendered: overbookingApologyTemplate({
      customerName,
      confirmationCode: "ES-TEST15",
      serviceName,
      startDate: "21/05/2026",
      refundAmount: "600,00 EUR",
      refundChannel: "stripe",
      contactEmail: "info@egadisailing.com",
      contactPhone: "+39 345 971 0696",
      bookingUrl: portalUrl,
      voucherSoftText: "Per scusarci, ti offriremo un upgrade di benvenuto sulla prossima data confermata.",
      rebookingSuggestions: ["22/05/2026", "23/05/2026"],
    }),
  },
  {
    role: "UTENTE",
    key: "prenotazione-annullata-assistenza",
    rendered: overbookingApologyTemplate({
      customerName,
      confirmationCode: "ES-TEST16",
      serviceName,
      startDate: "21/05/2026",
      refundAmount: "",
      refundChannel: "offline",
      contactEmail: "info@egadisailing.com",
      contactPhone: "+39 345 971 0696",
      bookingUrl: portalUrl,
      rebookingSuggestions: ["24/05/2026"],
    }),
  },
  {
    role: "ADMIN",
    key: "nuova-prenotazione-direct",
    rendered: normalize(newBookingTemplate({
      source: "DIRECT",
      confirmationCode: "ES-ADM01",
      customerName,
      serviceName,
      startDate,
      numPeople: 2,
      totalPrice: "2.000,00 EUR",
    })),
  },
  {
    role: "ADMIN",
    key: "nuova-prenotazione-bokun",
    rendered: normalize(newBookingTemplate({
      source: "BOKUN",
      confirmationCode: "ES-ADM02",
      customerName: "Cliente Bokun Test",
      serviceName: "Barca condivisa giornata intera",
      startDate: "16/05/2026",
      numPeople: 4,
      totalPrice: "480,00 EUR",
    })),
  },
  {
    role: "ADMIN",
    key: "nuova-prenotazione-charter",
    rendered: normalize(newBookingTemplate({
      source: "CHARTER",
      confirmationCode: "ES-ADM03",
      customerName: "Cliente Charter Test",
      serviceName: "Esperienza Charter 3 giorni",
      startDate: "20/05/2026 - 23/05/2026",
      numPeople: 6,
      totalPrice: "5.400,00 EUR",
    })),
  },
  {
    role: "ADMIN",
    key: "prenotazione-cancellata-admin",
    rendered: normalize(bookingCancelledTemplate({
      confirmationCode: "ES-ADM04",
      customerName,
      serviceName,
      startDate,
      source: "DIRECT",
      reason: "Cancellazione richiesta dal cliente in area prenotazioni.",
      refundAmount: "600,00 EUR",
    })),
  },
  {
    role: "ADMIN",
    key: "pagamento-fallito",
    rendered: normalize(paymentFailedTemplate({
      confirmationCode: "ES-ADM05",
      customerName,
      serviceName,
      startDate,
      amount: "600,00 EUR",
      reason: "payment_intent.payment_failed: carta rifiutata",
    })),
  },
  {
    role: "ADMIN",
    key: "sync-failure",
    rendered: normalize(syncFailureTemplate({
      queueName: "availability.bokun",
      jobName: "availability.update",
      jobId: "job-test-123",
      attemptsMade: 5,
      errorCode: "BOKUN_429",
      errorMessage: "Rate limit upstream dopo 5 tentativi",
    })),
  },
  {
    role: "ADMIN",
    key: "weather-alert",
    rendered: normalize(weatherAlertTemplate({
      confirmationCode: "ES-ADM06",
      customerName,
      serviceName,
      startDate,
      risk: "HIGH",
      reasons: ["Vento previsto oltre soglia", "Onda in aumento nel pomeriggio"],
    })),
  },
  {
    role: "ADMIN",
    key: "double-booking",
    rendered: normalize(doubleBookingTemplate({
      newBookingId: "booking-test-id",
      newSource: "BOKUN",
      newConfirmationCode: "ES-ADM07",
      boatId: "trimarano",
      startDate: "2026-05-22",
      endDate: "2026-05-22",
      conflicts: [
        { source: "DIRECT", confirmationCode: "ES-OLD01", status: "CONFIRMED" },
        { source: "BOATAROUND", confirmationCode: "EXT-7788", status: "CONFIRMED" },
      ],
    })),
  },
  {
    role: "ADMIN",
    key: "override-admin-requested",
    rendered: overrideAdminRequestedTemplate({
      confirmationCode: "ES-ADM08",
      customerName,
      customerEmail: recipient,
      serviceName,
      startDate,
      numPeople: 2,
      newRevenue: "2000.00",
      conflictRevenue: "1200.00",
      conflictSources: ["BOKUN", "DIRECT"],
      dropDeadAt: "09/05/2026 18:00",
      adminDetailUrl: adminUrl,
    }),
  },
  {
    role: "ADMIN",
    key: "override-reconcile-failed",
    rendered: overrideReconcileFailedAdminTemplate({
      overrideRequestId: "ovr_test_123",
      newBookingCode: "ES-ADM09",
      upstreamConflicts: [
        { bookingId: "bk_1", channel: "BOKUN", externalRef: "BOK-123", status: "CONFIRMED" },
        { bookingId: "bk_2", channel: "VIATOR", externalRef: "VIA-456", status: "CONFIRMED" },
      ],
      overrideDetailUrl: `${appUrl}/admin/override-requests/ovr_test_123`,
    }),
  },
  {
    role: "ADMIN",
    key: "change-requested-admin-inline",
    rendered: inlineTemplate(
      "Richiesta cambio data ES-ADM10",
      `
        <p><strong>Prenotazione:</strong> ES-ADM10</p>
        <p><strong>Cliente:</strong> ${escapeHtml(customerName)}</p>
        <p><strong>Esperienza:</strong> ${escapeHtml(serviceName)}</p>
        <p><strong>Data attuale:</strong> 13/05/2026</p>
        <p><strong>Data richiesta:</strong> 18/05/2026</p>
        <p><strong>Nota:</strong> Preferirebbe partire al mattino.</p>
        <p><a href="${safeUrl(adminUrl)}">Apri richiesta in admin</a></p>
      `,
      "Richiesta cambio data ES-ADM10\nCliente: Antonio Marino\nData richiesta: 18/05/2026",
    ),
  },
  {
    role: "ADMIN",
    key: "override-reminder-inline",
    rendered: inlineTemplate(
      "Reminder override PENDING ES-ADM11",
      "<p>Override request pending level 2. Decisione richiesta.</p>",
      "Override reminder level 2: ES-ADM11",
    ),
  },
  {
    role: "ADMIN",
    key: "cross-channel-conflict-inline",
    rendered: inlineTemplate(
      "ManualAlert: cross-channel conflict",
      "<p>Cross-channel conflict detected on boat <strong>trimarano</strong> date 2026-05-24.</p>",
      "Cross-channel conflict trimarano 2026-05-24",
    ),
  },
  {
    role: "ADMIN",
    key: "contact-message-admin",
    replyTo: { email: recipient, name: customerName },
    rendered: inlineTemplate(
      "[Contatti] Informazioni esperienza gourmet",
      `
        <h2>Nuovo messaggio dal sito</h2>
        <p><strong>Da:</strong> ${escapeHtml(customerName)} &lt;${escapeHtml(recipient)}&gt;</p>
        <p><strong>Telefono:</strong> +39 320 000 0000</p>
        <p><strong>Oggetto:</strong> Informazioni esperienza gourmet</p>
        <hr />
        <p style="white-space: pre-wrap">Ciao, vorrei informazioni sull'esperienza gourmet e sul saldo in loco.</p>
      `,
      "Da: Antonio Marino <iakaofficial@gmail.com>\nCiao, vorrei informazioni sull'esperienza gourmet e sul saldo in loco.",
    ),
  },
];

async function main() {
  const selectedEmails = filter
    ? emails.filter((item) => {
        const normalizedFilter = filter.toLowerCase();
        return item.key.toLowerCase() === normalizedFilter || item.role.toLowerCase() === normalizedFilter;
      })
    : emails;

  if (selectedEmails.length === 0) {
    throw new Error(`No test emails matched filter: ${filter}`);
  }

  let sent = 0;
  for (let index = 0; index < selectedEmails.length; index += 1) {
    const item = selectedEmails[index];
    const n = String(index + 1).padStart(2, "0");
    const subject = `[TEST ${item.role} ${n}/${selectedEmails.length}] ${item.rendered.subject}`;
    const result = await sendEmailWithResult({
      to: recipient,
      toName: item.role === "ADMIN" ? "Admin Egadisailing Test" : customerName,
      subject,
      htmlContent: item.rendered.html,
      textContent: `[TEST ${item.role}] ${item.key}\n\n${item.rendered.text ?? item.rendered.subject}`,
      replyTo: item.replyTo,
    });
    if (!result.delivered) throw new Error(`Delivery skipped for ${item.key}`);
    sent += 1;
    console.log(`sent ${n}/${selectedEmails.length} ${item.role} ${item.key}`);
    await sleep(250);
  }

  console.log(`DONE sent=${sent} to=${recipient}`);
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
