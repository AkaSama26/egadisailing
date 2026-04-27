-- Booking availability ownership guard.
--
-- `exclusiveSlot` describes the business semantics of the service/range.
-- `claimsAvailability` describes whether this booking currently owns the
-- master availability slot. DIRECT override candidates stay PENDING but do not
-- claim the slot until approved, so the DB guard can coexist with the priority
-- override workflow.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD COLUMN "exclusiveSlot" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "claimsAvailability" BOOLEAN NOT NULL DEFAULT true;

-- Historical shared-tour rows, if present in production, must not suddenly
-- become exclusive. Current active trimaran catalog remains exclusive.
UPDATE "Booking" b
SET "exclusiveSlot" = CASE
  WHEN s."type" IN ('EXCLUSIVE_EXPERIENCE', 'CABIN_CHARTER', 'BOAT_EXCLUSIVE') THEN true
  ELSE false
END
FROM "Service" s
WHERE s."id" = b."serviceId";

-- Pending DIRECT override candidates exist as commercial contenders but do not
-- own the master slot until admin approval.
UPDATE "Booking" b
SET "claimsAvailability" = false
FROM "OverrideRequest" o
WHERE o."newBookingId" = b."id"
  AND o."status" = 'PENDING'
  AND b."source" = 'DIRECT'
  AND b."status" = 'PENDING';

-- Preflight: fail deployment instead of installing a constraint over already
-- conflicting rows. Override candidates are excluded by claimsAvailability.
DO $$
DECLARE
  conflict_count integer;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM "Booking" a
  JOIN "Booking" b
    ON a."id" < b."id"
   AND a."boatId" = b."boatId"
   AND daterange(a."startDate", (a."endDate" + INTERVAL '1 day')::date, '[)') &&
       daterange(b."startDate", (b."endDate" + INTERVAL '1 day')::date, '[)')
  WHERE a."exclusiveSlot" = true
    AND a."claimsAvailability" = true
    AND a."status" IN ('PENDING', 'CONFIRMED')
    AND b."exclusiveSlot" = true
    AND b."claimsAvailability" = true
    AND b."status" IN ('PENDING', 'CONFIRMED');

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Cannot add booking_no_overlap_claiming_exclusive: % overlapping active exclusive bookings found', conflict_count;
  END IF;
END $$;

ALTER TABLE "Booking"
  DROP CONSTRAINT IF EXISTS "booking_no_overlap_active";

ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_no_overlap_claiming_exclusive"
  EXCLUDE USING gist (
    "boatId" WITH =,
    daterange("startDate", ("endDate" + INTERVAL '1 day')::date, '[)') WITH &&
  )
  WHERE (
    "exclusiveSlot" = true
    AND "claimsAvailability" = true
    AND status IN ('PENDING', 'CONFIRMED')
  )
  DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "Booking_exclusiveSlot_claimsAvailability_status_idx"
  ON "Booking"("exclusiveSlot", "claimsAvailability", "status");
