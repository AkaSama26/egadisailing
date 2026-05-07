import type Decimal from "decimal.js";
import { formatEur, formatEurCents } from "@/lib/pricing/cents";
import { appendVatIncluded } from "@/lib/pricing/vat-label";

export { appendVatIncluded, vatIncludedLabel } from "@/lib/pricing/vat-label";

export function formatEurWithVat(
  amount: Decimal | string | number | null | undefined,
  locale?: string,
): string {
  const value = formatEur(amount, locale);
  return value ? appendVatIncluded(value, locale) : value;
}

export function formatEurCentsWithVat(cents: number, locale?: string): string {
  return appendVatIncluded(formatEurCents(cents, locale), locale);
}
