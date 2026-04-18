-- Round 8 Plan 4: partial unique index per prevenire duplicati PENDING
-- di ManualAlert su stesso (channel, boatId, date, action). Previene race
-- tra worker concorrenti anche quando il DB restarta e l'advisory lock
-- app-level non e' ancora stato acquisito.
CREATE UNIQUE INDEX "ManualAlert_unique_pending_idx"
  ON "ManualAlert"("channel", "boatId", "date", "action")
  WHERE "status" = 'PENDING';
