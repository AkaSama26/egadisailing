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

/**
 * Cancella un PaymentIntent se ancora in stato cancellabile (requires_*).
 * Idempotent: se Stripe ritorna uno status finale (succeeded/canceled),
 * ritorna l'intent senza modificarlo.
 *
 * Uso: admin `cancelBooking` su booking PENDING per prevenire la race
 * Stripe webhook `payment_intent.succeeded` dopo la cancellazione DB
 * (Round 10 BL-C3).
 */
/**
 * R23-S-ALTA-2: blacklist invertita invece di whitelist di cancelable
 * states. La whitelist hardcoded (requires_*) si spezza silenziosamente
 * se Stripe aggiunge un nuovo stato intermedio: la mitigation R10 BL-C3
 * (cancel PRIMA del DB cancel per race) dipende da questa funzione
 * riuscire sugli stati "cancelable". Blacklist copre solo gli stati
 * terminali documentati da Stripe: `succeeded`, `canceled`, `processing`
 * (quest'ultimo non cancellabile per definizione — R14-REG-M2).
 * Fonte: https://docs.stripe.com/api/payment_intents/object#payment_intent_object-status
 */
const NON_CANCELABLE_PI_STATUSES = new Set(["succeeded", "canceled", "processing"]);

export async function cancelPaymentIntent(paymentIntentId: string) {
  try {
    const pi = await stripe().paymentIntents.retrieve(paymentIntentId);
    if (NON_CANCELABLE_PI_STATUSES.has(pi.status)) {
      logger.info({ paymentIntentId, status: pi.status }, "PI not cancelable, skipping");
      return pi;
    }
    const canceled = await stripe().paymentIntents.cancel(paymentIntentId);
    logger.info({ paymentIntentId, status: canceled.status }, "PI canceled by admin");
    return canceled;
  } catch (err) {
    logger.error({ err, paymentIntentId }, "Stripe cancelPaymentIntent failed");
    throw new ExternalServiceError("Stripe", "cancelPaymentIntent failed");
  }
}
