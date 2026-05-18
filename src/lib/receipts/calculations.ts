import Decimal from "decimal.js";

export interface ReceiptLineAmountInput {
  quantity: Decimal.Value;
  unitPrice: Decimal.Value;
}

export function normalizeMoney(value: Decimal.Value): Decimal {
  const amount = new Decimal(value);
  if (!amount.isFinite()) {
    throw new Error("Amount must be finite");
  }
  return amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function normalizeQuantity(value: Decimal.Value): Decimal {
  const quantity = new Decimal(value);
  if (!quantity.isFinite()) {
    throw new Error("Quantity must be finite");
  }
  return quantity.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function computeReceiptLineTotal(line: ReceiptLineAmountInput): Decimal {
  return normalizeQuantity(line.quantity)
    .mul(normalizeMoney(line.unitPrice))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function computeReceiptTotal(lines: ReceiptLineAmountInput[]): Decimal {
  return lines
    .reduce((sum, line) => sum.plus(computeReceiptLineTotal(line)), new Decimal(0))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

