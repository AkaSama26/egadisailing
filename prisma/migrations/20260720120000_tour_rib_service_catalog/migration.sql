-- Add a dedicated tour RIB with the same public booking formats and 2026
-- pricing as the equivalent open-boat services. The existing fishing RIB and
-- fishing charter remain separate.

INSERT INTO "Boat" (
  "id",
  "name",
  "type",
  "description",
  "amenities",
  "images",
  "createdAt",
  "updatedAt"
)
VALUES (
  'tour-rib',
  'Gommone Egadi Sailing',
  'RIB',
  'Gommone Egadi Sailing per tour condivisi ed esclusivi tra Favignana e Levanzo, con soste bagno e snorkeling.',
  '{"seats":12,"shade":true,"swimLadder":true,"snorkeling":true,"safetyEquipment":true}'::jsonb,
  '["/images/boats/tour-rib/tour-rib-main.webp","/images/boats/tour-rib/tour-rib-gallery-02.webp","/images/boats/tour-rib/tour-rib-gallery-03.webp","/images/boats/tour-rib/tour-rib-gallery-04.webp","/images/boats/tour-rib/tour-rib-gallery-05.webp","/images/boats/tour-rib/tour-rib-gallery-06.webp","/images/boats/tour-rib/tour-rib-gallery-07.webp","/images/boats/tour-rib/tour-rib-gallery-08.webp","/images/boats/tour-rib/tour-rib-gallery-09.webp","/images/boats/tour-rib/tour-rib-gallery-10.webp","/images/boats/tour-rib/tour-rib-gallery-11.webp"]'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "description" = EXCLUDED."description",
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
VALUES
  ('rib-shared-full-day', 'Gommone condiviso giornata intera', 'BOAT_SHARED', 'tour-rib', 'FULL_DAY', 8, 12, 1, 'DEPOSIT_BALANCE', 30, 6, 'PER_PERSON', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rib-exclusive-full-day', 'Gommone esclusivo giornata intera', 'BOAT_EXCLUSIVE', 'tour-rib', 'FULL_DAY', 8, 12, NULL, 'DEPOSIT_BALANCE', 30, 9, 'PER_PACKAGE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rib-exclusive-morning', 'Gommone esclusivo mattina', 'BOAT_EXCLUSIVE', 'tour-rib', 'HALF_DAY_MORNING', 4, 12, NULL, 'DEPOSIT_BALANCE', 30, 5, 'PER_PACKAGE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
SELECT
  v."id",
  v."serviceId",
  v."year",
  v."priceBucket",
  v."durationDays",
  v."amount",
  v."pricingUnit",
  CURRENT_TIMESTAMP
FROM (
  VALUES
    ('sp-2026-rib-shared-full-low', 'rib-shared-full-day', 2026, 'LOW', NULL::INTEGER, 75.00::DECIMAL(10,2), 'PER_PERSON'),
    ('sp-2026-rib-shared-full-mid', 'rib-shared-full-day', 2026, 'MID', NULL::INTEGER, 85.00::DECIMAL(10,2), 'PER_PERSON'),
    ('sp-2026-rib-shared-full-high', 'rib-shared-full-day', 2026, 'HIGH', NULL::INTEGER, 100.00::DECIMAL(10,2), 'PER_PERSON'),
    ('sp-2026-rib-excl-full-low', 'rib-exclusive-full-day', 2026, 'LOW', NULL::INTEGER, 900.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-rib-excl-full-mid', 'rib-exclusive-full-day', 2026, 'MID', NULL::INTEGER, 1050.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-rib-excl-full-high', 'rib-exclusive-full-day', 2026, 'HIGH', NULL::INTEGER, 1200.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-rib-excl-morning-low', 'rib-exclusive-morning', 2026, 'LOW', NULL::INTEGER, 630.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-rib-excl-morning-mid', 'rib-exclusive-morning', 2026, 'MID', NULL::INTEGER, 740.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-rib-excl-morning-high', 'rib-exclusive-morning', 2026, 'HIGH', NULL::INTEGER, 840.00::DECIMAL(10,2), 'PER_PACKAGE')
) AS v("id", "serviceId", "year", "priceBucket", "durationDays", "amount", "pricingUnit")
WHERE EXISTS (
  SELECT 1
  FROM "Service" s
  WHERE s."id" = v."serviceId"
)
ON CONFLICT ("serviceId", "year", "priceBucket")
WHERE "priceBucket" IS NOT NULL AND "durationDays" IS NULL
DO UPDATE SET
  "id" = EXCLUDED."id",
  "durationDays" = EXCLUDED."durationDays",
  "amount" = EXCLUDED."amount",
  "pricingUnit" = EXCLUDED."pricingUnit",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Preserve any exact passenger-category prices configured for the equivalent
-- shared open-boat service. The application fallback still applies when the
-- source service has no category-specific row.
INSERT INTO "PassengerFareSeasonPrice" (
  "id",
  "serviceId",
  "year",
  "priceBucket",
  "category",
  "amount",
  "updatedAt"
)
SELECT
  CONCAT(
    'pfs-rib-shared-full-',
    source."year",
    '-',
    LOWER(source."priceBucket"),
    '-',
    LOWER(source."category")
  ),
  'rib-shared-full-day',
  source."year",
  source."priceBucket",
  source."category",
  source."amount",
  CURRENT_TIMESTAMP
FROM "PassengerFareSeasonPrice" source
WHERE source."serviceId" = 'boat-shared-full-day'
ON CONFLICT ("serviceId", "year", "priceBucket", "category") DO UPDATE SET
  "amount" = EXCLUDED."amount",
  "updatedAt" = CURRENT_TIMESTAMP;
