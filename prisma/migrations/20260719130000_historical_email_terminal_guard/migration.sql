-- A dedicated tombstone makes the historical cutoff independent from mutable
-- operator notes. Once set, neither the tombstone nor the terminal status can
-- be changed by normal application/SQL writes.
BEGIN;

ALTER TABLE "EmailOutbox"
  ADD COLUMN "historicalDismissedAt" TIMESTAMP(3),
  ADD CONSTRAINT "chk_email_outbox_historical_terminal"
  CHECK ("historicalDismissedAt" IS NULL OR "status" = 'DISMISSED');

CREATE FUNCTION "prevent_historical_email_reactivation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."historicalDismissedAt" IS NOT NULL
     AND (
       NEW."historicalDismissedAt" IS DISTINCT FROM OLD."historicalDismissedAt"
       OR NEW."status" IS DISTINCT FROM 'DISMISSED'
     ) THEN
    RAISE EXCEPTION 'historical EmailOutbox rows are immutable and terminal';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "trg_email_outbox_historical_terminal"
BEFORE UPDATE ON "EmailOutbox"
FOR EACH ROW
EXECUTE FUNCTION "prevent_historical_email_reactivation"();

CREATE FUNCTION "prevent_historical_email_deletion"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."historicalDismissedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'historical EmailOutbox rows cannot be deleted';
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER "trg_email_outbox_historical_no_delete"
BEFORE DELETE ON "EmailOutbox"
FOR EACH ROW
EXECUTE FUNCTION "prevent_historical_email_deletion"();

COMMIT;
