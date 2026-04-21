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
});
