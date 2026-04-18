-- Plan 4: dedup per webhook Boataround + email processing.
CREATE TABLE "ProcessedBoataroundEvent" (
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedBoataroundEvent_pkey" PRIMARY KEY ("eventId")
);

CREATE INDEX "ProcessedBoataroundEvent_eventType_processedAt_idx" ON "ProcessedBoataroundEvent"("eventType", "processedAt");
