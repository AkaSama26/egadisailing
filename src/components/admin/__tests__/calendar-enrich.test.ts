import { describe, it, expect } from "vitest";
import { enrichDayCells } from "@/app/admin/(dashboard)/calendario/enrich";

describe("enrichDayCells", () => {
  it("ritorna Map vuoto se zero boats", () => {
    const result = enrichDayCells({
      boats: [],
      bookings: [],
      availability: [],
      auditLogs: [],
      monthStart: new Date("2026-07-01"),
      monthEnd: new Date("2026-07-31"),
    });
    expect(result.size).toBe(0);
  });

  it("genera N giorni per ciascuna barca nel mese", () => {
    const result = enrichDayCells({
      boats: [{ id: "boat-1", name: "Trimarano" }],
      bookings: [],
      availability: [],
      auditLogs: [],
      monthStart: new Date(Date.UTC(2026, 6, 1)),
      monthEnd: new Date(Date.UTC(2026, 6, 31)),
    });
    expect(result.size).toBe(1);
    const days = result.get("boat-1")!;
    expect(days).toHaveLength(31);
    expect(days[0].dateIso).toBe("2026-07-01");
    expect(days[30].dateIso).toBe("2026-07-31");
    expect(days[0].status).toBe("AVAILABLE");
    expect(days[0].bookings).toEqual([]);
    expect(days[0].isAdminBlock).toBe(false);
  });
});
