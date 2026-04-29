"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { auditLog } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { computeCustomerCancellationPolicy } from "@/lib/booking/cancellation-policy";
import {
  acquireRescheduleAvailabilityLocks,
  applyBookingReschedule,
  checkRescheduleAvailability,
} from "@/lib/booking/reschedule";
import { acquireTxAdvisoryLock } from "@/lib/db/advisory-lock";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import {
  changeRequestApprovedTemplate,
  changeRequestRejectedTemplate,
} from "@/lib/email/templates/customer-lifecycle";
import {
  buildEmailIdempotencyKey,
  enqueueTransactionalEmail,
} from "@/lib/email/outbox";
import { formatItDay } from "@/lib/dates";

const requestIdSchema = z.string().min(1);

const rejectSchema = z.object({
  requestId: z.string().min(1),
  adminNote: z.string().max(1000).optional(),
});

export async function approveChangeRequest(formData: FormData): Promise<void> {
  const { userId } = await requireAdmin();
  const requestId = requestIdSchema.parse(formData.get("requestId"));

  const approved = await db.$transaction(async (tx) => {
    await acquireTxAdvisoryLock(tx, "booking-change-request", requestId);

    const request = await tx.bookingChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        booking: {
          include: {
            service: true,
            customer: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!request) throw new NotFoundError("BookingChangeRequest", requestId);
    if (request.status !== "PENDING") {
      throw new ValidationError("Questa richiesta e' gia' stata decisa.");
    }

    const booking = request.booking;
    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      throw new ValidationError("La prenotazione non puo' essere modificata.");
    }

    await acquireRescheduleAvailabilityLocks(tx, {
      boatId: booking.boatId,
      oldStartDate: booking.startDate,
      oldEndDate: booking.endDate,
      newStartDate: request.requestedStartDate,
      newEndDate: request.requestedEndDate,
    });

    const availability = await checkRescheduleAvailability(
      {
        bookingId: booking.id,
        boatId: booking.boatId,
        service: booking.service,
        numPeople: booking.numPeople,
        startDate: request.requestedStartDate,
        endDate: request.requestedEndDate,
      },
      tx,
    );
    if (!availability.available) throw new ConflictError(availability.reason);

    const policyAtOriginalDate = computeCustomerCancellationPolicy(request.originalStartDate);
    const anchorDate =
      booking.cancellationPolicyAnchorDate ??
      (policyAtOriginalDate.daysUntilStart < 15 ? request.originalStartDate : null);

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        startDate: request.requestedStartDate,
        endDate: request.requestedEndDate,
        cancellationPolicyAnchorDate: anchorDate,
      },
    });
    await tx.bookingChangeRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        decidedAt: new Date(),
        decidedByUserId: userId,
      },
    });

    return {
      request,
      booking,
      anchorDate,
    };
  });

  await applyBookingReschedule({
    bookingId: approved.booking.id,
    boatId: approved.booking.boatId,
    serviceType: approved.booking.service.type,
    oldStartDate: approved.booking.startDate,
    oldEndDate: approved.booking.endDate,
    newStartDate: approved.request.requestedStartDate,
    newEndDate: approved.request.requestedEndDate,
  });

  await auditLog({
    userId,
    action: AUDIT_ACTIONS.ADMIN_RESCHEDULE_APPROVED,
    entity: "BookingChangeRequest",
    entityId: approved.request.id,
    before: {
      bookingId: approved.booking.id,
      startDate: approved.booking.startDate.toISOString().slice(0, 10),
      endDate: approved.booking.endDate.toISOString().slice(0, 10),
      status: approved.request.status,
    },
    after: {
      startDate: approved.request.requestedStartDate.toISOString().slice(0, 10),
      endDate: approved.request.requestedEndDate.toISOString().slice(0, 10),
      cancellationPolicyAnchorDate: approved.anchorDate?.toISOString().slice(0, 10) ?? null,
      status: "APPROVED",
    },
  });

  try {
    const customerName =
      `${approved.booking.customer.firstName ?? ""} ${approved.booking.customer.lastName ?? ""}`.trim() ||
      "cliente";
    const tpl = changeRequestApprovedTemplate({
      customerName,
      confirmationCode: approved.booking.confirmationCode,
      serviceName: approved.booking.service.name,
      originalDate: formatItDay(approved.request.originalStartDate),
      requestedDate: formatItDay(approved.request.requestedStartDate),
      bookingPortalUrl: `${env.APP_URL}/b/sessione`,
    });
    await enqueueTransactionalEmail({
      templateKey: "customer.change-request.approved",
      recipientEmail: approved.booking.customer.email,
      recipientName: customerName,
      subject: tpl.subject,
      htmlContent: tpl.html,
      textContent: tpl.text,
      bookingId: approved.booking.id,
      customerId: approved.booking.customerId,
      payload: {
        requestId: approved.request.id,
        confirmationCode: approved.booking.confirmationCode,
      },
      idempotencyKey: buildEmailIdempotencyKey([
        "change-request-approved",
        approved.request.id,
      ]),
    });
  } catch (err) {
    logger.error({ err, requestId: approved.request.id }, "Change request approved email enqueue failed");
    // Non bloccare l'azione admin: la modifica data e' gia' stata applicata.
  }

  revalidatePath("/admin/change-requests");
  revalidatePath(`/admin/prenotazioni/${approved.booking.id}`);
}

export async function rejectChangeRequest(formData: FormData): Promise<void> {
  const { userId } = await requireAdmin();
  const input = rejectSchema.parse({
    requestId: formData.get("requestId"),
    adminNote: formData.get("adminNote") || undefined,
  });

  const request = await db.$transaction(async (tx) => {
    await acquireTxAdvisoryLock(tx, "booking-change-request", input.requestId);
    const request = await tx.bookingChangeRequest.findUnique({
      where: { id: input.requestId },
      include: {
        booking: {
          include: {
            customer: { select: { id: true, email: true, firstName: true, lastName: true } },
            service: { select: { name: true } },
          },
        },
      },
    });
    if (!request) throw new NotFoundError("BookingChangeRequest", input.requestId);
    if (request.status !== "PENDING") {
      throw new ValidationError("Questa richiesta e' gia' stata decisa.");
    }

    await tx.bookingChangeRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        adminNote: input.adminNote?.trim() || null,
        decidedAt: new Date(),
        decidedByUserId: userId,
      },
    });

    return request;
  });

  await auditLog({
    userId,
    action: AUDIT_ACTIONS.ADMIN_RESCHEDULE_REJECTED,
    entity: "BookingChangeRequest",
    entityId: request.id,
    before: { status: request.status },
    after: { status: "REJECTED", adminNote: input.adminNote?.trim() || null },
  });

  try {
    const customerName =
      `${request.booking.customer.firstName ?? ""} ${request.booking.customer.lastName ?? ""}`.trim() ||
      "cliente";
    const tpl = changeRequestRejectedTemplate({
      customerName,
      confirmationCode: request.booking.confirmationCode,
      serviceName: request.booking.service.name,
      originalDate: formatItDay(request.originalStartDate),
      requestedDate: formatItDay(request.requestedStartDate),
      bookingPortalUrl: `${env.APP_URL}/b/sessione`,
      adminNote: input.adminNote?.trim() || undefined,
    });
    await enqueueTransactionalEmail({
      templateKey: "customer.change-request.rejected",
      recipientEmail: request.booking.customer.email,
      recipientName: customerName,
      subject: tpl.subject,
      htmlContent: tpl.html,
      textContent: tpl.text,
      bookingId: request.booking.id,
      customerId: request.booking.customer.id,
      payload: {
        requestId: request.id,
        confirmationCode: request.booking.confirmationCode,
        adminNote: input.adminNote?.trim() || null,
      },
      idempotencyKey: buildEmailIdempotencyKey([
        "change-request-rejected",
        request.id,
      ]),
    });
  } catch (err) {
    logger.error({ err, requestId: request.id }, "Change request rejected email enqueue failed");
    // Non bloccare l'azione admin: il rifiuto e' gia' stato salvato.
  }

  revalidatePath("/admin/change-requests");
  revalidatePath(`/admin/prenotazioni/${request.booking.id}`);
}
