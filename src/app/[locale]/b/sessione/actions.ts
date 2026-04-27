"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { revokeBookingSession } from "@/lib/session/create";
import { getBookingSession } from "@/lib/session/verify";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import {
  reconcileBoatDatesFromActiveBookings,
  releaseBookingDates,
} from "@/lib/availability/service";
import { CHANNELS } from "@/lib/channels";
import { parseDateLikelyLocalDay } from "@/lib/dates";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { deriveEndDate } from "@/lib/booking/helpers";
import { isBoatSharedServiceType } from "@/lib/booking/boat-slot-availability";
import { computeCustomerCancellationPolicy } from "@/lib/booking/cancellation-policy";
import {
  cancelPaymentIntent,
  getChargeRefundState,
  refundPayment,
} from "@/lib/stripe/payment-intents";
import { fromCents } from "@/lib/pricing/cents";
import { logger } from "@/lib/logger";

export async function logout(): Promise<void> {
  await revokeBookingSession();
  redirect(`/${env.APP_LOCALES_DEFAULT}/recupera-prenotazione`);
}

const bookingIdSchema = z.string().min(1);
const rescheduleSchema = z.object({
  bookingId: z.string().min(1),
  newDate: z.string().min(1),
  note: z.string().max(1000).optional(),
});

export async function cancelCustomerBooking(bookingId: string): Promise<void> {
  const session = await requireBookingSession();
  const id = bookingIdSchema.parse(bookingId);

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      customer: { select: { email: true } },
      directBooking: true,
      payments: true,
      service: { select: { type: true } },
    },
  });
  if (!booking || booking.customer.email !== session.email) {
    throw new NotFoundError("Booking", id);
  }
  if (booking.source !== "DIRECT") {
    throw new ValidationError(
      "Le prenotazioni da portali esterni vanno cancellate dal portale di acquisto.",
    );
  }
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw new ValidationError("Questa prenotazione non puo' essere cancellata.");
  }

  if (booking.directBooking?.stripePaymentIntentId && booking.status === "PENDING") {
    try {
      await cancelPaymentIntent(booking.directBooking.stripePaymentIntentId);
    } catch (err) {
      logger.warn(
        { err, bookingId: booking.id },
        "Customer cancellation: PaymentIntent cancel failed, continuing with booking cancellation",
      );
    }
  }

  const policy = computeCustomerCancellationPolicy(
    booking.cancellationPolicyAnchorDate ?? booking.startDate,
  );
  const refundErrors: Array<{ paymentId: string; message: string }> = [];
  let refundedCents = 0;
  let retainedCents = 0;

  for (const payment of booking.payments) {
    if (
      payment.status !== "SUCCEEDED" ||
      payment.type === "REFUND" ||
      payment.method !== "STRIPE" ||
      !payment.stripeChargeId
    ) {
      continue;
    }

    try {
      const state = await getChargeRefundState(payment.stripeChargeId);
      const targetRefundCents = Math.floor(
        state.totalCents * policy.refundMultiplier.toNumber(),
      );
      const amountToRefundCents = Math.max(
        0,
        Math.min(state.residualCents, targetRefundCents - state.refundedCents),
      );

      if (amountToRefundCents <= 0) {
        retainedCents += state.residualCents;
        continue;
      }

      const refund = await refundPayment(payment.stripeChargeId, amountToRefundCents);
      await db.payment.create({
        data: {
          bookingId: booking.id,
          amount: fromCents(amountToRefundCents).toFixed(2),
          currency: payment.currency,
          type: "REFUND",
          method: "STRIPE",
          status: "REFUNDED",
          stripeRefundId: refund.id,
          processedAt: new Date(),
          note: `Customer cancellation · policy=${policy.band} · originalPayment=${payment.id}`,
        },
      });
      if (state.residualCents - amountToRefundCents <= 0) {
        await db.payment.update({
          where: { id: payment.id },
          data: { status: "REFUNDED" },
        });
      }
      refundedCents += amountToRefundCents;
      retainedCents += Math.max(0, state.residualCents - amountToRefundCents);
    } catch (err) {
      refundErrors.push({ paymentId: payment.id, message: (err as Error).message });
      logger.error({ err, bookingId: booking.id, paymentId: payment.id }, "Customer cancellation refund failed");
    }
  }

  if (refundErrors.length > 0) {
    throw new ValidationError(
      "Rimborso non riuscito. Contattaci per completare la cancellazione.",
      { refundErrors },
    );
  }

  await db.booking.update({
    where: { id: booking.id },
    data: { status: refundedCents > 0 && retainedCents === 0 ? "REFUNDED" : "CANCELLED" },
  });

  if (isBoatSharedServiceType(booking.service.type)) {
    await reconcileBoatDatesFromActiveBookings({
      boatId: booking.boatId,
      startDate: booking.startDate,
      endDate: booking.endDate,
      sourceChannel: CHANNELS.DIRECT,
    });
  } else {
    await releaseBookingDates({
      bookingId: booking.id,
      boatId: booking.boatId,
      startDate: booking.startDate,
      endDate: booking.endDate,
      sourceChannel: CHANNELS.DIRECT,
    });
  }

  await auditLog({
    action: AUDIT_ACTIONS.CUSTOMER_CANCEL,
    entity: "Booking",
    entityId: booking.id,
    before: { status: booking.status },
    after: {
      status: refundedCents > 0 && retainedCents === 0 ? "REFUNDED" : "CANCELLED",
      policyBand: policy.band,
      daysUntilStart: policy.daysUntilStart,
      refundedCents,
      retainedCents,
    },
  });

  revalidatePath(`/${env.APP_LOCALES_DEFAULT}/b/sessione`);
}

export async function requestCustomerReschedule(formData: FormData): Promise<void> {
  const session = await requireBookingSession();
  const input = rescheduleSchema.parse({
    bookingId: formData.get("bookingId"),
    newDate: formData.get("newDate"),
    note: formData.get("note") || undefined,
  });
  const newStartDate = parseDateLikelyLocalDay(input.newDate);

  const booking = await db.booking.findUnique({
    where: { id: input.bookingId },
    include: {
      customer: { select: { email: true } },
      service: true,
    },
  });
  if (!booking || booking.customer.email !== session.email) {
    throw new NotFoundError("Booking", input.bookingId);
  }
  if (booking.source !== "DIRECT") {
    throw new ValidationError(
      "Le prenotazioni da portali esterni vanno modificate dal portale di acquisto.",
    );
  }
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw new ValidationError("Questa prenotazione non puo' essere modificata.");
  }
  if (newStartDate < parseDateLikelyLocalDay(new Date().toISOString().slice(0, 10))) {
    throw new ValidationError("La nuova data non puo' essere nel passato.");
  }

  const oldStartDate = booking.startDate;
  const oldEndDate = booking.endDate;
  const newEndDate = deriveEndDate(
    newStartDate,
    booking.service.durationType,
    booking.service.durationHours,
  );

  if (
    oldStartDate.getTime() === newStartDate.getTime() &&
    oldEndDate.getTime() === newEndDate.getTime()
  ) {
    return;
  }

  const existing = await db.bookingChangeRequest.findFirst({
    where: { bookingId: booking.id, status: "PENDING" },
  });
  const data = {
    originalStartDate: oldStartDate,
    originalEndDate: oldEndDate,
    requestedStartDate: newStartDate,
    requestedEndDate: newEndDate,
    customerNote: input.note?.trim() || null,
  };
  const request = existing
    ? await db.bookingChangeRequest.update({
        where: { id: existing.id },
        data,
      })
    : await db.bookingChangeRequest.create({
        data: {
          bookingId: booking.id,
          ...data,
        },
      });

  await auditLog({
    action: AUDIT_ACTIONS.CUSTOMER_RESCHEDULE_REQUESTED,
    entity: "BookingChangeRequest",
    entityId: request.id,
    before: {
      startDate: oldStartDate.toISOString().slice(0, 10),
      endDate: oldEndDate.toISOString().slice(0, 10),
    },
    after: {
      startDate: newStartDate.toISOString().slice(0, 10),
      endDate: newEndDate.toISOString().slice(0, 10),
      bookingId: booking.id,
      status: "PENDING",
    },
  });

  revalidatePath(`/${env.APP_LOCALES_DEFAULT}/b/sessione`);
}

async function requireBookingSession(): Promise<{ email: string }> {
  const session = await getBookingSession();
  if (!session) {
    redirect(`/${env.APP_LOCALES_DEFAULT}/recupera-prenotazione`);
  }
  return session;
}
