import { describe, expect, it } from "vitest";
import {
  groupCalendarDays,
  type DayCell,
  type DayCellBooking,
} from "@/components/admin/calendar-grid";

const charterBooking: DayCellBooking = {
  id: "charter-1",
  source: "DIRECT",
  serviceName: "Esperienza Charter",
  serviceType: "CABIN_CHARTER",
  confirmationCode: "CHA-001",
  numPeople: 6,
  isExclusive: true,
};

function calendarDay(day: number, booking?: DayCellBooking): DayCell {
  return {
    date: new Date(Date.UTC(2026, 7, day)),
    bookings: booking ? [booking] : [],
    totalPeople: booking?.numPeople ?? 0,
    capacityMax: null,
    hasExclusiveBooking: Boolean(booking?.isExclusive),
    status: booking ? "BLOCKED" : "AVAILABLE",
  };
}

describe("groupCalendarDays", () => {
  it("unisce le date consecutive dello stesso cabin charter", () => {
    const groups = groupCalendarDays([
      calendarDay(10, charterBooking),
      calendarDay(11, charterBooking),
      calendarDay(12, charterBooking),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].charterBooking?.id).toBe("charter-1");
    expect(groups[0].entries.map(({ day }) => day.date.getUTCDate())).toEqual([10, 11, 12]);
  });

  it("spezza il blocco quando il charter attraversa domenica e lunedi'", () => {
    const days = Array.from({ length: 8 }, (_, index) =>
      calendarDay(index + 1, index >= 5 ? charterBooking : undefined),
    );
    const charterGroups = groupCalendarDays(days).filter((group) => group.charterBooking);

    expect(charterGroups).toHaveLength(2);
    expect(charterGroups.map((group) => group.entries.length)).toEqual([2, 1]);
  });

  it("non unisce le altre esperienze esclusive", () => {
    const exclusiveBooking: DayCellBooking = {
      ...charterBooking,
      id: "exclusive-1",
      serviceType: "EXCLUSIVE_EXPERIENCE",
    };
    const groups = groupCalendarDays([
      calendarDay(10, exclusiveBooking),
      calendarDay(11, exclusiveBooking),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.charterBooking === null)).toBe(true);
  });
});
