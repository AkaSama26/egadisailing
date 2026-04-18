"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { auditLog } from "@/lib/audit/log";
import { refundPayment } from "@/lib/stripe/payment-intents";
import { releaseDates } from "@/lib/availability/service";
import { toCents } from "@/lib/pricing/cents";
import { CHANNELS, type Channel } from "@/lib/channels";
import { logger } from "@/lib/logger";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import type { PaymentMethod, PaymentType } from "@/generated/prisma/enums";

async function requireAdmin(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  if (session.user.role !== "ADMIN") throw new ForbiddenError();
  return { userId: session.user.id };
}

/**
 * Admin action: cancella una prenotazione + refund Stripe dei payments
 * SUCCEEDED (se charge presente) + rilascia availability verso tutti i canali.
 *
 * Source channel usato per `releaseDates`: quello del booking (DIRECT/BOKUN/...).
 * Il fan-out non tornera' al canale origine (self-echo + source exclude).
 */
export async function cancelBooking(bookingId: string): Promise<void> {
  const { userId } = await requireAdmin();

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true },
  });
  if (!booking) throw new NotFoundError("Booking", bookingId);
  if (booking.status === "CANCELLED" || booking.status === "REFUNDED") {
    // idempotent: gia' cancellato, no-op
    return;
  }

  // Refund Stripe (solo payments ancora SUCCEEDED con charge id).
  for (const p of booking.payments) {
    if (p.status === "SUCCEEDED" && p.stripeChargeId && p.type !== "REFUND") {
      try {
        const ref = await refundPayment(p.stripeChargeId);
        await db.payment.update({
          where: { id: p.id },
          data: { status: "REFUNDED", stripeRefundId: ref.id },
        });
      } catch (err) {
        logger.error({ err, paymentId: p.id }, "Refund failed during admin cancel");
      }
    }
  }

  await db.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  // Release availability verso tutti i canali eccetto l'origine (fan-out).
  // Usiamo il source del booking come channel di provenienza.
  const sourceChannel = booking.source as Channel;
  const channelForRelease = (CHANNELS as Record<string, Channel>)[sourceChannel] ?? CHANNELS.DIRECT;
  try {
    await releaseDates(booking.boatId, booking.startDate, booking.endDate, channelForRelease);
  } catch (err) {
    logger.error({ err, bookingId }, "releaseDates failed during admin cancel");
  }

  await auditLog({
    userId,
    action: "CANCEL",
    entity: "Booking",
    entityId: bookingId,
    before: { status: booking.status },
    after: { status: "CANCELLED" },
  });

  revalidatePath(`/admin/prenotazioni/${bookingId}`);
  revalidatePath("/admin/prenotazioni");
}

export async function addBookingNote(bookingId: string, note: string): Promise<void> {
  const { userId } = await requireAdmin();
  const clean = note.trim();
  if (!clean) return;
  if (clean.length > 2000) {
    throw new ValidationError("Nota troppo lunga (max 2000 char)");
  }

  await db.bookingNote.create({
    data: { bookingId, note: clean, authorId: userId },
  });

  await auditLog({
    userId,
    action: "ADD_NOTE",
    entity: "Booking",
    entityId: bookingId,
    after: { noteLength: clean.length },
  });

  revalidatePath(`/admin/prenotazioni/${bookingId}`);
}

export interface RegisterPaymentInput {
  bookingId: string;
  amountEur: number;
  method: Extract<PaymentMethod, "CASH" | "BANK_TRANSFER">;
  type: Extract<PaymentType, "DEPOSIT" | "BALANCE" | "FULL">;
  note?: string;
}

/**
 * Registra un pagamento off-Stripe (contanti/bonifico). Se type=BALANCE
 * marca `DirectBooking.balancePaidAt` per suppressione balance-reminder cron.
 */
export async function registerManualPayment(input: RegisterPaymentInput): Promise<void> {
  const { userId } = await requireAdmin();
  if (input.amountEur <= 0) {
    throw new ValidationError("Importo deve essere positivo");
  }
  const amountCents = toCents(input.amountEur);

  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        bookingId: input.bookingId,
        amount: (amountCents / 100).toFixed(2),
        type: input.type,
        method: input.method,
        status: "SUCCEEDED",
        processedAt: new Date(),
        note: input.note?.trim() || null,
      },
    });

    if (input.type === "BALANCE") {
      const direct = await tx.directBooking.findUnique({
        where: { bookingId: input.bookingId },
        select: { bookingId: true },
      });
      if (direct) {
        await tx.directBooking.update({
          where: { bookingId: input.bookingId },
          data: { balancePaidAt: new Date() },
        });
      }
    }
  });

  await auditLog({
    userId,
    action: "REGISTER_PAYMENT",
    entity: "Booking",
    entityId: input.bookingId,
    after: { amountEur: input.amountEur, method: input.method, type: input.type },
  });

  revalidatePath(`/admin/prenotazioni/${input.bookingId}`);
}
