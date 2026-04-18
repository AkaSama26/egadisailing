import { db } from "@/lib/db";
import { CHANNEL_SYNC_MODE, type Channel } from "@/lib/channels";

const MODE_LABEL: Record<string, string> = {
  API: "API bidirezionale",
  ICAL: "iCal pull",
  EMAIL: "Email parser",
  INTERNAL: "Interno (sito)",
};

export default async function CanaliPage() {
  const channels = await db.channelSyncStatus.findMany({ orderBy: { channel: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Canali</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((c) => {
          const mode = CHANNEL_SYNC_MODE[c.channel as Channel];
          const statusClass =
            c.healthStatus === "GREEN"
              ? "bg-emerald-100 text-emerald-800"
              : c.healthStatus === "YELLOW"
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-800";
          return (
            <div key={c.channel} className="bg-white rounded-xl border p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="font-bold text-slate-900">{c.channel}</h2>
                  <p className="text-xs text-slate-500">
                    Mode: {mode ? MODE_LABEL[mode] : "-"}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                  {c.healthStatus}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Ultimo sync:{" "}
                <strong>{c.lastSyncAt ? c.lastSyncAt.toLocaleString("it-IT") : "mai"}</strong>
              </p>
              {c.lastError && (
                <p className="text-xs text-red-600 mt-2 break-words">
                  <strong>Errore:</strong> {c.lastError}
                </p>
              )}
            </div>
          );
        })}
        {channels.length === 0 && (
          <p className="text-sm text-slate-500">
            Nessun canale ancora sincronizzato. Le entry vengono create dal primo cron / webhook.
          </p>
        )}
      </div>
    </div>
  );
}
