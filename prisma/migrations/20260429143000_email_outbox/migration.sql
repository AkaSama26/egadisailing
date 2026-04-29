CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "replyToEmail" TEXT,
    "replyToName" TEXT,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "brevoMessageId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "bookingId" TEXT,
    "customerId" TEXT,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EmailOutbox"
  ADD CONSTRAINT "EmailOutbox_idempotencyKey_key" UNIQUE ("idempotencyKey"),
  ADD CONSTRAINT "EmailOutbox_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "EmailOutbox_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "chk_email_outbox_status"
    CHECK ("status" IN ('PENDING', 'SENDING', 'SENT', 'FAILED'));

CREATE INDEX "EmailOutbox_status_nextAttemptAt_idx" ON "EmailOutbox"("status", "nextAttemptAt");
CREATE INDEX "EmailOutbox_bookingId_idx" ON "EmailOutbox"("bookingId");
CREATE INDEX "EmailOutbox_customerId_idx" ON "EmailOutbox"("customerId");
CREATE INDEX "EmailOutbox_templateKey_createdAt_idx" ON "EmailOutbox"("templateKey", "createdAt");
