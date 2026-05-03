import Decimal from "decimal.js";
import { db } from "@/lib/db";
import {
  DEFAULT_PASSENGER_FARE_RULES,
  PASSENGER_FARE_SERVICE_TYPE,
  normalizePassengerFareRules,
  passengerCountForCategory,
  occupiedSeatCountForRules,
  type PassengerBreakdownLike,
  type PassengerFareRuleConfig,
} from "./passenger-fare-rules-shared";

export async function getPassengerFareRulesForServiceType(
  serviceType: string,
): Promise<PassengerFareRuleConfig[]> {
  if (serviceType !== PASSENGER_FARE_SERVICE_TYPE) {
    return DEFAULT_PASSENGER_FARE_RULES;
  }

  const rows = await db.passengerFareRule.findMany({
    where: { serviceType },
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }],
  });

  return normalizePassengerFareRules(
    rows.map((row) => ({
      category: row.category as PassengerFareRuleConfig["category"],
      label: row.label,
      ageLabel: row.ageLabel,
      pricingMode: row.pricingMode as PassengerFareRuleConfig["pricingMode"],
      multiplier: Number(row.multiplier),
      fixedAmount: row.fixedAmount == null ? null : Number(row.fixedAmount),
      occupiesSeat: row.occupiesSeat,
      active: row.active,
      sortOrder: row.sortOrder,
    })),
  );
}

export function calculatePassengerFareTotal(params: {
  serviceType: string;
  pricingUnit: string;
  unitPrice: Decimal;
  passengers: PassengerBreakdownLike;
  rules?: PassengerFareRuleConfig[] | null;
}): Decimal {
  const { serviceType, pricingUnit, unitPrice, passengers, rules } = params;
  if (pricingUnit === "PER_PACKAGE") return unitPrice;
  if (serviceType !== PASSENGER_FARE_SERVICE_TYPE) {
    return unitPrice.mul(occupiedSeatCountForRules(passengers));
  }

  return normalizePassengerFareRules(rules).reduce((sum, rule) => {
    if (!rule.active) return sum;
    const count = passengerCountForCategory(passengers, rule.category);
    if (rule.pricingMode === "FIXED") {
      return sum.plus(new Decimal(rule.fixedAmount ?? 0).mul(count));
    }
    return sum.plus(unitPrice.mul(rule.multiplier).mul(count));
  }, new Decimal(0));
}
