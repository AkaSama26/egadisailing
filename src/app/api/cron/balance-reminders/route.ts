import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createBalancePaymentLink } from "@/lib/booking/balance-link";
import { sendEmail } from "@/lib/email/brevo";
import { balanceReminderTemplate } from "@/lib/email/templates/balance-reminder";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { formatEur } from "@/lib/pricing/cents";
import { toUtcDay, addDays } from "@/lib/dates";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";

export const runtime = "nodejs";

/**
 * Cron quotidiano: invia payment link per il saldo di booking con experienza
 * tra ~7 giorni e balanceReminderSentAt null.
 *
 * Claim-then-do: updateMany guard su balanceReminderSentAt=null prima di
 * creare il link Stripe. Se un'altra istanza ha gia' claimato, count=0 e
 * skippiamo → no doppio invio anche se il cron parte 2 volte.
 */
export const GET = withErrorHandler(async (req: Request) => {
  requireBearerSecret(req, env.CRON_SECRET);

  const today = toUtcDay(new Date());
  const sevenDaysFrom = addDays(today, 7);
  const eightDaysFrom = addDays(today, 8);

  const candidates = await db.booking.findMany({
    where: {
      source: "DIRECT",
      status: "CONFIRMED",
      startDate: { gte: sevenDaysFrom, lt: eightDaysFrom },
      directBooking: {
        paymentSchedule: "DEPOSIT_BALANCE",
        balancePaidAt: null,
        balanceReminderSentAt: null,
      },
    },
    include: { customer: true, service: true, directBooking: true },
  });

  const results: Array<{ bookingId: string; sent: boolean; error?: string }> = [];

  for (const b of candidates) {
    try {
      // Claim-then-do: solo chi vince l'updateMany (count=1) procede.
      const claim = await db.directBooking.updateMany({
        where: { bookingId: b.id, balanceReminderSentAt: null },
        data: { balanceReminderSentAt: new Date() },
      });
      if (claim.count === 0) {
        results.push({ bookingId: b.id, sent: false, error: "already claimed" });
        continue;
      }

      const link = await createBalancePaymentLink(b.id);
      const { subject, html, text } = balanceReminderTemplate({
        customerName: `${b.customer.firstName} ${b.customer.lastName}`,
        confirmationCode: b.confirmationCode,
        serviceName: b.service.name,
        startDate: b.startDate.toLocaleDateString("it-IT"),
        balanceAmount: formatEur(b.directBooking!.balanceAmount!),
        paymentLinkUrl: link,
      });
      await sendEmail({
        to: b.customer.email,
        toName: `${b.customer.firstName} ${b.customer.lastName}`,
        subject,
        htmlContent: html,
        textContent: text,
      });
      results.push({ bookingId: b.id, sent: true });
    } catch (err) {
      logger.error({ err, bookingId: b.id }, "Balance reminder failed");
      // Release claim per retry futuro (altrimenti il booking e' "morto")
      await db.directBooking
        .update({
          where: { bookingId: b.id },
          data: { balanceReminderSentAt: null },
        })
        .catch(() => {});
      results.push({ bookingId: b.id, sent: false, error: "send_failed" });
    }
  }

  return NextResponse.json({ processed: candidates.length, results });
});
