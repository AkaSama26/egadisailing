-- Round 5 audit: dedup per webhook Bokun (mirror ProcessedStripeEvent).
CREATE TABLE "ProcessedBokunEvent" (
    "eventId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedBokunEvent_pkey" PRIMARY KEY ("eventId")
);

CREATE INDEX "ProcessedBokunEvent_topic_processedAt_idx" ON "ProcessedBokunEvent"("topic", "processedAt");
