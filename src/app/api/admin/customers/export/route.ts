import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { withErrorHandler } from "@/lib/http/with-error-handler";

export const runtime = "nodejs";

/**
 * Admin-only CSV export of all customers + lifetime spend.
 * Authenticated via NextAuth session with role=ADMIN.
 */
export const GET = withErrorHandler(async () => {
  await requireAdmin();

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

/**
 * CSV escape con difesa contro formula injection (CVE-2014-3524-class).
 * Excel/LibreOffice eseguono celle che iniziano con `=`/`+`/`-`/`@` come
 * formule → attaccante con nome cliente `=HYPERLINK("http://evil",...)` fa
 * eseguire codice all'admin che apre l'export. Prefisso `'` neutralizza.
 */
function escapeCsv(value: string): string {
  const needsFormulaGuard = /^[=+\-@\t\r]/.test(value);
  const guarded = needsFormulaGuard ? `'${value}` : value;
  if (guarded.includes(",") || guarded.includes('"') || guarded.includes("\n")) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}
