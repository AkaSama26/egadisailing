import type Decimal from "decimal.js";

/**
 * Input per checkOverrideEligibility — pure helper, nessun DB access.
 *
 * @remarks
 * `isAdminBlock=true` rappresenta un BoatAvailability.BLOCKED con
 * `lockedByBookingId === null` — tipico di un boat-block admin manuale.
 * Questo ha priorità assoluta sulla logica revenue (spec §5.3).
 * Il caller deve derivare questo flag leggendo `BoatAvailability` sul DB
 * e verificando `status === "BLOCKED" && lockedByBookingId === null`.
 */
export interface OverrideEligibilityInput {
  newBookingRevenue: Decimal;
  conflictingBookings: Array<{
    id: string;
    revenue: Decimal;
    /** true = admin boat-block (BoatAvailability.BLOCKED con lockedByBookingId=null) */
    isAdminBlock: boolean;
  }>;
  experienceDate: Date;
  today: Date;
}

export type OverrideEligibilityResult =
  | { status: "normal"; conflictingBookingIds: [] }
  | {
      status: "override_request";
      conflictingBookingIds: string[];
      conflictingRevenueTotal: Decimal;
      dropDeadAt: Date;
    }
  | {
      status: "blocked";
      reason: "within_15_day_cutoff" | "insufficient_revenue" | "boat_block";
      conflictingBookingIds: string[];
    };

export function checkOverrideEligibility(
  input: OverrideEligibilityInput,
): OverrideEligibilityResult {
  if (input.conflictingBookings.length === 0) {
    return { status: "normal", conflictingBookingIds: [] };
  }
  // TODO: implementa i 6 passi in task 1.4-1.8
  throw new Error("not yet implemented");
}
