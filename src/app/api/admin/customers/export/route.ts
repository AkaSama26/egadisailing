// @ts-nocheck - legacy schema references, refactored in Plan 2-5
import { db } from "@/lib/db";

export async function GET() {
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

  const header = "Nome,Email,Telefono,Nazionalità,Prenotazioni,Spesa Totale";

  const rows = customers.map((c) => {
    const totalSpent = c.bookings
      .reduce((sum, b) => sum + b.totalPrice.toNumber(), 0)
      .toFixed(2);

    return [
      escapeCsv(c.name),
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
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
