import Link from "next/link";
import { db } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { CustomerTable } from "../../_components/customer-table";

export default async function CustomersPage() {
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

  const customersWithTotal = customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    nationality: c.nationality,
    _count: c._count,
    totalSpent: c.bookings.reduce(
      (sum, b) => sum + b.totalPrice.toNumber(),
      0,
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clienti</h1>
          <p className="text-sm text-muted-foreground">
            {customers.length} cliente{customers.length !== 1 ? "i" : ""}{" "}
            registrat{customers.length !== 1 ? "i" : "o"}
          </p>
        </div>
        <Link
          href="/api/admin/customers/export"
          className={buttonVariants({ variant: "outline" })}
        >
          Esporta CSV
        </Link>
      </div>

      <CustomerTable customers={customersWithTotal} />
    </div>
  );
}
