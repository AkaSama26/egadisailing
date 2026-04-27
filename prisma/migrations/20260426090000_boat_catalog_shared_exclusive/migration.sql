-- Add the second vessel "Barca" and its shared/exclusive product catalog.
-- Prices are intentionally not inserted here: full-day prices will be
-- configured via PricingPeriod; half-day quotes derive at 75% in app logic.

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
  'boat',
  'Barca',
  'MOTORBOAT',
  'Barca Egadisailing per esperienze condivise ed esclusive alle Egadi.',
  '{"seats":12,"shade":true,"swimLadder":true,"snorkeling":true}'::jsonb,
  '[]'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "description" = EXCLUDED."description",
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
  ('boat-shared-full-day', 'Barca condivisa giornata intera', 'BOAT_SHARED', 'boat', 'FULL_DAY', 8, 12, 1, 'DEPOSIT_BALANCE', 30, 6, 'PER_PERSON', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('boat-shared-morning', 'Barca condivisa mattina', 'BOAT_SHARED', 'boat', 'HALF_DAY_MORNING', 4, 12, 1, 'DEPOSIT_BALANCE', 30, 4, 'PER_PERSON', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('boat-shared-afternoon', 'Barca condivisa pomeriggio', 'BOAT_SHARED', 'boat', 'HALF_DAY_AFTERNOON', 4, 12, 1, 'DEPOSIT_BALANCE', 30, 4, 'PER_PERSON', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('boat-exclusive-full-day', 'Barca esclusiva giornata intera', 'BOAT_EXCLUSIVE', 'boat', 'FULL_DAY', 8, 12, NULL, 'DEPOSIT_BALANCE', 30, 9, 'PER_PACKAGE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('boat-exclusive-morning', 'Barca esclusiva mattina', 'BOAT_EXCLUSIVE', 'boat', 'HALF_DAY_MORNING', 4, 12, NULL, 'DEPOSIT_BALANCE', 30, 5, 'PER_PACKAGE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('boat-exclusive-afternoon', 'Barca esclusiva pomeriggio', 'BOAT_EXCLUSIVE', 'boat', 'HALF_DAY_AFTERNOON', 4, 12, NULL, 'DEPOSIT_BALANCE', 30, 5, 'PER_PACKAGE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
