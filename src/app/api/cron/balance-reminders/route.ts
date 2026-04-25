import { db } from "@/lib/db";
import { createBalancePaymentLink } from "@/lib/booking/balance-link";
import { sendEmail } from "@/lib/email/brevo";
import { balanceReminderTemplate } from "@/lib/email/templates/balance-reminder";
import { logger } from "@/lib/logger";
import { formatEur } from "@/lib/pricing/cents";
import { parseDateLikelyLocalDay, addDays } from "@/lib/dates";
import { withCronGuard } from "@/lib/http/with-cron-guard";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { formatItDay } from "@/lib/dates";
import { bookingWithDetailsInclude } from "@/lib/booking/queries";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { swallow } from "@/lib/result";

export const runtime = "nodejs";

/**
 * Cron quotidiano: invia payment link per il saldo di booking con experienza
 * tra ~7 giorni e balanceReminderSentAt null.
 *
 * Claim-then-do: updateMany guard su balanceReminderSentAt=null prima di
 * creare il link Stripe. Se un'altra istanza ha gia' claimato, count=0 e
 * skippiamo → no doppio invio anche se il cron parte 2 volte.
 *
 * R14-Area2: lease cross-replica via withCronGuard. node-cron fires per pod;
 * senza lease, un deploy multi-replica inviava doppio reminder al cliente
 * (il claim updateMany di sotto dedupliea, ma intanto 2 link Stripe venivano
 * creati prima del claim).
 */
export const GET = withCronGuard(
  {
    scope: RATE_LIMIT_SCOPES.BALANCE_REMINDERS_CRON_IP,
    leaseKey: LEASE_KEYS.BALANCE_REMINDERS,
    leaseTtlSeconds: 10 * 60,
  },
  async (_req, _ctx) => {
    // R22-A4-CRITICA-1: `parseDateLikelyLocalDay(new Date())` invece di
    // `toUtcDay` → allinea con `Booking.startDate` stored come UTC midnight
    // del day Europe/Rome. Evita drift ai margini (cron 00:30 Rome vs UTC).
    const today = parseDateLikelyLocalDay(new Date());
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
      include: bookingWithDetailsInclude,
    });

    const results: Array<{ bookingId: string; sent: boolean; error?: string }> = [];

    for (const b of candidates) {
      try {
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
          startDate: formatItDay(b.startDate),
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
        logger.error({ err: (err as Error).message, bookingId: b.id }, "Balance reminder failed");
        await db.directBooking
          .update({
            where: { bookingId: b.id },
            data: { balanceReminderSentAt: null },
          })
          .catch(swallow("balance-reminder reset balanceReminderSentAt", { bookingId: b.id }));
        results.push({ bookingId: b.id, sent: false, error: "send_failed" });
      }
    }

    return { processed: candidates.length, results };
  },
);
