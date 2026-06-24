import type { ReactNode } from "react";
import Decimal from "decimal.js";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CloudSun,
  CreditCard,
  Euro,
  Ship,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { TimeIso } from "@/components/ui/time-iso";
import { BookingStatus, PaymentStatus, PaymentType } from "@/generated/prisma/enums";
import { BOOKING_SOURCE_LABEL, labelOrRaw } from "@/lib/admin/labels";
import { db } from "@/lib/db";
import { addDays, formatItDay, isoDay } from "@/lib/dates";
import { formatEur } from "@/lib/pricing/cents";
import {
  getAdminControlRoomDashboard,
  type ControlRoomBooking,
} from "@/lib/queries/admin-control-room-dashboard";
import { getAllWeather, type WeatherForBooking } from "@/lib/weather/service";

interface AvailabilitySummaryRow {
  boatId: string;
  boatName: string;
  totalDays: number;
  availableDays: number;
  blockedDays: number;
  partialDays: number;
}

const MONEY_IN_TYPES: PaymentType[] = ["DEPOSIT", "BALANCE", "FULL"];

const RISK_LABEL: Record<string, string> = {
  LOW: "Buono",
  MEDIUM: "Da monitorare",
  HIGH: "Attenzione",
  EXTREME: "Critico",
};

export default async function DashboardHome() {
  const dashboard = await getAdminControlRoomDashboard();
  const today = dashboard.today;
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 6);
  const todayKey = isoDay(today);

  const [weatherRows, todayRevenue, overdueBalanceCount, availabilitySummary] =
    await Promise.all([
      getAllWeather().catch(() => [] as WeatherForBooking[]),
      getTodayRevenue(today, tomorrow),
      getOverdueBalanceCount(today),
      getAvailabilitySummary(today, weekEnd),
    ]);

  const weatherByDate = new Map(weatherRows.map((row) => [row.date, row]));
  const todayBookings = dashboard.upcomingBookings.filter(
    (booking) => isoDay(booking.startDate) === todayKey,
  );
  const pendingBookings = dashboard.upcomingBookings.filter(
    (booking) => booking.status === BookingStatus.PENDING,
  );
  const urgentCount =
    dashboard.openBalanceCount +
    pendingBookings.length +
    dashboard.pendingAlerts.length +
    dashboard.pendingChangeRequestCount +
    dashboard.pendingOverrideCount +
    dashboard.weatherWatchBookings.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Partenze, meteo, azioni urgenti e disponibilita' per la giornata."
        actions={
          <>
            <Link
              href="/admin/calendario"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              Calendario
            </Link>
            <Link
              href="/admin/prenotazioni"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Prenotazioni
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.85fr]">
        <AdminCard className="space-y-4">
          <SectionTitle
            icon={CalendarDays}
            title="Partenze di oggi"
            actionHref="/admin/calendario"
            actionLabel="Apri calendario"
          />
          {todayBookings.length === 0 ? (
            <EmptyState message="Nessuna partenza prevista oggi." />
          ) : (
            <div className="space-y-3">
              {todayBookings.map((booking) => (
                <TodayDeparture key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard className="space-y-4">
          <SectionTitle
            icon={CloudSun}
            title="Meteo"
            actionHref="/admin/meteo"
            actionLabel="Dettaglio"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <WeatherDay title="Oggi" weather={weatherByDate.get(todayKey)} />
            <WeatherDay title="Domani" weather={weatherByDate.get(isoDay(tomorrow))} />
          </div>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <AdminCard
          id="azioni"
          className="space-y-4"
          tone={urgentCount > 0 ? "warn" : "success"}
        >
          <SectionTitle icon={urgentCount > 0 ? AlertTriangle : CheckCircle2} title="Azioni urgenti" />
          {urgentCount === 0 ? (
            <EmptyState message="Nessuna azione operativa aperta." />
          ) : (
            <div className="space-y-3 text-sm">
              {dashboard.openBalanceBookings.length > 0 && (
                <TaskBlock
                  title={`Saldi da incassare (${dashboard.openBalanceCount})`}
                  href="/admin/finanza"
                  tone="warn"
                >
                  {dashboard.openBalanceBookings.slice(0, 4).map((booking) => (
                    <TaskLine
                      key={booking.id}
                      href={`/admin/prenotazioni/${booking.id}`}
                      title={`${booking.confirmationCode} · ${booking.customerName}`}
                      meta={`${formatItDay(booking.startDate)} · ${formatEur(booking.balanceAmount)}`}
                    />
                  ))}
                </TaskBlock>
              )}

              {pendingBookings.length > 0 && (
                <TaskBlock title={`Booking pending (${pendingBookings.length})`} href="/admin/prenotazioni?status=PENDING">
                  {pendingBookings.slice(0, 4).map((booking) => (
                    <TaskLine
                      key={booking.id}
                      href={`/admin/prenotazioni/${booking.id}`}
                      title={`${booking.confirmationCode} · ${booking.customerName}`}
                      meta={`${formatItDay(booking.startDate)} · ${booking.serviceName}`}
                    />
                  ))}
                </TaskBlock>
              )}

              {dashboard.pendingOverrides.length > 0 && (
                <TaskBlock
                  title={`Conflitti / override (${dashboard.pendingOverrideCount})`}
                  href="/admin/override-requests"
                  tone="alert"
                >
                  {dashboard.pendingOverrides.slice(0, 4).map((request) => (
                    <TaskLine
                      key={request.id}
                      href={`/admin/override-requests/${request.id}`}
                      title={`${request.bookingCode} · ${request.customerName}`}
                      meta={`Differenza ${formatEur(request.deltaRevenue)} · ${formatItDay(request.startDate)}`}
                    />
                  ))}
                </TaskBlock>
              )}

              {dashboard.pendingChangeRequests.length > 0 && (
                <TaskBlock title={`Cambi data (${dashboard.pendingChangeRequestCount})`} href="/admin/change-requests">
                  {dashboard.pendingChangeRequests.slice(0, 4).map((request) => (
                    <TaskLine
                      key={request.id}
                      href="/admin/change-requests"
                      title={`${request.bookingCode} · ${request.customerName}`}
                      meta={`${formatItDay(request.originalStartDate)} -> ${formatItDay(request.requestedStartDate)}`}
                    />
                  ))}
                </TaskBlock>
              )}

              {dashboard.pendingAlerts.length > 0 && (
                <TaskBlock title={`Errori canali (${dashboard.pendingAlerts.length})`} href="/admin/sync-log" tone="warn">
                  {dashboard.pendingAlerts.slice(0, 4).map((alert) => (
                    <TaskLine
                      key={alert.id}
                      href="/admin/sync-log"
                      title={`${alert.channel} · ${alert.action}`}
                      meta={formatItDay(alert.date)}
                    />
                  ))}
                </TaskBlock>
              )}

              {dashboard.weatherWatchBookings.length > 0 && (
                <TaskBlock title={`Meteo da monitorare (${dashboard.weatherWatchBookings.length})`} href="/admin/meteo" tone="warn">
                  {dashboard.weatherWatchBookings.slice(0, 4).map((booking) => (
                    <TaskLine
                      key={booking.id}
                      href={`/admin/prenotazioni/${booking.id}`}
                      title={`${booking.confirmationCode} · ${booking.serviceName}`}
                      meta={`${formatItDay(booking.startDate)} · ${riskText(booking)}`}
                    />
                  ))}
                </TaskBlock>
              )}
            </div>
          )}
        </AdminCard>

        <AdminCard className="space-y-5">
          <SectionTitle icon={CreditCard} title="Pagamenti + disponibilita' prossimi 7 giorni" />
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Incassato oggi" value={formatEur(todayRevenue)} icon={Euro} />
            <MiniMetric
              label="Da incassare"
              value={formatEur(dashboard.openBalanceTotal)}
              hint={`${dashboard.openBalanceCount} saldi aperti`}
              icon={CreditCard}
              tone={dashboard.openBalanceCount > 0 ? "warn" : "default"}
            />
            <MiniMetric
              label="Saldi scaduti"
              value={String(overdueBalanceCount)}
              hint="partenze gia' passate"
              icon={AlertTriangle}
              tone={overdueBalanceCount > 0 ? "alert" : "default"}
            />
          </div>
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Disponibilita' compatta</h3>
              <Link href="/admin/calendario" className="text-xs font-medium text-blue-700 hover:underline">
                Gestisci
              </Link>
            </div>
            {availabilitySummary.length === 0 ? (
              <EmptyState message="Nessuna barca attiva trovata." />
            ) : (
              <div className="space-y-3">
                {availabilitySummary.map((row) => (
                  <AvailabilityRow key={row.boatId} row={row} />
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Aggiornato <TimeIso datetime={dashboard.generatedAt} />
          </p>
        </AdminCard>
      </div>
    </div>
  );
}

async function getTodayRevenue(today: Date, tomorrow: Date): Promise<Decimal> {
  const result = await db.payment.aggregate({
    where: {
      status: PaymentStatus.SUCCEEDED,
      type: { in: MONEY_IN_TYPES },
      processedAt: { gte: today, lt: tomorrow },
    },
    _sum: { amount: true },
  });
  return result._sum.amount ?? new Decimal(0);
}

async function getOverdueBalanceCount(today: Date): Promise<number> {
  return db.directBooking.count({
    where: {
      balanceAmount: { not: null },
      balancePaidAt: null,
      booking: {
        status: BookingStatus.CONFIRMED,
        startDate: { lt: today },
      },
    },
  });
}

async function getAvailabilitySummary(from: Date, to: Date): Promise<AvailabilitySummaryRow[]> {
  const boats = await db.boat.findMany({
    where: { services: { some: { active: true } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (boats.length === 0) return [];

  const rows = await db.boatAvailability.findMany({
    where: {
      boatId: { in: boats.map((boat) => boat.id) },
      date: { gte: from, lte: to },
    },
    select: { boatId: true, date: true, status: true },
  });

  const totalDays = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const byBoat = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byBoat.get(row.boatId) ?? [];
    list.push(row);
    byBoat.set(row.boatId, list);
  }

  return boats.map((boat) => {
    const boatRows = byBoat.get(boat.id) ?? [];
    const blockedDays = boatRows.filter((row) => row.status === "BLOCKED").length;
    const partialDays = boatRows.filter((row) => row.status === "PARTIALLY_BOOKED").length;
    return {
      boatId: boat.id,
      boatName: boat.name,
      totalDays,
      blockedDays,
      partialDays,
      availableDays: Math.max(0, totalDays - blockedDays - partialDays),
    };
  });
}

function SectionTitle({
  icon: Icon,
  title,
  actionHref,
  actionLabel,
}: {
  icon: LucideIcon;
  title: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-bold text-slate-900">
        <Icon className="size-4 text-slate-500" aria-hidden="true" />
        {title}
      </h2>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="text-xs font-medium text-blue-700 hover:underline">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

function TodayDeparture({ booking }: { booking: ControlRoomBooking }) {
  const hasBalance = booking.balanceAmount !== null && !booking.balancePaid;
  return (
    <Link
      href={`/admin/prenotazioni/${booking.id}`}
      className="block rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-blue-700">
              {booking.confirmationCode}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              {labelOrRaw(BOOKING_SOURCE_LABEL, booking.source)}
            </span>
            <StatusBadge status={booking.status} kind="booking" />
          </div>
          <p className="mt-2 font-semibold text-slate-950">{booking.serviceName}</p>
          <p className="mt-1 text-sm text-slate-600">
            {booking.boatName} · {booking.customerName} · {booking.numPeople} pax
          </p>
        </div>
        <div className="text-right text-sm text-slate-600">
          <div>{formatItDay(booking.startDate)}</div>
          <div className="mt-1 inline-flex items-center gap-1 font-medium text-slate-950">
            Apri <ArrowRight className="size-3" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>Pagato {formatEur(booking.paidAmount)} / {formatEur(booking.totalPrice)}</span>
        {hasBalance && (
          <span className="font-semibold text-amber-700">
            saldo {formatEur(booking.balanceAmount)}
          </span>
        )}
        {booking.weatherRisk && booking.weatherRisk !== "LOW" && (
          <span className="font-semibold text-amber-700">{riskText(booking)}</span>
        )}
      </div>
    </Link>
  );
}

function WeatherDay({ title, weather }: { title: string; weather?: WeatherForBooking }) {
  if (!weather) {
    return (
      <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-2">Meteo non disponibile.</p>
      </div>
    );
  }
  const riskClass =
    weather.risk === "EXTREME"
      ? "border-red-200 bg-red-50 text-red-900"
      : weather.risk === "HIGH"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : weather.risk === "MEDIUM"
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : "border-emerald-200 bg-emerald-50 text-emerald-900";
  return (
    <div className={`rounded-xl border p-4 ${riskClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs opacity-80">{formatItDay(new Date(`${weather.date}T00:00:00Z`))}</p>
        </div>
        <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-semibold">
          {RISK_LABEL[weather.risk] ?? weather.risk}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <Metric label="Vento" value={`${Math.round(weather.forecast.windSpeedKmh)} km/h`} />
        <Metric label="Raffiche" value={`${Math.round(weather.forecast.windGustKmh)} km/h`} />
        <Metric label="Onde" value={weather.forecast.waveHeightM === null ? "n/d" : `${weather.forecast.waveHeightM.toFixed(1)} m`} />
        <Metric label="Pioggia" value={`${weather.forecast.precipitationProbability}%`} />
        <Metric label="Temp." value={`${Math.round(weather.forecast.temperatureMin)}-${Math.round(weather.forecast.temperatureMax)} C`} />
      </dl>
      {weather.reasons.length > 0 && (
        <p className="mt-3 text-xs opacity-85">{weather.reasons[0]}</p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="opacity-70">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function TaskBlock({
  title,
  href,
  tone = "default",
  children,
}: {
  title: string;
  href: string;
  tone?: "default" | "warn" | "alert";
  children: ReactNode;
}) {
  const toneClass =
    tone === "alert"
      ? "border-red-200 bg-red-50"
      : tone === "warn"
        ? "border-amber-200 bg-white/70"
        : "border-slate-200 bg-white/70";
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <Link href={href} className="text-xs font-medium text-blue-700 hover:underline">
          Apri
        </Link>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function TaskLine({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <Link href={href} className="block rounded px-1 py-0.5 hover:bg-white">
      <span className="block truncate font-medium text-slate-800">{title}</span>
      <span className="block truncate text-xs text-slate-500">{meta}</span>
    </Link>
  );
}

function MiniMetric({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "warn" | "alert";
}) {
  const iconClass =
    tone === "alert"
      ? "text-red-600"
      : tone === "warn"
        ? "text-amber-600"
        : "text-slate-500";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <Icon className={`size-4 ${iconClass}`} aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function AvailabilityRow({ row }: { row: AvailabilitySummaryRow }) {
  const blockedWidth = Math.round((row.blockedDays / row.totalDays) * 100);
  const partialWidth = Math.round((row.partialDays / row.totalDays) * 100);
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
          <Ship className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="truncate">{row.boatName}</span>
        </span>
        <span className="text-xs text-slate-500">
          {row.availableDays}/{row.totalDays} liberi
        </span>
      </div>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-emerald-100">
        <div className="bg-red-500" style={{ width: `${blockedWidth}%` }} />
        <div className="bg-amber-400" style={{ width: `${partialWidth}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        <span>{row.blockedDays} bloccati</span>
        <span>{row.partialDays} parziali</span>
      </div>
    </div>
  );
}

function riskText(booking: ControlRoomBooking): string {
  if (!booking.weatherRisk) return "meteo non disponibile";
  const reason = booking.weatherReasons[0];
  return `${RISK_LABEL[booking.weatherRisk] ?? booking.weatherRisk}${reason ? ` · ${reason}` : ""}`;
}
