-- R26-A2-1 + R26-P2-ALTA: Payment.currency CHECK constraint (allineato con
-- Booking R19 pattern). Stripe multi-currency o admin bulk-insert con stringa
-- invalida → formatEur NaN downstream. 3-char ISO 4217 upper forza.
-- `NOT VALID` = no scan delle righe esistenti (zero-downtime su prod con
-- >10k Payment). `VALIDATE CONSTRAINT` dopo ALTER scansiona + fallisce solo
-- se esiste riga invalid — admin puo' fixarla + ri-eseguire VALIDATE.
-- In questo progetto pre-launch il DB e' vuoto, VALIDATE passa; in prod
-- con dati legacy il DBA fa il migration e VALIDATE off-hour.
ALTER TABLE "Payment"
  ADD CONSTRAINT "chk_payment_currency_iso4217"
  CHECK (length(currency) = 3 AND currency = upper(currency))
  NOT VALID;
ALTER TABLE "Payment"
  VALIDATE CONSTRAINT "chk_payment_currency_iso4217";

-- R26-A3-H2: pg_trgm GIN index per customer search ILIKE. Senza, admin
-- `/admin/clienti` con 5k+ customer = seq-scan 200-400ms per search,
-- typing laggy. Trigram GIN drop a <10ms.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "customer_search_trgm_idx"
  ON "Customer"
  USING gin ((lower("firstName" || ' ' || "lastName" || ' ' || "email")) gin_trgm_ops);

-- R26-A3-H4: partial index hotDayRule active. Senza, `quotePrice`
-- scan full table su `active: true` + range check. Con 20+ active rules
-- Ferragosto, index-only scan drop a sub-ms.
CREATE INDEX IF NOT EXISTS "hot_day_rule_active_range_idx"
  ON "HotDayRule" ("dateRangeStart", "dateRangeEnd")
  WHERE active = true;

-- R26-A2-4: ConsentRecord FK to Customer + Booking — orphan records
-- risk (developer typo in customerId leaves unreferenced consent row
-- → GDPR art.7.3 prova consenso rotta). FK con SetNull preserva storia
-- audit anche se customer viene anonymized (hard-delete impossibile
-- via Restrict onDelete su Booking → customerId fa passthrough).
-- Idempotent via IF NOT EXISTS su constraint check.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ConsentRecord_customerId_fkey'
  ) THEN
    ALTER TABLE "ConsentRecord"
      ADD CONSTRAINT "ConsentRecord_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ConsentRecord_bookingId_fkey'
  ) THEN
    ALTER TABLE "ConsentRecord"
      ADD CONSTRAINT "ConsentRecord_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- R26-A2-5: BookingNote.authorId FK to User — dangling id dopo user
-- deletion (Plan 7 admin CRUD). SetNull preserva row con audit gap.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BookingNote_authorId_fkey'
  ) THEN
    ALTER TABLE "BookingNote"
      ADD CONSTRAINT "BookingNote_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- R26-A2-7: ManualAlert.bookingId + resolvedByUserId FKs. Analogo pattern.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ManualAlert_bookingId_fkey'
  ) THEN
    ALTER TABLE "ManualAlert"
      ADD CONSTRAINT "ManualAlert_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ManualAlert_resolvedByUserId_fkey'
  ) THEN
    ALTER TABLE "ManualAlert"
      ADD CONSTRAINT "ManualAlert_resolvedByUserId_fkey"
      FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
