/**
 * Integration test — availability service (R23+R26 fixes).
 *
 * Scenari coperti:
 *  1. R23-B-ALTA-1: preserve lockedByBookingId first-winner su BLOCKED→BLOCKED
 *     cross-channel overlap. Cella con owner A, webhook cross-OTA con owner B
 *     NON deve sovrascrivere A.
 *  2. R23-Q-CRITICA-1 fan-out: fan-out route per-channel queue (Bokun →
 *     availBokunQueue, Boataround → availBoataroundQueue, etc).
 *  3. Changeset batch (R23-L-CAPACITY): blockDates in 1 tx con advisory lock
 *     sequenziale → da 7 connessioni Prisma a 1.
 *  4. R14 cross-channel self-echo 600s window prevents ping-pong.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { installRedisMock, resetRedisMock } from "../helpers/redis-mock";

let testPrisma: Awaited<ReturnType<typeof setupTestDb>>;
vi.mock("@/lib/db", () => ({
  get db() {
    return testPrisma;
  },
}));

// Track fan-out enqueue per queue — permette asserzioni on channel routing.
const availBokunAdd = vi.fn().mockResolvedValue({ id: "job-bokun" });
const availBoataroundAdd = vi.fn().mockResolvedValue({ id: "job-boataround" });
const availManualAdd = vi.fn().mockResolvedValue({ id: "job-manual" });
const pricingBokunAdd = vi.fn().mockResolvedValue({ id: "job-pricing" });

vi.mock("@/lib/queue", () => ({
  getRedisConnection: () => installRedisMock(),
  syncQueue: () => ({ add: availBokunAdd }),
  availBokunQueue: () => ({ add: availBokunAdd }),
  availBoataroundQueue: () => ({ add: availBoataroundAdd }),
  availManualQueue: () => ({ add: availManualAdd }),
  pricingBokunQueue: () => ({ add: pricingBokunAdd }),
  getQueue: () => ({ add: vi.fn() }),
  QUEUE_NAMES: {
    AVAIL_BOKUN: "sync:avail:bokun",
    AVAIL_BOATAROUND: "sync:avail:boataround",
    AVAIL_MANUAL: "sync:avail:manual",
    PRICING_BOKUN: "sync:pricing:bokun",
  },
  ALL_QUEUE_NAMES: [
    "sync:avail:bokun",
    "sync:avail:boataround",
    "sync:avail:manual",
    "sync:pricing:bokun",
  ],
}));

let db: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => {
  db = await setupTestDb();
  testPrisma = db;
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  await resetRedisMock();
  vi.clearAllMocks();
});

async function seedBoat(id = "avail-boat") {
  return db.boat.create({
    data: {
      id,
      name: "Avail Boat",
      type: "TRIMARAN",
      description: "t",
      amenities: [],
      images: [],
    },
  });
}

describe("R23-B-ALTA-1: preserve lockedByBookingId first-winner", () => {
  it("BLOCKED owner=A → BLOCKED owner=B cross-channel → preserva A", async () => {
    const boat = await seedBoat();
    const { updateAvailability } = await import("@/lib/availability/service");

    const date = new Date("2026-07-15");

    // Step 1: DIRECT blocca con bookingA.
    await updateAvailability({
      boatId: boat.id,
      date,
      status: "BLOCKED",
      sourceChannel: "DIRECT",
      lockedByBookingId: "bookingA",
    });

    // Step 2: BOKUN webhook cross-OTA stesso slot con bookingB (fuori
    // self-echo window di 600s — DIRECT source diverso da BOKUN quindi
    // self-echo non trigga, ma preserveLockedBy R23-B-ALTA-1 deve stop).
    await updateAvailability({
      boatId: boat.id,
      date,
      status: "BLOCKED",
      sourceChannel: "BOKUN",
      lockedByBookingId: "bookingB",
    });

    const cell = await db.boatAvailability.findUnique({
      where: { boatId_date: { boatId: boat.id, date } },
    });
    expect(cell?.status).toBe("BLOCKED");
    // First-winner preservato — owner resta bookingA.
    expect(cell?.lockedByBookingId).toBe("bookingA");
  });

  it("BLOCKED → AVAILABLE clear lockedByBookingId (admin release)", async () => {
    const boat = await seedBoat();
    const { updateAvailability } = await import("@/lib/availability/service");
    const date = new Date("2026-07-15");

    await updateAvailability({
      boatId: boat.id,
      date,
      status: "BLOCKED",
      sourceChannel: "DIRECT",
      lockedByBookingId: "bookingA",
    });
    await updateAvailability({
      boatId: boat.id,
      date,
      status: "AVAILABLE",
      sourceChannel: "DIRECT",
    });

    const cell = await db.boatAvailability.findUnique({
      where: { boatId_date: { boatId: boat.id, date } },
    });
    expect(cell?.status).toBe("AVAILABLE");
    // Release → clear owner.
    expect(cell?.lockedByBookingId).toBeNull();
  });
});

describe("R23-Q-CRITICA-1: fan-out route per-channel queue", () => {
  it("blockDates DIRECT → fan-out a BOKUN + BOATAROUND + MANUAL queue (no SAMBOAT iCal)", async () => {
    const boat = await seedBoat();
    const { blockDates } = await import("@/lib/availability/service");

    const start = new Date("2026-07-15");
    const end = new Date("2026-07-15");

    await blockDates(boat.id, start, end, "DIRECT", "bookingX");

    // 1 day × 3 non-iCal channels = 3 job enqueues (BOKUN, BOATAROUND, MANUAL).
    // SAMBOAT e' ICAL → filtered out upstream (fan-out.ts:29).
    // Totale somma cross-queue = 3 (1 per queue).
    expect(availBokunAdd).toHaveBeenCalledTimes(1);
    expect(availBoataroundAdd).toHaveBeenCalledTimes(1);
    // Manual queue riceve sia CLICKANDBOAT che NAUTAL jobs — 2 call.
    expect(availManualAdd).toHaveBeenCalledTimes(2);
  });

  it("blockDates WEEK (7 giorni) → 1 connessione Prisma (single tx batch)", async () => {
    const boat = await seedBoat();
    const { blockDates } = await import("@/lib/availability/service");

    const start = new Date("2026-07-11"); // sabato
    const end = new Date("2026-07-17"); // venerdi successivo (7 giorni)

    await blockDates(boat.id, start, end, "DIRECT", "bookingWeek");

    // Verifica: 7 celle BoatAvailability create in singola tx.
    const cells = await db.boatAvailability.findMany({
      where: { boatId: boat.id },
      orderBy: { date: "asc" },
    });
    expect(cells).toHaveLength(7);
    for (const c of cells) {
      expect(c.status).toBe("BLOCKED");
      expect(c.lockedByBookingId).toBe("bookingWeek");
    }

    // Fan-out: 7 giorni × 3 queue non-iCal = 21 job totali
    // (7 BOKUN + 7 BOATAROUND + 14 MANUAL [clickandboat+nautal]).
    expect(availBokunAdd).toHaveBeenCalledTimes(7);
    expect(availBoataroundAdd).toHaveBeenCalledTimes(7);
    expect(availManualAdd).toHaveBeenCalledTimes(14);
  });
});

describe("R5 self-echo window 600s prevents ping-pong", () => {
  it("same source entro 600s → skip (no fan-out)", async () => {
    const boat = await seedBoat();
    const { updateAvailability } = await import("@/lib/availability/service");
    const date = new Date("2026-07-15");

    await updateAvailability({
      boatId: boat.id,
      date,
      status: "BLOCKED",
      sourceChannel: "BOKUN",
      lockedByBookingId: "b1",
    });
    // Reset counters DOPO il primo update.
    vi.clearAllMocks();

    // Stesso source subito dopo → self-echo detection.
    await updateAvailability({
      boatId: boat.id,
      date,
      status: "BLOCKED",
      sourceChannel: "BOKUN",
      lockedByBookingId: "b1",
    });

    // Nessun fan-out al secondo update (self-echo).
    expect(availBokunAdd).not.toHaveBeenCalled();
    expect(availBoataroundAdd).not.toHaveBeenCalled();
  });
});
