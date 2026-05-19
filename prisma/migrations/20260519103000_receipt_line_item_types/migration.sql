-- Add typed receipt rows: product/service rows and received-payment rows.

CREATE TYPE "ReceiptLineType" AS ENUM ('PRODUCT', 'PAYMENT_RECEIVED');

ALTER TABLE "ReceiptLineItem"
  ADD COLUMN "lineType" "ReceiptLineType" NOT NULL DEFAULT 'PRODUCT',
  ADD COLUMN "paymentType" "PaymentType",
  ADD COLUMN "paymentMethod" "PaymentMethod",
  ADD COLUMN "paymentDate" DATE,
  ADD COLUMN "productLineItemId" TEXT;

ALTER TABLE "ReceiptLineItem"
  ADD CONSTRAINT "ReceiptLineItem_productLineItemId_fkey"
  FOREIGN KEY ("productLineItemId") REFERENCES "ReceiptLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReceiptLineItem"
  ADD CONSTRAINT "chk_receipt_line_type_fields" CHECK (
    (
      "lineType" = 'PRODUCT'
      AND "paymentType" IS NULL
      AND "paymentMethod" IS NULL
      AND "paymentDate" IS NULL
      AND "productLineItemId" IS NULL
    )
    OR
    (
      "lineType" = 'PAYMENT_RECEIVED'
      AND "paymentType" IS NOT NULL
      AND "paymentMethod" IS NOT NULL
    )
  );

CREATE INDEX "ReceiptLineItem_receiptId_lineType_idx" ON "ReceiptLineItem"("receiptId", "lineType");
CREATE INDEX "ReceiptLineItem_productLineItemId_idx" ON "ReceiptLineItem"("productLineItemId");

-- Backfill existing payment-linked receipts with one PAYMENT_RECEIVED row for
-- each linked Payment. Existing line items remain PRODUCT rows.
WITH first_product AS (
  SELECT DISTINCT ON ("receiptId")
    "receiptId",
    "id" AS "productLineItemId"
  FROM "ReceiptLineItem"
  WHERE "lineType" = 'PRODUCT'
  ORDER BY "receiptId", "sortOrder", "id"
), max_sort AS (
  SELECT "receiptId", COALESCE(MAX("sortOrder"), -1) AS "maxSortOrder"
  FROM "ReceiptLineItem"
  GROUP BY "receiptId"
), payment_rows AS (
  SELECT
    rp."receiptId",
    p."id" AS "paymentId",
    p."amount",
    p."type",
    p."method",
    COALESCE(p."processedAt", p."createdAt")::date AS "paymentDate",
    COALESCE(p."processedAt", p."createdAt") AS "paymentDateTime",
    fp."productLineItemId",
    ms."maxSortOrder",
    ROW_NUMBER() OVER (
      PARTITION BY rp."receiptId"
      ORDER BY rp."createdAt", p."createdAt", p."id"
    ) AS rn
  FROM "ReceiptPayment" rp
  JOIN "Payment" p ON p."id" = rp."paymentId"
  LEFT JOIN first_product fp ON fp."receiptId" = rp."receiptId"
  LEFT JOIN max_sort ms ON ms."receiptId" = rp."receiptId"
  WHERE p."status" = 'SUCCEEDED'
    AND p."type" <> 'REFUND'
)
INSERT INTO "ReceiptLineItem" (
  "id",
  "receiptId",
  "lineType",
  "description",
  "quantity",
  "unitPrice",
  "vatTreatment",
  "paymentType",
  "paymentMethod",
  "paymentDate",
  "productLineItemId",
  "sortOrder",
  "createdAt"
)
SELECT
  'rli_pay_' || substr(md5("receiptId" || ':' || "paymentId"), 1, 24),
  "receiptId",
  'PAYMENT_RECEIVED'::"ReceiptLineType",
  CASE "type"
    WHEN 'DEPOSIT' THEN 'Acconto ricevuto'
    WHEN 'BALANCE' THEN 'Saldo ricevuto'
    WHEN 'FULL' THEN 'Pagamento intero ricevuto'
    ELSE 'Pagamento ricevuto'
  END,
  1,
  "amount",
  'VAT_INCLUDED'::"ReceiptVatTreatment",
  "type",
  "method",
  "paymentDate",
  "productLineItemId",
  "maxSortOrder" + rn,
  "paymentDateTime"
FROM payment_rows
ON CONFLICT ("id") DO NOTHING;
