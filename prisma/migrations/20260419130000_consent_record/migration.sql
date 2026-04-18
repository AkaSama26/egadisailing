-- Round 11 — GDPR ConsentRecord (art. 7 prova del consenso).
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "bookingId" TEXT,
    "privacyAccepted" BOOLEAN NOT NULL DEFAULT false,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "policyVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsentRecord_customerId_idx" ON "ConsentRecord"("customerId");
CREATE INDEX "ConsentRecord_bookingId_idx" ON "ConsentRecord"("bookingId");
CREATE INDEX "ConsentRecord_acceptedAt_idx" ON "ConsentRecord"("acceptedAt");
