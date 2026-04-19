import Stripe from "stripe";
import { env } from "@/lib/env";

const globalForStripe = globalThis as unknown as { __stripe__?: Stripe };

export function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not set — cannot call Stripe API");
  }
  if (!globalForStripe.__stripe__) {
    // R15-REG-REG-6: Stripe SDK default timeout = 80s + 2 retry = worst-case
    // 4min per una singola call. Un Stripe parzialmente degradato bloccava
    // pending-gc per ore (oltre il lease TTL 5min) → double-cancel. Cap a
    // 10s + 1 retry = worst-case ~22s. Accettabile retry budget.
    globalForStripe.__stripe__ = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
      timeout: 10_000,
      maxNetworkRetries: 1,
    });
  }
  return globalForStripe.__stripe__;
}
