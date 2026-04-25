import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { OverrideImpactBadge } from "@/components/admin/override-impact-badge";
import { AdminStatusTabs } from "@/components/admin/admin-status-tabs";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { OVERRIDE_STATUS_LABEL } from "@/lib/admin/labels";
import { ADMIN_LIST_LIMIT } from "@/lib/admin/constants";

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
    take: ADMIN_LIST_LIMIT,
  });

  return (
    <div className="space-y-6">
      <PageHeader title={`Richieste priorita’ (${requests.length})`} />
      <AdminStatusTabs
        active={status}
        tabs={[
          { value: "PENDING", label: OVERRIDE_STATUS_LABEL.PENDING },
          { value: "PENDING_RECONCILE_FAILED", label: OVERRIDE_STATUS_LABEL.PENDING_RECONCILE_FAILED },
          { value: "APPROVED", label: OVERRIDE_STATUS_LABEL.APPROVED },
          { value: "REJECTED", label: OVERRIDE_STATUS_LABEL.REJECTED },
          { value: "EXPIRED", label: OVERRIDE_STATUS_LABEL.EXPIRED },
        ]}
      />
      <div className="grid gap-4">
        {requests.length === 0 && (
          <EmptyState message="Nessuna richiesta in questo stato." />
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
            <div className="text-sm text-slate-600 flex items-center gap-2 flex-wrap">
              <span>Revenue nuovo: &euro; {r.newBookingRevenue.toFixed(2)}</span>
              <span>&middot;</span>
              <span>Conflict: &euro; {r.conflictingRevenueTotal.toFixed(2)}</span>
              <span>&middot;</span>
              <StatusBadge status={r.status} kind="override" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
