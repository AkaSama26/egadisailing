import Decimal from "decimal.js";

/**
 * Input per checkOverrideEligibility — pure helper, nessun DB access.
 *
 * @remarks
 * `isAdminBlock=true` rappresenta un BoatAvailability.BLOCKED con
 * `lockedByBookingId === null` — tipico di un boat-block admin manuale.
 * Questo ha priorità assoluta sulla logica revenue (spec §5.3).
 *
 * `source` identifica il canale del booking conflittuale. L'override e'
 * permesso solo contro conflitti DIRECT: prenotazioni arrivate da Bokun,
 * Boataround, SamBoat, Click&Boat o Nautal sono gia' confermate upstream e
 * devono bloccare il calendario master senza offrire scavalco.
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
    /** Booking.source; omesso = DIRECT per backward compatibility dei test pure. */
    source?: string;
    blockReason?: "full_day_priority";
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
      reason:
        | "within_15_day_cutoff"
        | "insufficient_revenue"
        | "boat_block"
        | "external_booking"
        | "full_day_priority";
      conflictingBookingIds: string[];
    };

export function checkOverrideEligibility(
  input: OverrideEligibilityInput,
): OverrideEligibilityResult {
  if (input.conflictingBookings.length === 0) {
    return { status: "normal", conflictingBookingIds: [] };
  }
  // Regola 1: boat-block absolute priority
  const hasBoatBlock = input.conflictingBookings.some((b) => b.isAdminBlock);
  if (hasBoatBlock) {
    return {
      status: "blocked",
      reason: "boat_block",
      conflictingBookingIds: input.conflictingBookings.map((b) => b.id),
    };
  }
  // Regola 2: override solo DIRECT-vs-DIRECT. Qualunque booking esterno
  // confermato/pending da aggregatori blocca lo slot master e non puo' essere
  // scavalcato dal wizard del sito, indipendentemente dalla revenue.
  const hasExternalBooking = input.conflictingBookings.some(
    (b) => !b.isAdminBlock && (b.source ?? "DIRECT") !== "DIRECT",
  );
  if (hasExternalBooking) {
    return {
      status: "blocked",
      reason: "external_booking",
      conflictingBookingIds: input.conflictingBookings.map((b) => b.id),
    };
  }
  const priorityBlock = input.conflictingBookings.find(
    (b) => b.blockReason === "full_day_priority",
  );
  if (priorityBlock) {
    return {
      status: "blocked",
      reason: "full_day_priority",
      conflictingBookingIds: input.conflictingBookings.map((b) => b.id),
    };
  }
  // Regola 3: 15-day cutoff strict (> 15 = eligible, <= 15 = blocked)
  const daysToExperience = Math.floor(
    (input.experienceDate.getTime() - input.today.getTime()) /
      (24 * 60 * 60 * 1000),
  );
  if (daysToExperience <= 15) {
    return {
      status: "blocked",
      reason: "within_15_day_cutoff",
      conflictingBookingIds: input.conflictingBookings.map((b) => b.id),
    };
  }
  // Regola 4: somma revenue conflittuali
  const conflictingRevenueTotal = input.conflictingBookings.reduce(
    (acc, b) => acc.add(b.revenue),
    new Decimal(0),
  );

  if (input.newBookingRevenue.lte(conflictingRevenueTotal)) {
    return {
      status: "blocked",
      reason: "insufficient_revenue",
      conflictingBookingIds: input.conflictingBookings.map((b) => b.id),
    };
  }

  // Eligibile
  const dropDeadAt = new Date(input.experienceDate);
  dropDeadAt.setDate(dropDeadAt.getDate() - 15);

  return {
    status: "override_request",
    conflictingBookingIds: input.conflictingBookings.map((b) => b.id),
    conflictingRevenueTotal,
    dropDeadAt,
  };
}
