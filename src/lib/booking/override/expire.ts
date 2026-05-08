"use server";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { postCommitCancelBooking } from "../post-commit-cancel";
import { dispatchNotification, toDispatchResult } from "@/lib/notifications/dispatcher";
import { getAlternativeDatesIso } from "../alternative-dates";
import { localizedAbsoluteUrl } from "@/lib/i18n/paths";
import { emailServiceName, formatEmailDay, resolveEmailLocale } from "@/lib/email/templates/locale";
import { formatEur } from "@/lib/pricing/cents";

export interface ExpireDropDeadResult {
  expired: number;
  refundFailures: number;
  emailFailures: number;
}

/**
 * Cron helper §8.2: auto-expire PENDING OverrideRequest con dropDeadAt passato.
 * Cancella newBooking + refund + release + email al customer.
 * Batch 50/run per safety — chiamato ogni ora dal cron scheduler.
 */
export async function expireDropDeadRequests(): Promise<ExpireDropDeadResult> {
  const now = new Date();
  const toExpire = await db.overrideRequest.findMany({
    where: {
      status: "PENDING",
      dropDeadAt: { lte: now },
    },
    select: { id: true },
    take: 50,
  });

  let expiredCount = 0;
  let refundFailures = 0;
  let emailFailures = 0;

  for (const { id } of toExpire) {
    try {
      // DB tx: mark EXPIRED + cancel newBooking (atomic)
      const req = await db.$transaction(async (tx) => {
        await tx.overrideRequest.update({
          where: { id },
          data: {
            status: "EXPIRED",
            decidedAt: now,
            decisionNotes: "auto-expired at 15-day cutoff",
          },
        });
        const r = await tx.overrideRequest.findUniqueOrThrow({
          where: { id },
          select: {
            newBookingId: true,
            newBooking: {
              select: {
                boatId: true,
                startDate: true,
                confirmationCode: true,
                totalPrice: true,
                customer: { select: { email: true, firstName: true, lastName: true, language: true } },
                service: { select: { id: true, name: true } },
              },
            },
          },
        });
        await tx.booking.update({
          where: { id: r.newBookingId },
          data: { status: "CANCELLED", claimsAvailability: false },
        });
        return r;
      });

      // Post-commit: refund + release + audit via helper
      const cancelOutcome = await postCommitCancelBooking({
        bookingId: req.newBookingId,
        actorUserId: null,
        reason: "override_expired",
      });
      if (cancelOutcome.status === "partial") {
        refundFailures += cancelOutcome.errors.filter((e) => e.kind === "refund").length;
      }

      // Email customer expired via dispatcher (template override-expired)
      if (req.newBooking.customer?.email) {
        try {
          const alternativeDates = await getAlternativeDatesIso(
            req.newBooking.boatId,
            req.newBooking.startDate,
            3,
          );
          const locale = resolveEmailLocale(req.newBooking.customer.language);
          const outcome = await dispatchNotification({
            type: "OVERRIDE_EXPIRED",
            channels: ["EMAIL"],
            recipientEmail: req.newBooking.customer.email,
            recipientName:
              `${req.newBooking.customer.firstName ?? ""} ${req.newBooking.customer.lastName ?? ""}`.trim() ||
              undefined,
            bookingId: req.newBookingId,
            emailIdempotencyKey: `override-expired:${id}`,
            payload: {
              customerName:
                `${req.newBooking.customer.firstName ?? ""} ${req.newBooking.customer.lastName ?? ""}`.trim() ||
                "cliente",
              confirmationCode: req.newBooking.confirmationCode,
              serviceName: emailServiceName(
                req.newBooking.service?.id,
                req.newBooking.service?.name,
                locale,
              ),
              startDate: formatEmailDay(req.newBooking.startDate, locale),
              refundAmount: formatEur(req.newBooking.totalPrice ?? "0.00", locale),
              alternativeDates,
              bookingPortalUrl: localizedAbsoluteUrl(env.APP_URL, locale, "/b/sessione"),
              locale,
            } as unknown as Record<string, unknown>,
          });
          const result = toDispatchResult(outcome);
          if (!result.emailOk) emailFailures++;
        } catch (err) {
          emailFailures++;
          logger.error({ err, requestId: id }, "expireDropDead: dispatch OVERRIDE_EXPIRED failed");
        }
      }

      expiredCount++;
    } catch (err) {
      logger.error({ err, requestId: id }, "expireDropDeadRequests iteration failed");
    }
  }

  return { expired: expiredCount, refundFailures, emailFailures };
}
