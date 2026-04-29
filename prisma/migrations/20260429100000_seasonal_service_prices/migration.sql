-- Seasonal price list from the 2026 operating document.
-- PricingPeriod remains in place as a temporary legacy fallback.

CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "priceBucket" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServicePrice" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "priceBucket" TEXT,
    "durationDays" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "pricingUnit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePrice_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Booking"
  ADD COLUMN "adultCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "childCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "freeChildSeatCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "infantCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Booking"
SET "adultCount" = GREATEST("numPeople", 0)
WHERE "adultCount" = 0
  AND "childCount" = 0
  AND "freeChildSeatCount" = 0
  AND "infantCount" = 0;

ALTER TABLE "Season"
  ADD CONSTRAINT "Season_year_key_key" UNIQUE ("year", "key"),
  ADD CONSTRAINT "chk_season_date_range" CHECK ("endDate" >= "startDate");

ALTER TABLE "ServicePrice"
  ADD CONSTRAINT "ServicePrice_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "chk_service_price_amount" CHECK ("amount" > 0),
  ADD CONSTRAINT "chk_service_price_shape" CHECK (
    (("priceBucket" IS NOT NULL AND "durationDays" IS NULL)
    OR
    ("priceBucket" IS NULL AND "durationDays" IS NOT NULL))
  ),
  ADD CONSTRAINT "chk_service_price_duration" CHECK ("durationDays" IS NULL OR "durationDays" BETWEEN 1 AND 30);

ALTER TABLE "Booking"
  ADD CONSTRAINT "chk_booking_adult_count" CHECK ("adultCount" >= 0),
  ADD CONSTRAINT "chk_booking_child_count" CHECK ("childCount" >= 0),
  ADD CONSTRAINT "chk_booking_free_child_seat_count" CHECK ("freeChildSeatCount" >= 0),
  ADD CONSTRAINT "chk_booking_infant_count" CHECK ("infantCount" >= 0);

CREATE INDEX "Season_year_startDate_endDate_idx" ON "Season"("year", "startDate", "endDate");
CREATE INDEX "Season_year_priceBucket_idx" ON "Season"("year", "priceBucket");
CREATE INDEX "ServicePrice_serviceId_year_priceBucket_durationDays_idx" ON "ServicePrice"("serviceId", "year", "priceBucket", "durationDays");
CREATE INDEX "ServicePrice_year_priceBucket_idx" ON "ServicePrice"("year", "priceBucket");

CREATE UNIQUE INDEX "ServicePrice_seasonal_unique_idx"
  ON "ServicePrice"("serviceId", "year", "priceBucket")
  WHERE "priceBucket" IS NOT NULL AND "durationDays" IS NULL;

CREATE UNIQUE INDEX "ServicePrice_duration_unique_idx"
  ON "ServicePrice"("serviceId", "year", "durationDays")
  WHERE "priceBucket" IS NULL AND "durationDays" IS NOT NULL;

CREATE UNIQUE INDEX "Season_year_date_range_unique_idx"
  ON "Season"("year", "startDate", "endDate");

UPDATE "Service"
SET "capacityMax" = 10
WHERE "id" = 'exclusive-experience';

UPDATE "Service"
SET "capacityMax" = 6
WHERE "id" = 'cabin-charter';

UPDATE "Service"
SET "active" = FALSE
WHERE "id" IN ('charter-3-days', 'charter-4-days', 'charter-5-days', 'charter-6-days', 'charter-7-days');

INSERT INTO "Season" ("id", "year", "key", "label", "startDate", "endDate", "priceBucket", "updatedAt")
VALUES
  ('season-2026-low', 2026, 'LOW', 'Bassa stagione', DATE '2026-04-01', DATE '2026-06-15', 'LOW', CURRENT_TIMESTAMP),
  ('season-2026-mid', 2026, 'MID', 'Media stagione', DATE '2026-06-16', DATE '2026-07-15', 'MID', CURRENT_TIMESTAMP),
  ('season-2026-high', 2026, 'HIGH', 'Alta stagione', DATE '2026-07-16', DATE '2026-09-15', 'HIGH', CURRENT_TIMESTAMP),
  ('season-2026-late-low', 2026, 'LATE_LOW', 'Bassa tardiva', DATE '2026-09-16', DATE '2026-10-31', 'LOW', CURRENT_TIMESTAMP);

INSERT INTO "ServicePrice" ("id", "serviceId", "year", "priceBucket", "durationDays", "amount", "pricingUnit", "updatedAt")
SELECT v."id", v."serviceId", v."year", v."priceBucket", v."durationDays", v."amount", v."pricingUnit", CURRENT_TIMESTAMP
FROM (
  VALUES
    ('sp-2026-gourmet-low', 'exclusive-experience', 2026, 'LOW', NULL::INTEGER, 2000.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-gourmet-mid', 'exclusive-experience', 2026, 'MID', NULL::INTEGER, 2200.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-gourmet-high', 'exclusive-experience', 2026, 'HIGH', NULL::INTEGER, 2500.00::DECIMAL(10,2), 'PER_PACKAGE'),

    ('sp-2026-boat-excl-full-low', 'boat-exclusive-full-day', 2026, 'LOW', NULL::INTEGER, 900.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-boat-excl-full-mid', 'boat-exclusive-full-day', 2026, 'MID', NULL::INTEGER, 1050.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-boat-excl-full-high', 'boat-exclusive-full-day', 2026, 'HIGH', NULL::INTEGER, 1200.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-boat-excl-morning-low', 'boat-exclusive-morning', 2026, 'LOW', NULL::INTEGER, 630.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-boat-excl-morning-mid', 'boat-exclusive-morning', 2026, 'MID', NULL::INTEGER, 740.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-boat-excl-morning-high', 'boat-exclusive-morning', 2026, 'HIGH', NULL::INTEGER, 840.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-boat-excl-afternoon-low', 'boat-exclusive-afternoon', 2026, 'LOW', NULL::INTEGER, 630.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-boat-excl-afternoon-mid', 'boat-exclusive-afternoon', 2026, 'MID', NULL::INTEGER, 740.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-boat-excl-afternoon-high', 'boat-exclusive-afternoon', 2026, 'HIGH', NULL::INTEGER, 840.00::DECIMAL(10,2), 'PER_PACKAGE'),

    ('sp-2026-boat-shared-full-low', 'boat-shared-full-day', 2026, 'LOW', NULL::INTEGER, 75.00::DECIMAL(10,2), 'PER_PERSON'),
    ('sp-2026-boat-shared-full-mid', 'boat-shared-full-day', 2026, 'MID', NULL::INTEGER, 85.00::DECIMAL(10,2), 'PER_PERSON'),
    ('sp-2026-boat-shared-full-high', 'boat-shared-full-day', 2026, 'HIGH', NULL::INTEGER, 100.00::DECIMAL(10,2), 'PER_PERSON'),
    ('sp-2026-boat-shared-morning-low', 'boat-shared-morning', 2026, 'LOW', NULL::INTEGER, 55.00::DECIMAL(10,2), 'PER_PERSON'),
    ('sp-2026-boat-shared-morning-mid', 'boat-shared-morning', 2026, 'MID', NULL::INTEGER, 65.00::DECIMAL(10,2), 'PER_PERSON'),
    ('sp-2026-boat-shared-morning-high', 'boat-shared-morning', 2026, 'HIGH', NULL::INTEGER, 75.00::DECIMAL(10,2), 'PER_PERSON'),
    ('sp-2026-boat-shared-afternoon-low', 'boat-shared-afternoon', 2026, 'LOW', NULL::INTEGER, 55.00::DECIMAL(10,2), 'PER_PERSON'),
    ('sp-2026-boat-shared-afternoon-mid', 'boat-shared-afternoon', 2026, 'MID', NULL::INTEGER, 65.00::DECIMAL(10,2), 'PER_PERSON'),
    ('sp-2026-boat-shared-afternoon-high', 'boat-shared-afternoon', 2026, 'HIGH', NULL::INTEGER, 75.00::DECIMAL(10,2), 'PER_PERSON'),

    ('sp-2026-charter-3', 'cabin-charter', 2026, NULL::TEXT, 3, 3250.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-charter-4', 'cabin-charter', 2026, NULL::TEXT, 4, 4300.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-charter-5', 'cabin-charter', 2026, NULL::TEXT, 5, 5400.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-charter-6', 'cabin-charter', 2026, NULL::TEXT, 6, 6450.00::DECIMAL(10,2), 'PER_PACKAGE'),
    ('sp-2026-charter-7', 'cabin-charter', 2026, NULL::TEXT, 7, 7500.00::DECIMAL(10,2), 'PER_PACKAGE')
) AS v("id", "serviceId", "year", "priceBucket", "durationDays", "amount", "pricingUnit")
WHERE EXISTS (SELECT 1 FROM "Service" s WHERE s."id" = v."serviceId");
