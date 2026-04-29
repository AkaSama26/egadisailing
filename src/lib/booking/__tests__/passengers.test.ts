import { describe, expect, it } from "vitest";
import {
  normalizePassengerBreakdown,
  occupiedSeatCount,
  paidUnitsForService,
  totalGuestCount,
} from "@/lib/booking/passengers";

describe("passenger breakdown pricing helpers", () => {
  it("calcola posti occupati: neonati 0-2 esclusi", () => {
    const passengers = normalizePassengerBreakdown({
      adults: 2,
      children: 1,
      freeChildren: 1,
      infants: 1,
    });

    expect(occupiedSeatCount(passengers)).toBe(4);
    expect(totalGuestCount(passengers)).toBe(5);
  });

  it("applica sconto bambini solo a BOAT_SHARED", () => {
    const passengers = normalizePassengerBreakdown({
      adults: 2,
      children: 2,
      freeChildren: 1,
      infants: 1,
    });

    expect(paidUnitsForService("BOAT_SHARED", passengers).toString()).toBe("3");
    expect(paidUnitsForService("BOAT_EXCLUSIVE", passengers).toString()).toBe("5");
  });

  it("rifiuta prenotazioni composte solo da neonati", () => {
    expect(() =>
      normalizePassengerBreakdown({
        adults: 0,
        children: 0,
        freeChildren: 0,
        infants: 1,
      }),
    ).toThrow(/posto/i);
  });
});
