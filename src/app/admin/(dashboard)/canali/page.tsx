import { db } from "@/lib/db";
import { CHANNEL_SYNC_MODE, type Channel } from "@/lib/channels";
import { AdminCard } from "@/components/admin/admin-card";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { TimeIso } from "@/components/ui/time-iso";
import {
  BOOKING_SOURCE_LABEL,
  CHANNEL_SYNC_MODE_LABEL,
  labelOrRaw,
} from "@/lib/admin/labels";

export default async function CanaliPage() {
  const channels = await db.channelSyncStatus.findMany({ orderBy: { channel: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader title="Canali" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((c) => {
          const mode = CHANNEL_SYNC_MODE[c.channel as Channel];
          return (
            <AdminCard key={c.channel}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="font-bold text-slate-900">
                    {labelOrRaw(BOOKING_SOURCE_LABEL, c.channel)}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Modalità: {mode ? labelOrRaw(CHANNEL_SYNC_MODE_LABEL, mode) : "-"}
                  </p>
                </div>
                <StatusBadge status={c.healthStatus} kind="sync" />
              </div>
              <p className="text-sm text-slate-600">
                Ultimo sync:{" "}
                <strong>{c.lastSyncAt ? <TimeIso datetime={c.lastSyncAt} /> : "mai"}</strong>
              </p>
              {c.lastError && (
                <p className="text-xs text-red-600 mt-2 break-words">
                  <strong>Errore:</strong> {c.lastError}
                </p>
              )}
            </AdminCard>
          );
        })}
        {channels.length === 0 && (
          <EmptyState message="Nessun canale ancora sincronizzato. Le entry vengono create dal primo cron / webhook." />
        )}
      </div>
    </div>
  );
}
