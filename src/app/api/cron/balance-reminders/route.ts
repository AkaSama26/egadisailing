import { logger } from "@/lib/logger";
import { withCronGuard } from "@/lib/http/with-cron-guard";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { db } from "@/lib/db";
import { addDays, formatItDay, parseDateLikelyLocalDay } from "@/lib/dates";
import {
  preDepartureReminderTemplate,
  reviewRequestTemplate,
} from "@/lib/email/templates/customer-lifecycle";
import {
  buildEmailIdempotencyKey,
  enqueueTransactionalEmail,
} from "@/lib/email/outbox";
import { formatEur } from "@/lib/pricing/cents";
import { buildTicketUrl } from "@/lib/booking/ticket";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Saldo solo in loco.
 * Il cron non genera link Stripe: invia solo promemoria operativo prima
 * della partenza e richiesta recensione post-esperienza.
 */
export const GET = withCronGuard(
  {
    scope: RATE_LIMIT_SCOPES.BALANCE_REMINDERS_CRON_IP,
    leaseKey: LEASE_KEYS.BALANCE_REMINDERS,
    leaseTtlSeconds: 10 * 60,
  },
  async () => {
    const today = parseDateLikelyLocalDay(new Date());
    const reminderUntil = addDays(today, 2);
    const reviewFrom = addDays(today, -7);
    const reviewTo = addDays(today, -1);

    const reminders = await db.booking.findMany({
      where: {
        source: "DIRECT",
        status: "CONFIRMED",
        startDate: { gte: today, lte: reminderUntil },
        directBooking: {
          is: {
            balanceAmount: { not: null },
            balancePaidAt: null,
            balanceReminderSentAt: null,
          },
        },
      },
      include: {
        customer: true,
        service: { select: { name: true } },
        directBooking: true,
      },
      take: 100,
    });

    let reminderQueued = 0;
    for (const booking of reminders) {
      const customerName = `${booking.customer.firstName} ${booking.customer.lastName}`.trim();
      const tpl = preDepartureReminderTemplate({
        customerName,
        confirmationCode: booking.confirmationCode,
        serviceName: booking.service.name,
        startDate: formatItDay(booking.startDate),
        balanceAmount: booking.directBooking?.balanceAmount
          ? formatEur(booking.directBooking.balanceAmount)
          : undefined,
        ticketUrl: buildTicketUrl(booking.confirmationCode),
      });
      const result = await enqueueTransactionalEmail({
        templateKey: "customer.pre-departure-reminder",
        recipientEmail: booking.customer.email,
        recipientName: customerName,
        subject: tpl.subject,
        htmlContent: tpl.html,
        textContent: tpl.text,
        bookingId: booking.id,
        customerId: booking.customerId,
        payload: {
          confirmationCode: booking.confirmationCode,
          startDate: booking.startDate.toISOString().slice(0, 10),
          balanceAmount: booking.directBooking?.balanceAmount?.toFixed(2) ?? null,
        },
        idempotencyKey: buildEmailIdempotencyKey(["pre-departure", booking.id]),
      });
      if (result.accepted) {
        await db.directBooking.update({
          where: { bookingId: booking.id },
          data: { balanceReminderSentAt: new Date() },
        });
        reminderQueued++;
      }
    }

    const reviewBookings = await db.booking.findMany({
      where: {
        status: "CONFIRMED",
        endDate: { gte: reviewFrom, lte: reviewTo },
        emailOutboxEntries: {
          none: { templateKey: "customer.review-request" },
        },
      },
      include: {
        customer: true,
        service: { select: { name: true } },
      },
      take: 100,
    });

    let reviewQueued = 0;
    for (const booking of reviewBookings) {
      const customerName = `${booking.customer.firstName} ${booking.customer.lastName}`.trim();
      const tpl = reviewRequestTemplate({
        customerName,
        serviceName: booking.service.name,
        reviewUrl: env.APP_URL,
      });
      const result = await enqueueTransactionalEmail({
        templateKey: "customer.review-request",
        recipientEmail: booking.customer.email,
        recipientName: customerName,
        subject: tpl.subject,
        htmlContent: tpl.html,
        textContent: tpl.text,
        bookingId: booking.id,
        customerId: booking.customerId,
        payload: {
          confirmationCode: booking.confirmationCode,
          serviceName: booking.service.name,
        },
        idempotencyKey: buildEmailIdempotencyKey(["review-request", booking.id]),
      });
      if (result.accepted) reviewQueued++;
    }

    logger.info({ reminderQueued, reviewQueued }, "pre-departure/review email cron completed");
    return { reminderQueued, reviewQueued };
  },
);
