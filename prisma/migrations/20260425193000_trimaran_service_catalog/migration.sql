INSERT INTO "Boat" (
  "id",
  "name",
  "type",
  "description",
  "length",
  "year",
  "cabins",
  "engineHp",
  "amenities",
  "images",
  "createdAt",
  "updatedAt"
)
VALUES (
  'trimarano',
  'Trimarano Egadisailing',
  'trimaran',
  'Trimarano per esperienze gourmet e charter alle Egadi',
  NULL,
  NULL,
  NULL,
  NULL,
  '[]'::jsonb,
  '[]'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

UPDATE "Service"
SET
  "active" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('social-boating', 'boat-tour', 'boat-exclusive');

UPDATE "Service"
SET
  "name" = 'Esperienza Gourmet',
  "type" = 'EXCLUSIVE_EXPERIENCE',
  "boatId" = 'trimarano',
  "durationType" = 'FULL_DAY',
  "durationHours" = 8,
  "capacityMax" = 20,
  "minPaying" = NULL,
  "defaultPaymentSchedule" = 'DEPOSIT_BALANCE',
  "defaultDepositPercentage" = 30,
  "priority" = 8,
  "pricingUnit" = 'PER_PACKAGE',
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'exclusive-experience';

INSERT INTO "Service" (
  "id",
  "name",
  "type",
  "boatId",
  "durationType",
  "durationHours",
  "capacityMax",
  "minPaying",
  "defaultPaymentSchedule",
  "defaultDepositPercentage",
  "priority",
  "pricingUnit",
  "active",
  "createdAt",
  "updatedAt"
)
VALUES
  ('exclusive-experience', 'Esperienza Gourmet', 'EXCLUSIVE_EXPERIENCE', 'trimarano', 'FULL_DAY', 8, 20, NULL, 'DEPOSIT_BALANCE', 30, 8, 'PER_PACKAGE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('charter-3-days', 'Esperienza Charter 3 giorni', 'CABIN_CHARTER', 'trimarano', 'MULTI_DAY', 72, 8, NULL, 'DEPOSIT_BALANCE', 30, 10, 'PER_PACKAGE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('charter-4-days', 'Esperienza Charter 4 giorni', 'CABIN_CHARTER', 'trimarano', 'MULTI_DAY', 96, 8, NULL, 'DEPOSIT_BALANCE', 30, 10, 'PER_PACKAGE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('charter-5-days', 'Esperienza Charter 5 giorni', 'CABIN_CHARTER', 'trimarano', 'MULTI_DAY', 120, 8, NULL, 'DEPOSIT_BALANCE', 30, 10, 'PER_PACKAGE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('charter-6-days', 'Esperienza Charter 6 giorni', 'CABIN_CHARTER', 'trimarano', 'MULTI_DAY', 144, 8, NULL, 'DEPOSIT_BALANCE', 30, 10, 'PER_PACKAGE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cabin-charter', 'Esperienza Charter 7 giorni', 'CABIN_CHARTER', 'trimarano', 'MULTI_DAY', 168, 8, NULL, 'DEPOSIT_BALANCE', 30, 10, 'PER_PACKAGE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "boatId" = EXCLUDED."boatId",
  "durationType" = EXCLUDED."durationType",
  "durationHours" = EXCLUDED."durationHours",
  "capacityMax" = EXCLUDED."capacityMax",
  "minPaying" = EXCLUDED."minPaying",
  "defaultPaymentSchedule" = EXCLUDED."defaultPaymentSchedule",
  "defaultDepositPercentage" = EXCLUDED."defaultDepositPercentage",
  "priority" = EXCLUDED."priority",
  "pricingUnit" = EXCLUDED."pricingUnit",
  "active" = EXCLUDED."active",
  "updatedAt" = CURRENT_TIMESTAMP;
