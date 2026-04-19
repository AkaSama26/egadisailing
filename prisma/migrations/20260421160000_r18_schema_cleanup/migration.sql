-- Round 18 Prisma schema cleanup: drop dead fields + CHECK constraints +
-- index Booking(source, externalRef) + onDelete espliciti.

-- ═══════════════════════════════════════════════════════════
-- 1. Drop dead fields (0 runtime reference)
-- ═══════════════════════════════════════════════════════════

-- Booking.weatherGuarantee: R12 deferred, mai applicato. Sara' reintrodotto
-- come addon DirectBooking quando business decide feature.
ALTER TABLE "Booking" DROP COLUMN IF EXISTS "weatherGuarantee";

-- DirectBooking.cancellationPolicyApplied: duplicato di ConsentRecord.policyVersion.
ALTER TABLE "DirectBooking" DROP COLUMN IF EXISTS "cancellationPolicyApplied";

-- ═══════════════════════════════════════════════════════════
-- 2. CHECK constraints (defense-in-depth vs Zod app-level)
-- ═══════════════════════════════════════════════════════════

-- Booking.numPeople >= 0 (R7-C2 gift voucher Bokun può arrivare 0).
ALTER TABLE "Booking"
  ADD CONSTRAINT "chk_booking_num_people" CHECK ("numPeople" >= 0);

-- Booking.totalPrice >= 0.
ALTER TABLE "Booking"
  ADD CONSTRAINT "chk_booking_total_price" CHECK ("totalPrice" >= 0);

-- Booking.currency = 'EUR' (multi-currency non supportato).
ALTER TABLE "Booking"
  ADD CONSTRAINT "chk_booking_currency_eur" CHECK ("currency" = 'EUR');

-- Payment.amount >= 0.
ALTER TABLE "Payment"
  ADD CONSTRAINT "chk_payment_amount" CHECK ("amount" >= 0);

-- PricingPeriod.pricePerPerson > 0.
ALTER TABLE "PricingPeriod"
  ADD CONSTRAINT "chk_pricing_period_positive" CHECK ("pricePerPerson" > 0);

-- HotDayRule.multiplier > 0 (evita division-by-zero o price collapse).
ALTER TABLE "HotDayRule"
  ADD CONSTRAINT "chk_hot_day_rule_multiplier_positive" CHECK ("multiplier" > 0);

-- ═══════════════════════════════════════════════════════════
-- 3. Compound index per reconciliation cron (hot path)
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS "Booking_source_externalRef_idx"
  ON "Booking"("source", "externalRef")
  WHERE "externalRef" IS NOT NULL;
