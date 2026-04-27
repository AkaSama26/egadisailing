-- Booking change requests: customer asks, admin decides.

CREATE TYPE "BookingChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

ALTER TABLE "Booking"
  ADD COLUMN "cancellationPolicyAnchorDate" DATE;

CREATE TABLE "BookingChangeRequest" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "originalStartDate" DATE NOT NULL,
  "originalEndDate" DATE NOT NULL,
  "requestedStartDate" DATE NOT NULL,
  "requestedEndDate" DATE NOT NULL,
  "customerNote" TEXT,
  "status" "BookingChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "decidedAt" TIMESTAMP(3),
  "decidedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookingChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingChangeRequest_bookingId_status_idx"
  ON "BookingChangeRequest"("bookingId", "status");

CREATE INDEX "BookingChangeRequest_status_createdAt_idx"
  ON "BookingChangeRequest"("status", "createdAt");

CREATE UNIQUE INDEX "BookingChangeRequest_one_pending_per_booking_idx"
  ON "BookingChangeRequest"("bookingId")
  WHERE "status" = 'PENDING';

ALTER TABLE "BookingChangeRequest"
  ADD CONSTRAINT "BookingChangeRequest_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingChangeRequest"
  ADD CONSTRAINT "BookingChangeRequest_decidedByUserId_fkey"
  FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
