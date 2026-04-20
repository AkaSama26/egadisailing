-- R26-P4 (audit double-book Agent 3 #14):
-- `BoatAvailability.lockedByBookingId` era un plain String senza FK →
-- orphan pointers possibili se Booking hard-deleted. Aggiunge FK
-- ON DELETE SET NULL: mantiene il cell state consistente + libera
-- automatic lockedByBookingId se il booking owner viene deletato.
-- DEFERRABLE INITIALLY IMMEDIATE: constraint check immediate per-statement
-- (default). Valore NULL ammesso per celle non associate a booking
-- (manualBlockRange admin, release post-refund).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'BoatAvailability_lockedByBookingId_fkey'
  ) THEN
    -- Clean orphan pointer pre-esistenti (Booking id inesistente) per
    -- evitare FK violation durante ADD CONSTRAINT. SET NULL atomico.
    UPDATE "BoatAvailability" a
    SET "lockedByBookingId" = NULL
    WHERE a."lockedByBookingId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "Booking" b WHERE b.id = a."lockedByBookingId"
      );

    ALTER TABLE "BoatAvailability"
      ADD CONSTRAINT "BoatAvailability_lockedByBookingId_fkey"
      FOREIGN KEY ("lockedByBookingId") REFERENCES "Booking"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
