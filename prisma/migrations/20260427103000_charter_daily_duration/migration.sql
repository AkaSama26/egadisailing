UPDATE "Service"
SET
  "name" = 'Esperienza Charter',
  "durationType" = 'MULTI_DAY',
  "durationHours" = 72,
  "pricingUnit" = 'PER_PACKAGE',
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'cabin-charter';

UPDATE "Service"
SET
  "active" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('charter-3-days', 'charter-4-days', 'charter-5-days', 'charter-6-days');
