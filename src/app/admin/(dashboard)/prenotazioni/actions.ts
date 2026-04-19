"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { auditLog } from "@/lib/audit/log";
import { refundPayment, cancelPaymentIntent } from "@/lib/stripe/payment-intents";
import { releaseDates } from "@/lib/availability/service";
import { toCents } from "@/lib/pricing/cents";
import { CHANNELS } from "@/lib/channels";
import { createManualAlert, type ManualAlertChannel } from "@/lib/charter/manual-alerts";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { PaymentMethod, PaymentType } from "@/generated/prisma/enums";

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
    include: {
      payments: true,
      directBooking: true,
      customer: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
    },
  });
  if (!booking) throw new NotFoundError("Booking", bookingId);
  if (booking.status === "CANCELLED" || booking.status === "REFUNDED") {
    // idempotent: gia' cancellato, no-op
    return;
  }

  // Round 10 BL-C3: cancella PaymentIntent Stripe se ancora in flight
  // (status requires_*/processing) per prevenire la race "webhook succeeded
  // dopo cancel-admin". Se arrivasse comunque, il webhook handler fa
  // auto-refund del charge (fix speculare in stripe/webhook-handler.ts).
  if (booking.directBooking?.stripePaymentIntentId) {
    try {
      await cancelPaymentIntent(booking.directBooking.stripePaymentIntentId);
    } catch (err) {
      logger.warn(
        { err, bookingId, piId: booking.directBooking.stripePaymentIntentId },
        "cancelPaymentIntent failed (continue with cancel) — webhook handler refundera' eventuale charge",
      );
    }
  }

  // Refund Stripe (solo payments ancora SUCCEEDED con charge id).
  // Round 10 BL-M4: se un refund fallisce, NON marchiamo CANCELLED — admin
  // riprova. Senza questo, il booking finiva CANCELLED con charge ancora
  // addebitato al cliente.
  const refundErrors: Array<{ paymentId: string; message: string }> = [];
  let refundsSucceeded = 0;
  for (const p of booking.payments) {
    if (p.status === "SUCCEEDED" && p.stripeChargeId && p.type !== "REFUND") {
      try {
        const ref = await refundPayment(p.stripeChargeId);
        await db.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: p.id },
            data: { status: "REFUNDED", stripeRefundId: ref.id },
          });
          // Round 10 Int-C1 + Round 11 Reg-C1: record REFUND separato per
          // audit fiscale (revenue mese originale non cambia retroattivamente),
          // ma SENZA stripeChargeId/stripeRefundId che sono @unique sul
          // Payment originale gia' updated sopra. Riferimento preservato
          // in `note` per correlation audit.
          await tx.payment.create({
            data: {
              bookingId: booking.id,
              amount: p.amount.toString(),
              type: "REFUND",
              method: p.method,
              status: "REFUNDED",
              processedAt: new Date(),
              note: `Refund admin-cancel · paymentId=${p.id} · charge=${p.stripeChargeId} · refund=${ref.id}`,
            },
          });
        });
        refundsSucceeded++;
      } catch (err) {
        const message = (err as Error).message;
        logger.error({ err, paymentId: p.id }, "Refund failed during admin cancel");
        refundErrors.push({ paymentId: p.id, message });
      }
    }
  }
  if (refundErrors.length > 0) {
    throw new ValidationError(
      `Refund fallito per ${refundErrors.length} pagamento/i. Riprovare o refund manuale. Booking NON cancellato.`,
      { refundErrors },
    );
  }

  await db.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  // Release availability. Round 10 BL-C2 + Int-M3: admin-cancel e' semanticamente
  // una source DIRECT decision; usiamo CHANNELS.DIRECT per fan-out a TUTTI
  // i canali esterni (inclusi BOKUN/BOATAROUND). Per source != DIRECT
  // emettiamo un ManualAlert: admin deve cancellare upstream anche sul
  // panel OTA (Bokun UI, Boataround panel) perche' l'API release non
  // cancella il booking upstream.
  try {
    await releaseDates(booking.boatId, booking.startDate, booking.endDate, CHANNELS.DIRECT);
  } catch (err) {
    logger.error({ err, bookingId }, "releaseDates failed during admin cancel");
  }

  if (booking.source !== "DIRECT") {
    try {
      await createManualAlert({
        channel: booking.source as ManualAlertChannel,
        boatId: booking.boatId,
        date: booking.startDate,
        action: "UNBLOCK",
        bookingId: booking.id,
        notes: `Admin-cancel booking ${booking.confirmationCode} (${booking.source}). Cancellare anche upstream sul panel OTA.`,
      });
    } catch (err) {
      // ManualAlert ha partial unique su (channel, boatId, date, action) — se
      // un'altra entry esiste per stesso slot, catch del P2002 nella funzione
      // stessa: qui logghiamo altri errori senza bloccare.
      logger.warn({ err, bookingId }, "createManualAlert for admin cancel failed");
    }
  }

  await auditLog({
    userId,
    action: "CANCEL",
    entity: "Booking",
    entityId: bookingId,
    before: { status: booking.status },
    after: {
      status: "CANCELLED",
      refundsSucceeded,
      refundsAttempted: refundsSucceeded + refundErrors.length,
    },
  });

  // Plan 6 Task 8: notify admin su cancel (audit backup + Telegram).
  try {
    await dispatchNotification({
      type: "BOOKING_CANCELLED",
      channels: ["EMAIL"],
      payload: {
        confirmationCode: booking.confirmationCode,
        customerName: `${booking.customer?.firstName ?? ""} ${booking.customer?.lastName ?? ""}`.trim() || "n/a",
        serviceName: booking.service?.name ?? "n/a",
        startDate: booking.startDate.toISOString().slice(0, 10),
        source: booking.source,
        refundAmount:
          refundsSucceeded > 0 ? `${refundsSucceeded} pagamento/i refundato/i` : undefined,
      },
    });
  } catch (err) {
    logger.warn({ err, bookingId }, "Cancel notification failed (non-blocking)");
  }

  revalidatePath(`/admin/prenotazioni/${bookingId}`);
  revalidatePath("/admin/prenotazioni");
  revalidatePath("/admin");
  revalidatePath("/admin/finanza");
  revalidatePath("/admin/calendario");
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
  // Guard NaN/Infinity: parseFloat("") → NaN, `NaN <= 0` e' FALSE → senza
  // questo check un form vuoto passava con amountEur=NaN e corrompeva il DB
  // (Payment.amount stringa "NaN" → errore Prisma o silente). Round 10 Sec-M6.
  if (!Number.isFinite(input.amountEur) || input.amountEur <= 0) {
    throw new ValidationError("Importo deve essere un numero positivo");
  }
  if (input.amountEur > 1_000_000) {
    throw new ValidationError("Importo fuori range (max 1.000.000€)");
  }
  const amountCents = toCents(input.amountEur);

  await db.$transaction(async (tx) => {
    // Guard status: impedisce di registrare payment su booking chiusi
    // (CANCELLED/REFUNDED). Inconsistenza contabile + potenziale update
    // silent di DirectBooking.balancePaidAt su booking cancellato.
    // Round 10 BL-C4.
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      select: { id: true, status: true, source: true },
    });
    if (!booking) {
      throw new ValidationError("Booking non trovato");
    }
    if (booking.status === "CANCELLED" || booking.status === "REFUNDED") {
      throw new ValidationError(
        `Non e' possibile registrare un pagamento su booking ${booking.status}`,
      );
    }
    // BALANCE richiede DirectBooking (saldo deposit+balance). Bloccare
    // esplicitamente il silent-skip su booking BOKUN/CHARTER (Round 10 BL-M2).
    if (input.type === "BALANCE" && booking.source !== "DIRECT") {
      throw new ValidationError(
        "Il tipo BALANCE richiede un booking DIRECT con DirectBooking associato",
      );
    }

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
  revalidatePath("/admin"); // KPI saldi pendenti (Round 10 Int-A2)
  revalidatePath("/admin/finanza");
}
