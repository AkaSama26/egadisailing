-- Internal/non-fiscal receipts for the admin panel.

CREATE TYPE "ReceiptLanguage" AS ENUM ('IT', 'EN');
CREATE TYPE "ReceiptStatus" AS ENUM ('ACTIVE', 'CANCELLED');
CREATE TYPE "ReceiptOrigin" AS ENUM ('CUSTOM', 'PAYMENT');
CREATE TYPE "ReceiptVatTreatment" AS ENUM ('VAT_INCLUDED', 'VAT_EXEMPT');

CREATE TABLE "ReceiptSequence" (
  "year" INTEGER NOT NULL,
  "lastSequence" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReceiptSequence_pkey" PRIMARY KEY ("year"),
  CONSTRAINT "chk_receipt_sequence_positive" CHECK ("lastSequence" >= 0)
);

CREATE TABLE "Receipt" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "sequence" INTEGER NOT NULL,
  "origin" "ReceiptOrigin" NOT NULL,
  "language" "ReceiptLanguage" NOT NULL DEFAULT 'IT',
  "status" "ReceiptStatus" NOT NULL DEFAULT 'ACTIVE',
  "issueDate" DATE NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "recipientName" TEXT NOT NULL,
  "recipientEmail" TEXT,
  "recipientAddress" TEXT,
  "recipientTaxId" TEXT,
  "bookingId" TEXT,
  "customerId" TEXT,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "cancelledByUserId" TEXT,

  CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chk_receipt_year" CHECK ("year" BETWEEN 2000 AND 2100),
  CONSTRAINT "chk_receipt_sequence_positive" CHECK ("sequence" > 0),
  CONSTRAINT "chk_receipt_total_amount" CHECK ("totalAmount" >= 0),
  CONSTRAINT "chk_receipt_currency_eur" CHECK ("currency" = 'EUR'),
  CONSTRAINT "chk_receipt_cancelled_fields" CHECK (
    ("status" = 'CANCELLED' AND "cancelledAt" IS NOT NULL)
    OR ("status" = 'ACTIVE' AND "cancelledAt" IS NULL)
  )
);

CREATE TABLE "ReceiptLineItem" (
  "id" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(10,2) NOT NULL,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "vatTreatment" "ReceiptVatTreatment" NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReceiptLineItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chk_receipt_line_quantity" CHECK ("quantity" > 0),
  CONSTRAINT "chk_receipt_line_unit_price" CHECK ("unitPrice" >= 0),
  CONSTRAINT "chk_receipt_line_sort_order" CHECK ("sortOrder" >= 0)
);

CREATE TABLE "ReceiptPayment" (
  "id" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReceiptPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Receipt_number_key" ON "Receipt"("number");
CREATE UNIQUE INDEX "Receipt_year_sequence_key" ON "Receipt"("year", "sequence");
CREATE INDEX "Receipt_status_issueDate_idx" ON "Receipt"("status", "issueDate");
CREATE INDEX "Receipt_origin_idx" ON "Receipt"("origin");
CREATE INDEX "Receipt_bookingId_idx" ON "Receipt"("bookingId");
CREATE INDEX "Receipt_customerId_idx" ON "Receipt"("customerId");
CREATE INDEX "Receipt_recipientName_idx" ON "Receipt"("recipientName");

CREATE INDEX "ReceiptLineItem_receiptId_sortOrder_idx" ON "ReceiptLineItem"("receiptId", "sortOrder");

CREATE UNIQUE INDEX "ReceiptPayment_paymentId_key" ON "ReceiptPayment"("paymentId");
CREATE INDEX "ReceiptPayment_receiptId_idx" ON "ReceiptPayment"("receiptId");

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_cancelledByUserId_fkey"
  FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReceiptLineItem"
  ADD CONSTRAINT "ReceiptLineItem_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReceiptPayment"
  ADD CONSTRAINT "ReceiptPayment_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReceiptPayment"
  ADD CONSTRAINT "ReceiptPayment_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
