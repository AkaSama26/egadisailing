-- CreateEnum
CREATE TYPE "OverrideStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'PENDING_RECONCILE_FAILED');

-- CreateTable
CREATE TABLE "OverrideRequest" (
    "id" TEXT NOT NULL,
    "newBookingId" TEXT NOT NULL,
    "conflictingBookingIds" TEXT[],
    "conflictSourceChannels" TEXT[],
    "newBookingRevenue" DECIMAL(10,2) NOT NULL,
    "conflictingRevenueTotal" DECIMAL(10,2) NOT NULL,
    "status" "OverrideStatus" NOT NULL DEFAULT 'PENDING',
    "dropDeadAt" TIMESTAMP(3) NOT NULL,
    "reconcileCheckDue" TIMESTAMP(3),
    "reconcileCheckedAt" TIMESTAMP(3),
    "reminderLevel" INTEGER NOT NULL DEFAULT 0,
    "lastReminderSentAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "decisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OverrideRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OverrideRequest_newBookingId_key" ON "OverrideRequest"("newBookingId");

-- CreateIndex
CREATE INDEX "OverrideRequest_status_dropDeadAt_idx" ON "OverrideRequest"("status", "dropDeadAt");

-- CreateIndex
CREATE INDEX "OverrideRequest_status_createdAt_idx" ON "OverrideRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OverrideRequest_status_lastReminderSentAt_idx" ON "OverrideRequest"("status", "lastReminderSentAt");

-- CreateIndex
CREATE INDEX "OverrideRequest_status_reconcileCheckDue_idx" ON "OverrideRequest"("status", "reconcileCheckDue");

-- AddForeignKey
ALTER TABLE "OverrideRequest" ADD CONSTRAINT "OverrideRequest_newBookingId_fkey" FOREIGN KEY ("newBookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverrideRequest" ADD CONSTRAINT "OverrideRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
