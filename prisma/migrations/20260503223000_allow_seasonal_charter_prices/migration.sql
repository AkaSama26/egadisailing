-- The admin price matrix stores cabin-charter prices by season bucket and
-- duration. The original shape constraint only allowed one of the two fields,
-- so charter matrix saves failed with chk_service_price_shape.

ALTER TABLE "ServicePrice"
  DROP CONSTRAINT IF EXISTS "chk_service_price_shape";

ALTER TABLE "ServicePrice"
  ADD CONSTRAINT "chk_service_price_shape" CHECK (
    ("priceBucket" IS NOT NULL AND "durationDays" IS NULL)
    OR
    ("priceBucket" IS NULL AND "durationDays" IS NOT NULL)
    OR
    ("priceBucket" IS NOT NULL AND "durationDays" IS NOT NULL)
  );

WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "serviceId", "year", "priceBucket", "durationDays"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS rn
  FROM "ServicePrice"
  WHERE "priceBucket" IS NOT NULL
    AND "durationDays" IS NOT NULL
)
DELETE FROM "ServicePrice" sp
USING ranked r
WHERE sp."id" = r."id"
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "ServicePrice_charter_seasonal_unique_idx"
  ON "ServicePrice"("serviceId", "year", "priceBucket", "durationDays")
  WHERE "priceBucket" IS NOT NULL
    AND "durationDays" IS NOT NULL;
