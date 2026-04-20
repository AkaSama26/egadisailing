import Decimal from "decimal.js";
import { stripe } from "@/lib/stripe/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { toCents } from "@/lib/pricing/cents";
import { buildBookingMetadata } from "@/lib/stripe/metadata";
import { bookingWithDetailsInclude } from "@/lib/booking/queries";

/**
 * Crea un Stripe Checkout Session per il saldo di una DirectBooking.
 * Restituisce l'URL da mandare al cliente via email.
 */
export async function createBalancePaymentLink(bookingId: string): Promise<string> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: bookingWithDetailsInclude,
  });
  if (!booking || !booking.directBooking) {
    throw new NotFoundError("DirectBooking", bookingId);
  }

  const balanceAmount = booking.directBooking.balanceAmount;
  if (!balanceAmount || new Decimal(balanceAmount).lte(0)) {
    throw new ValidationError("No balance due for this booking");
  }

  const metadata = buildBookingMetadata({
    bookingId: booking.id,
    confirmationCode: booking.confirmationCode,
    paymentType: "BALANCE",
  });

  // R24-A3-C2 (reclassified ALTA): expires_at limita l'URL. Default Stripe
  // Checkout 24h → cliente forwarda email "paga tu" a familiare → terzi
  // aprono link + pagano con propria carta → Payment SUCCEEDED su booking
  // altrui → refund mess operativo. 6h e' compromesso: cliente ha finestra
  // ragionevole per pagare same-day, ma ridotto forwarding abuse window.
  // Stripe min = 30min from now, max = 24h from now.
  const expiresAt = Math.floor(Date.now() / 1000) + 6 * 60 * 60; // 6h

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: booking.customer.email,
    expires_at: expiresAt,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: toCents(balanceAmount),
          product_data: {
            name: `Saldo ${booking.confirmationCode} · ${booking.service.name}`,
          },
        },
      },
    ],
    payment_intent_data: { metadata },
    metadata,
    success_url: `${env.APP_URL}/${env.APP_LOCALES_DEFAULT}/prenota/success/${booking.confirmationCode}`,
    cancel_url: `${env.APP_URL}/${env.APP_LOCALES_DEFAULT}/recupera-prenotazione`,
  });

  if (!session.url) {
    throw new Error("Stripe session did not return URL");
  }
  return session.url;
}
