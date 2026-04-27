import Decimal from "decimal.js";
import { toUtcDay } from "@/lib/dates";

export type CustomerCancellationBand = "FULL_REFUND" | "HALF_REFUND" | "NO_REFUND";

export interface CustomerCancellationPolicy {
  band: CustomerCancellationBand;
  daysUntilStart: number;
  refundMultiplier: Decimal;
  retentionMultiplier: Decimal;
  label: string;
}

export function computeCustomerCancellationPolicy(
  startDate: Date,
  now: Date = new Date(),
): CustomerCancellationPolicy {
  const startDay = toUtcDay(startDate);
  const today = toUtcDay(now);
  const daysUntilStart = Math.floor(
    (startDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (daysUntilStart >= 15) {
    return {
      band: "FULL_REFUND",
      daysUntilStart,
      refundMultiplier: new Decimal(1),
      retentionMultiplier: new Decimal(0),
      label: "Rimborso completo",
    };
  }

  if (daysUntilStart >= 7) {
    return {
      band: "HALF_REFUND",
      daysUntilStart,
      refundMultiplier: new Decimal(0.5),
      retentionMultiplier: new Decimal(0.5),
      label: "Rimborso 50%",
    };
  }

  return {
    band: "NO_REFUND",
    daysUntilStart,
    refundMultiplier: new Decimal(0),
    retentionMultiplier: new Decimal(1),
    label: "Cancellazione senza rimborso",
  };
}

