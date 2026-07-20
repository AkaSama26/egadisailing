-- Billing identity snapshot for every new direct booking.
-- Existing and externally imported bookings intentionally remain without a row.

CREATE TABLE "BookingBillingDetails" (
  "bookingId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "taxId" TEXT,
  "addressLine1" TEXT NOT NULL,
  "addressLine2" TEXT,
  "city" TEXT NOT NULL,
  "province" TEXT,
  "postalCode" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "nationality" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BookingBillingDetails_pkey" PRIMARY KEY ("bookingId"),
  CONSTRAINT "chk_booking_billing_country" CHECK ("countryCode" ~ '^[A-Z]{2}$'),
  CONSTRAINT "chk_booking_billing_nationality" CHECK ("nationality" ~ '^[A-Z]{2}$'),
  CONSTRAINT "chk_booking_billing_required_text" CHECK (
    btrim("firstName") <> '' AND
    btrim("lastName") <> '' AND
    btrim("addressLine1") <> '' AND
    btrim("city") <> '' AND
    btrim("postalCode") <> ''
  ),
  CONSTRAINT "chk_booking_billing_italy" CHECK (
    "countryCode" <> 'IT' OR (
      "taxId" ~ '^[A-Z0-9]{16}$' AND
      btrim(COALESCE("province", '')) <> ''
    )
  )
);

CREATE INDEX "BookingBillingDetails_countryCode_idx"
  ON "BookingBillingDetails"("countryCode");
CREATE INDEX "BookingBillingDetails_taxId_idx"
  ON "BookingBillingDetails"("taxId");

ALTER TABLE "BookingBillingDetails"
  ADD CONSTRAINT "BookingBillingDetails_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
