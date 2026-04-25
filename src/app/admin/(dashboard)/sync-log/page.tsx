import { db } from "@/lib/db";
import { getQueue, ALL_QUEUE_NAMES } from "@/lib/queue";
import { listPendingManualAlerts } from "@/lib/charter/manual-alerts";
import { resolveAlertAction } from "./actions";
import { formatItDay } from "@/lib/dates";
import { AdminCard } from "@/components/admin/admin-card";
import { EmptyState } from "@/components/admin/empty-state";
import { SubmitButton } from "@/components/admin/submit-button";

/**
 * Admin view: stato sync real-time.
 *
 * NB: `SyncQueue` legacy non e' piu' usato (BullMQ l'ha sostituito, Round 2).
 * Leggiamo direttamente dalla BullMQ queue + tabelle dedup (ProcessedBokun/
 * Boataround/Email) + AuditLog.
 */
interface QueueBreakdown {
  queueName: string;
  counts: { waiting: number; active: number; delayed: number; failed: number; completed: number };
}
interface QueueStatusInfo {
  totals: { waiting: number; active: number; delayed: number; failed: number; completed: number };
  breakdown: QueueBreakdown[];
  failedJobs: Array<{
    id: string;
    failedReason: string;
    name: string;
    queue: string;
    attemptsMade: number;
  }>;
  reachable: true;
}
interface QueueStatusUnreachable {
  reachable: false;
  error: string;
}

async function loadQueueStatus(): Promise<QueueStatusInfo | QueueStatusUnreachable> {
  try {
    // R23-Q-CRITICA-1: aggregate cross-queue + breakdown per-queue visibile
    // all'admin per diagnosticare "quale canale e' indietro".
    const perQueue = await Promise.all(
      ALL_QUEUE_NAMES.map(async (queueName) => {
        const q = getQueue(queueName);
        const [counts, failed] = await Promise.all([
          q.getJobCounts("waiting", "active", "delayed", "failed", "completed"),
          q.getFailed(0, 4),
        ]);
        return {
          queueName,
          counts: {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            delayed: counts.delayed ?? 0,
            failed: counts.failed ?? 0,
            completed: counts.completed ?? 0,
          },
          failedJobs: failed.map((j) => ({
            id: String(j.id),
            failedReason: (j.failedReason ?? "").slice(0, 300),
            name: j.name,
            queue: queueName,
            attemptsMade: j.attemptsMade,
          })),
        };
      }),
    );
    const totals = perQueue.reduce(
      (acc, q) => ({
        waiting: acc.waiting + q.counts.waiting,
        active: acc.active + q.counts.active,
        delayed: acc.delayed + q.counts.delayed,
        failed: acc.failed + q.counts.failed,
        completed: acc.completed + q.counts.completed,
      }),
      { waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0 },
    );
    return {
      totals,
      breakdown: perQueue.map(({ queueName, counts }) => ({ queueName, counts })),
      failedJobs: perQueue.flatMap((q) => q.failedJobs).slice(0, 10),
      reachable: true,
    };
  } catch (err) {
    return { reachable: false, error: (err as Error).message };
  }
}

export default async function SyncLogPage() {
  const [queueStatus, manualAlerts, bokunEvents, boataroundEvents, charterEmails, auditEntries] =
    await Promise.all([
      loadQueueStatus(),
      listPendingManualAlerts(),
      db.processedBokunEvent.findMany({ orderBy: { processedAt: "desc" }, take: 20 }),
      db.processedBoataroundEvent.findMany({ orderBy: { processedAt: "desc" }, take: 20 }),
      db.processedCharterEmail.findMany({ orderBy: { processedAt: "desc" }, take: 20 }),
      db.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 50 }),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Sync & Log</h1>

      <AdminCard>
        <h2 className="font-bold text-slate-900 mb-3">BullMQ queue · totali</h2>
        {queueStatus.reachable ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <QueueStat label="Waiting" value={queueStatus.totals.waiting} />
              <QueueStat label="Active" value={queueStatus.totals.active} />
              <QueueStat label="Delayed" value={queueStatus.totals.delayed} />
              <QueueStat
                label="Failed"
                value={queueStatus.totals.failed}
                tone={queueStatus.totals.failed > 100 ? "alert" : undefined}
              />
              <QueueStat label="Completed" value={queueStatus.totals.completed} />
            </div>
            <details className="mt-4">
              <summary className="text-sm font-semibold text-slate-700 cursor-pointer">
                Breakdown per queue
              </summary>
              <ul className="mt-2 text-xs font-mono space-y-1">
                {queueStatus.breakdown.map((b) => (
                  <li key={b.queueName} className="flex gap-3 border-l-2 border-slate-200 pl-2 py-1">
                    <span className="text-slate-700 font-semibold w-48 shrink-0">{b.queueName}</span>
                    <span>W:{b.counts.waiting}</span>
                    <span>A:{b.counts.active}</span>
                    <span>D:{b.counts.delayed}</span>
                    <span className={b.counts.failed > 0 ? "text-red-600 font-bold" : ""}>
                      F:{b.counts.failed}
                    </span>
                    <span>C:{b.counts.completed}</span>
                  </li>
                ))}
              </ul>
            </details>
            {queueStatus.failedJobs.length > 0 && (
              <details className="mt-4">
                <summary className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Ultimi {queueStatus.failedJobs.length} job falliti
                </summary>
                <ul className="mt-2 text-xs font-mono space-y-1">
                  {queueStatus.failedJobs.map((j) => (
                    <li key={j.id} className="border-l-2 border-red-200 pl-2 py-1">
                      <div className="text-slate-700">
                        <strong>{j.name}</strong> · {j.queue} · id {j.id} · attempts {j.attemptsMade}
                      </div>
                      <div className="text-red-600 break-words">{j.failedReason}</div>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
            <strong className="text-red-800">BullMQ unreachable</strong>
            <p className="text-xs text-red-700 mt-1 break-words">
              {queueStatus.error}
            </p>
          </div>
        )}
      </AdminCard>

      <AdminCard>
        <h2 className="font-bold text-slate-900 mb-3">
          Manual alerts pendenti ({manualAlerts.length})
        </h2>
        {manualAlerts.length === 0 ? (
          <EmptyState message="Nessuna azione manuale richiesta." />
        ) : (
          <ul className="text-sm divide-y divide-slate-100">
            {manualAlerts.slice(0, 30).map((a) => (
              <li key={a.id} className="py-2 flex items-center justify-between gap-3 flex-wrap">
                <span className="flex-1 min-w-0">
                  <strong>{a.channel}</strong> · {a.action} · boat{" "}
                  <code className="text-xs">{a.boatId}</code> ·{" "}
                  {formatItDay(a.date)}
                  {a.notes && (
                    <span className="block text-xs text-slate-500 mt-1">{a.notes}</span>
                  )}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-500">
                    {a.createdAt.toLocaleString("it-IT")}
                  </span>
                  <form
                    action={async () => {
                      "use server";
                      const res = await resolveAlertAction({ id: a.id });
                      if (!res.ok) throw new Error(res.message);
                    }}
                  >
                    <SubmitButton
                      className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700"
                    >
                      Risolvi
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

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

      <AdminCard>
        <h2 className="font-bold text-slate-900 mb-3">Audit log (ultimi 50)</h2>
        {auditEntries.length === 0 ? (
          <EmptyState message="Nessuna entry audit." />
        ) : (
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
          </ul>
        )}
      </AdminCard>
    </div>
  );
}

function QueueStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "alert";
}) {
  const bg = tone === "alert" ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200";
  return (
    <div className={`rounded-lg border p-3 ${bg}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
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
    <AdminCard>
      <h2 className="font-bold text-slate-900 mb-3 text-sm">{title}</h2>
      {items.length === 0 ? (
        <EmptyState message="Nessun evento." />
      ) : (
        <ul className="text-xs space-y-1 font-mono">
          {items.map((e) => (
            <li key={e.id} className="flex justify-between gap-2">
              <span className="truncate">{e.label}</span>
              <span className="text-slate-400 shrink-0">
                {e.at.toLocaleTimeString("it-IT")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}
