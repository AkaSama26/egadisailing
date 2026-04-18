import { stripe } from "./server";
import { logger } from "@/lib/logger";
import { ExternalServiceError } from "@/lib/errors";

export interface CreatePaymentIntentOptions {
  amountCents: number;
  currency?: string;
  customerEmail: string;
  customerName: string;
  metadata: Record<string, string>;
  description: string;
}

export async function createPaymentIntent(
  opts: CreatePaymentIntentOptions,
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  try {
    const intent = await stripe().paymentIntents.create({
      amount: opts.amountCents,
      currency: opts.currency ?? "eur",
      automatic_payment_methods: { enabled: true },
      receipt_email: opts.customerEmail,
      description: opts.description,
      metadata: opts.metadata,
    });

    logger.info(
      { paymentIntentId: intent.id, amountCents: opts.amountCents },
      "Payment intent created",
    );

    if (!intent.client_secret) {
      throw new Error("Stripe returned no client_secret");
    }

    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    };
  } catch (err) {
    logger.error({ err }, "Stripe createPaymentIntent failed");
    throw new ExternalServiceError("Stripe", "createPaymentIntent failed");
  }
}

export async function retrievePaymentIntent(id: string) {
  return stripe().paymentIntents.retrieve(id);
}

export async function refundPayment(chargeId: string, amountCents?: number) {
  try {
    return await stripe().refunds.create({
      charge: chargeId,
      amount: amountCents,
    });
  } catch (err) {
    logger.error({ err, chargeId }, "Stripe refund failed");
    throw new ExternalServiceError("Stripe", "refund failed");
  }
}
