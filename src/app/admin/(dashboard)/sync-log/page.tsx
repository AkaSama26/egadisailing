import { db } from "@/lib/db";
import { syncQueue } from "@/lib/queue";
import { listPendingManualAlerts } from "@/lib/charter/manual-alerts";

/**
 * Admin view: stato sync real-time.
 *
 * NB: `SyncQueue` legacy non e' piu' usato (BullMQ l'ha sostituito, Round 2).
 * Leggiamo direttamente dalla BullMQ queue + tabelle dedup (ProcessedBokun/
 * Boataround/Email) + AuditLog.
 */
export default async function SyncLogPage() {
  const [queueCounts, manualAlerts, bokunEvents, boataroundEvents, charterEmails, auditEntries] =
    await Promise.all([
      syncQueue()
        .getJobCounts("waiting", "active", "delayed", "failed", "completed")
        .catch(() => ({ waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0 })),
      listPendingManualAlerts(),
      db.processedBokunEvent.findMany({ orderBy: { processedAt: "desc" }, take: 20 }),
      db.processedBoataroundEvent.findMany({ orderBy: { processedAt: "desc" }, take: 20 }),
      db.processedCharterEmail.findMany({ orderBy: { processedAt: "desc" }, take: 20 }),
      db.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 50 }),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Sync & Log</h1>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold text-slate-900 mb-3">BullMQ queue · sync</h2>
        <div className="grid grid-cols-5 gap-3 text-sm">
          <QueueStat label="Waiting" value={queueCounts.waiting} />
          <QueueStat label="Active" value={queueCounts.active} />
          <QueueStat label="Delayed" value={queueCounts.delayed} />
          <QueueStat
            label="Failed"
            value={queueCounts.failed}
            tone={queueCounts.failed > 100 ? "alert" : undefined}
          />
          <QueueStat label="Completed" value={queueCounts.completed} />
        </div>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold text-slate-900 mb-3">
          Manual alerts pendenti ({manualAlerts.length})
        </h2>
        {manualAlerts.length === 0 ? (
          <p className="text-sm text-slate-500">Nessuna azione manuale richiesta.</p>
        ) : (
          <ul className="text-sm divide-y divide-slate-100">
            {manualAlerts.slice(0, 30).map((a) => (
              <li key={a.id} className="py-2 flex justify-between gap-3">
                <span>
                  <strong>{a.channel}</strong> · {a.action} · boat{" "}
                  <code className="text-xs">{a.boatId}</code> · {a.date.toISOString().slice(0, 10)}
                </span>
                <span className="text-xs text-slate-500 shrink-0">
                  {a.createdAt.toLocaleString("it-IT")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <EventList title="Bokun events (ultimi 20)" items={bokunEvents.map((e) => ({
          id: e.eventId,
          label: e.topic,
          at: e.processedAt,
        }))} />
        <EventList title="Boataround events (ultimi 20)" items={boataroundEvents.map((e) => ({
          id: e.eventId,
          label: e.eventType,
          at: e.processedAt,
        }))} />
        <EventList title="Charter emails (ultimi 20)" items={charterEmails.map((e) => ({
          id: e.messageHash,
          label: e.platform ?? "unknown",
          at: e.processedAt,
        }))} />
      </div>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold text-slate-900 mb-3">Audit log (ultimi 50)</h2>
        <ul className="text-xs font-mono divide-y divide-slate-100">
          {auditEntries.map((a) => (
            <li key={a.id} className="py-1.5 flex gap-3">
              <span className="text-slate-500 shrink-0">
                {a.timestamp.toLocaleString("it-IT")}
              </span>
              <span className="font-semibold">{a.action}</span>
              <span className="text-slate-600">
                {a.entity}/{a.entityId}
              </span>
            </li>
          ))}
          {auditEntries.length === 0 && (
            <li className="text-slate-500">Nessuna entry audit.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function QueueStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | undefined;
  tone?: "alert";
}) {
  const bg = tone === "alert" ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200";
  return (
    <div className={`rounded-lg border p-3 ${bg}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold tabular-nums">{value ?? 0}</div>
    </div>
  );
}

function EventList({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; label: string; at: Date }>;
}) {
  return (
    <section className="bg-white rounded-xl border p-5">
      <h2 className="font-bold text-slate-900 mb-3 text-sm">{title}</h2>
      <ul className="text-xs space-y-1 font-mono">
        {items.length === 0 ? (
          <li className="text-slate-500">Nessun evento.</li>
        ) : (
          items.map((e) => (
            <li key={e.id} className="flex justify-between gap-2">
              <span className="truncate">{e.label}</span>
              <span className="text-slate-400 shrink-0">
                {e.at.toLocaleTimeString("it-IT")}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
