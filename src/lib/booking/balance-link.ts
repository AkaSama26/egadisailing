import Decimal from "decimal.js";
import { stripe } from "@/lib/stripe/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { NotFoundError, ValidationError } from "@/lib/errors";

/**
 * Crea un Stripe Checkout Session per il saldo di una DirectBooking.
 * Restituisce l'URL da mandare al cliente via email.
 */
export async function createBalancePaymentLink(bookingId: string): Promise<string> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, service: true, directBooking: true },
  });
  if (!booking || !booking.directBooking) {
    throw new NotFoundError("DirectBooking", bookingId);
  }

  const balanceAmount = booking.directBooking.balanceAmount;
  if (!balanceAmount || new Decimal(balanceAmount.toString()).lte(0)) {
    throw new ValidationError("No balance due for this booking");
  }

  const balanceCents = new Decimal(balanceAmount.toString())
    .mul(100)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: booking.customer.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: balanceCents,
          product_data: {
            name: `Saldo ${booking.confirmationCode} · ${booking.service.name}`,
          },
        },
      },
    ],
    payment_intent_data: {
      metadata: {
        bookingId: booking.id,
        confirmationCode: booking.confirmationCode,
        paymentType: "BALANCE",
      },
    },
    metadata: {
      bookingId: booking.id,
      confirmationCode: booking.confirmationCode,
      paymentType: "BALANCE",
    },
    success_url: `${env.APP_URL}/${env.APP_LOCALES_DEFAULT}/prenota/success/${booking.confirmationCode}`,
    cancel_url: `${env.APP_URL}/${env.APP_LOCALES_DEFAULT}/recupera-prenotazione`,
  });

  if (!session.url) {
    throw new Error("Stripe session did not return URL");
  }
  return session.url;
}
