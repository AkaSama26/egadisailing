import Decimal from "decimal.js";

/**
 * Convert a money value (Decimal, string, or number) to an integer number of
 * cents, rounding half-up at the 2nd decimal. Always use this before calling
 * Stripe (which wants integer cents).
 */
export function toCents(amount: Decimal | string | number): number {
  return new Decimal(amount).mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

export function fromCents(cents: number): Decimal {
  return new Decimal(cents).div(100);
}

/**
 * Format a money value as "€1.234,56" style (Italian).
 */
const EUR_FORMATTER = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export function formatEur(amount: Decimal | string | number | null | undefined): string {
  if (amount === null || amount === undefined) return "";
  return EUR_FORMATTER.format(new Decimal(amount).toNumber());
}

export function formatEurCents(cents: number): string {
  return formatEur(fromCents(cents));
}
