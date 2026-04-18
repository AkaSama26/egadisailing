-- Round 7 audit: constraint + index gaps

-- 1) Service.bokunProductId UNIQUE — previene che due Service puntino allo stesso
--    prodotto Bokun (causerebbe doppio push availability/pricing).
CREATE UNIQUE INDEX "Service_bokunProductId_key" ON "Service"("bokunProductId") WHERE "bokunProductId" IS NOT NULL;

-- 2) Payment.stripeRefundId UNIQUE — dedup dei webhook charge.refunded replay.
CREATE UNIQUE INDEX "Payment_stripeRefundId_key" ON "Payment"("stripeRefundId") WHERE "stripeRefundId" IS NOT NULL;

-- 3) AuditLog timestamp index per retention deleteMany (oggi solo (userId, timestamp) compound).
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- 4) BoatAvailability date index standalone per query calendario admin cross-boat.
CREATE INDEX "BoatAvailability_date_idx" ON "BoatAvailability"("date");
