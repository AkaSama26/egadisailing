import Decimal from "decimal.js";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  aggregateFinanceDashboard,
  type FinanceBookingInput,
  type FinanceDashboardSummary,
  type FinanceRange,
} from "@/lib/queries/finance-dashboard-helpers";

const MONEY_IN_TYPES = ["DEPOSIT", "BALANCE", "FULL"] as const;
const EXTERNAL_PAID_STATUSES = new Set(["PAID", "PAID_IN_FULL", "COMPLETED", "CAPTURED"]);

const BOAT_PRESENTATION: Record<string, { name: string; order: number }> = {
  boat: { name: "Barca", order: 1 },
  "tour-rib": { name: "Gommone", order: 2 },
  trimarano: { name: "Trimarano", order: 3 },
  "fishing-rib": { name: "Gommone Pesca", order: 4 },
};

const FINANCE_BOOKING_SELECT = {
  boatId: true,
  startDate: true,
  totalPrice: true,
  payments: {
    where: { status: "SUCCEEDED", type: { in: [...MONEY_IN_TYPES] } },
    select: { amount: true },
  },
  bokunBooking: { select: { rawPayload: true } },
} as const satisfies Prisma.BookingSelect;

type FinanceBookingRow = Prisma.BookingGetPayload<{ select: typeof FINANCE_BOOKING_SELECT }>;

export async function getFinanceDashboard(range: FinanceRange): Promise<FinanceDashboardSummary> {
  const [boatRows, bookingRows] = await Promise.all([
    db.boat.findMany({ select: { id: true, name: true } }),
    db.booking.findMany({
      where: {
        status: "CONFIRMED",
        startDate: { gte: range.start, lt: range.endExclusive },
      },
      select: FINANCE_BOOKING_SELECT,
      orderBy: [{ startDate: "asc" }, { boatId: "asc" }],
    }),
  ]);

  const boats = boatRows
    .map((boat) => ({
      id: boat.id,
      name: BOAT_PRESENTATION[boat.id]?.name ?? boat.name,
      order: BOAT_PRESENTATION[boat.id]?.order ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name, "it"));

  return aggregateFinanceDashboard(
    range,
    boats.map(({ id, name }) => ({ id, name })),
    bookingRows.map(toFinanceBookingInput),
  );
}

function toFinanceBookingInput(row: FinanceBookingRow): FinanceBookingInput {
  const recordedPaid = row.payments.reduce(
    (sum, payment) => sum.plus(payment.amount.toString()),
    new Decimal(0),
  );
  const externalStatus = jsonStringField(row.bokunBooking?.rawPayload, "paymentStatus");

  return {
    boatId: row.boatId,
    startDate: row.startDate,
    totalPrice: row.totalPrice.toString(),
    recordedPaid,
    externallyPaidInFull: Boolean(externalStatus && EXTERNAL_PAID_STATUSES.has(externalStatus)),
  };
}

function jsonStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field.toUpperCase() : undefined;
}
