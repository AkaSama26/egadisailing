import { describe, it, expect } from "vitest";
import { computeActionState } from "../day-actions-state";

const base = {
  date: new Date(),
  dateIso: "2026-07-15",
  status: "AVAILABLE" as const,
  bookings: [],
  isAdminBlock: false,
};

describe("computeActionState", () => {
  it("AVAILABLE → solo blocca", () => {
    expect(computeActionState(base)).toMatchObject({ canBlock: true, canRelease: false });
  });
  it("BLOCKED admin → solo rilascia", () => {
    expect(
      computeActionState({ ...base, status: "BLOCKED", isAdminBlock: true }),
    ).toMatchObject({ canBlock: false, canRelease: true });
  });
  it("BLOCKED con booking attivo → entrambi disabled", () => {
    expect(
      computeActionState({
        ...base,
        status: "BLOCKED",
        isAdminBlock: false,
        bookings: [
          {
            id: "b1",
            confirmationCode: "X",
            source: "DIRECT",
            status: "CONFIRMED",
            serviceName: "",
            customerName: "",
          },
        ],
      }),
    ).toMatchObject({ canBlock: false, canRelease: false });
  });
  it("PARTIALLY_BOOKED → blocca con warning", () => {
    const s = computeActionState({
      ...base,
      status: "PARTIALLY_BOOKED",
      bookings: [
        {
          id: "b1",
          confirmationCode: "X",
          source: "DIRECT",
          status: "CONFIRMED",
          serviceName: "",
          customerName: "",
        },
      ],
    });
    expect(s.canBlock).toBe(true);
    expect(s.canRelease).toBe(false);
    expect(s.blockWarning).toContain("1 cliente");
  });
});
