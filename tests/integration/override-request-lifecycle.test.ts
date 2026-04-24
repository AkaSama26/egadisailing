import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { seedBoatAndService, seedBooking } from "../helpers/seed-override";
import { createOverrideRequest } from "@/lib/booking/override-request";
import Decimal from "decimal.js";

let db: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestDb();
});

describe("createOverrideRequest", () => {
  it("persiste OverrideRequest PENDING con tutti i campi", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const newBooking = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "3000.00",
      status: "PENDING",
    });
    const conflict = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "2000.00",
      status: "CONFIRMED",
      startDate: new Date("2026-08-14"),
      endDate: new Date("2026-08-16"),
    });

    const result = await db.$transaction(async (tx) => {
      return createOverrideRequest(tx, {
        newBookingId: newBooking.id,
        conflictingBookingIds: [conflict.id],
        conflictSourceChannels: ["DIRECT"],
        newBookingRevenue: new Decimal("3000.00"),
        conflictingRevenueTotal: new Decimal("2000.00"),
        dropDeadAt: new Date("2026-07-31"),
      });
    });

    expect(result.requestId).toBeDefined();
    expect(result.supersededRequestIds).toEqual([]);

    const or = await db.overrideRequest.findUnique({
      where: { id: result.requestId },
    });
    expect(or?.status).toBe("PENDING");
    expect(or?.newBookingId).toBe(newBooking.id);
    expect(or?.conflictingBookingIds).toEqual([conflict.id]);
    expect(or?.newBookingRevenue.toString()).toBe("3000");
    expect(or?.conflictingRevenueTotal.toString()).toBe("2000");
    expect(or?.dropDeadAt.toISOString()).toBe("2026-07-31T00:00:00.000Z");
    expect(or?.reminderLevel).toBe(0);
    expect(or?.lastReminderSentAt).toBeNull();
  });

  it("crea request + supersede richiesta inferiore esistente", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const conflictBooking = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "1000.00",
      status: "CONFIRMED",
    });

    // Prima request: Laura Gourmet €2000
    const laura = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "2000.00",
      status: "PENDING",
    });
    const lauraRequest = await db.$transaction((tx) =>
      createOverrideRequest(tx, {
        newBookingId: laura.id,
        conflictingBookingIds: [conflictBooking.id],
        newBookingRevenue: new Decimal("2000.00"),
        conflictingRevenueTotal: new Decimal("1000.00"),
        dropDeadAt: new Date("2026-07-31"),
      }),
    );

    // Seconda request: Sofia Charter €7500
    const sofia = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "7500.00",
      status: "PENDING",
    });
    const sofiaRequest = await db.$transaction((tx) =>
      createOverrideRequest(tx, {
        newBookingId: sofia.id,
        conflictingBookingIds: [conflictBooking.id],
        newBookingRevenue: new Decimal("7500.00"),
        conflictingRevenueTotal: new Decimal("1000.00"),
        dropDeadAt: new Date("2026-07-31"),
      }),
    );

    // Sofia deve aver supersed laura
    expect(sofiaRequest.supersededRequestIds).toEqual([lauraRequest.requestId]);

    const lauraUpdated = await db.overrideRequest.findUnique({
      where: { id: lauraRequest.requestId },
    });
    expect(lauraUpdated?.status).toBe("REJECTED");
    expect(lauraUpdated?.decisionNotes).toContain("superseded");

    const lauraBookingUpdated = await db.booking.findUnique({
      where: { id: laura.id },
    });
    expect(lauraBookingUpdated?.status).toBe("CANCELLED");
  });

  it("supersede preserva conflictSourceChannels del request originale (multi-source)", async () => {
    const { boat, service } = await seedBoatAndService(db);
    // Conflict misto: 1 DIRECT + 1 BOKUN
    const conflictDirect = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "1000.00",
      status: "CONFIRMED",
    });
    const customerBokun = await db.customer.create({
      data: { email: "bk@x.com", firstName: "B", lastName: "K" },
    });
    const conflictBokun = await db.booking.create({
      data: {
        confirmationCode: "BK000001",
        source: "BOKUN",
        customerId: customerBokun.id,
        serviceId: service.id,
        boatId: boat.id,
        startDate: new Date("2026-08-15"),
        endDate: new Date("2026-08-15"),
        numPeople: 2,
        totalPrice: "800.00",
        status: "CONFIRMED",
      },
    });

    const laura = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      totalPrice: "2000.00",
      status: "PENDING",
    });
    const lauraReq = await db.$transaction((tx) =>
      createOverrideRequest(tx, {
        newBookingId: laura.id,
        conflictingBookingIds: [conflictDirect.id, conflictBokun.id],
        newBookingRevenue: new Decimal("2000.00"),
        conflictingRevenueTotal: new Decimal("1800.00"),
        dropDeadAt: new Date("2026-07-31"),
      }),
    );

    const or = await db.overrideRequest.findUnique({
      where: { id: lauraReq.requestId },
    });
    expect(or?.conflictSourceChannels.sort()).toEqual(["BOKUN", "DIRECT"]);
  });
});
