-- R17-SEC-#3: DirectBooking.stripePaymentIntentId @unique previene double-payment
-- via retry wizard che creava 2 PaymentIntent separati per lo stesso booking.
-- Con unique constraint, la seconda INSERT fallisce con P2002 → il caller retry
-- riceve errore e deve riutilizzare il PI esistente (idempotency-key client-side).
-- Partial unique WHERE NOT NULL perche' il campo puo' essere null durante creazione.

CREATE UNIQUE INDEX IF NOT EXISTS "DirectBooking_stripePaymentIntentId_key"
  ON "DirectBooking"("stripePaymentIntentId")
  WHERE "stripePaymentIntentId" IS NOT NULL;
