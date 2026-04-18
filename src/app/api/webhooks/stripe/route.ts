import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { handleStripeEvent } from "@/lib/stripe/webhook-handler";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  if (!env.STRIPE_WEBHOOK_SECRET) {
    logger.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error({ err }, "Stripe webhook signature invalid");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error({ err, type: event.type }, "Stripe webhook handler error");
    // Return 500 so Stripe retries (important: the handler must be idempotent).
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
