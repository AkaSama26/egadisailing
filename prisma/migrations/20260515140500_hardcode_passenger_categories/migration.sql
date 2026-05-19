-- Passenger categories are now hardcoded in application code:
-- ADULT (10+), CHILD (3-9), INFANT (0-3). The old configurable rules table
-- and FREE_CHILD category are no longer part of the pricing model.

DELETE FROM "PassengerFareSeasonPrice"
WHERE "category" NOT IN ('ADULT', 'CHILD', 'INFANT');

ALTER TABLE "PassengerFareSeasonPrice"
  ADD CONSTRAINT "PassengerFareSeasonPrice_category_check"
  CHECK ("category" IN ('ADULT', 'CHILD', 'INFANT'));

DROP TABLE IF EXISTS "PassengerFareRule";
