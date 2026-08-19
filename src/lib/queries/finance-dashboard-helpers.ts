import Decimal from "decimal.js";
import {
  addDays,
  daysBetween,
  isoDay,
  parseDateLikelyLocalDay,
  parseIsoDay,
} from "@/lib/dates";

export type FinancePeriod = "day" | "month" | "year" | "custom";
export type FinanceGrouping = "day" | "month" | "year";

export interface FinanceRange {
  period: FinancePeriod;
  start: Date;
  endExclusive: Date;
  fromInput: string;
  toInput: string;
  label: string;
  grouping: FinanceGrouping;
  customInvalid: boolean;
}

export interface FinanceBoatDescriptor {
  id: string;
  name: string;
}

export interface FinanceBookingInput {
  boatId: string;
  startDate: Date;
  totalPrice: Decimal | string | number;
  recordedPaid: Decimal | string | number;
  externallyPaidInFull: boolean;
}

export interface FinanceBoatSummary extends FinanceBoatDescriptor {
  revenue: Decimal;
  collected: Decimal;
  outstanding: Decimal;
  bookings: number;
}

export interface FinanceSeriesBucket {
  key: string;
  label: string;
  collected: Decimal;
  outstanding: Decimal;
  bookings: number;
}

export interface FinanceDashboardSummary {
  revenue: Decimal;
  collected: Decimal;
  outstanding: Decimal;
  bookings: number;
  boats: FinanceBoatSummary[];
  buckets: FinanceSeriesBucket[];
}

const IT_DAY = new Intl.DateTimeFormat("it-IT", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

const IT_MONTH = new Intl.DateTimeFormat("it-IT", {
  timeZone: "UTC",
  month: "short",
});

const IT_MONTH_YEAR = new Intl.DateTimeFormat("it-IT", {
  timeZone: "UTC",
  month: "short",
  year: "2-digit",
});

const IT_RANGE_DAY = new Intl.DateTimeFormat("it-IT", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function resolveFinanceRange(
  input: { period?: string; from?: string; to?: string },
  now: Date = new Date(),
): FinanceRange {
  const today = parseDateLikelyLocalDay(now);
  const requested = isFinancePeriod(input.period) ? input.period : "year";
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));

  if (requested === "day") {
    return buildRange("day", today, addDays(today, 1), false);
  }

  if (requested === "month") {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const endExclusive = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    return buildRange("month", start, endExclusive, false);
  }

  if (requested === "year") {
    const endExclusive = new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1));
    return buildRange("year", yearStart, endExclusive, false);
  }

  const defaultFrom = isoDay(yearStart);
  const defaultTo = isoDay(today);
  const fromInput = input.from ?? defaultFrom;
  const toInput = input.to ?? defaultTo;
  const parsedFrom = safeParseIsoDay(fromInput);
  const parsedTo = safeParseIsoDay(toInput);
  const customInvalid = !parsedFrom || !parsedTo || parsedFrom.getTime() > parsedTo.getTime();
  const start = customInvalid ? yearStart : parsedFrom;
  const inclusiveEnd = customInvalid ? today : parsedTo;
  const range = buildRange("custom", start, addDays(inclusiveEnd, 1), customInvalid);

  return {
    ...range,
    fromInput: customInvalid ? defaultFrom : fromInput,
    toInput: customInvalid ? defaultTo : toInput,
  };
}

export function aggregateFinanceDashboard(
  range: FinanceRange,
  boatDescriptors: FinanceBoatDescriptor[],
  bookings: FinanceBookingInput[],
): FinanceDashboardSummary {
  const boats = new Map<string, FinanceBoatSummary>(
    boatDescriptors.map((boat) => [
      boat.id,
      {
        ...boat,
        revenue: new Decimal(0),
        collected: new Decimal(0),
        outstanding: new Decimal(0),
        bookings: 0,
      },
    ]),
  );
  const buckets = createBuckets(range);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  let revenue = new Decimal(0);
  let collected = new Decimal(0);
  let outstanding = new Decimal(0);

  for (const booking of bookings) {
    const totalPrice = new Decimal(booking.totalPrice);
    const recordedPaid = Decimal.max(new Decimal(booking.recordedPaid), 0);
    const paidAmount = booking.externallyPaidInFull && recordedPaid.eq(0)
      ? totalPrice
      : Decimal.min(recordedPaid, totalPrice);
    const outstandingAmount = Decimal.max(totalPrice.minus(paidAmount), 0);

    revenue = revenue.plus(totalPrice);
    collected = collected.plus(paidAmount);
    outstanding = outstanding.plus(outstandingAmount);

    let boat = boats.get(booking.boatId);
    if (!boat) {
      boat = {
        id: booking.boatId,
        name: booking.boatId,
        revenue: new Decimal(0),
        collected: new Decimal(0),
        outstanding: new Decimal(0),
        bookings: 0,
      };
      boats.set(booking.boatId, boat);
    }
    boat.revenue = boat.revenue.plus(totalPrice);
    boat.collected = boat.collected.plus(paidAmount);
    boat.outstanding = boat.outstanding.plus(outstandingAmount);
    boat.bookings += 1;

    const bucket = bucketMap.get(bucketKey(booking.startDate, range.grouping));
    if (bucket) {
      bucket.collected = bucket.collected.plus(paidAmount);
      bucket.outstanding = bucket.outstanding.plus(outstandingAmount);
      bucket.bookings += 1;
    }
  }

  return {
    revenue,
    collected,
    outstanding,
    bookings: bookings.length,
    boats: Array.from(boats.values()),
    buckets: trimTrailingEmptyBuckets(buckets),
  };
}

function buildRange(
  period: FinancePeriod,
  start: Date,
  endExclusive: Date,
  customInvalid: boolean,
): FinanceRange {
  const inclusiveEnd = addDays(endExclusive, -1);
  const totalDays = daysBetween(start, inclusiveEnd);
  const grouping: FinanceGrouping = period === "day"
    ? "day"
    : period === "month"
      ? "day"
      : period === "year"
        ? "month"
        : totalDays <= 45
          ? "day"
          : totalDays <= 730
            ? "month"
            : "year";

  return {
    period,
    start,
    endExclusive,
    fromInput: isoDay(start),
    toInput: isoDay(inclusiveEnd),
    label: rangeLabel(period, start, inclusiveEnd),
    grouping,
    customInvalid,
  };
}

function createBuckets(range: FinanceRange): FinanceSeriesBucket[] {
  const buckets: FinanceSeriesBucket[] = [];
  let cursor = bucketStart(range.start, range.grouping);
  const spansYears = range.endExclusive.getUTCFullYear() !== range.start.getUTCFullYear();

  while (cursor.getTime() < range.endExclusive.getTime()) {
    const key = bucketKey(cursor, range.grouping);
    buckets.push({
      key,
      label: bucketLabel(cursor, range.grouping, spansYears),
      collected: new Decimal(0),
      outstanding: new Decimal(0),
      bookings: 0,
    });
    cursor = nextBucket(cursor, range.grouping);
  }

  return buckets;
}

function bucketStart(date: Date, grouping: FinanceGrouping): Date {
  if (grouping === "day") return parseIsoDay(isoDay(date));
  if (grouping === "month") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function nextBucket(date: Date, grouping: FinanceGrouping): Date {
  if (grouping === "day") return addDays(date, 1);
  if (grouping === "month") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return new Date(Date.UTC(date.getUTCFullYear() + 1, 0, 1));
}

function bucketKey(date: Date, grouping: FinanceGrouping): string {
  if (grouping === "day") return isoDay(date);
  if (grouping === "month") return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return String(date.getUTCFullYear());
}

function bucketLabel(date: Date, grouping: FinanceGrouping, spansYears: boolean): string {
  if (grouping === "day") return IT_DAY.format(date).replace(".", "");
  if (grouping === "month") return (spansYears ? IT_MONTH_YEAR : IT_MONTH).format(date).replace(".", "");
  return String(date.getUTCFullYear());
}

function trimTrailingEmptyBuckets(buckets: FinanceSeriesBucket[]): FinanceSeriesBucket[] {
  const lastPopulatedIndex = buckets.findLastIndex(
    (bucket) => bucket.bookings > 0 || !bucket.collected.eq(0) || !bucket.outstanding.eq(0),
  );
  return lastPopulatedIndex >= 0 ? buckets.slice(0, lastPopulatedIndex + 1) : buckets;
}

function rangeLabel(period: FinancePeriod, start: Date, inclusiveEnd: Date): string {
  if (period === "day") return IT_RANGE_DAY.format(start);
  return `${IT_RANGE_DAY.format(start)} – ${IT_RANGE_DAY.format(inclusiveEnd)}`;
}

function safeParseIsoDay(value: string): Date | null {
  try {
    const parsed = parseIsoDay(value);
    return isoDay(parsed) === value ? parsed : null;
  } catch {
    return null;
  }
}

function isFinancePeriod(value: string | undefined): value is FinancePeriod {
  return value === "day" || value === "month" || value === "year" || value === "custom";
}
