-- Round 14 Area 3 — compound indexes su hot path query.
-- Booking_boatId_status_startDate: createPendingDirectBooking overlap check.
-- Booking_status_source_createdAt: pending-gc filter PENDING/DIRECT/createdAt<cutoff.
-- Processed*Event_processedAt: retention cron deleteMany.
-- BookingRecoverySession_expiresAt: retention cron cleanup.

CREATE INDEX IF NOT EXISTS "Booking_boatId_status_startDate_idx"
  ON "Booking"("boatId", "status", "startDate");

CREATE INDEX IF NOT EXISTS "Booking_status_source_createdAt_idx"
  ON "Booking"("status", "source", "createdAt");

CREATE INDEX IF NOT EXISTS "ProcessedStripeEvent_processedAt_idx"
  ON "ProcessedStripeEvent"("processedAt");

CREATE INDEX IF NOT EXISTS "ProcessedBokunEvent_processedAt_idx"
  ON "ProcessedBokunEvent"("processedAt");

CREATE INDEX IF NOT EXISTS "ProcessedBoataroundEvent_processedAt_idx"
  ON "ProcessedBoataroundEvent"("processedAt");

CREATE INDEX IF NOT EXISTS "BookingRecoverySession_expiresAt_idx"
  ON "BookingRecoverySession"("expiresAt");
