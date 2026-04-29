import Decimal from "decimal.js";
import { z } from "zod";

export interface PassengerBreakdown {
  adults: number;
  children: number;
  freeChildren: number;
  infants: number;
}

export const passengerBreakdownSchema = z
  .object({
    adults: z.number().int().min(0).max(50).default(1),
    children: z.number().int().min(0).max(50).default(0),
    freeChildren: z.number().int().min(0).max(50).default(0),
    infants: z.number().int().min(0).max(50).default(0),
  })
  .refine((value) => occupiedSeatCount(value) >= 1, {
    message: "Almeno una persona deve occupare un posto",
  })
  .refine((value) => totalGuestCount(value) <= 50, {
    message: "Numero ospiti fuori range",
  });

export function normalizePassengerBreakdown(
  input?: Partial<PassengerBreakdown> | null,
  fallbackNumPeople = 1,
): PassengerBreakdown {
  if (!input) {
    return {
      adults: Math.max(0, Math.trunc(fallbackNumPeople)),
      children: 0,
      freeChildren: 0,
      infants: 0,
    };
  }

  return passengerBreakdownSchema.parse({
    adults: input.adults ?? 0,
    children: input.children ?? 0,
    freeChildren: input.freeChildren ?? 0,
    infants: input.infants ?? 0,
  });
}

export function occupiedSeatCount(passengers: PassengerBreakdown): number {
  return passengers.adults + passengers.children + passengers.freeChildren;
}

export function totalGuestCount(passengers: PassengerBreakdown): number {
  return occupiedSeatCount(passengers) + passengers.infants;
}

export function paidTicketUnitsForShared(passengers: PassengerBreakdown): Decimal {
  return new Decimal(passengers.adults).plus(new Decimal(passengers.children).mul(0.5));
}

export function paidUnitsForService(
  serviceType: string,
  passengers: PassengerBreakdown,
): Decimal {
  if (serviceType === "BOAT_SHARED") return paidTicketUnitsForShared(passengers);
  return new Decimal(occupiedSeatCount(passengers));
}
