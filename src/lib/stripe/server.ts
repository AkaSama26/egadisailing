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
    // pending-gc per ore (oltre il lease TTL 5min) → double-cancel.
    // R16-REG-A2: 10s era troppo basso per refund con importi grossi
    // (p99 5-8s normale + retry). 15s + 1 retry = worst-case ~32s, ancora
    // sotto pending-gc lease TTL 5min e webhook Stripe timeout 30s+.
    globalForStripe.__stripe__ = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
      timeout: 15_000,
      maxNetworkRetries: 1,
    });
  }
  return globalForStripe.__stripe__;
}
