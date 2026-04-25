import { describe, it, expect, vi } from "vitest";
import { transitionBookingStatus } from "../transition-status";
import { ConflictError } from "@/lib/errors";

/**
 * Unit test pure: mock di TransactionClient via vi.fn(). Niente DB —
 * verifica il state-machine + concurrent-modification path.
 */

interface MockTx {
  booking: {
    updateMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
}

function makeTx(opts: {
  updateManyCount?: number;
  currentStatus?: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED" | null;
}): MockTx {
  return {
    booking: {
      updateMany: vi.fn().mockResolvedValue({ count: opts.updateManyCount ?? 1 }),
      findUnique: vi
        .fn()
        .mockResolvedValue(
          opts.currentStatus !== undefined
            ? { status: opts.currentStatus }
            : null,
        ),
    },
  };
}

describe("transitionBookingStatus", () => {
  it("legal transition PENDING → CONFIRMED succeeds", async () => {
    const tx = makeTx({ updateManyCount: 1 });
    const res = await transitionBookingStatus(
      tx as never,
      {
        bookingId: "B1",
        from: "PENDING",
        to: "CONFIRMED",
        reason: "stripe_succeeded",
      },
    );
    expect(res).toEqual({ id: "B1", status: "CONFIRMED" });
    expect(tx.booking.updateMany).toHaveBeenCalledWith({
      where: { id: "B1", status: "PENDING" },
      data: { status: "CONFIRMED" },
    });
  });

  it("illegal transition REFUNDED → CONFIRMED throws ConflictError", async () => {
    const tx = makeTx({ updateManyCount: 0 });
    await expect(
      transitionBookingStatus(tx as never, {
        bookingId: "B2",
        from: "REFUNDED",
        to: "CONFIRMED",
      }),
    ).rejects.toThrow(ConflictError);
    // Non deve mai chiamare updateMany — guard early.
    expect(tx.booking.updateMany).not.toHaveBeenCalled();
  });

  it("concurrent modification (DB row already CANCELLED) throws ConflictError with actualStatus", async () => {
    const tx = makeTx({ updateManyCount: 0, currentStatus: "CANCELLED" });
    try {
      await transitionBookingStatus(tx as never, {
        bookingId: "B3",
        from: "PENDING",
        to: "CONFIRMED",
        reason: "stripe_succeeded",
      });
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictError);
      const ctx = (err as ConflictError).context as Record<string, unknown>;
      expect(ctx.actualStatus).toBe("CANCELLED");
      expect(ctx.expectedFrom).toBe("PENDING");
      expect(ctx.attemptedTo).toBe("CONFIRMED");
    }
  });
});
