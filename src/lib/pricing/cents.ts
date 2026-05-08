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

const EUR_FORMATTER_EN = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
});

const EUR_FORMATTER_ES = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const EUR_FORMATTER_FR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formatEur(
  amount: Decimal | string | number | null | undefined,
  locale?: string | null,
): string {
  if (amount === null || amount === undefined) return "";
  const formatter =
    locale === "en"
      ? EUR_FORMATTER_EN
      : locale === "es"
        ? EUR_FORMATTER_ES
        : locale === "fr"
          ? EUR_FORMATTER_FR
          : EUR_FORMATTER;
  return formatter.format(new Decimal(amount).toNumber());
}

export function formatEurCents(cents: number, locale?: string | null): string {
  return formatEur(fromCents(cents), locale);
}
