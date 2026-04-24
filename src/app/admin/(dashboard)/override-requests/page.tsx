import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { OverrideImpactBadge } from "@/components/admin/override-impact-badge";
import { OVERRIDE_STATUS_LABEL } from "@/lib/admin/labels";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "PENDING_RECONCILE_FAILED";

export default async function OverrideRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = (params.status ?? "PENDING") as Status;
  const sourceFilter = params.source;

  const where: Record<string, unknown> = { status };
  if (sourceFilter) where.conflictSourceChannels = { has: sourceFilter };

  const requests = await db.overrideRequest.findMany({
    where,
    include: {
      newBooking: {
        include: {
          customer: { select: { firstName: true, lastName: true, email: true } },
          service: { select: { name: true } },
          boat: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const tabs: { status: Status; label: string }[] = [
    { status: "PENDING", label: "In attesa" },
    { status: "PENDING_RECONCILE_FAILED", label: "Reconcile failed" },
    { status: "APPROVED", label: "Approvate" },
    { status: "REJECTED", label: "Rifiutate" },
    { status: "EXPIRED", label: "Scadute" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">
        Richieste priorita&apos; ({requests.length})
      </h1>
      <nav className="flex gap-4 border-b">
        {tabs.map((t) => (
          <Link
            key={t.status}
            href={`?status=${t.status}`}
            className={`pb-2 px-2 text-sm ${status === t.status ? "border-b-2 border-sky-600 text-sky-700 font-semibold" : "text-slate-600 hover:text-slate-900"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="grid gap-4">
        {requests.length === 0 && (
          <p className="text-slate-500">Nessuna richiesta in questo stato.</p>
        )}
        {requests.map((r) => (
          <Link
            key={r.id}
            href={`/admin/override-requests/${r.id}`}
            className="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md"
          >
            <OverrideImpactBadge channels={r.conflictSourceChannels} />
            <div className="font-semibold">
              {r.newBooking.customer.firstName} {r.newBooking.customer.lastName} &middot;{" "}
              {r.newBooking.service.name} &middot;{" "}
              {r.newBooking.startDate.toISOString().slice(0, 10)}
            </div>
            <div className="text-sm text-slate-600">
              Revenue nuovo: &euro; {r.newBookingRevenue.toFixed(2)} &middot;
              Conflict: &euro; {r.conflictingRevenueTotal.toFixed(2)} &middot;
              Status: {OVERRIDE_STATUS_LABEL[r.status]}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
