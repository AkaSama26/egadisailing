export const PASSENGER_FARE_SERVICE_TYPE = "BOAT_SHARED";

export const PASSENGER_FARE_CATEGORIES = [
  "ADULT",
  "CHILD",
  "FREE_CHILD",
  "INFANT",
] as const;

export type PassengerFareCategory = (typeof PASSENGER_FARE_CATEGORIES)[number];
export type PassengerFarePricingMode = "MULTIPLIER" | "FIXED";

export interface PassengerFareRuleConfig {
  category: PassengerFareCategory;
  label: string;
  ageLabel: string;
  pricingMode: PassengerFarePricingMode;
  multiplier: number;
  fixedAmount: number | null;
  occupiesSeat: boolean;
  active: boolean;
  sortOrder: number;
}

export interface PassengerBreakdownLike {
  adults: number;
  children: number;
  freeChildren: number;
  infants: number;
}

export const DEFAULT_PASSENGER_FARE_RULES: PassengerFareRuleConfig[] = [
  {
    category: "ADULT",
    label: "Adulti",
    ageLabel: "10+ anni",
    pricingMode: "MULTIPLIER",
    multiplier: 1,
    fixedAmount: null,
    occupiesSeat: true,
    active: true,
    sortOrder: 10,
  },
  {
    category: "CHILD",
    label: "Bambini",
    ageLabel: "5-9 anni",
    pricingMode: "MULTIPLIER",
    multiplier: 0.5,
    fixedAmount: null,
    occupiesSeat: true,
    active: true,
    sortOrder: 20,
  },
  {
    category: "FREE_CHILD",
    label: "Bimbi piccoli",
    ageLabel: "3-4 anni",
    pricingMode: "FIXED",
    multiplier: 0,
    fixedAmount: 0,
    occupiesSeat: true,
    active: true,
    sortOrder: 30,
  },
  {
    category: "INFANT",
    label: "Neonati",
    ageLabel: "0-2 anni",
    pricingMode: "FIXED",
    multiplier: 0,
    fixedAmount: 0,
    occupiesSeat: false,
    active: true,
    sortOrder: 40,
  },
];

const CATEGORY_TO_FIELD: Record<PassengerFareCategory, keyof PassengerBreakdownLike> = {
  ADULT: "adults",
  CHILD: "children",
  FREE_CHILD: "freeChildren",
  INFANT: "infants",
};

export function passengerCountForCategory(
  passengers: PassengerBreakdownLike,
  category: PassengerFareCategory,
): number {
  return Math.max(0, Math.trunc(passengers[CATEGORY_TO_FIELD[category]] ?? 0));
}

export function normalizePassengerFareRules(
  rules?: Array<Partial<PassengerFareRuleConfig>> | null,
): PassengerFareRuleConfig[] {
  const byCategory = new Map<PassengerFareCategory, Partial<PassengerFareRuleConfig>>();
  for (const rule of rules ?? []) {
    if (rule.category && PASSENGER_FARE_CATEGORIES.includes(rule.category)) {
      byCategory.set(rule.category, rule);
    }
  }

  return DEFAULT_PASSENGER_FARE_RULES.map((fallback) => {
    const override = byCategory.get(fallback.category);
    return {
      ...fallback,
      ...override,
      category: fallback.category,
      multiplier:
        typeof override?.multiplier === "number" && Number.isFinite(override.multiplier)
          ? Math.max(0, override.multiplier)
          : fallback.multiplier,
      fixedAmount:
        typeof override?.fixedAmount === "number" && Number.isFinite(override.fixedAmount)
          ? Math.max(0, override.fixedAmount)
          : fallback.fixedAmount,
      sortOrder:
        typeof override?.sortOrder === "number" && Number.isFinite(override.sortOrder)
          ? override.sortOrder
          : fallback.sortOrder,
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function occupiedSeatCountForRules(
  passengers: PassengerBreakdownLike,
  rules?: Array<Partial<PassengerFareRuleConfig>> | null,
): number {
  return normalizePassengerFareRules(rules).reduce((sum, rule) => {
    if (!rule.active || !rule.occupiesSeat) return sum;
    return sum + passengerCountForCategory(passengers, rule.category);
  }, 0);
}

export function totalGuestCountFromBreakdown(passengers: PassengerBreakdownLike): number {
  return PASSENGER_FARE_CATEGORIES.reduce(
    (sum, category) => sum + passengerCountForCategory(passengers, category),
    0,
  );
}

export function inactivePassengerCategories(
  passengers: PassengerBreakdownLike,
  rules?: Array<Partial<PassengerFareRuleConfig>> | null,
): PassengerFareRuleConfig[] {
  return normalizePassengerFareRules(rules).filter(
    (rule) => !rule.active && passengerCountForCategory(passengers, rule.category) > 0,
  );
}

export function sanitizePassengerBreakdownForRules<T extends PassengerBreakdownLike>(
  passengers: T,
  rules?: Array<Partial<PassengerFareRuleConfig>> | null,
): T {
  const next: PassengerBreakdownLike = { ...passengers };
  for (const rule of normalizePassengerFareRules(rules)) {
    if (rule.active) continue;
    next[CATEGORY_TO_FIELD[rule.category]] = 0;
  }
  return next as T;
}

export function estimatePassengerFareTotal(params: {
  serviceType: string;
  pricingUnit: string;
  unitPrice: number;
  passengers: PassengerBreakdownLike;
  rules?: Array<Partial<PassengerFareRuleConfig>> | null;
}): number {
  const { serviceType, pricingUnit, unitPrice, passengers, rules } = params;
  if (pricingUnit === "PER_PACKAGE") return unitPrice;
  if (serviceType !== PASSENGER_FARE_SERVICE_TYPE) {
    return unitPrice * occupiedSeatCountForRules(passengers);
  }

  return normalizePassengerFareRules(rules).reduce((sum, rule) => {
    if (!rule.active) return sum;
    const count = passengerCountForCategory(passengers, rule.category);
    if (rule.pricingMode === "FIXED") {
      return sum + count * (rule.fixedAmount ?? 0);
    }
    return sum + count * unitPrice * rule.multiplier;
  }, 0);
}

export function estimatePaidUnitEquivalent(params: {
  serviceType: string;
  pricingUnit: string;
  unitPrice: number;
  passengers: PassengerBreakdownLike;
  rules?: Array<Partial<PassengerFareRuleConfig>> | null;
}): number {
  if (params.pricingUnit === "PER_PACKAGE") return 1;
  if (params.unitPrice <= 0) return 0;
  return estimatePassengerFareTotal(params) / params.unitPrice;
}
