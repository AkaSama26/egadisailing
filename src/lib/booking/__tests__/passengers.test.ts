import { describe, expect, it } from "vitest";
import {
  normalizePassengerBreakdown,
  occupiedSeatCount,
  paidUnitsForService,
  totalGuestCount,
} from "@/lib/booking/passengers";
import {
  DEFAULT_PASSENGER_FARE_CATEGORIES,
  estimatePassengerFareTotal,
} from "@/lib/pricing/passenger-fare-rules-shared";

describe("passenger breakdown pricing helpers", () => {
  it("espone solo fasce passeggeri non sovrapposte", () => {
    expect(
      DEFAULT_PASSENGER_FARE_CATEGORIES.map((category) => ({
        category: category.category,
        ageLabel: category.ageLabel,
      })),
    ).toEqual([
      { category: "ADULT", ageLabel: "10+ anni" },
      { category: "CHILD", ageLabel: "4-9 anni" },
      { category: "INFANT", ageLabel: "0-3 anni" },
    ]);
  });

  it("calcola posti occupati: neonati 0-3 esclusi", () => {
    const passengers = normalizePassengerBreakdown({
      adults: 2,
      children: 1,
      infants: 1,
    });

    expect(occupiedSeatCount(passengers)).toBe(3);
    expect(totalGuestCount(passengers)).toBe(4);
  });

  it("converte il vecchio campo freeChildren in bambini", () => {
    const passengers = normalizePassengerBreakdown({
      adults: 1,
      children: 1,
      freeChildren: 2,
      infants: 1,
    });

    expect(passengers.children).toBe(3);
    expect(passengers.freeChildren).toBe(0);
    expect(occupiedSeatCount(passengers)).toBe(4);
  });

  it("applica il fallback hardcoded bambini solo a BOAT_SHARED", () => {
    const passengers = normalizePassengerBreakdown({
      adults: 2,
      children: 3,
      infants: 1,
    });

    expect(paidUnitsForService("BOAT_SHARED", passengers).toString()).toBe("3.5");
    expect(paidUnitsForService("BOAT_EXCLUSIVE", passengers).toString()).toBe("5");
  });

  it("usa prezzi esatti categoria/stagione quando disponibili", () => {
    const passengers = normalizePassengerBreakdown({
      adults: 1,
      children: 2,
      infants: 1,
    });

    expect(
      estimatePassengerFareTotal({
        serviceType: "BOAT_SHARED",
        pricingUnit: "PER_PERSON",
        unitPrice: 999,
        passengers,
        categoryPrices: [
          { category: "ADULT", amount: 90 },
          { category: "CHILD", amount: 60 },
          { category: "INFANT", amount: 0 },
        ],
      }),
    ).toBe(210);
  });

  it("rifiuta prenotazioni composte solo da neonati", () => {
    expect(() =>
      normalizePassengerBreakdown({
        adults: 0,
        children: 0,
        infants: 1,
      }),
    ).toThrow(/posto/i);
  });
});
