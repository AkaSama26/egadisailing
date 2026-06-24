import { Activity, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { PageHeader } from "@/components/admin/page-header";
import { TimeIso } from "@/components/ui/time-iso";
import {
  getCloudflareTrafficSummary,
  type CloudflareTrafficRankItem,
  type CloudflareTrafficSummary,
} from "@/lib/cloudflare/analytics";
import { CloudflareHourlyLineChart } from "../cloudflare-hourly-line-chart";

const integerFormatter = new Intl.NumberFormat("it-IT");
const countryNameFormatter = new Intl.DisplayNames(["it"], { type: "region" });

function formatNumber(value: number) {
  return integerFormatter.format(value);
}

export default async function AdminTrafficPage() {
  const cloudflareTraffic = await getCloudflareTrafficSummary();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Traffico sito"
        subtitle="Report aggregati Cloudflare sulle visite e sulle pagine piu' viste."
      />
      <CloudflareTrafficCard traffic={cloudflareTraffic} />
    </div>
  );
}

function CloudflareTrafficCard({ traffic }: { traffic: CloudflareTrafficSummary }) {
  const tone = traffic.status === "error" ? "warn" : "default";

  if (traffic.status !== "configured") {
    return (
      <AdminCard className="space-y-3" tone={tone}>
        <SectionTitle icon={Activity} title="Traffico Cloudflare" />
        <div className="rounded-lg border border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">
            {traffic.status === "unavailable"
              ? "Cloudflare Analytics non configurato"
              : "Cloudflare Analytics temporaneamente non disponibile"}
          </p>
          <p className="mt-1">{traffic.message}</p>
          <p className="mt-3 text-xs text-slate-500">
            Il widget usa dati edge aggregati server-side. Nessun beacon o cookie viene caricato dal sito pubblico.
          </p>
        </div>
      </AdminCard>
    );
  }

  const maxCountryVisits = maxVisits(traffic.topCountries);
  const maxPageVisits = maxVisits(traffic.topPaths);

  return (
    <AdminCard className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle icon={Activity} title="Traffico Cloudflare" />
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          ultime 24 ore
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-white">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-300">
          Visite totali
        </p>
        <p className="mt-2 text-4xl font-bold tabular-nums">
          {formatNumber(traffic.last24h.visits)}
        </p>
      </div>

      <CloudflareHourlyLineChart
        data={traffic.hourlyVisits.map((point) => ({ hour: point.hour, visits: point.visits }))}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BarChart3 className="size-4 text-slate-500" aria-hidden="true" />
            Paesi visitatori
          </h3>
          {traffic.topCountries.length === 0 ? (
            <p className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500">
              Nessun dato disponibile.
            </p>
          ) : (
            <div className="space-y-3">
              {traffic.topCountries.map((country) => (
                <CountryVisitBar key={country.label} country={country} maxVisits={maxCountryVisits} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BarChart3 className="size-4 text-slate-500" aria-hidden="true" />
            Pagine piu' viste
          </h3>
          {traffic.topPaths.length === 0 ? (
            <p className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500">
              Nessun dato disponibile.
            </p>
          ) : (
            <div className="space-y-2">
              {traffic.topPaths.map((page) => (
                <TopPageRow key={page.label} page={page} maxVisits={maxPageVisits} />
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Aggiornato <TimeIso datetime={traffic.generatedAt} />
      </p>
    </AdminCard>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <h2 className="flex items-center gap-2 font-bold text-slate-900">
      <Icon className="size-4 text-slate-500" aria-hidden="true" />
      {title}
    </h2>
  );
}

function CountryVisitBar({
  country,
  maxVisits,
}: {
  country: CloudflareTrafficRankItem;
  maxVisits: number;
}) {
  const meta = countryDisplay(country.label);
  const visits = visitCount(country);
  const width = barWidth(visits, maxVisits);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-lg leading-none" aria-hidden="true">
            {meta.flag}
          </span>
          <span className="truncate font-medium text-slate-800" title={meta.label}>
            {meta.label}
          </span>
        </div>
        <span className="font-semibold tabular-nums text-slate-950">
          {formatNumber(visits)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-sky-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function TopPageRow({ page, maxVisits }: { page: CloudflareTrafficRankItem; maxVisits: number }) {
  const visits = visitCount(page);
  const width = barWidth(visits, maxVisits);
  const label = pagePathLabel(page.label);
  const title = pagePathTitle(page);

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
        <span className="truncate font-medium text-slate-800" title={title}>
          {label}
        </span>
        <span className="font-semibold tabular-nums text-slate-950">
          {formatNumber(visits)}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function maxVisits(rows: Array<{ visits: number }>): number {
  return Math.max(...rows.map((row) => row.visits), 1);
}

function visitCount(row: CloudflareTrafficRankItem): number {
  return row.visits;
}

function barWidth(value: number, maxValue: number): number {
  if (value <= 0 || maxValue <= 0) return 0;
  return Math.max(6, Math.round((value / maxValue) * 100));
}

function pagePathLabel(path: string): string {
  if (path === "Homepage" || path === "/" || /^\/(it|en|de|es|fr)\/?$/.test(path)) {
    return "Homepage";
  }
  return path;
}

function pagePathTitle(page: CloudflareTrafficRankItem): string {
  const sources = page.sourceLabels?.filter((source) => source !== page.label);
  if (!sources?.length) return page.label;
  return `${pagePathLabel(page.label)}: ${sources.join(", ")}`;
}

function countryDisplay(value: string): { flag: string; label: string } {
  const code = value.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(code)) {
    return {
      flag: countryFlag(code),
      label: countryNameFormatter.of(code) ?? code,
    };
  }
  if (!value || value === "Paese non rilevato") {
    return { flag: "🌐", label: "Paese non rilevato" };
  }
  return { flag: "🌐", label: value };
}

function countryFlag(code: string): string {
  const regionalIndicatorOffset = 127397;
  return Array.from(code)
    .map((letter) => String.fromCodePoint(letter.charCodeAt(0) + regionalIndicatorOffset))
    .join("");
}
