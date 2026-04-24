import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Bokun API + DB
const getBokunBookingMock = vi.fn();
vi.mock("@/lib/bokun/bookings", () => ({
  getBokunBooking: getBokunBookingMock,
}));

const dbMock = {
  booking: {
    findUnique: vi.fn(),
  },
  overrideRequest: {
    findUniqueOrThrow: vi.fn(),
  },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

describe("isUpstreamCancelled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("BOKUN: upstream CANCELLED → true", async () => {
    dbMock.booking.findUnique.mockResolvedValueOnce({
      id: "b1",
      bokunBooking: { bokunBookingId: "BK-123" },
    });
    getBokunBookingMock.mockResolvedValueOnce({ status: "CANCELLED" });
    const { isUpstreamCancelled } = await import("@/lib/booking/override-reconcile");
    const result = await isUpstreamCancelled("b1", "BOKUN");
    expect(result).toBe(true);
  });

  it("BOKUN: upstream CONFIRMED → false", async () => {
    dbMock.booking.findUnique.mockResolvedValueOnce({
      id: "b1",
      bokunBooking: { bokunBookingId: "BK-123" },
    });
    getBokunBookingMock.mockResolvedValueOnce({ status: "CONFIRMED" });
    const { isUpstreamCancelled } = await import("@/lib/booking/override-reconcile");
    const result = await isUpstreamCancelled("b1", "BOKUN");
    expect(result).toBe(false);
  });

  it("BOKUN: BokunBooking record missing → false (safe default)", async () => {
    dbMock.booking.findUnique.mockResolvedValueOnce({
      id: "b1",
      bokunBooking: null,
    });
    const { isUpstreamCancelled } = await import("@/lib/booking/override-reconcile");
    const result = await isUpstreamCancelled("b1", "BOKUN");
    expect(result).toBe(false);
  });

  it("BOKUN: API error → false", async () => {
    dbMock.booking.findUnique.mockResolvedValueOnce({
      id: "b1",
      bokunBooking: { bokunBookingId: "BK-123" },
    });
    getBokunBookingMock.mockRejectedValueOnce(new Error("network"));
    const { isUpstreamCancelled } = await import("@/lib/booking/override-reconcile");
    const result = await isUpstreamCancelled("b1", "BOKUN");
    expect(result).toBe(false);
  });

  it("BOATAROUND: trust admin manual step → true", async () => {
    const { isUpstreamCancelled } = await import("@/lib/booking/override-reconcile");
    const result = await isUpstreamCancelled("b1", "BOATAROUND");
    expect(result).toBe(true);
  });
});

describe("checkOtaReconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("non-APPROVED → throws", async () => {
    dbMock.overrideRequest.findUniqueOrThrow.mockResolvedValueOnce({
      id: "req-1", status: "PENDING", conflictingBookingIds: [],
    });
    const { checkOtaReconciliation } = await import("@/lib/booking/override-reconcile");
    await expect(checkOtaReconciliation("req-1")).rejects.toThrow(/not APPROVED/);
  });

  it("tutti conflict OTA cancellati upstream → upstreamStatus=CANCELLED", async () => {
    dbMock.overrideRequest.findUniqueOrThrow.mockResolvedValueOnce({
      id: "req-1", status: "APPROVED", conflictingBookingIds: ["b1"],
    });
    dbMock.booking.findUnique
      .mockResolvedValueOnce({ source: "BOKUN" })  // outer call in checkOta
      .mockResolvedValueOnce({  // inner call in isUpstreamCancelled
        id: "b1",
        bokunBooking: { bokunBookingId: "BK-123" },
      });
    getBokunBookingMock.mockResolvedValueOnce({ status: "CANCELLED" });

    const { checkOtaReconciliation } = await import("@/lib/booking/override-reconcile");
    const res = await checkOtaReconciliation("req-1");
    expect(res.upstreamStatus).toBe("CANCELLED");
    expect(res.channels).toEqual(["BOKUN"]);
  });

  it("1 conflict upstream ancora CONFIRMED → upstreamStatus=STILL_ACTIVE", async () => {
    dbMock.overrideRequest.findUniqueOrThrow.mockResolvedValueOnce({
      id: "req-1", status: "APPROVED", conflictingBookingIds: ["b1"],
    });
    dbMock.booking.findUnique
      .mockResolvedValueOnce({ source: "BOKUN" })
      .mockResolvedValueOnce({
        id: "b1",
        bokunBooking: { bokunBookingId: "BK-123" },
      });
    getBokunBookingMock.mockResolvedValueOnce({ status: "CONFIRMED" });

    const { checkOtaReconciliation } = await import("@/lib/booking/override-reconcile");
    const res = await checkOtaReconciliation("req-1");
    expect(res.upstreamStatus).toBe("STILL_ACTIVE");
    expect(res.channels).toEqual(["BOKUN"]);
  });
});
