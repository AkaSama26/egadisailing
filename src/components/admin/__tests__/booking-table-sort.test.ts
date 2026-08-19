import { describe, expect, it } from "vitest";
import {
  sortBookingRows,
  type BookingRow,
} from "@/components/admin/booking-table";

function bookingRow(overrides: Partial<BookingRow>): BookingRow {
  return {
    id: "booking-1",
    confirmationCode: "BOOK-001",
    source: "DIRECT",
    customerName: "Mario Rossi",
    customerEmail: "mario@example.test",
    serviceName: "Esperienza Gourmet",
    createdAt: new Date("2026-08-01T10:00:00Z"),
    startDate: new Date("2026-08-20T00:00:00Z"),
    endDate: new Date("2026-08-20T00:00:00Z"),
    numPeople: 2,
    totalPrice: "100.00",
    paidAmount: "30.00",
    status: "CONFIRMED",
    ...overrides,
  };
}

describe("sortBookingRows", () => {
  it("ordina separatamente per data acquisto", () => {
    const older = bookingRow({ id: "older", createdAt: new Date("2026-07-01T10:00:00Z") });
    const newer = bookingRow({ id: "newer", createdAt: new Date("2026-08-01T10:00:00Z") });

    expect(sortBookingRows([older, newer], "purchaseDate", "desc").map((row) => row.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("ordina per data dell'esperienza senza usare la data acquisto", () => {
    const first = bookingRow({ id: "first", startDate: new Date("2026-08-10T00:00:00Z") });
    const second = bookingRow({ id: "second", startDate: new Date("2026-08-25T00:00:00Z") });

    expect(sortBookingRows([second, first], "experienceDate", "asc").map((row) => row.id)).toEqual([
      "first",
      "second",
    ]);
  });

  it("ordina gli importi come Decimal e non come stringhe", () => {
    const lower = bookingRow({ id: "lower", paidAmount: "9.99" });
    const higher = bookingRow({ id: "higher", paidAmount: "100.00" });

    expect(sortBookingRows([higher, lower], "paid", "asc").map((row) => row.id)).toEqual([
      "lower",
      "higher",
    ]);
  });
});
