-- Bókun imports historically forced every booking to exclusiveSlot=true,
-- including shared tours. Restore the catalog semantics used by the original
-- availability-ownership migration: only whole-boat services are exclusive.
UPDATE "Booking" AS b
SET "exclusiveSlot" = false
FROM "Service" AS s
WHERE s."id" = b."serviceId"
  AND s."type" NOT IN ('EXCLUSIVE_EXPERIENCE', 'CABIN_CHARTER', 'BOAT_EXCLUSIVE')
  AND b."exclusiveSlot" = true;
