import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { extractConfirmationCodeFromQrPayload } from "@/lib/booking/check-in";
import { ticketSlotLabel } from "@/lib/booking/ticket";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { auditLog } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { getClientIp, getUserAgent } from "@/lib/http/client-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checkInSchema = z.object({
  payload: z.string().trim().min(1).max(500),
});

const bookingInclude = {
  customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
  service: { select: { name: true, durationType: true } },
  boat: { select: { name: true } },
  checkedInBy: { select: { name: true, email: true } },
} as const;

export const POST = withErrorHandler(async (req) => {
  const { userId } = await requireAdmin();
  const input = checkInSchema.parse(await req.json());
  const code = extractConfirmationCodeFromQrPayload(input.payload);
  if (!code) {
    throw new ValidationError("QR non riconosciuto: apri il biglietto Egadisailing o inserisci il codice.");
  }

  const now = new Date();
  const outcome = await db.$transaction(async (tx) => {
    const current = await tx.booking.findUnique({
      where: { confirmationCode: code },
      include: bookingInclude,
    });
    if (!current) throw new NotFoundError("Booking", code);

    if (current.status !== "CONFIRMED") {
      throw new ValidationError(
        `Check-in non consentito: prenotazione ${current.status.toLowerCase()}.`,
      );
    }

    if (current.checkedInAt) {
      return { type: "ALREADY_CHECKED_IN" as const, booking: current };
    }

    const updated = await tx.booking.update({
      where: { id: current.id },
      data: {
        checkedInAt: now,
        checkedInByUserId: userId,
      },
      include: bookingInclude,
    });

    return {
      type: "CHECKED_IN" as const,
      booking: updated,
      before: { checkedInAt: current.checkedInAt },
    };
  });

  if (outcome.type === "CHECKED_IN") {
    await auditLog({
      userId,
      action: AUDIT_ACTIONS.CHECK_IN,
      entity: "Booking",
      entityId: outcome.booking.id,
      before: outcome.before,
      after: { checkedInAt: outcome.booking.checkedInAt },
      ip: getClientIp(req.headers),
      userAgent: getUserAgent(req.headers) ?? undefined,
    });
    revalidatePath(`/admin/prenotazioni/${outcome.booking.id}`);
    revalidatePath("/admin/prenotazioni");
    revalidatePath("/admin/check-in");
  }

  return NextResponse.json({
    data: {
      outcome: outcome.type,
      booking: serializeCheckInBooking(outcome.booking),
    },
  });
});

interface CheckInBooking {
  id: string;
  confirmationCode: string;
  source: string;
  status: string;
  startDate: Date;
  endDate: Date;
  numPeople: number;
  adultCount: number;
  childCount: number;
  freeChildSeatCount: number;
  infantCount: number;
  checkedInAt: Date | null;
  checkedInBy: { name: string; email: string } | null;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  service: {
    name: string;
    durationType: string;
  };
  boat: {
    name: string;
  };
}

function serializeCheckInBooking(booking: CheckInBooking) {
  const guestBreakdown = [
    booking.adultCount ? `${booking.adultCount} adulti` : null,
    booking.childCount ? `${booking.childCount} bambini` : null,
    booking.freeChildSeatCount ? `${booking.freeChildSeatCount} bimbi 3-4` : null,
    booking.infantCount ? `${booking.infantCount} neonati` : null,
  ].filter(Boolean);

  return {
    id: booking.id,
    confirmationCode: booking.confirmationCode,
    source: booking.source,
    status: booking.status,
    serviceName: booking.service.name,
    boatName: booking.boat.name,
    startDate: booking.startDate.toISOString(),
    endDate: booking.endDate.toISOString(),
    slotLabel: ticketSlotLabel(booking.service.durationType),
    customerName: `${booking.customer.firstName} ${booking.customer.lastName}`.trim(),
    customerEmail: booking.customer.email,
    customerPhone: booking.customer.phone,
    numPeople: booking.numPeople,
    guestBreakdown: guestBreakdown.length > 0 ? guestBreakdown.join(", ") : `${booking.numPeople} ospiti`,
    checkedInAt: booking.checkedInAt?.toISOString() ?? null,
    checkedInBy: booking.checkedInBy
      ? { name: booking.checkedInBy.name, email: booking.checkedInBy.email }
      : null,
  };
}
