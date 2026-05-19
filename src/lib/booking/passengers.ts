import Decimal from "decimal.js";
import { z } from "zod";
import {
  estimatePaidUnitEquivalent,
  occupiedSeatCountForPassengerCategories,
  totalGuestCountFromBreakdown,
  type PassengerBreakdownLike,
} from "@/lib/pricing/passenger-fare-rules-shared";

export interface PassengerBreakdown extends PassengerBreakdownLike {
  // Legacy field kept for old drafts/bookings/API clients. New UI always sends 0.
  freeChildren: number;
}

export const passengerBreakdownSchema = z
  .object({
    adults: z.number().int().min(0).max(50).default(1),
    children: z.number().int().min(0).max(50).default(0),
    freeChildren: z.number().int().min(0).max(50).default(0),
    infants: z.number().int().min(0).max(50).default(0),
  })
  .transform((value) => ({
    adults: value.adults,
    children: value.children + value.freeChildren,
    freeChildren: 0,
    infants: value.infants,
  }))
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
  return occupiedSeatCountForPassengerCategories(passengers);
}

export function totalGuestCount(passengers: PassengerBreakdown): number {
  return totalGuestCountFromBreakdown(passengers);
}

export function paidTicketUnitsForShared(passengers: PassengerBreakdown): Decimal {
  return new Decimal(
    estimatePaidUnitEquivalent({
      serviceType: "BOAT_SHARED",
      pricingUnit: "PER_PERSON",
      unitPrice: 1,
      passengers,
    }),
  );
}

export function paidUnitsForService(serviceType: string, passengers: PassengerBreakdown): Decimal {
  if (serviceType === "BOAT_SHARED") return paidTicketUnitsForShared(passengers);
  return new Decimal(occupiedSeatCount(passengers));
}
