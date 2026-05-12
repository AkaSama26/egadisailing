-- Add the dedicated fishing RIB and its full-day private fishing charter.
-- This is a data migration only: it reuses Boat, Service and ServicePrice.

INSERT INTO "Boat" (
  "id",
  "name",
  "type",
  "description",
  "engineHp",
  "amenities",
  "images",
  "createdAt",
  "updatedAt"
)
VALUES (
  'fishing-rib',
  'Gommone Pesca',
  'RIB',
  'Gommone dedicato alle uscite di pesca sportiva alle Isole Egadi, con setup tecnico per piccoli gruppi fino a 4 persone.',
  NULL,
  '{"seats":4,"shade":true,"fishingGear":true,"professionalRods":true,"bait":true,"cooler":true,"safetyEquipment":true}'::jsonb,
  '["/images/boats/fishing-rib/fishing-rib-hero.webp","/images/boats/fishing-rib/fishing-rib-deck.webp","/images/boats/fishing-rib/fishing-rib-navigation.webp"]'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "description" = EXCLUDED."description",
  "engineHp" = EXCLUDED."engineHp",
  "amenities" = EXCLUDED."amenities",
  "images" = EXCLUDED."images",
  "updatedAt" = CURRENT_TIMESTAMP;

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
VALUES (
  'fishing-full-day',
  'Charter pesca Egadi giornata intera',
  'BOAT_EXCLUSIVE',
  'fishing-rib',
  'FULL_DAY',
  8,
  4,
  NULL,
  'DEPOSIT_BALANCE',
  30,
  3,
  'PER_PACKAGE',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
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

INSERT INTO "ServicePrice" (
  "id",
  "serviceId",
  "year",
  "priceBucket",
  "durationDays",
  "amount",
  "pricingUnit",
  "updatedAt"
)
SELECT v."id", v."serviceId", v."year", v."priceBucket", v."durationDays", v."amount", v."pricingUnit", CURRENT_TIMESTAMP
FROM (
  VALUES
    ('sp-2026-fishing-low', 'fishing-full-day', 2026, 'LOW', NULL::INTEGER, 800.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-fishing-mid', 'fishing-full-day', 2026, 'MID', NULL::INTEGER, 1000.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-fishing-high', 'fishing-full-day', 2026, 'HIGH', NULL::INTEGER, 1000.00::DECIMAL(10,2), 'PER_PACKAGE')
) AS v("id", "serviceId", "year", "priceBucket", "durationDays", "amount", "pricingUnit")
WHERE EXISTS (SELECT 1 FROM "Service" s WHERE s."id" = v."serviceId")
ON CONFLICT ("serviceId", "year", "priceBucket")
WHERE "priceBucket" IS NOT NULL AND "durationDays" IS NULL
DO UPDATE SET
  "id" = EXCLUDED."id",
  "serviceId" = EXCLUDED."serviceId",
  "year" = EXCLUDED."year",
  "priceBucket" = EXCLUDED."priceBucket",
  "durationDays" = EXCLUDED."durationDays",
  "amount" = EXCLUDED."amount",
  "pricingUnit" = EXCLUDED."pricingUnit",
  "updatedAt" = CURRENT_TIMESTAMP;
