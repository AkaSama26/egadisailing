import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (_req: Request, ...args: unknown[]) => {
  await requireAdmin();
  const ctx = args[0] as { params: Promise<{ id: string }> };
  const { id } = await ctx.params;
  const request = await db.overrideRequest.findUniqueOrThrow({
    where: { id },
    select: { conflictingBookingIds: true },
  });
  const conflicts = await db.booking.findMany({
    where: { id: { in: request.conflictingBookingIds } },
    select: {
      id: true,
      source: true,
      status: true,
      bokunBooking: { select: { bokunBookingId: true } },
      charterBooking: { select: { platformBookingRef: true } },
    },
  });
  const now = new Date().toISOString();
  return NextResponse.json(
    conflicts.map((c) => ({
      conflictId: c.id,
      source: c.source,
      // Per tutti i source: upstream CANCELLED = nostro Booking.status ===
      // "CANCELLED" (webhook cascade ha aggiornato il DB). Per BOKUN potremmo
      // fare API call live ma qui stiamo mostrando solo polling rapido UI.
      upstreamCancelled: c.status === "CANCELLED",
      lastCheckedAt: now,
    })),
  );
});
