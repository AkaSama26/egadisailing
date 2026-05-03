ALTER TABLE "public"."Booking"
  ADD COLUMN "checkedInAt" TIMESTAMP(3),
  ADD COLUMN "checkedInByUserId" TEXT;

CREATE INDEX "Booking_checkedInAt_idx" ON "public"."Booking"("checkedInAt");
CREATE INDEX "Booking_checkedInByUserId_idx" ON "public"."Booking"("checkedInByUserId");

ALTER TABLE "public"."Booking"
  ADD CONSTRAINT "Booking_checkedInByUserId_fkey"
  FOREIGN KEY ("checkedInByUserId") REFERENCES "public"."User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
