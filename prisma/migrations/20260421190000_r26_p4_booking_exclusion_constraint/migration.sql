-- R26-P4 (audit double-book Agent 3 #1): DB-level double-booking prevention.
--
-- Prima di questo fix, TUTTA la prevenzione double-booking era app-level
-- (advisory lock + pre-check). Un nuovo code path che dimentica
-- l'advisory lock, un admin edit psql diretto, o una migration rollback
-- permetteva 2 Booking CONFIRMED sullo stesso boat+date senza alcuna
-- rilevazione DB.
--
-- Con questo EXCLUDE constraint + btree_gist:
-- - Il DB rifiuta l'INSERT/UPDATE se esiste gia' un Booking attivo
--   (PENDING o CONFIRMED) con stesso boat + date range overlapping.
-- - Postgres ritorna error 23P01 (exclusion_violation).
-- - I path applicativi esistenti (createPendingDirectBooking, Bokun
--   webhook adapter, Boataround, charter email parser) gia' hanno
--   advisory lock + pre-check, quindi non dovrebbero mai colpire il
--   constraint in flow normale. E' defense-in-depth CONTRO bug futuri +
--   path non testati.
--
-- Multi-round deferred: R7, R14, R18 go-live blocker noted.
--
-- Semantica daterange: `[startDate, endDate + 1 day)` — half-open
-- convenzione Postgres (include start, escludi end+1). Un booking che
-- finisce 15/07 e uno che inizia 16/07 NON overlappano. Se volessimo
-- enforce buffer giorno (turnover cleaning), bumpare a +2.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_no_overlap_active"
  EXCLUDE USING gist (
    "boatId" WITH =,
    daterange("startDate", ("endDate" + INTERVAL '1 day')::date, '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'))
  DEFERRABLE INITIALLY IMMEDIATE;
