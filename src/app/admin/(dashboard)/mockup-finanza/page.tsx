import Link from "next/link";
import {
  Banknote,
  CalendarRange,
  CreditCard,
  Download,
  ListChecks,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";

type Variant = "a" | "b" | "c";

interface PageProps {
  searchParams: Promise<{ variant?: string }>;
}

interface BoatFinanceRow {
  name: string;
  revenue: number;
  collected: number;
  outstanding: number;
  bookings: number;
}

interface ChartSeries {
  label: string;
  values: number[];
  color: string;
  dashed?: boolean;
  fill?: boolean;
}

const boats: BoatFinanceRow[] = [
  { name: "Barca", revenue: 52_640, collected: 46_800, outstanding: 5_840, bookings: 91 },
  { name: "Gommone", revenue: 31_480, collected: 27_400, outstanding: 4_080, bookings: 65 },
  { name: "Trimarano", revenue: 38_960, collected: 32_420, outstanding: 6_540, bookings: 34 },
  { name: "Gommone Pesca", revenue: 7_800, collected: 6_800, outstanding: 1_000, bookings: 21 },
];

const monthLabels = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago"];
const collectedByMonth = [6.5, 8.2, 10.2, 14.3, 17.5, 20.5, 22.4, 13.82];
const outstandingByMonth = [0.9, 1.1, 1.3, 1.8, 2.2, 3, 3.4, 3.76];
const bookingsByMonth = [9, 13, 19, 27, 36, 42, 45, 20];

const boatRevenueSeries: ChartSeries[] = [
  { label: "Barca", values: [2, 3, 4, 5.5, 8, 10, 12, 8.14], color: "#0f172a" },
  { label: "Gommone", values: [1.5, 2, 3, 4.5, 5, 6, 6, 3.48], color: "#2563eb" },
  { label: "Trimarano", values: [1.8, 2.2, 2.8, 4, 6, 7, 9, 6.16], color: "#a21caf" },
  { label: "Gommone Pesca", values: [0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 0.8], color: "#d97706" },
];

const variantLabels: Record<Variant, string> = {
  a: "Bilanciata",
  b: "Analitica",
  c: "Per mezzo",
};

export default async function FinanceMockupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const variant: Variant = params.variant === "b" || params.variant === "c" ? params.variant : "a";

  return (
    <div className="space-y-4 pb-6">
      <FinanceHeader variant={variant} />
      <PeriodFilters />
      <KpiGrid />
      {variant === "a" && <BalancedView />}
      {variant === "b" && <AnalyticalView />}
      {variant === "c" && <BoatView />}
    </div>
  );
}

function FinanceHeader({ variant }: { variant: Variant }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 id="main" className="text-3xl font-bold text-slate-950">Finanza</h1>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Mockup</span>
        </div>
        <p className="mt-1 text-sm text-slate-600">Incassi, importi da incassare e prenotazioni per mezzo.</p>
      </div>
      <div className="flex items-center gap-2">
        <nav className="flex rounded-lg border border-slate-200 bg-white p-1" aria-label="Varianti mockup finanza">
          {(["a", "b", "c"] as Variant[]).map((item) => (
            <Link
              key={item}
              href={`/mockup-finanza?variant=${item}`}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${variant === item ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {item.toUpperCase()} · {variantLabels[item]}
            </Link>
          ))}
        </nav>
        <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          <Download className="size-3.5" aria-hidden="true" /> Esporta
        </button>
      </div>
    </div>
  );
}

function PeriodFilters() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2">
      <div className="flex items-center gap-2">
        <span className="pl-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Periodo</span>
        <div className="flex rounded-lg bg-slate-100 p-1">
          {[
            { label: "Giorno", active: false },
            { label: "Mese", active: false },
            { label: "Anno", active: true },
            { label: "Personalizzato", active: false },
          ].map((period) => (
            <button
              key={period.label}
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${period.active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
        <CalendarRange className="size-3.5 text-slate-500" aria-hidden="true" />
        01 gennaio – 19 agosto 2026
      </button>
    </div>
  );
}

function KpiGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <KpiCard icon={Banknote} label="Incassi" value="113.420 €" detail="86,7% della revenue totale" tone="success" />
      <KpiCard icon={CreditCard} label="Da incassare" value="17.460 €" detail="13,3% della revenue totale" tone="warning" />
      <KpiCard icon={ListChecks} label="Totale prenotazioni" value="211" detail="Prenotazioni confermate nel periodo" />
    </div>
  );
}

function BalancedView() {
  const cashSeries: ChartSeries[] = [
    { label: "Incassi", values: collectedByMonth, color: "#059669", fill: true },
    { label: "Da incassare", values: outstandingByMonth, color: "#d97706", dashed: true },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <AdminCard padding="sm" className="xl:col-span-2">
        <CardHeading title="Andamento incassi" subtitle="Incassato e ancora da incassare per mese" />
        <LineChart labels={monthLabels} series={cashSeries} max={25} unit="k €" />
      </AdminCard>
      <RevenueByBoatTable />
      <AdminCard padding="none" className="overflow-hidden xl:col-span-3">
        <TableCardHeader title="Prenotazioni per mezzo" subtitle="Totale prenotazioni confermate nel periodo" />
        <BookingsByBoatTableContent />
      </AdminCard>
    </div>
  );
}

function AnalyticalView() {
  const cashSeries: ChartSeries[] = [
    { label: "Incassi", values: collectedByMonth, color: "#059669", fill: true },
    { label: "Da incassare", values: outstandingByMonth, color: "#d97706", dashed: true },
  ];
  const bookingSeries: ChartSeries[] = [
    { label: "Prenotazioni", values: bookingsByMonth, color: "#2563eb", fill: true },
  ];

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <AdminCard padding="sm">
          <CardHeading title="Incassi per mese" subtitle="Importi incassati e residui" />
          <LineChart labels={monthLabels} series={cashSeries} max={25} unit="k €" compact />
        </AdminCard>
        <AdminCard padding="sm">
          <CardHeading title="Prenotazioni per mese" subtitle="Totale confermate nel periodo" />
          <LineChart labels={monthLabels} series={bookingSeries} max={50} unit="" compact />
        </AdminCard>
      </div>
      <CombinedBoatTable />
    </>
  );
}

function BoatView() {
  return (
    <>
      <CombinedBoatTable />
      <AdminCard padding="sm">
        <CardHeading title="Revenue per mezzo" subtitle="Andamento mensile in migliaia di euro" />
        <LineChart labels={monthLabels} series={boatRevenueSeries} max={15} unit="k €" />
      </AdminCard>
    </>
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

function LineChart({ labels, series, max, unit, compact = false }: { labels: string[]; series: ChartSeries[]; max: number; unit: string; compact?: boolean }) {
  const width = 820;
  const height = compact ? 190 : 220;
  const left = 48;
  const right = 14;
  const top = 18;
  const bottom = 30;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (index: number) => left + (index * plotWidth) / Math.max(labels.length - 1, 1);
  const y = (value: number) => top + plotHeight - (value / max) * plotHeight;
  const first = series[0];
  const points = (values: number[]) => values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const area = first ? `M ${x(0)} ${top + plotHeight} L ${first.values.map((value, index) => `${x(index)} ${y(value)}`).join(" L ")} L ${x(first.values.length - 1)} ${top + plotHeight} Z` : "";
  const gradientId = `finance-${series.map((item) => item.label.replaceAll(" ", "-")).join("-")}`;

  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-end gap-4 text-[9px] text-slate-500">
        {series.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ backgroundColor: item.color }} />{item.label}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className={compact ? "h-[160px] w-full" : "h-[195px] w-full"} role="img" aria-label="Grafico lineare finanziario">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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
              <text x={left - 8} y={lineY + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{Number.isInteger(value) ? value : value.toFixed(1)}{unit}</text>
            </g>
          );
        })}
        {first?.fill && <path d={area} fill={`url(#${gradientId})`} />}
        {series.map((item) => (
          <polyline key={item.label} points={points(item.values)} fill="none" stroke={item.color} strokeWidth="2.5" strokeDasharray={item.dashed ? "6 5" : undefined} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {first?.values.map((value, index) => <circle key={index} cx={x(index)} cy={y(value)} r="3" fill="white" stroke={first.color} strokeWidth="2" />)}
        {labels.map((label, index) => <text key={label} x={x(index)} y={height - 8} textAnchor="middle" fontSize="9" fill="#64748b">{label}</text>)}
      </svg>
    </div>
  );
}

function RevenueByBoatTable() {
  const totalRevenue = boats.reduce((sum, boat) => sum + boat.revenue, 0);
  return (
    <AdminCard padding="none" className="overflow-hidden">
      <TableCardHeader title="Revenue per mezzo" subtitle={`Totale ${formatEur(totalRevenue)}`} />
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-500"><tr><TableHead>Mezzo</TableHead><TableHead align="right">Revenue</TableHead><TableHead align="right">Quota</TableHead></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {boats.map((boat) => (
            <tr key={boat.name}><TableCell strong>{boat.name}</TableCell><TableCell align="right" strong>{formatEur(boat.revenue)}</TableCell><TableCell align="right">{formatPercentage(boat.revenue / totalRevenue)}</TableCell></tr>
          ))}
        </tbody>
        <tfoot className="border-t border-slate-200 bg-slate-50"><tr><TableCell strong>Totale</TableCell><TableCell align="right" strong>{formatEur(totalRevenue)}</TableCell><TableCell align="right" strong>100%</TableCell></tr></tfoot>
      </table>
    </AdminCard>
  );
}

function BookingsByBoatTableContent() {
  const totalBookings = boats.reduce((sum, boat) => sum + boat.bookings, 0);
  return (
    <table className="w-full text-xs">
      <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-500"><tr><TableHead>Mezzo</TableHead><TableHead align="right">Prenotazioni</TableHead><TableHead align="right">Quota sul totale</TableHead></tr></thead>
      <tbody className="divide-y divide-slate-100">
        {boats.map((boat) => <tr key={boat.name}><TableCell strong>{boat.name}</TableCell><TableCell align="right" strong>{boat.bookings}</TableCell><TableCell align="right">{formatPercentage(boat.bookings / totalBookings)}</TableCell></tr>)}
      </tbody>
      <tfoot className="border-t border-slate-200 bg-slate-50"><tr><TableCell strong>Totale</TableCell><TableCell align="right" strong>{totalBookings}</TableCell><TableCell align="right" strong>100%</TableCell></tr></tfoot>
    </table>
  );
}

function CombinedBoatTable() {
  return (
    <AdminCard padding="none" className="overflow-hidden">
      <TableCardHeader title="Riepilogo per mezzo" subtitle="Revenue, incassi, residuo e numero prenotazioni" />
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-500">
          <tr><TableHead>Mezzo</TableHead><TableHead align="right">Revenue</TableHead><TableHead align="right">Incassi</TableHead><TableHead align="right">Da incassare</TableHead><TableHead align="right">Prenotazioni</TableHead></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {boats.map((boat) => (
            <tr key={boat.name} className="hover:bg-slate-50"><TableCell strong>{boat.name}</TableCell><TableCell align="right" strong>{formatEur(boat.revenue)}</TableCell><TableCell align="right" tone="success">{formatEur(boat.collected)}</TableCell><TableCell align="right" tone="warning">{formatEur(boat.outstanding)}</TableCell><TableCell align="right" strong>{boat.bookings}</TableCell></tr>
          ))}
        </tbody>
        <tfoot className="border-t border-slate-200 bg-slate-50"><tr><TableCell strong>Totale</TableCell><TableCell align="right" strong>130.880 €</TableCell><TableCell align="right" strong>113.420 €</TableCell><TableCell align="right" strong>17.460 €</TableCell><TableCell align="right" strong>211</TableCell></tr></tfoot>
      </table>
    </AdminCard>
  );
}

function TableCardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="border-b border-slate-200 px-4 py-3"><CardHeading title={title} subtitle={subtitle} /></div>;
}

function TableHead({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-4 py-2 ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function TableCell({ children, align = "left", strong = false, tone = "default" }: { children: React.ReactNode; align?: "left" | "right"; strong?: boolean; tone?: "default" | "success" | "warning" }) {
  const color = tone === "success" ? "text-emerald-700" : tone === "warning" ? "text-amber-700" : "text-slate-700";
  return <td className={`px-4 py-2.5 tabular-nums ${align === "right" ? "text-right" : "text-left"} ${strong ? "font-bold text-slate-950" : color}`}>{children}</td>;
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

function formatPercentage(value: number): string {
  return new Intl.NumberFormat("it-IT", { style: "percent", maximumFractionDigits: 1 }).format(value);
}
