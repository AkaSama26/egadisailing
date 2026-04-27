DELETE FROM "HotDayOverride"
WHERE "serviceId" IN ('social-boating', 'boat-tour', 'boat-exclusive');

DELETE FROM "PricingPeriod"
WHERE "serviceId" IN ('social-boating', 'boat-tour', 'boat-exclusive');

DELETE FROM "Service" s
WHERE s."id" IN ('social-boating', 'boat-tour', 'boat-exclusive')
  AND NOT EXISTS (
    SELECT 1
    FROM "Booking" b
    WHERE b."serviceId" = s."id"
  );

UPDATE "Service"
SET
  "active" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('social-boating', 'boat-tour', 'boat-exclusive');
