import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { AdminCard } from "@/components/admin/admin-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { db } from "@/lib/db";
import { formatItDateTime, formatItDay } from "@/lib/dates";
import { CheckInScanner } from "./check-in-scanner";

export const dynamic = "force-dynamic";

export default async function AdminCheckInPage() {
  const recent = await db.booking.findMany({
    where: { checkedInAt: { not: null } },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
      checkedInBy: { select: { name: true } },
    },
    orderBy: { checkedInAt: "desc" },
    take: 12,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-in QR"
        subtitle="Scanner per biglietti Egadisailing da telefono o webcam."
      />

      <CheckInScanner />

      <AdminCard>
        <h2 className="text-lg font-bold text-slate-900">Ultimi check-in</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nessun check-in registrato.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-4 font-semibold">Ora</th>
                  <th className="py-2 pr-4 font-semibold">Codice</th>
                  <th className="py-2 pr-4 font-semibold">Cliente</th>
                  <th className="py-2 pr-4 font-semibold">Esperienza</th>
                  <th className="py-2 pr-4 font-semibold">Data</th>
                  <th className="py-2 pr-4 font-semibold">Stato</th>
                  <th className="py-2 pr-4 font-semibold">Staff</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((booking) => (
                  <tr key={booking.id} className="border-b border-slate-100 last:border-0">
                    <td className="whitespace-nowrap py-3 pr-4 text-slate-600">
                      {booking.checkedInAt ? formatItDateTime(booking.checkedInAt) : "-"}
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/prenotazioni/${booking.id}`}
                        className="font-mono font-semibold text-slate-900 underline-offset-2 hover:underline"
                      >
                        {booking.confirmationCode}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {`${booking.customer.firstName} ${booking.customer.lastName}`.trim()}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{booking.service.name}</td>
                    <td className="whitespace-nowrap py-3 pr-4 text-slate-700">
                      {formatItDay(booking.startDate)}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={booking.status} kind="booking" />
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {booking.checkedInBy?.name ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
