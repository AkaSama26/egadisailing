export const PRICING_UNITS = {
  PER_PERSON: "PER_PERSON",
  PER_PACKAGE: "PER_PACKAGE",
} as const;

export type PricingUnit = (typeof PRICING_UNITS)[keyof typeof PRICING_UNITS];

const PACKAGE_SERVICE_TYPES = new Set([
  "EXCLUSIVE_EXPERIENCE",
  "CABIN_CHARTER",
  "BOAT_EXCLUSIVE",
]);

export function isPackagePricingServiceType(type: string): boolean {
  return PACKAGE_SERVICE_TYPES.has(type);
}

export function effectivePricingUnit(service: {
  type: string;
  pricingUnit?: string | null;
}): PricingUnit {
  if (
    service.pricingUnit === PRICING_UNITS.PER_PACKAGE ||
    isPackagePricingServiceType(service.type)
  ) {
    return PRICING_UNITS.PER_PACKAGE;
  }
  if (service.pricingUnit === PRICING_UNITS.PER_PERSON) return PRICING_UNITS.PER_PERSON;
  return PRICING_UNITS.PER_PERSON;
}
