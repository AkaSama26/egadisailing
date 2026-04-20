import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { handleStripeEvent } from "@/lib/stripe/webhook-handler";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { AppError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

// R22-A3-ALTA-1: wrap in `withErrorHandler` per x-request-id correlation +
// envelope coerente `{error:{code,...}}`. Stripe retry policy: 500 → retry,
// 4xx → no retry. Handler idempotente via `ProcessedStripeEvent` quindi retry
// e' safe. `ValidationError` (400) usato per missing/invalid signature —
// Stripe non ritenta (giustamente, il bug e' upstream). `AppError(500)` per
// config mancante → retry accettabile. Qualsiasi altro throw diventa 500
// generico via `withErrorHandler` → retry Stripe.
export const POST = withErrorHandler(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    throw new ValidationError("Missing stripe-signature header");
  }
  if (!env.STRIPE_WEBHOOK_SECRET) {
    logger.error("STRIPE_WEBHOOK_SECRET not configured");
    throw new AppError("WEBHOOK_NOT_CONFIGURED", "Stripe webhook not configured", 500);
  }

  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error({ err }, "Stripe webhook signature invalid");
    throw new ValidationError("Invalid stripe signature");
  }

  try {
    await handleStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error({ err, type: event.type }, "Stripe webhook handler error");
    // Re-throw → withErrorHandler mappa a 500 generico → Stripe ritenta.
    // Handler idempotente via ProcessedStripeEvent, retry sicuro.
    throw err;
  }
});
