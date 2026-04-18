import Stripe from "stripe";
import { env } from "@/lib/env";

const globalForStripe = globalThis as unknown as { __stripe__?: Stripe };

export function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not set — cannot call Stripe API");
  }
  if (!globalForStripe.__stripe__) {
    globalForStripe.__stripe__ = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return globalForStripe.__stripe__;
}
