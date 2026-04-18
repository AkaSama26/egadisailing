-- Plan 4: ManualAlert per azioni manuali admin su Click&Boat / Nautal.
CREATE TYPE "ManualAlertStatus" AS ENUM ('PENDING', 'RESOLVED', 'IGNORED');

CREATE TABLE "ManualAlert" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "action" TEXT NOT NULL,
    "status" "ManualAlertStatus" NOT NULL DEFAULT 'PENDING',
    "bookingId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,

    CONSTRAINT "ManualAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManualAlert_status_createdAt_idx" ON "ManualAlert"("status", "createdAt");
CREATE INDEX "ManualAlert_channel_date_idx" ON "ManualAlert"("channel", "date");
