import type Stripe from "stripe";
import { stripe } from "./server";
import { logger } from "@/lib/logger";
import { ExternalServiceError } from "@/lib/errors";

export interface CreateCheckoutSessionOptions {
  amountCents: number;
  currency?: string;
  customerEmail: string;
  clientReferenceId: string;
  productName: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

export interface CreatedCheckoutSession {
  checkoutSessionId: string;
  checkoutUrl: string;
  paymentIntentId: string | null;
  expiresAt: Date | null;
}

function paymentIntentIdFromSession(session: Stripe.Checkout.Session): string | null {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent.id;
}

export async function createCheckoutSession(
  opts: CreateCheckoutSessionOptions,
): Promise<CreatedCheckoutSession> {
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      client_reference_id: opts.clientReferenceId,
      customer_email: opts.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: opts.currency ?? "eur",
            unit_amount: opts.amountCents,
            product_data: {
              name: opts.productName,
            },
          },
        },
      ],
      metadata: opts.metadata,
      payment_intent_data: {
        receipt_email: opts.customerEmail,
        metadata: opts.metadata,
      },
    });

    if (!session.url) {
      throw new Error("Stripe returned no Checkout Session URL");
    }

    logger.info(
      {
        checkoutSessionId: session.id,
        paymentIntentId: paymentIntentIdFromSession(session),
        amountCents: opts.amountCents,
      },
      "Stripe Checkout Session created",
    );

    return {
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
      paymentIntentId: paymentIntentIdFromSession(session),
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null,
    };
  } catch (err) {
    logger.error({ err }, "Stripe createCheckoutSession failed");
    throw new ExternalServiceError("Stripe", "createCheckoutSession failed");
  }
}

export async function retrieveCheckoutSession(id: string) {
  return stripe().checkout.sessions.retrieve(id);
}

export async function expireCheckoutSession(id: string): Promise<Stripe.Checkout.Session | null> {
  try {
    const session = await stripe().checkout.sessions.retrieve(id);
    if (session.status !== "open") {
      logger.info({ checkoutSessionId: id, status: session.status }, "Checkout Session not open");
      return session;
    }
    const expired = await stripe().checkout.sessions.expire(id);
    logger.info({ checkoutSessionId: id }, "Checkout Session expired");
    return expired;
  } catch (err) {
    logger.warn({ err, checkoutSessionId: id }, "Stripe expireCheckoutSession failed");
    return null;
  }
}
