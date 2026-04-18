-- Plan 4: dedup email charter (SamBoat, Click&Boat, Nautal).
CREATE TABLE "ProcessedCharterEmail" (
    "messageHash" TEXT NOT NULL,
    "platform" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedCharterEmail_pkey" PRIMARY KEY ("messageHash")
);

CREATE INDEX "ProcessedCharterEmail_processedAt_idx" ON "ProcessedCharterEmail"("processedAt");
