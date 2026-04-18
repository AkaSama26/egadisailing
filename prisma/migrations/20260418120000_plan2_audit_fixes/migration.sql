-- Unique constraint on Payment.stripeChargeId for idempotent webhook handling
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripeChargeId_key" ON "Payment"("stripeChargeId");

-- Event-level idempotency table for Stripe webhooks
CREATE TABLE IF NOT EXISTS "ProcessedStripeEvent" (
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessedStripeEvent_pkey" PRIMARY KEY ("eventId")
);

CREATE INDEX IF NOT EXISTS "ProcessedStripeEvent_eventType_processedAt_idx" ON "ProcessedStripeEvent"("eventType", "processedAt");
