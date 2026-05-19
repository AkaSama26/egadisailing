-- Passenger-category seasonal prices for local master pricing.
-- These rows let BOAT_SHARED use exact category prices per season bucket
-- instead of global percentage/fixed fallback rules.

CREATE TABLE "PassengerFareSeasonPrice" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "priceBucket" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassengerFareSeasonPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PassengerFareSeasonPrice_serviceId_year_priceBucket_category_key"
    ON "PassengerFareSeasonPrice"("serviceId", "year", "priceBucket", "category");

CREATE INDEX "PassengerFareSeasonPrice_serviceId_year_priceBucket_idx"
    ON "PassengerFareSeasonPrice"("serviceId", "year", "priceBucket");

CREATE INDEX "PassengerFareSeasonPrice_year_priceBucket_category_idx"
    ON "PassengerFareSeasonPrice"("year", "priceBucket", "category");

ALTER TABLE "PassengerFareSeasonPrice"
    ADD CONSTRAINT "PassengerFareSeasonPrice_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
