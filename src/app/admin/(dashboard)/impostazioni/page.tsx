import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatItDay } from "@/lib/dates";
import { AdminCard } from "@/components/admin/admin-card";
import { DetailRow } from "@/components/admin/detail-row";
import { EmptyState } from "@/components/admin/empty-state";

// Label IT per channel key. Include anche i "meta channel" usati da cron
// reconciliation (STRIPE_EVENTS_RECONCILIATION) + detection (CROSS_OTA_DOUBLE_BOOKING).
const CHANNEL_LABEL: Record<string, { label: string; mode: string }> = {
  DIRECT: { label: "Sito diretto", mode: "Interno" },
  BOKUN: { label: "Bokun (+ OTA hub: Viator, GetYourGuide)", mode: "API bidirezionale" },
  BOATAROUND: { label: "Boataround", mode: "API bidirezionale" },
  SAMBOAT: { label: "SamBoat", mode: "Export iCal" },
  CLICKANDBOAT: { label: "Click&Boat", mode: "Email + alert manuale" },
  NAUTAL: { label: "Nautal", mode: "Email + alert manuale" },
  STRIPE_EVENTS_RECONCILIATION: {
    label: "Stripe reconciliation",
    mode: "Cron fallback webhook persi",
  },
};

type HealthStatus = "GREEN" | "YELLOW" | "RED";

const HEALTH_STYLE: Record<
  HealthStatus,
  { bg: string; text: string; icon: typeof CheckCircle2; label: string }
> = {
  GREEN: {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-900",
    icon: CheckCircle2,
    label: "Operativo",
  },
  YELLOW: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-900",
    icon: AlertTriangle,
    label: "Attenzione",
  },
  RED: {
    bg: "bg-red-50 border-red-200",
    text: "text-red-900",
    icon: XCircle,
    label: "Errore",
  },
};

export default async function ImpostazioniPage() {
  const [session, channelStatuses] = await Promise.all([
    auth(),
    db.channelSyncStatus.findMany({ orderBy: { channel: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Informazioni</h1>

      <AdminCard className="space-y-2">
        <h2 className="font-bold text-slate-900">Account</h2>
        <DetailRow label="Nome" value={session?.user?.name ?? "-"} />
        <DetailRow label="Email" value={session?.user?.email ?? "-"} />
        <DetailRow label="Ruolo" value={(session?.user?.role as string | undefined) ?? "-"} />
      </AdminCard>

      <AdminCard className="space-y-4">
        <div>
          <h2 className="font-bold text-slate-900">Stato canali</h2>
          <p className="text-xs text-slate-500 mt-1">
            Health check real-time di ogni canale di vendita + cron di reconciliation.
            Aggiornato automaticamente dai webhook, import e cron.
          </p>
        </div>

        {channelStatuses.length === 0 ? (
          <EmptyState message="Nessun canale ancora sincronizzato." />
        ) : (
          <ul className="space-y-2">
            {channelStatuses.map((c) => {
              const status = (c.healthStatus as HealthStatus) ?? "GREEN";
              const style = HEALTH_STYLE[status] ?? HEALTH_STYLE.GREEN;
              const meta = CHANNEL_LABEL[c.channel] ?? {
                label: c.channel,
                mode: "—",
              };
              const Icon = style.icon;
              return (
                <li
                  key={c.channel}
                  className={`border rounded-lg p-3 ${style.bg}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      className={`size-5 shrink-0 mt-0.5 ${style.text}`}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`font-semibold ${style.text}`}>
                          {meta.label}
                        </span>
                        <span className={`text-xs font-medium ${style.text}`}>
                          · {style.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {meta.mode}
                        {c.lastSyncAt && (
                          <>
                            {" · ultimo sync "}
                            <time dateTime={c.lastSyncAt.toISOString()}>
                              {formatItDay(c.lastSyncAt)}{" "}
                              {c.lastSyncAt.toLocaleTimeString("it-IT", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </time>
                          </>
                        )}
                      </div>
                      {c.lastError && (
                        <p className={`text-xs mt-1 break-words ${style.text}`}>
                          <span className="font-semibold">Dettaglio:</span>{" "}
                          {c.lastError}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>

      <AdminCard className="space-y-3">
        <h2 className="font-bold text-slate-900">Configurazione</h2>
        <p className="text-sm text-slate-600">
          Le configurazioni sensibili sono gestite tramite <code>.env</code> sul VPS:
        </p>
        <ul className="text-sm text-slate-600 list-disc ml-6 space-y-1">
          <li>Credenziali Stripe, Brevo, Bokun, Boataround, IMAP</li>
          <li>Markup Bokun (<code>BOKUN_PRICE_MARKUP</code>)</li>
          <li>Soglie rate-limit (Redis)</li>
          <li>Secret NextAuth + Cron</li>
        </ul>
        <p className="text-xs text-slate-500">
          Per rotazione secret contattare il team tech. La UI admin per editing ENV e' fuori scope
          (Plan 6).
        </p>
      </AdminCard>

      <AdminCard className="space-y-3">
        <h2 className="font-bold text-slate-900">Link utili</h2>
        <ul className="text-sm space-y-1 list-disc ml-6">
          <li>
            <a className="text-blue-600 hover:underline" href="/api/health?deep=1">
              Health check deep
            </a>{" "}
            (richiede Bearer CRON_SECRET)
          </li>
          <li>
            <a className="text-blue-600 hover:underline" href="/api/admin/customers/export">
              Export CSV clienti
            </a>
          </li>
        </ul>
      </AdminCard>
    </div>
  );
}
