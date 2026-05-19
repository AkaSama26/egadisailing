-- Cleanup for the emergency production repair that recreated the old
-- configurable passenger fare table after main drifted behind the May 15 model.
DROP TABLE IF EXISTS "PassengerFareRule";
