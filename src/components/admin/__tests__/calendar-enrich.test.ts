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
    expect(days[0].totalPeople).toBe(0);
    expect(days[0].capacityMax).toBeNull();
    expect(days[0].hasExclusiveBooking).toBe(false);
    expect(days[0].isAdminBlock).toBe(false);
  });

  it("merge availability status su cella giusta", () => {
    const result = enrichDayCells({
      boats: [{ id: "boat-1", name: "T" }],
      bookings: [],
      availability: [
        {
          boatId: "boat-1",
          date: new Date(Date.UTC(2026, 6, 15)),
          status: "BLOCKED",
          lockedByBookingId: null, // admin-block
        },
      ],
      auditLogs: [],
      monthStart: new Date(Date.UTC(2026, 6, 1)),
      monthEnd: new Date(Date.UTC(2026, 6, 31)),
    });
    const days = result.get("boat-1")!;
    const day15 = days.find((d) => d.dateIso === "2026-07-15")!;
    expect(day15.status).toBe("BLOCKED");
    expect(day15.isAdminBlock).toBe(true);
  });

  it("booking multi-day appare su tutti i giorni del range", () => {
    const result = enrichDayCells({
      boats: [{ id: "boat-1", name: "T" }],
      bookings: [
        {
          id: "bk-1",
          confirmationCode: "ABC123",
          source: "DIRECT",
          status: "CONFIRMED",
          boatId: "boat-1",
          numPeople: 8,
          startDate: new Date(Date.UTC(2026, 6, 10)),
          endDate: new Date(Date.UTC(2026, 6, 12)),
          service: { name: "Charter", type: "CABIN_CHARTER", capacityMax: 6 },
          customer: { firstName: "Mario", lastName: "Rossi" },
        },
      ],
      availability: [],
      auditLogs: [],
      monthStart: new Date(Date.UTC(2026, 6, 1)),
      monthEnd: new Date(Date.UTC(2026, 6, 31)),
    });
    const days = result.get("boat-1")!;
    const day9 = days.find((d) => d.dateIso === "2026-07-09")!;
    const day10 = days.find((d) => d.dateIso === "2026-07-10")!;
    const day11 = days.find((d) => d.dateIso === "2026-07-11")!;
    const day12 = days.find((d) => d.dateIso === "2026-07-12")!;
    const day13 = days.find((d) => d.dateIso === "2026-07-13")!;
    expect(day9.bookings).toHaveLength(0);
    expect(day10.bookings).toHaveLength(1);
    expect(day11.bookings).toHaveLength(1);
    expect(day12.bookings).toHaveLength(1);
    expect(day13.bookings).toHaveLength(0);
    expect(day10.bookings[0]).toMatchObject({
      id: "bk-1",
      confirmationCode: "ABC123",
      source: "DIRECT",
      status: "CONFIRMED",
      serviceName: "Charter",
      serviceType: "CABIN_CHARTER",
      customerName: "Mario Rossi",
      numPeople: 8,
      capacityMax: 6,
      isExclusive: true,
    });
    expect(day10.totalPeople).toBe(8);
    expect(day10.capacityMax).toBeNull();
    expect(day10.hasExclusiveBooking).toBe(true);
    expect(day13.totalPeople).toBe(0);
    expect(day13.hasExclusiveBooking).toBe(false);
  });

  it("somma le persone delle prenotazioni condivise nella stessa giornata", () => {
    const sharedBooking = {
      confirmationCode: "SHARED",
      source: "DIRECT" as const,
      status: "CONFIRMED" as const,
      boatId: "boat-1",
      startDate: new Date(Date.UTC(2026, 6, 20)),
      endDate: new Date(Date.UTC(2026, 6, 20)),
      service: { name: "Social Boating", type: "SOCIAL_BOATING", capacityMax: 20 },
      customer: { firstName: "Cliente", lastName: "Test" },
    };
    const result = enrichDayCells({
      boats: [{ id: "boat-1", name: "Trimarano" }],
      bookings: [
        { ...sharedBooking, id: "bk-1", numPeople: 7 },
        { ...sharedBooking, id: "bk-2", numPeople: 5 },
      ],
      availability: [],
      auditLogs: [],
      monthStart: new Date(Date.UTC(2026, 6, 1)),
      monthEnd: new Date(Date.UTC(2026, 6, 31)),
    });

    const day20 = result.get("boat-1")!.find((day) => day.dateIso === "2026-07-20")!;
    expect(day20.bookings).toHaveLength(2);
    expect(day20.totalPeople).toBe(12);
    expect(day20.capacityMax).toBe(20);
    expect(day20.hasExclusiveBooking).toBe(false);
  });

  it("admin-block arricchito con reason + blockedAt da AuditLog", () => {
    const blockedAt = new Date("2026-06-28T10:00:00Z");
    const result = enrichDayCells({
      boats: [{ id: "boat-1", name: "T" }],
      bookings: [],
      availability: [
        {
          boatId: "boat-1",
          date: new Date(Date.UTC(2026, 6, 15)),
          status: "BLOCKED",
          lockedByBookingId: null,
        },
      ],
      auditLogs: [
        {
          entityId: "boat-1",
          after: {
            boatName: "T",
            startDate: "2026-07-15",
            endDate: "2026-07-15",
            reason: "manutenzione motore",
          },
          timestamp: blockedAt,
        },
      ],
      monthStart: new Date(Date.UTC(2026, 6, 1)),
      monthEnd: new Date(Date.UTC(2026, 6, 31)),
    });
    const day15 = result.get("boat-1")!.find((d) => d.dateIso === "2026-07-15")!;
    expect(day15.adminBlockInfo?.reason).toBe("manutenzione motore");
    expect(day15.adminBlockInfo?.blockedAt).toBe(blockedAt.toISOString());
  });

  it("admin-block con reason redatto mostra solo blockedAt", () => {
    const blockedAt = new Date("2026-06-28T10:00:00Z");
    const result = enrichDayCells({
      boats: [{ id: "boat-1", name: "T" }],
      bookings: [],
      availability: [
        {
          boatId: "boat-1",
          date: new Date(Date.UTC(2026, 6, 15)),
          status: "BLOCKED",
          lockedByBookingId: null,
        },
      ],
      auditLogs: [
        {
          entityId: "boat-1",
          after: { _redacted: true }, // retention cron marker
          timestamp: blockedAt,
        },
      ],
      monthStart: new Date(Date.UTC(2026, 6, 1)),
      monthEnd: new Date(Date.UTC(2026, 6, 31)),
    });
    const day15 = result.get("boat-1")!.find((d) => d.dateIso === "2026-07-15")!;
    expect(day15.adminBlockInfo?.reason).toBeUndefined();
    expect(day15.adminBlockInfo?.blockedAt).toBe(blockedAt.toISOString());
  });
});
