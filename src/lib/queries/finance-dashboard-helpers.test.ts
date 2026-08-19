import { describe, expect, it } from "vitest";
import {
  aggregateFinanceDashboard,
  resolveFinanceRange,
} from "./finance-dashboard-helpers";

const NOW = new Date("2026-08-19T10:00:00.000Z");

describe("resolveFinanceRange", () => {
  it("uses the current calendar year by default", () => {
    const range = resolveFinanceRange({}, NOW);

    expect(range.period).toBe("year");
    expect(range.start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(range.endExclusive.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(range.grouping).toBe("month");
    expect(range.label).toBe("1 gennaio 2026 – 31 dicembre 2026");
  });

  it("makes the custom end date inclusive", () => {
    const range = resolveFinanceRange(
      { period: "custom", from: "2026-08-10", to: "2026-08-19" },
      NOW,
    );

    expect(range.start.toISOString()).toBe("2026-08-10T00:00:00.000Z");
    expect(range.endExclusive.toISOString()).toBe("2026-08-20T00:00:00.000Z");
    expect(range.grouping).toBe("day");
    expect(range.customInvalid).toBe(false);
  });

  it("falls back safely when the custom interval is reversed", () => {
    const range = resolveFinanceRange(
      { period: "custom", from: "2026-08-20", to: "2026-08-10" },
      NOW,
    );

    expect(range.customInvalid).toBe(true);
    expect(range.fromInput).toBe("2026-01-01");
    expect(range.toInput).toBe("2026-08-19");
  });
});

describe("aggregateFinanceDashboard", () => {
  it("reconciles revenue, collected, outstanding and bookings by boat and bucket", () => {
    const range = resolveFinanceRange({ period: "year" }, NOW);
    const summary = aggregateFinanceDashboard(
      range,
      [
        { id: "boat", name: "Barca" },
        { id: "rib", name: "Gommone" },
      ],
      [
        {
          boatId: "boat",
          startDate: new Date("2026-01-15T00:00:00.000Z"),
          totalPrice: "100.00",
          recordedPaid: "40.00",
          externallyPaidInFull: false,
        },
        {
          boatId: "rib",
          startDate: new Date("2026-02-10T00:00:00.000Z"),
          totalPrice: "200.00",
          recordedPaid: "0.00",
          externallyPaidInFull: true,
        },
      ],
    );

    expect(summary.revenue.toFixed(2)).toBe("300.00");
    expect(summary.collected.toFixed(2)).toBe("240.00");
    expect(summary.outstanding.toFixed(2)).toBe("60.00");
    expect(summary.bookings).toBe(2);
    expect(summary.boats[0]).toMatchObject({ name: "Barca", bookings: 1 });
    expect(summary.boats[0].outstanding.toFixed(2)).toBe("60.00");
    expect(summary.boats[1].collected.toFixed(2)).toBe("200.00");
    expect(summary.buckets[0].collected.toFixed(2)).toBe("40.00");
    expect(summary.buckets[1].collected.toFixed(2)).toBe("200.00");
  });

  it("caps recorded payments at booking revenue", () => {
    const range = resolveFinanceRange({ period: "day" }, NOW);
    const summary = aggregateFinanceDashboard(
      range,
      [{ id: "boat", name: "Barca" }],
      [{
        boatId: "boat",
        startDate: new Date("2026-08-19T00:00:00.000Z"),
        totalPrice: "100.00",
        recordedPaid: "120.00",
        externallyPaidInFull: false,
      }],
    );

    expect(summary.collected.toFixed(2)).toBe("100.00");
    expect(summary.outstanding.toFixed(2)).toBe("0.00");
  });
});
