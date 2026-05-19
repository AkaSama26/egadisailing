export const PASSENGER_FARE_SERVICE_TYPE = "BOAT_SHARED";

export const PASSENGER_FARE_CATEGORIES = ["ADULT", "CHILD", "INFANT"] as const;

export type PassengerFareCategory = (typeof PASSENGER_FARE_CATEGORIES)[number];
export type PassengerFarePricingMode = "MULTIPLIER" | "FIXED";

export interface PassengerFareCategoryConfig {
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

export interface PassengerFareCategoryPriceConfig {
  category: PassengerFareCategory;
  amount: number;
}

export interface PassengerBreakdownLike {
  adults: number;
  children: number;
  infants: number;
}

export const DEFAULT_PASSENGER_FARE_CATEGORIES: PassengerFareCategoryConfig[] = [
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
    ageLabel: "4-9 anni",
    pricingMode: "MULTIPLIER",
    multiplier: 0.5,
    fixedAmount: null,
    occupiesSeat: true,
    active: true,
    sortOrder: 20,
  },
  {
    category: "INFANT",
    label: "Neonati",
    ageLabel: "0-3 anni",
    pricingMode: "FIXED",
    multiplier: 0,
    fixedAmount: 0,
    occupiesSeat: false,
    active: true,
    sortOrder: 30,
  },
];

const CATEGORY_TO_FIELD: Record<PassengerFareCategory, keyof PassengerBreakdownLike> = {
  ADULT: "adults",
  CHILD: "children",
  INFANT: "infants",
};

export function passengerCountForCategory(
  passengers: PassengerBreakdownLike,
  category: PassengerFareCategory,
): number {
  return Math.max(0, Math.trunc(passengers[CATEGORY_TO_FIELD[category]] ?? 0));
}

export function normalizePassengerFareCategoryPrices(
  prices?: Array<Partial<PassengerFareCategoryPriceConfig>> | null,
): PassengerFareCategoryPriceConfig[] {
  const byCategory = new Map<PassengerFareCategory, PassengerFareCategoryPriceConfig>();
  for (const price of prices ?? []) {
    if (!price.category || !PASSENGER_FARE_CATEGORIES.includes(price.category)) continue;
    if (typeof price.amount !== "number" || !Number.isFinite(price.amount)) continue;
    byCategory.set(price.category, {
      category: price.category,
      amount: Math.max(0, price.amount),
    });
  }
  return PASSENGER_FARE_CATEGORIES.flatMap((category) => {
    const price = byCategory.get(category);
    return price ? [price] : [];
  });
}

export function occupiedSeatCountForPassengerCategories(passengers: PassengerBreakdownLike): number {
  return DEFAULT_PASSENGER_FARE_CATEGORIES.reduce((sum, rule) => {
    if (!rule.occupiesSeat) return sum;
    return sum + passengerCountForCategory(passengers, rule.category);
  }, 0);
}

export function totalGuestCountFromBreakdown(passengers: PassengerBreakdownLike): number {
  return PASSENGER_FARE_CATEGORIES.reduce(
    (sum, category) => sum + passengerCountForCategory(passengers, category),
    0,
  );
}

export function estimatePassengerFareTotal(params: {
  serviceType: string;
  pricingUnit: string;
  unitPrice: number;
  passengers: PassengerBreakdownLike;
  categoryPrices?: Array<Partial<PassengerFareCategoryPriceConfig>> | null;
}): number {
  const { serviceType, pricingUnit, unitPrice, passengers, categoryPrices } = params;
  if (pricingUnit === "PER_PACKAGE") return unitPrice;
  if (serviceType !== PASSENGER_FARE_SERVICE_TYPE) {
    return unitPrice * occupiedSeatCountForPassengerCategories(passengers);
  }

  const priceByCategory = new Map(
    normalizePassengerFareCategoryPrices(categoryPrices).map((price) => [price.category, price.amount]),
  );

  return DEFAULT_PASSENGER_FARE_CATEGORIES.reduce((sum, rule) => {
    const count = passengerCountForCategory(passengers, rule.category);
    const seasonalAmount = priceByCategory.get(rule.category);
    if (seasonalAmount !== undefined) {
      return sum + count * seasonalAmount;
    }
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
  categoryPrices?: Array<Partial<PassengerFareCategoryPriceConfig>> | null;
}): number {
  if (params.pricingUnit === "PER_PACKAGE") return 1;
  if (params.unitPrice <= 0) return 0;
  return estimatePassengerFareTotal(params) / params.unitPrice;
}
