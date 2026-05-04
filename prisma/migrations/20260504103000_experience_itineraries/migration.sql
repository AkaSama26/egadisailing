CREATE TABLE "ExperienceItineraryStep" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "timeIt" TEXT NOT NULL,
    "timeEn" TEXT,
    "titleIt" TEXT,
    "titleEn" TEXT,
    "locationIt" TEXT,
    "locationEn" TEXT,
    "textIt" TEXT NOT NULL,
    "textEn" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperienceItineraryStep_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExperienceItineraryStep_serviceId_sortOrder_idx"
  ON "ExperienceItineraryStep"("serviceId", "sortOrder");

ALTER TABLE "ExperienceItineraryStep"
  ADD CONSTRAINT "ExperienceItineraryStep_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
