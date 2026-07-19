-- Migrazione volutamente additiva e compatibile con il container precedente:
-- il tipo della colonna resta TEXT; estendiamo soltanto il vincolo esistente.
BEGIN;

ALTER TABLE "EmailOutbox"
  DROP CONSTRAINT IF EXISTS "chk_email_outbox_status",
  ADD CONSTRAINT "chk_email_outbox_status"
  CHECK ("status" IN ('PENDING', 'SENDING', 'SENT', 'FAILED', 'DISMISSED'));

ALTER TABLE "EmailOutbox"
  ADD COLUMN "deliveryStartedAt" TIMESTAMP(3),
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "resolvedByUserId" TEXT,
  ADD COLUMN "resolutionReason" TEXT;

ALTER TABLE "EmailOutbox"
  ADD CONSTRAINT "EmailOutbox_resolvedByUserId_fkey"
  FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "EmailOutbox_resolvedByUserId_idx"
  ON "EmailOutbox"("resolvedByUserId");

ALTER TABLE "EmailOutbox"
  ADD CONSTRAINT "chk_email_outbox_dismissed_resolution"
  CHECK (
    "status" <> 'DISMISSED'
    OR (
      "resolvedAt" IS NOT NULL
      AND "resolutionReason" IS NOT NULL
      AND length(btrim("resolutionReason")) > 0
    )
  );

COMMIT;
