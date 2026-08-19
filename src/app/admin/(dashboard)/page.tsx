import Decimal from "decimal.js";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  CloudSun,
  CreditCard,
  Euro,
  Fish,
  Ship,
  Users,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import type { Prisma } from "@/generated/prisma/client";
import type { BookingSource, BookingStatus } from "@/generated/prisma/enums";
import { BOOKING_SOURCE_LABEL, labelOrRaw } from "@/lib/admin/labels";
import { isBoatExclusiveServiceType } from "@/lib/booking/service-types";
import { db } from "@/lib/db";
import { addDays, isoDay, toUtcDay } from "@/lib/dates";
import { formatEur } from "@/lib/pricing/cents";
import { getAllWeather, type WeatherForBooking } from "@/lib/weather/service";

interface PageProps {
  searchParams: Promise<{ boat?: string }>;
}

interface DailyBooking {
  id: string;
  confirmationCode: string;
  source: BookingSource;
  sourceLabel: string;
  status: BookingStatus;
  customerName: string;
  serviceName: string;
  serviceType: string;
  numPeople: number;
  paidAmount: Decimal;
  balanceAmount: Decimal;
}

interface DailyDeparture {
  id: string;
  boatName: string;
  experience: string;
  experienceKind: "Condivisa" | "Exclusive" | "Mista";
  people: number;
  icon: LucideIcon;
  tone: string;
  bookings: DailyBooking[];
  paidAmount: Decimal;
  balanceAmount: Decimal;
}

const MONEY_IN_TYPES = ["DEPOSIT", "BALANCE", "FULL"] as const;
const EXTERNAL_PAID_STATUSES = new Set(["PAID", "PAID_IN_FULL", "COMPLETED", "CAPTURED"]);

const BOAT_PRESENTATION: Record<
  string,
  { name: string; order: number; icon: LucideIcon; tone: string }
> = {
  boat: { name: "Barca", order: 1, icon: Ship, tone: "bg-blue-100 text-blue-700" },
  "tour-rib": { name: "Gommone", order: 2, icon: Waves, tone: "bg-cyan-100 text-cyan-700" },
  trimarano: { name: "Trimarano", order: 3, icon: Ship, tone: "bg-fuchsia-100 text-fuchsia-700" },
  "fishing-rib": { name: "Gommone Pesca", order: 4, icon: Fish, tone: "bg-amber-100 text-amber-700" },
};

const TODAY_BOOKING_SELECT = {
  id: true,
  confirmationCode: true,
  source: true,
  status: true,
  boatId: true,
  numPeople: true,
  totalPrice: true,
  createdAt: true,
  customer: { select: { firstName: true, lastName: true } },
  service: { select: { name: true, type: true } },
  boat: { select: { name: true } },
  payments: {
    where: { status: "SUCCEEDED", type: { in: [...MONEY_IN_TYPES] } },
    select: { amount: true },
  },
  bokunBooking: {
    select: { channelName: true, netAmount: true, rawPayload: true },
  },
  charterBooking: {
    select: { platformName: true, commissionAmount: true },
  },
} as const satisfies Prisma.BookingSelect;

type TodayBookingRow = Prisma.BookingGetPayload<{ select: typeof TODAY_BOOKING_SELECT }>;

export default async function DashboardHome({ searchParams }: PageProps) {
  const params = await searchParams;
  const today = toUtcDay(new Date());
  const tomorrow = addDays(today, 1);

  const [bookingRows, activeBoatCount, weatherRows, todayRevenue, openBalances] =
    await Promise.all([
      db.booking.findMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          startDate: { lte: today },
          endDate: { gte: today },
        },
        select: TODAY_BOOKING_SELECT,
        orderBy: [{ boatId: "asc" }, { createdAt: "asc" }],
      }),
      db.boat.count({ where: { services: { some: { active: true } } } }),
      getAllWeather().catch(() => [] as WeatherForBooking[]),
      getTodayRevenue(today, tomorrow),
      getOpenBalanceSummary(today),
    ]);

  const departures = buildDailyDepartures(bookingRows);
  const selectedDeparture =
    departures.find((departure) => departure.id === params.boat) ?? departures[0] ?? null;
  const totalPeople = departures.reduce((total, departure) => total + departure.people, 0);
  const totalBookings = departures.reduce(
    (total, departure) => total + departure.bookings.length,
    0,
  );
  const weatherByDate = new Map(weatherRows.map((row) => [row.date, row]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="Uscite, prenotazioni e situazione operativa della giornata."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
        <AdminCard padding="sm" className="self-start space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Oggi · {formatDashboardDate(today)}
              </p>
              <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-950">
                <CalendarDays className="size-5 text-slate-500" aria-hidden="true" />
                Uscite
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <SummaryPill value={String(departures.length)} label="mezzi" />
              <SummaryPill value={String(totalPeople)} label="persone" />
              <SummaryPill value={String(totalBookings)} label="prenotazioni" />
            </div>
          </div>

          {departures.length === 0 ? (
            <EmptyState message="Nessuna uscita prevista oggi." />
          ) : (
            <DepartureList
              departures={departures}
              selectedId={selectedDeparture?.id ?? null}
            />
          )}
        </AdminCard>

        <QuickBookingPanel departure={selectedDeparture} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <AdminCard padding="sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-bold text-slate-900">
              <CloudSun className="size-4 text-slate-500" aria-hidden="true" />
              Meteo
            </h2>
            <Link href="/admin/meteo" className="text-xs font-medium text-blue-700 hover:underline">
              Dettaglio
            </Link>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <WeatherPreview label="Oggi" weather={weatherByDate.get(isoDay(today))} />
            <WeatherPreview label="Domani" weather={weatherByDate.get(isoDay(tomorrow))} />
          </div>
        </AdminCard>

        <AdminCard padding="sm">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <CreditCard className="size-4 text-slate-500" aria-hidden="true" />
            Pagamenti e disponibilità
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <CompactMetric icon={Euro} label="Incassato oggi" value={formatEur(todayRevenue)} />
            <CompactMetric
              icon={CreditCard}
              label="Da incassare"
              value={formatEur(openBalances.total)}
              hint={`${openBalances.count} ${openBalances.count === 1 ? "saldo aperto" : "saldi aperti"}`}
            />
            <CompactMetric
              icon={Ship}
              label="Mezzi in uscita"
              value={`${departures.length} / ${activeBoatCount}`}
              hint={`${totalPeople} ${totalPeople === 1 ? "persona totale" : "persone totali"}`}
            />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

async function getTodayRevenue(today: Date, tomorrow: Date): Promise<Decimal> {
  const result = await db.payment.aggregate({
    where: {
      status: "SUCCEEDED",
      type: { in: [...MONEY_IN_TYPES] },
      processedAt: { gte: today, lt: tomorrow },
    },
    _sum: { amount: true },
  });
  return toDecimal(result._sum.amount);
}

async function getOpenBalanceSummary(
  today: Date,
): Promise<{ total: Decimal; count: number }> {
  const where = {
    paymentSchedule: "DEPOSIT_BALANCE" as const,
    balancePaidAt: null,
    booking: { startDate: { gte: today }, status: "CONFIRMED" as const },
  };
  const [aggregate, count] = await Promise.all([
    db.directBooking.aggregate({ where, _sum: { balanceAmount: true } }),
    db.directBooking.count({ where }),
  ]);
  return { total: toDecimal(aggregate._sum.balanceAmount), count };
}

function buildDailyDepartures(rows: TodayBookingRow[]): DailyDeparture[] {
  const rowsByBoat = new Map<string, TodayBookingRow[]>();
  for (const row of rows) {
    const boatRows = rowsByBoat.get(row.boatId) ?? [];
    boatRows.push(row);
    rowsByBoat.set(row.boatId, boatRows);
  }

  return [...rowsByBoat.entries()]
    .map(([boatId, boatRows]) => {
      const presentation = BOAT_PRESENTATION[boatId];
      const bookings = boatRows.map(toDailyBooking);
      const experienceNames = [...new Set(bookings.map((booking) => booking.serviceName))];
      const exclusiveCount = bookings.filter((booking) =>
        isBoatExclusiveServiceType(booking.serviceType),
      ).length;
      const experienceKind =
        exclusiveCount === bookings.length
          ? "Exclusive"
          : exclusiveCount === 0
            ? "Condivisa"
            : "Mista";

      return {
        id: boatId,
        boatName: presentation?.name ?? boatRows[0].boat.name,
        experience: experienceNames.join(" · "),
        experienceKind,
        people: bookings.reduce((total, booking) => total + booking.numPeople, 0),
        icon: presentation?.icon ?? Ship,
        tone: presentation?.tone ?? "bg-slate-100 text-slate-700",
        bookings,
        paidAmount: bookings.reduce(
          (total, booking) => total.plus(booking.paidAmount),
          new Decimal(0),
        ),
        balanceAmount: bookings.reduce(
          (total, booking) => total.plus(booking.balanceAmount),
          new Decimal(0),
        ),
      } satisfies DailyDeparture;
    })
    .sort((left, right) => {
      const leftOrder = BOAT_PRESENTATION[left.id]?.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = BOAT_PRESENTATION[right.id]?.order ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.boatName.localeCompare(right.boatName, "it");
    });
}

function toDailyBooking(row: TodayBookingRow): DailyBooking {
  const { paidAmount, balanceAmount } = bookingFinancials(row);
  const channelName = row.bokunBooking?.channelName ?? row.charterBooking?.platformName;
  return {
    id: row.id,
    confirmationCode: row.confirmationCode,
    source: row.source,
    sourceLabel: channelName || labelOrRaw(BOOKING_SOURCE_LABEL, row.source),
    status: row.status,
    customerName: `${row.customer.firstName} ${row.customer.lastName}`.trim(),
    serviceName: row.service.name,
    serviceType: row.service.type,
    numPeople: row.numPeople,
    paidAmount,
    balanceAmount,
  };
}

function bookingFinancials(
  row: TodayBookingRow,
): { paidAmount: Decimal; balanceAmount: Decimal } {
  const totalPrice = toDecimal(row.totalPrice);
  const paymentTotal = row.payments.reduce(
    (total, payment) => total.plus(toDecimal(payment.amount)),
    new Decimal(0),
  );

  if (paymentTotal.gt(0)) {
    return {
      paidAmount: paymentTotal,
      balanceAmount: Decimal.max(totalPrice.minus(paymentTotal), 0),
    };
  }

  const externalPaymentStatus = jsonStringField(
    row.bokunBooking?.rawPayload,
    "paymentStatus",
  );
  if (externalPaymentStatus && EXTERNAL_PAID_STATUSES.has(externalPaymentStatus)) {
    const netAmount = row.bokunBooking?.netAmount
      ? toDecimal(row.bokunBooking.netAmount)
      : totalPrice;
    return { paidAmount: netAmount, balanceAmount: new Decimal(0) };
  }

  const commissionAmount = toDecimal(row.charterBooking?.commissionAmount);
  const receivableAmount = row.charterBooking
    ? Decimal.max(totalPrice.minus(commissionAmount), 0)
    : totalPrice;
  return { paidAmount: new Decimal(0), balanceAmount: receivableAmount };
}

function DepartureList({
  departures,
  selectedId,
}: {
  departures: DailyDeparture[];
  selectedId: string | null;
}) {
  return (
    <div className="space-y-2">
      {departures.map((departure) => {
        const Icon = departure.icon;
        const active = departure.id === selectedId;
        return (
          <Link
            key={departure.id}
            href={`/admin?boat=${encodeURIComponent(departure.id)}`}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={`grid grid-cols-[auto_minmax(0,1fr)_64px_auto] items-center gap-3 rounded-xl border p-3 transition sm:grid-cols-[auto_minmax(0,1fr)_110px_110px_70px_auto] ${
              active
                ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span className={`flex size-11 items-center justify-center rounded-xl ${departure.tone}`}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-950">{departure.boatName}</span>
                <ExperienceBadge kind={departure.experienceKind} />
              </span>
              <span className="mt-1 block truncate text-xs text-slate-500">
                {departure.experience} · {departure.bookings.length}{" "}
                {departure.bookings.length === 1 ? "prenotazione" : "prenotazioni"}
              </span>
              <span className="mt-1 flex gap-3 text-[10px] font-semibold sm:hidden">
                <span className="text-emerald-700">Incassato {formatEur(departure.paidAmount)}</span>
                <span className="text-amber-700">Da incassare {formatEur(departure.balanceAmount)}</span>
              </span>
            </span>
            <FinancialAmount
              label="Incassato"
              amount={departure.paidAmount}
              className="hidden sm:block"
              tone="success"
            />
            <FinancialAmount
              label="Da incassare"
              amount={departure.balanceAmount}
              className="hidden sm:block"
              tone="warn"
            />
            <span className="text-right">
              <span className="block text-2xl font-black tabular-nums text-slate-950">
                {departure.people}
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                persone
              </span>
            </span>
            <ChevronRight className="size-4 text-slate-400" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}

function QuickBookingPanel({ departure }: { departure: DailyDeparture | null }) {
  if (!departure) {
    return (
      <AdminCard padding="sm" className="self-start">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Prenotazioni del mezzo selezionato
        </p>
        <div className="mt-4">
          <EmptyState message="Nessuna prenotazione da mostrare oggi." />
        </div>
      </AdminCard>
    );
  }

  const Icon = departure.icon;
  return (
    <AdminCard padding="none" className="self-start overflow-hidden xl:sticky xl:top-4">
      <div className="border-b border-slate-200 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Prenotazioni del mezzo selezionato
        </p>
        <div className="mt-2 flex items-start gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${departure.tone}`}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="truncate text-lg font-bold text-slate-950">{departure.boatName}</h2>
              <ExperienceBadge kind={departure.experienceKind} />
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">{departure.experience}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <SummaryBox icon={Users} value={String(departure.people)} label="persone" />
          <SummaryBox
            icon={CalendarDays}
            value={String(departure.bookings.length)}
            label="prenotazioni"
          />
          <SummaryBox
            icon={Euro}
            value={formatEur(departure.paidAmount)}
            label="incassato"
            tone="success"
          />
          <SummaryBox
            icon={CreditCard}
            value={formatEur(departure.balanceAmount)}
            label="da incassare"
            tone="warn"
          />
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {departure.bookings.map((booking) => (
          <Link
            key={booking.id}
            href={`/admin/prenotazioni/${booking.id}`}
            aria-label={`Apri il dettaglio della prenotazione ${booking.confirmationCode}`}
            className="grid grid-cols-[minmax(0,1fr)_70px_94px] items-center gap-2 px-4 py-3 text-xs transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-500"
          >
            <div className="min-w-0">
              <p className="font-mono font-bold text-blue-700">{booking.confirmationCode}</p>
              <p className="mt-0.5 truncate font-medium text-slate-900">{booking.customerName}</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">{booking.sourceLabel}</p>
              <p className="mt-1 truncate text-[10px] font-medium text-slate-600">
                <span className="text-emerald-700">Incassato {formatEur(booking.paidAmount)}</span>
                <span className="mx-1 text-slate-300">·</span>
                <span className={booking.balanceAmount.gt(0) ? "text-amber-700" : "text-slate-500"}>
                  Da incassare {formatEur(booking.balanceAmount)}
                </span>
              </p>
            </div>
            <span className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-bold tabular-nums text-slate-700">
              <Users className="size-3" aria-hidden="true" /> {booking.numPeople}
            </span>
            <span className="justify-self-end">
              <StatusBadge status={booking.status} kind="booking" />
            </span>
          </Link>
        ))}
      </div>
    </AdminCard>
  );
}

function ExperienceBadge({ kind }: { kind: DailyDeparture["experienceKind"] }) {
  const tone =
    kind === "Exclusive"
      ? "bg-fuchsia-100 text-fuchsia-800"
      : kind === "Mista"
        ? "bg-amber-100 text-amber-800"
        : "bg-blue-100 text-blue-800";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${tone}`}>
      {kind}
    </span>
  );
}

function SummaryPill({ value, label }: { value: string; label: string }) {
  return (
    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
      <strong className="tabular-nums text-slate-950">{value}</strong>{" "}
      <span className="text-slate-500">{label}</span>
    </span>
  );
}

function SummaryBox({
  icon: Icon,
  value,
  label,
  tone = "default",
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  tone?: "default" | "success" | "warn";
}) {
  const valueClass =
    tone === "success" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-slate-950";
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
      <p className="flex items-center gap-1 text-[10px] text-slate-500">
        <Icon className="size-3" aria-hidden="true" /> {label}
      </p>
      <p className={`mt-1 text-xl font-black tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

function FinancialAmount({
  label,
  amount,
  tone,
  className = "",
}: {
  label: string;
  amount: Decimal;
  tone: "success" | "warn";
  className?: string;
}) {
  return (
    <span className={`text-right ${className}`}>
      <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <span
        className={`mt-1 block text-sm font-black tabular-nums ${
          tone === "success" ? "text-emerald-700" : "text-amber-700"
        }`}
      >
        {formatEur(amount)}
      </span>
    </span>
  );
}

function WeatherPreview({
  label,
  weather,
}: {
  label: string;
  weather?: WeatherForBooking;
}) {
  if (!weather) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <strong className="text-sm text-slate-900">{label}</strong>
        <p className="mt-2 text-[11px] text-slate-500">Meteo non disponibile.</p>
      </div>
    );
  }

  const tone = weatherTone(weather.risk);
  return (
    <div className={`rounded-lg border p-3 ${tone.card}`}>
      <div className="flex items-center justify-between gap-2">
        <strong className="text-sm">{label}</strong>
        <span className={`rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-bold uppercase ${tone.label}`}>
          {weatherRiskLabel(weather.risk)}
        </span>
      </div>
      <p className="mt-2 text-[11px]">
        Vento {Math.round(weather.forecast.windSpeedKmh)} km/h · Onde{" "}
        {weather.forecast.waveHeightM === null ? "n/d" : `${weather.forecast.waveHeightM.toFixed(1)} m`} · Pioggia{" "}
        {weather.forecast.precipitationProbability}%
      </p>
    </div>
  );
}

function CompactMetric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </p>
      <p className="mt-1 text-xl font-black tabular-nums text-slate-950">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function weatherTone(risk: string): { card: string; label: string } {
  if (risk === "EXTREME") return { card: "border-red-200 bg-red-50 text-red-950", label: "text-red-800" };
  if (risk === "HIGH") return { card: "border-amber-200 bg-amber-50 text-amber-950", label: "text-amber-800" };
  if (risk === "MEDIUM") return { card: "border-sky-200 bg-sky-50 text-sky-950", label: "text-sky-800" };
  return { card: "border-emerald-200 bg-emerald-50 text-emerald-950", label: "text-emerald-800" };
}

function weatherRiskLabel(risk: string): string {
  if (risk === "EXTREME") return "Critico";
  if (risk === "HIGH") return "Attenzione";
  if (risk === "MEDIUM") return "Da monitorare";
  return "Buono";
}

function formatDashboardDate(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function jsonStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.trim() ? field.trim() : undefined;
}

function toDecimal(value: unknown): Decimal {
  if (value === null || value === undefined) return new Decimal(0);
  if (typeof value === "string" || typeof value === "number") return new Decimal(value);
  if (typeof value === "object" && "toString" in value) return new Decimal(value.toString());
  return new Decimal(0);
}
