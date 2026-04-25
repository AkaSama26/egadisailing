"use server";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { postCommitCancelBooking } from "../post-commit-cancel";
import { dispatchNotification, toDispatchResult } from "@/lib/notifications/dispatcher";
import { getAlternativeDatesIso } from "../alternative-dates";

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
                customer: { select: { email: true, firstName: true, lastName: true } },
                service: { select: { name: true } },
              },
            },
          },
        });
        await tx.booking.update({
          where: { id: r.newBookingId },
          data: { status: "CANCELLED" },
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
          const outcome = await dispatchNotification({
            type: "OVERRIDE_EXPIRED",
            channels: ["EMAIL"],
            payload: {
              customerName:
                `${req.newBooking.customer.firstName ?? ""} ${req.newBooking.customer.lastName ?? ""}`.trim() ||
                "cliente",
              confirmationCode: req.newBooking.confirmationCode,
              serviceName: req.newBooking.service?.name ?? "",
              startDate: req.newBooking.startDate.toISOString().slice(0, 10),
              refundAmount: req.newBooking.totalPrice?.toFixed(2) ?? "0.00",
              alternativeDates,
              bookingPortalUrl: `${env.APP_URL}/b/sessione`,
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
