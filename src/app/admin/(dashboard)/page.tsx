import type { ReactNode } from "react";
import type Decimal from "decimal.js";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Euro,
  Plug,
  Search,
  Ship,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TimeIso } from "@/components/ui/time-iso";
import { formatItDay } from "@/lib/dates";
import { formatEur } from "@/lib/pricing/cents";
import {
  getAdminControlRoomDashboard,
  type ControlRoomBooking,
  type ControlRoomPayment,
} from "@/lib/queries/admin-control-room-dashboard";
import {
  getCloudflareTrafficSummary,
  type CloudflareTrafficRankItem,
  type CloudflareTrafficSummary,
} from "@/lib/cloudflare/analytics";
import { CloudflareHourlyLineChart } from "./cloudflare-hourly-line-chart";
import {
  BOOKING_SOURCE_LABEL,
  BOOKING_STATUS_LABEL,
  MANUAL_ALERT_ACTION_LABEL,
  MANUAL_ALERT_CHANNEL_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_TYPE_LABEL,
  labelOrRaw,
} from "@/lib/admin/labels";

const RISK_LABEL: Record<string, string> = {
  MEDIUM: "Da monitorare",
  HIGH: "Attenzione",
  EXTREME: "Critico",
};

const integerFormatter = new Intl.NumberFormat("it-IT");

function formatNumber(value: number) {
  return integerFormatter.format(value);
}

export default async function DashboardHome() {
  const [dashboard, cloudflareTraffic] = await Promise.all([
    getAdminControlRoomDashboard(),
    getCloudflareTrafficSummary(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pannello di controllo"
        subtitle="Quadro operativo di oggi, stagione, incassi, canali e azioni aperte."
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

      <form
        action="/admin/prenotazioni"
        className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row"
      >
        <label className="relative flex-1">
          <span className="sr-only">Cerca prenotazione o cliente</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            type="search"
            placeholder="Cerca codice, cliente, email o telefono"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Cerca
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Incassato mese"
          value={formatEur(dashboard.monthRevenue)}
          icon={Euro}
          hint={`Pagamenti riusciti · rimborsi separati ${formatEur(dashboard.monthRefunds)}`}
          href="/admin/finanza"
        />
        <KpiTile
          label="Incassato stagione"
          value={formatEur(dashboard.seasonRevenue)}
          icon={TrendingUp}
          hint={`Pagamenti riusciti · rimborsi separati ${formatEur(dashboard.seasonRefunds)}`}
          href="/admin/finanza"
        />
        <KpiTile
          label="Da incassare"
          value={formatEur(dashboard.openBalanceTotal)}
          icon={CreditCard}
          tone={dashboard.openBalanceCount > 0 ? "warn" : "default"}
          hint={`${dashboard.openBalanceCount} saldi aperti`}
          href="/admin/finanza"
        />
        <KpiTile
          label="Azioni aperte"
          value={String(dashboard.taskCount)}
          icon={Clock}
          tone={dashboard.taskCount > 0 ? "warn" : "default"}
          hint="Saldi, canali, meteo, email, conflitti"
          href="#azioni"
        />
      </div>

      <CloudflareTrafficCard traffic={cloudflareTraffic} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <AdminCard className="space-y-4">
          <SectionTitle
            icon={Calendar}
            title="Oggi e prossime uscite"
            actionHref="/admin/calendario"
            actionLabel="Apri calendario"
          />
          {dashboard.upcomingBookings.length === 0 ? (
            <EmptyState message="Nessuna uscita confermata o in attesa nei prossimi 7 giorni." />
          ) : (
            <div className="space-y-3">
              {dashboard.upcomingBookings.slice(0, 8).map((booking) => (
                <BookingPreview key={booking.id} booking={booking} />
              ))}
              {dashboard.upcomingBookings.length > 8 && (
                <MoreLink href="/admin/prenotazioni" count={dashboard.upcomingBookings.length - 8} />
              )}
            </div>
          )}
        </AdminCard>

        <AdminCard id="azioni" className="space-y-4" tone={dashboard.taskCount > 0 ? "warn" : "success"}>
          <SectionTitle icon={CheckCircle2} title="Da fare ora" />
          {dashboard.taskCount === 0 ? (
            <EmptyState message="Nessuna azione aperta." />
          ) : (
            <div className="space-y-4 text-sm">
              {dashboard.openBalanceBookings.length > 0 && (
                <TaskBlock
                  title={`Saldi da incassare (${dashboard.openBalanceCount})`}
                  href="/admin/finanza"
                  tone="warn"
                >
                  {dashboard.openBalanceBookings.slice(0, 3).map((booking) => (
                    <TaskLine
                      key={booking.id}
                      href={`/admin/prenotazioni/${booking.id}`}
                      title={`${booking.confirmationCode} · ${booking.customerName}`}
                      meta={`${formatItDay(booking.startDate)} · ${formatEur(booking.balanceAmount)}`}
                    />
                  ))}
                </TaskBlock>
              )}

              {dashboard.pendingAlerts.length > 0 && (
                <TaskBlock
                  title={`Azioni canali (${dashboard.pendingAlerts.length})`}
                  href="/admin/sync-log"
                  tone="warn"
                >
                  {dashboard.pendingAlerts.slice(0, 3).map((alert) => (
                    <TaskLine
                      key={alert.id}
                      href="/admin/sync-log"
                      title={`${labelOrRaw(MANUAL_ALERT_CHANNEL_LABEL, alert.channel)} · ${labelOrRaw(MANUAL_ALERT_ACTION_LABEL, alert.action)}`}
                      meta={formatItDay(alert.date)}
                    />
                  ))}
                </TaskBlock>
              )}

              {dashboard.pendingChangeRequests.length > 0 && (
                <TaskBlock
                  title={`Cambi data (${dashboard.pendingChangeRequestCount})`}
                  href="/admin/change-requests"
                >
                  {dashboard.pendingChangeRequests.slice(0, 3).map((request) => (
                    <TaskLine
                      key={request.id}
                      href="/admin/change-requests"
                      title={`${request.bookingCode} · ${request.customerName}`}
                      meta={`${formatItDay(request.originalStartDate)} → ${formatItDay(request.requestedStartDate)}`}
                    />
                  ))}
                </TaskBlock>
              )}

              {dashboard.pendingOverrides.length > 0 && (
                <TaskBlock
                  title={`Conflitti / overbooking (${dashboard.pendingOverrideCount})`}
                  href="/admin/override-requests"
                  tone="alert"
                >
                  {dashboard.pendingOverrides.slice(0, 3).map((request) => (
                    <TaskLine
                      key={request.id}
                      href={`/admin/override-requests/${request.id}`}
                      title={`${request.bookingCode} · ${request.customerName}`}
                      meta={`Differenza ${formatEur(request.deltaRevenue)} · ${formatItDay(request.startDate)}`}
                    />
                  ))}
                </TaskBlock>
              )}

              {dashboard.weatherWatchBookings.length > 0 && (
                <TaskBlock
                  title={`Meteo da controllare (${dashboard.weatherWatchBookings.length})`}
                  href="/admin/meteo"
                  tone="warn"
                >
                  {dashboard.weatherWatchBookings.slice(0, 3).map((booking) => (
                    <TaskLine
                      key={booking.id}
                      href={`/admin/prenotazioni/${booking.id}`}
                      title={`${booking.confirmationCode} · ${booking.serviceName}`}
                      meta={`${formatItDay(booking.startDate)} · ${riskText(booking)}`}
                    />
                  ))}
                </TaskBlock>
              )}

              {dashboard.failedEmails.length > 0 && (
                <TaskBlock
                  title={`Email fallite (${dashboard.failedEmailCount})`}
                  href="/admin/sync-log"
                  tone="warn"
                >
                  {dashboard.failedEmails.slice(0, 3).map((email) => (
                    <TaskLine
                      key={email.id}
                      href="/admin/sync-log"
                      title={email.subject}
                      meta={`${email.recipientEmail} · tentativi ${email.attempts}`}
                    />
                  ))}
                </TaskBlock>
              )}
            </div>
          )}
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="space-y-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="size-4 text-slate-500" aria-hidden="true" />
              Incassi
            </CardTitle>
            <CardDescription>Incassato effettivo, rimborsi e saldi aperti.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <MoneyBars
              rows={[
                { label: "Incassato mese", value: dashboard.monthRevenue, tone: "positive" },
                { label: "Rimborsi", value: dashboard.monthRefunds, tone: "negative" },
                { label: "Da incassare", value: dashboard.openBalanceTotal, tone: "positive" },
              ]}
            />
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase text-slate-500">Ultimi movimenti</h3>
                <Link href="/admin/finanza" className="text-xs font-medium text-blue-700 hover:underline">
                  Apri incassi
                </Link>
              </div>
              {dashboard.recentPayments.length === 0 ? (
                <EmptyState message="Nessun movimento registrato." />
              ) : (
                dashboard.recentPayments.slice(0, 5).map((payment) => (
                  <PaymentMovement key={payment.id} payment={payment} />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="space-y-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="size-4 text-slate-500" aria-hidden="true" />
              Vendite
            </CardTitle>
            <CardDescription>
              {dashboard.monthBookingsCount} prenotazioni mese · {dashboard.upcomingCount} uscite future.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.servicesWithoutPrices > 0 && (
              <Link
                href="/admin/prezzi"
                className="block rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                {dashboard.servicesWithoutPrices}/{dashboard.activeServiceCount} servizi senza listino
              </Link>
            )}
            <BarChart
              empty="Nessuna vendita di stagione."
              rows={dashboard.topServices.map((service) => ({
                key: service.serviceId,
                label: service.serviceName,
                meta: `${service.bookingsCount} prenotazioni`,
                value: service.revenue,
              }))}
            />
          </CardContent>
        </Card>

        <Card className="space-y-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="size-4 text-slate-500" aria-hidden="true" />
              Canali
            </CardTitle>
            <CardDescription>
              {dashboard.channelProblemCount > 0
                ? `${dashboard.channelProblemCount} canali da verificare`
                : "Canali operativi"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              empty="Nessuna vendita per canale in stagione."
              rows={dashboard.channels.map((channel) => ({
                key: channel.source,
                label: labelOrRaw(BOOKING_SOURCE_LABEL, channel.source),
                meta: `${channel.bookingsCount} prenotazioni${channel.hasError ? " · errore" : ""}`,
                value: channel.revenue,
                tone: channel.hasError || channel.healthStatus === "RED"
                  ? "alert"
                  : channel.healthStatus === "YELLOW"
                    ? "warn"
                    : "default",
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <AdminCard className="space-y-4">
          <SectionTitle
            icon={Users}
            title="Prenotazioni recenti"
            actionHref="/admin/prenotazioni"
            actionLabel="Vedi tutte"
          />
          {dashboard.recentBookings.length === 0 ? (
            <EmptyState message="Nessuna prenotazione registrata." />
          ) : (
            <div className="space-y-3">
              {dashboard.recentBookings.map((booking) => (
                <BookingPreview key={booking.id} booking={booking} compact />
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard className="space-y-4">
          <SectionTitle icon={AlertTriangle} title="Stati prenotazioni stagione" />
          <div className="grid grid-cols-2 gap-3">
            {(["PENDING", "CONFIRMED", "CANCELLED", "REFUNDED"] as const).map((status) => (
              <div key={status} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">
                  {labelOrRaw(BOOKING_STATUS_LABEL, status)}
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                  {dashboard.bookingStatusCounts[status] ?? 0}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-500">
            Ultimo aggiornamento <TimeIso datetime={dashboard.generatedAt} />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

function CloudflareTrafficCard({ traffic }: { traffic: CloudflareTrafficSummary }) {
  const tone = traffic.status === "error" ? "warn" : "default";

  if (traffic.status !== "configured") {
    return (
      <AdminCard className="space-y-3" tone={tone}>
        <SectionTitle icon={Activity} title="Traffico sito" />
        <div className="rounded-lg border border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">
            {traffic.status === "unavailable"
              ? "Cloudflare Analytics non configurato"
              : "Cloudflare Analytics temporaneamente non disponibile"}
          </p>
          <p className="mt-1">{traffic.message}</p>
          <p className="mt-3 text-xs text-slate-500">
            Il widget usa solo dati edge aggregati server-side. Nessun beacon o cookie viene
            caricato sul sito pubblico.
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
        <SectionTitle icon={Activity} title="Traffico sito" />
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
        data={traffic.hourlyVisits.map((point) => ({
          hour: point.hour,
          visits: point.visits,
        }))}
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
                <CountryVisitBar
                  key={country.label}
                  country={country}
                  maxVisits={maxCountryVisits}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BarChart3 className="size-4 text-slate-500" aria-hidden="true" />
            Pagine più viste
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

function TopPageRow({
  page,
  maxVisits,
}: {
  page: CloudflareTrafficRankItem;
  maxVisits: number;
}) {
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

const countryNameFormatter = new Intl.DisplayNames(["it"], { type: "region" });

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

function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  href: string;
  tone?: "default" | "warn";
}) {
  const accent = tone === "warn" ? "border-l-amber-500" : "border-l-slate-900";
  return (
    <Link href={href} className="block">
      <Card className={`min-h-[138px] border-l-4 ${accent} transition hover:bg-slate-50`}>
        <CardHeader className="gap-2">
          <div className="flex items-center justify-between gap-3">
            <CardDescription>{label}</CardDescription>
            <Icon className="size-4 text-slate-500" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-bold tabular-nums">{value}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500">{hint}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function MoneyBars({
  rows,
}: {
  rows: Array<{ label: string; value: Decimal; tone: "positive" | "negative" }>;
}) {
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.value.toNumber())));
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const width = Math.max(4, Math.round((Math.abs(row.value.toNumber()) / max) * 100));
        const color = row.tone === "negative" ? "bg-rose-500" : "bg-emerald-600";
        return (
          <div key={row.label} className="space-y-1">
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-slate-600">{row.label}</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900">
                {formatEur(row.value)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className={`h-2 rounded-full ${color}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentMovement({ payment }: { payment: ControlRoomPayment }) {
  const isRefund = payment.type === "REFUND";
  return (
    <Link
      href={`/admin/prenotazioni/${payment.bookingId}`}
      className="grid gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50 sm:grid-cols-[1fr_auto]"
    >
      <span className="min-w-0">
        <span className="block truncate font-medium text-slate-900">
          {payment.bookingCode} · {payment.customerName}
        </span>
        <span className="block truncate text-xs text-slate-500">
          {labelOrRaw(PAYMENT_TYPE_LABEL, payment.type)} ·{" "}
          {labelOrRaw(PAYMENT_METHOD_LABEL, payment.method)}
          {payment.processedAt ? ` · ${formatItDay(payment.processedAt)}` : ""}
        </span>
      </span>
      <span className={`font-mono font-semibold ${isRefund ? "text-rose-700" : "text-emerald-700"}`}>
        {isRefund ? "-" : ""}
        {formatEur(payment.amount)}
      </span>
    </Link>
  );
}

function BarChart({
  rows,
  empty,
}: {
  rows: Array<{
    key: string;
    label: string;
    meta: string;
    value: Decimal;
    tone?: "default" | "warn" | "alert";
  }>;
  empty: string;
}) {
  if (rows.length === 0) return <EmptyState message={empty} />;
  const max = Math.max(1, ...rows.map((row) => row.value.toNumber()));
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const width = Math.max(4, Math.round((row.value.toNumber() / max) * 100));
        const color =
          row.tone === "alert"
            ? "bg-rose-500"
            : row.tone === "warn"
              ? "bg-amber-500"
              : "bg-slate-800";
        return (
          <div key={row.key} className="space-y-1">
            <div className="flex justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900">{row.label}</span>
                <span className="block truncate text-xs text-slate-500">{row.meta}</span>
              </span>
              <span className="shrink-0 font-mono font-semibold tabular-nums">
                {formatEur(row.value)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className={`h-2 rounded-full ${color}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
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

function BookingPreview({
  booking,
  compact = false,
}: {
  booking: ControlRoomBooking;
  compact?: boolean;
}) {
  const balanceAmount = booking.balanceAmount;
  const hasBalance = balanceAmount !== null && !booking.balancePaid;
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/admin/prenotazioni/${booking.id}`}
            className="font-mono font-semibold text-blue-700 hover:underline"
          >
            {booking.confirmationCode}
          </Link>
          <span className="text-slate-500"> · {formatDateRange(booking)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
            {labelOrRaw(BOOKING_SOURCE_LABEL, booking.source)}
          </span>
          <StatusBadge status={booking.status} kind="booking" />
        </div>
      </div>
      <div className="mt-2 grid gap-1 text-slate-700 md:grid-cols-2">
        <div className="min-w-0">
          <strong>{booking.serviceName}</strong> · {booking.boatName} · {booking.numPeople} pax
        </div>
        <div className="min-w-0 md:text-right">
          {booking.customerName}
          {booking.customerPhone && <span className="text-slate-500"> · {booking.customerPhone}</span>}
        </div>
      </div>
      {!compact && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>
            Pagato {formatEur(booking.paidAmount)} / {formatEur(booking.totalPrice)}
          </span>
          {hasBalance && (
            <span className="font-semibold text-amber-700">
              saldo {formatEur(balanceAmount)}
            </span>
          )}
          {booking.weatherRisk && booking.weatherRisk !== "LOW" && (
            <span className="font-semibold text-amber-700">{riskText(booking)}</span>
          )}
          {booking.latestNote && <span className="truncate">Nota: {booking.latestNote}</span>}
        </div>
      )}
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

function MetricRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="text-slate-500">{label}</dt>
          <dd className="font-mono font-semibold tabular-nums text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function MoreLink({ href, count }: { href: string; count: number }) {
  return (
    <Link href={href} className="block text-sm font-medium text-blue-700 hover:underline">
      +{count} altre righe
    </Link>
  );
}

function formatDateRange(booking: ControlRoomBooking): string {
  if (booking.startDate.getTime() === booking.endDate.getTime()) {
    return formatItDay(booking.startDate);
  }
  return `${formatItDay(booking.startDate)} → ${formatItDay(booking.endDate)}`;
}

function riskText(booking: ControlRoomBooking): string {
  if (!booking.weatherRisk) return "meteo non disponibile";
  const reason = booking.weatherReasons[0];
  return `${RISK_LABEL[booking.weatherRisk] ?? booking.weatherRisk}${reason ? ` · ${reason}` : ""}`;
}
