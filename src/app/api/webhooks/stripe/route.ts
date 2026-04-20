import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { handleStripeEvent } from "@/lib/stripe/webhook-handler";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { AppError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

// R25-A3-C3: body-size cap pre-HMAC. Stripe events sono tipicamente 2-10KB,
// max ~100KB. 1MB e' generoso ma protegge contro CPU-burn DoS via HMAC
// constructEvent (attacker POSTs 100MB body, Node alloca buffer + Stripe
// SDK HMACs → event loop starvation).
const MAX_STRIPE_BODY_BYTES = 1_048_576; // 1MB

// R25-A3-A2: explicit tolerance per make intent chiaro. Default Stripe = 300s.
// Manteniamo 300s ma esplicito.
const STRIPE_SIGNATURE_TOLERANCE_SEC = 300;

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

  // R25-A3-C3: size cap PRIMA di body read full.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_STRIPE_BODY_BYTES) {
    throw new ValidationError(`Body too large (${contentLength} > ${MAX_STRIPE_BODY_BYTES})`);
  }

  const body = await req.text();
  if (body.length > MAX_STRIPE_BODY_BYTES) {
    throw new ValidationError("Body too large");
  }

  let event;
  try {
    event = stripe().webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
      STRIPE_SIGNATURE_TOLERANCE_SEC,
    );
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
