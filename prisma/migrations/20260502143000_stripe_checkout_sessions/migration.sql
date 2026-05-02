-- Stripe Checkout hosted rollout. Keep PaymentIntent support for rollback,
-- but persist Checkout Session identity for expiration/GC and reconciliation.
ALTER TABLE "DirectBooking"
  ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "DirectBooking_stripeCheckoutSessionId_key"
  ON "DirectBooking"("stripeCheckoutSessionId")
  WHERE "stripeCheckoutSessionId" IS NOT NULL;
