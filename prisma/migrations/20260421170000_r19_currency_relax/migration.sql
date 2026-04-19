-- R19-REG-CRITICA-1: il constraint `currency = 'EUR'` introdotto in R18
-- rompeva i webhook Bokun/Boataround con valute non-EUR (USD, GBP, ecc.
-- arrivano da OTA hub come Viator/GetYourGuide). Al primo cliente USD:
--   PostgreSQL 23514 check_violation → webhook 500 → retry loop Bokun →
--   booking persi silently → double-booking downstream.
-- Fix: relaxare a `length = 3` (ISO 4217 format) + `currency = upper(currency)`.
-- La policy EUR-only resta app-level nell'adapter (forza 'EUR' + preserva
-- original in rawPayload per audit).

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "chk_booking_currency_eur";

ALTER TABLE "Booking"
  ADD CONSTRAINT "chk_booking_currency_iso4217"
  CHECK (length("currency") = 3 AND "currency" = upper("currency"));
