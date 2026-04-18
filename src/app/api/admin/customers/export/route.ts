import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { withErrorHandler } from "@/lib/http/with-error-handler";

export const runtime = "nodejs";

/**
 * Admin-only CSV export of all customers + lifetime spend.
 * Authenticated via NextAuth session with role=ADMIN.
 */
export const GET = withErrorHandler(async () => {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  if (session.user.role !== "ADMIN") throw new ForbiddenError();

  const customers = await db.customer.findMany({
    include: {
      _count: { select: { bookings: true } },
      bookings: {
        where: { status: "CONFIRMED" },
        select: { totalPrice: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = "Nome,Cognome,Email,Telefono,Nazionalita,Prenotazioni,Spesa Totale";

  const rows = customers.map((c) => {
    const totalSpent = c.bookings
      .reduce((sum, b) => sum.plus(b.totalPrice.toString()), new Decimal(0))
      .toFixed(2);

    return [
      escapeCsv(c.firstName),
      escapeCsv(c.lastName),
      escapeCsv(c.email),
      escapeCsv(c.phone ?? ""),
      escapeCsv(c.nationality ?? ""),
      c._count.bookings.toString(),
      totalSpent,
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="clienti.csv"',
    },
  });
});

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
