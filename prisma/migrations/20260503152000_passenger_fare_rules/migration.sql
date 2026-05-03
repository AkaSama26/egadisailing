CREATE TABLE "PassengerFareRule" (
  "id" TEXT NOT NULL,
  "serviceType" TEXT NOT NULL DEFAULT 'BOAT_SHARED',
  "category" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "ageLabel" TEXT NOT NULL,
  "pricingMode" TEXT NOT NULL,
  "multiplier" DECIMAL(6,3) NOT NULL DEFAULT 1.0,
  "fixedAmount" DECIMAL(10,2),
  "occupiesSeat" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PassengerFareRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PassengerFareRule_serviceType_category_key"
  ON "PassengerFareRule"("serviceType", "category");

CREATE INDEX "PassengerFareRule_serviceType_sortOrder_idx"
  ON "PassengerFareRule"("serviceType", "sortOrder");

INSERT INTO "PassengerFareRule" (
  "id",
  "serviceType",
  "category",
  "label",
  "ageLabel",
  "pricingMode",
  "multiplier",
  "fixedAmount",
  "occupiesSeat",
  "active",
  "sortOrder"
) VALUES
  ('pfr_boat_shared_adult', 'BOAT_SHARED', 'ADULT', 'Adulti', '10+ anni', 'MULTIPLIER', 1.000, NULL, true, true, 10),
  ('pfr_boat_shared_child', 'BOAT_SHARED', 'CHILD', 'Bambini', '5-9 anni', 'MULTIPLIER', 0.500, NULL, true, true, 20),
  ('pfr_boat_shared_free_child', 'BOAT_SHARED', 'FREE_CHILD', 'Bimbi piccoli', '3-4 anni', 'FIXED', 0.000, 0.00, true, true, 30),
  ('pfr_boat_shared_infant', 'BOAT_SHARED', 'INFANT', 'Neonati', '0-2 anni', 'FIXED', 0.000, 0.00, false, true, 40);
