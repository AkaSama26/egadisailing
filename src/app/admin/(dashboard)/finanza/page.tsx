import Link from "next/link";
import {
  Banknote,
  CalendarRange,
  CreditCard,
  ListChecks,
  Plus,
  ReceiptText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { PageHeader } from "@/components/admin/page-header";
import { formatEur } from "@/lib/pricing/cents";
import { getFinanceDashboard } from "@/lib/queries/finance-dashboard";
import {
  resolveFinanceRange,
  type FinancePeriod,
} from "@/lib/queries/finance-dashboard-helpers";

interface PageProps {
  searchParams: Promise<{
    period?: string | string[];
    from?: string | string[];
    to?: string | string[];
  }>;
}

interface ChartSeries {
  label: string;
  values: number[];
  color: string;
  dashed?: boolean;
  fill?: boolean;
}

export default async function FinanzaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const range = resolveFinanceRange({
    period: firstValue(params.period),
    from: firstValue(params.from),
    to: firstValue(params.to),
  });
  const dashboard = await getFinanceDashboard(range);
  const collectedShare = dashboard.revenue.gt(0)
    ? dashboard.collected.div(dashboard.revenue).mul(100).toDecimalPlaces(1).toString()
    : null;
  const outstandingShare = dashboard.revenue.gt(0)
    ? dashboard.outstanding.div(dashboard.revenue).mul(100).toDecimalPlaces(1).toString()
    : null;
  const moneySeries: ChartSeries[] = [
    {
      label: "Incassi",
      values: dashboard.buckets.map((bucket) => bucket.collected.toNumber()),
      color: "#059669",
      fill: true,
    },
    {
      label: "Da incassare",
      values: dashboard.buckets.map((bucket) => bucket.outstanding.toNumber()),
      color: "#d97706",
      dashed: true,
    },
  ];
  const bookingSeries: ChartSeries[] = [
    {
      label: "Prenotazioni",
      values: dashboard.buckets.map((bucket) => bucket.bookings),
      color: "#2563eb",
      fill: true,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Finanza"
        subtitle="Incassi, importi da incassare e prenotazioni per mezzo."
        actions={
          <>
            <Link
              href="/admin/ricevute"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ReceiptText className="size-4" aria-hidden="true" />
              Ricevute
            </Link>
            <Link
              href="/admin/ricevute/nuova"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="size-4" aria-hidden="true" />
              Nuova ricevuta
            </Link>
          </>
        }
      />

      <PeriodFilters range={range} />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={Banknote}
          label="Incassi"
          value={formatEur(dashboard.collected)}
          detail={collectedShare ? `${formatPercent(collectedShare)} della revenue totale` : "Nessuna revenue nel periodo"}
          tone="success"
        />
        <KpiCard
          icon={CreditCard}
          label="Da incassare"
          value={formatEur(dashboard.outstanding)}
          detail={outstandingShare ? `${formatPercent(outstandingShare)} della revenue totale` : "Nessun importo aperto nel periodo"}
          tone="warning"
        />
        <KpiCard
          icon={ListChecks}
          label="Totale prenotazioni"
          value={String(dashboard.bookings)}
          detail="Prenotazioni confermate con esperienza nel periodo"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminCard padding="sm">
          <CardHeading
            title="Incassi e da incassare"
            subtitle="Importi associati alle esperienze del periodo"
          />
          <LineChart
            id="finance-money"
            labels={dashboard.buckets.map((bucket) => bucket.label)}
            series={moneySeries}
            kind="money"
          />
        </AdminCard>
        <AdminCard padding="sm">
          <CardHeading
            title="Prenotazioni"
            subtitle="Prenotazioni confermate per data esperienza"
          />
          <LineChart
            id="finance-bookings"
            labels={dashboard.buckets.map((bucket) => bucket.label)}
            series={bookingSeries}
            kind="count"
          />
        </AdminCard>
      </div>

      <AdminCard padding="none" className="overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <CardHeading
            title="Riepilogo per mezzo"
            subtitle="Revenue, incassi, residuo e numero prenotazioni"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-xs">
            <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <TableHead>Mezzo</TableHead>
                <TableHead align="right">Revenue</TableHead>
                <TableHead align="right">Incassi</TableHead>
                <TableHead align="right">Da incassare</TableHead>
                <TableHead align="right">Prenotazioni</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dashboard.boats.map((boat) => (
                <tr key={boat.id} className="hover:bg-slate-50">
                  <TableCell strong>{boat.name}</TableCell>
                  <TableCell align="right" strong>{formatEur(boat.revenue)}</TableCell>
                  <TableCell align="right" tone="success">{formatEur(boat.collected)}</TableCell>
                  <TableCell align="right" tone="warning">{formatEur(boat.outstanding)}</TableCell>
                  <TableCell align="right" strong>{boat.bookings}</TableCell>
                </tr>
              ))}
              {dashboard.boats.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">Nessun mezzo configurato.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50">
              <tr>
                <TableCell strong>Totale</TableCell>
                <TableCell align="right" strong>{formatEur(dashboard.revenue)}</TableCell>
                <TableCell align="right" strong>{formatEur(dashboard.collected)}</TableCell>
                <TableCell align="right" strong>{formatEur(dashboard.outstanding)}</TableCell>
                <TableCell align="right" strong>{dashboard.bookings}</TableCell>
              </tr>
            </tfoot>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}

function PeriodFilters({ range }: { range: ReturnType<typeof resolveFinanceRange> }) {
  const periods: Array<{ value: FinancePeriod; label: string }> = [
    { value: "day", label: "Giorno" },
    { value: "month", label: "Mese" },
    { value: "year", label: "Anno" },
    { value: "custom", label: "Personalizzato" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pl-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Periodo</span>
          <nav className="flex rounded-lg bg-slate-100 p-1" aria-label="Periodo finanziario">
            {periods.map((period) => {
              const active = range.period === period.value;
              const href = period.value === "custom"
                ? `/admin/finanza?period=custom&from=${range.fromInput}&to=${range.toInput}`
                : `/admin/finanza?period=${period.value}`;
              return (
                <Link
                  key={period.value}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  {period.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {range.period === "custom" ? (
          <form action="/admin/finanza" method="get" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="period" value="custom" />
            <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
              Da
              <input
                type="date"
                name="from"
                defaultValue={range.fromInput}
                required
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
              />
            </label>
            <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
              A
              <input
                type="date"
                name="to"
                defaultValue={range.toInput}
                required
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
              />
            </label>
            <button type="submit" className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">Applica</button>
          </form>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
            <CalendarRange className="size-3.5 text-slate-500" aria-hidden="true" />
            {range.label}
          </span>
        )}
      </div>
      {range.customInvalid && (
        <p className="mt-2 px-2 text-xs font-medium text-rose-700" role="alert">
          Intervallo non valido: sono state ripristinate le date della stagione corrente.
        </p>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, detail, tone = "default" }: { icon: LucideIcon; label: string; value: string; detail: string; tone?: "default" | "success" | "warning" }) {
  const accent = tone === "success" ? "bg-emerald-500" : tone === "warning" ? "bg-amber-500" : "bg-slate-950";
  const valueColor = tone === "success" ? "text-emerald-700" : tone === "warning" ? "text-amber-700" : "text-slate-950";
  return (
    <AdminCard padding="sm" className="relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <Icon className="size-4 text-slate-400" aria-hidden="true" />
      </div>
      <p className={`mt-2 text-3xl font-black tracking-tight tabular-nums ${valueColor}`}>{value}</p>
      <p className="mt-1 text-[10px] text-slate-500">{detail}</p>
    </AdminCard>
  );
}

function CardHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-slate-950">{title}</h2>
      <p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p>
    </div>
  );
}

function LineChart({ id, labels, series, kind }: { id: string; labels: string[]; series: ChartSeries[]; kind: "money" | "count" }) {
  const width = 820;
  const height = 190;
  const left = 55;
  const right = 14;
  const top = 18;
  const bottom = 30;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const rawMax = Math.max(0, ...series.flatMap((item) => item.values));
  const max = niceChartMax(rawMax, kind);
  const x = (index: number) => labels.length <= 1
    ? left + plotWidth / 2
    : left + (index * plotWidth) / (labels.length - 1);
  const y = (value: number) => top + plotHeight - (value / max) * plotHeight;
  const linePoints = (values: number[]) => {
    if (values.length === 1) return `${left},${y(values[0])} ${width - right},${y(values[0])}`;
    return values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  };
  const first = series[0];
  const areaPath = first && first.values.length > 0
    ? first.values.length === 1
      ? `M ${left} ${top + plotHeight} L ${left} ${y(first.values[0])} L ${width - right} ${y(first.values[0])} L ${width - right} ${top + plotHeight} Z`
      : `M ${x(0)} ${top + plotHeight} L ${first.values.map((value, index) => `${x(index)} ${y(value)}`).join(" L ")} L ${x(first.values.length - 1)} ${top + plotHeight} Z`
    : "";
  const labelStep = Math.max(1, Math.ceil(labels.length / 10));
  const hasData = rawMax > 0;

  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-end gap-4 text-[9px] text-slate-500">
        {series.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[160px] w-full" role="img" aria-label={`Grafico ${series.map((item) => item.label).join(" e ")}`}>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={first?.color ?? "#0f172a"} stopOpacity="0.13" />
            <stop offset="100%" stopColor={first?.color ?? "#0f172a"} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((step) => {
          const value = max - (max / 4) * step;
          const lineY = top + (plotHeight / 4) * step;
          return (
            <g key={step}>
              <line x1={left} x2={width - right} y1={lineY} y2={lineY} stroke="#e2e8f0" />
              <text x={left - 8} y={lineY + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{formatAxisValue(value, kind)}</text>
            </g>
          );
        })}
        {hasData && first?.fill && <path d={areaPath} fill={`url(#${id}-fill)`} />}
        {hasData && series.map((item) => (
          <polyline key={item.label} points={linePoints(item.values)} fill="none" stroke={item.color} strokeWidth="2.5" strokeDasharray={item.dashed ? "6 5" : undefined} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {hasData && first?.values.map((value, index) => <circle key={index} cx={x(index)} cy={y(value)} r="3" fill="white" stroke={first.color} strokeWidth="2" />)}
        {labels.map((label, index) => (
          (index % labelStep === 0 || index === labels.length - 1) && (
            <text key={`${label}-${index}`} x={x(index)} y={height - 8} textAnchor="middle" fontSize="9" fill="#64748b">{label}</text>
          )
        ))}
        {!hasData && <text x={left + plotWidth / 2} y={top + plotHeight / 2} textAnchor="middle" fontSize="12" fill="#64748b">Nessun dato nel periodo</text>}
      </svg>
    </div>
  );
}

function TableHead({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-4 py-2 ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function TableCell({ children, align = "left", strong = false, tone = "default" }: { children: React.ReactNode; align?: "left" | "right"; strong?: boolean; tone?: "default" | "success" | "warning" }) {
  const color = tone === "success" ? "text-emerald-700" : tone === "warning" ? "text-amber-700" : "text-slate-700";
  return <td className={`whitespace-nowrap px-4 py-2.5 tabular-nums ${align === "right" ? "text-right" : "text-left"} ${strong ? "font-bold text-slate-950" : color}`}>{children}</td>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatPercent(value: string): string {
  return `${value.replace(".", ",")}%`;
}

function niceChartMax(value: number, kind: "money" | "count"): number {
  if (value <= 0) return kind === "money" ? 1_000 : 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  const result = niceNormalized * magnitude;
  return kind === "count" ? Math.max(4, Math.ceil(result / 4) * 4) : result;
}

function formatAxisValue(value: number, kind: "money" | "count"): string {
  if (kind === "count") return String(Math.round(value));
  if (value >= 1_000_000) return `${stripTrailingZero(value / 1_000_000)}M €`;
  if (value >= 1_000) return `${stripTrailingZero(value / 1_000)}k €`;
  return `${Math.round(value)} €`;
}

function stripTrailingZero(value: number): string {
  return value.toLocaleString("it-IT", { maximumFractionDigits: 1 });
}
