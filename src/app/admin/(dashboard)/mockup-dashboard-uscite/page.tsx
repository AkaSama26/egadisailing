import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Check,
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
import { PageHeader } from "@/components/admin/page-header";

type Variant = "a" | "b" | "c";

interface PageProps {
  searchParams: Promise<{ variant?: string; boat?: string }>;
}

interface MockBooking {
  id: string;
  code: string;
  customer: string;
  source: string;
  people: number;
  paidAmount: number;
  balanceAmount: number;
  status: "Confermata" | "In attesa";
}

interface MockDeparture {
  id: string;
  boatName: string;
  shortName: string;
  experience: string;
  experienceKind: string;
  people: number;
  capacity: number;
  departureLabel: string;
  exclusive?: boolean;
  icon: LucideIcon;
  tone: string;
  bookings: MockBooking[];
}

const departures: MockDeparture[] = [
  {
    id: "boat",
    boatName: "Barca",
    shortName: "Barca",
    experience: "Barca condivisa giornata intera",
    experienceKind: "Condivisa",
    people: 7,
    capacity: 12,
    departureLabel: "Imbarco 09:30",
    icon: Ship,
    tone: "bg-blue-100 text-blue-700",
    bookings: [
      { id: "mock-calendar-boat-1901", code: "MOCK-B1901", customer: "Luca Romano", source: "Sito diretto", people: 4, paidAmount: 120, balanceAmount: 280, status: "Confermata" },
      { id: "mock-calendar-boat-1902", code: "MOCK-B1902", customer: "Sara Conti", source: "Sito diretto", people: 3, paidAmount: 300, balanceAmount: 0, status: "Confermata" },
    ],
  },
  {
    id: "tour-rib",
    boatName: "Gommone",
    shortName: "Gommone",
    experience: "Gommone condiviso giornata intera",
    experienceKind: "Condivisa",
    people: 9,
    capacity: 12,
    departureLabel: "Imbarco 10:00",
    icon: Waves,
    tone: "bg-cyan-100 text-cyan-700",
    bookings: [
      { id: "mock-calendar-rib-2201", code: "MOCK-R2201", customer: "Marta Serra", source: "Bokun", people: 5, paidAmount: 150, balanceAmount: 350, status: "Confermata" },
      { id: "mock-calendar-rib-2202", code: "MOCK-R2202", customer: "Marco Sala", source: "Sito diretto", people: 4, paidAmount: 120, balanceAmount: 280, status: "Confermata" },
    ],
  },
  {
    id: "trimarano",
    boatName: "Trimarano",
    shortName: "Trimarano",
    experience: "Esperienza Gourmet",
    experienceKind: "Exclusive",
    people: 8,
    capacity: 10,
    departureLabel: "Imbarco 10:00",
    exclusive: true,
    icon: Ship,
    tone: "bg-fuchsia-100 text-fuchsia-700",
    bookings: [
      { id: "mock-calendar-gourmet-1901", code: "MOCK-G1901", customer: "Marco Rossi", source: "Sito diretto", people: 8, paidAmount: 750, balanceAmount: 1750, status: "Confermata" },
    ],
  },
  {
    id: "fishing-rib",
    boatName: "Gommone Pesca",
    shortName: "Gommone Pesca",
    experience: "Charter pesca Egadi",
    experienceKind: "Exclusive",
    people: 4,
    capacity: 4,
    departureLabel: "Imbarco 07:00",
    exclusive: true,
    icon: Fish,
    tone: "bg-amber-100 text-amber-700",
    bookings: [
      { id: "mock-calendar-fishing-2101", code: "MOCK-F2101", customer: "Roberto Marini", source: "Sito diretto", people: 4, paidAmount: 300, balanceAmount: 700, status: "Confermata" },
    ],
  },
];

const variantInfo: Record<Variant, { name: string; description: string }> = {
  a: {
    name: "Lista operativa",
    description: "Ogni uscita occupa una riga: mezzo, esperienza e persone si leggono in un colpo d'occhio.",
  },
  b: {
    name: "Schede flotta",
    description: "Una card per mezzo, più visuale e adatta a una dashboard da consultare rapidamente.",
  },
  c: {
    name: "Tabella compatta",
    description: "Massima densità informativa, utile quando aumentano mezzi e uscite giornaliere.",
  },
};

export default async function DashboardDeparturesMockup({ searchParams }: PageProps) {
  if (process.env.NODE_ENV === "production") notFound();

  const params = await searchParams;
  const variant: Variant = params.variant === "b" || params.variant === "c" ? params.variant : "a";
  const selected = departures.find((departure) => departure.id === params.boat) ?? departures[0];
  const totalPeople = departures.reduce((total, departure) => total + departure.people, 0);
  const totalBookings = departures.reduce((total, departure) => total + departure.bookings.length, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="Uscite, prenotazioni e situazione operativa della giornata."
        actions={
          <nav className="flex rounded-lg border border-slate-200 bg-white p-1" aria-label="Varianti mockup">
            {(["a", "b", "c"] as Variant[]).map((item) => (
              <Link
                key={item}
                href={mockupHref(item, selected.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  item === variant ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.toUpperCase()}
              </Link>
            ))}
          </nav>
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-950">
        <span className="font-bold">Proposta {variant.toUpperCase()} · {variantInfo[variant].name}</span>
        <span>{variantInfo[variant].description}</span>
        <span className="ml-auto font-semibold">Nessuna sezione “Azioni urgenti”</span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
        <AdminCard padding="sm" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Oggi · 19 agosto 2026</p>
              <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-950">
                <CalendarDays className="size-5 text-slate-500" aria-hidden="true" />
                Uscite
              </h2>
            </div>
            <div className="flex gap-2 text-xs">
              <SummaryPill value={String(departures.length)} label="mezzi" />
              <SummaryPill value={String(totalPeople)} label="persone" />
              <SummaryPill value={String(totalBookings)} label="prenotazioni" />
            </div>
          </div>

          {variant === "a" && (
            <DepartureList variant={variant} selectedId={selected.id} />
          )}
          {variant === "b" && (
            <DepartureCards variant={variant} selectedId={selected.id} />
          )}
          {variant === "c" && (
            <DepartureTable variant={variant} selectedId={selected.id} />
          )}
        </AdminCard>

        <QuickBookingPanel departure={selected} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <AdminCard padding="sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-bold text-slate-900">
              <CloudSun className="size-4 text-slate-500" aria-hidden="true" />
              Meteo
            </h2>
            <span className="text-xs font-semibold text-emerald-700">Condizioni buone</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <WeatherPreview label="Oggi" wind="12 km/h" waves="0.8 m" rain="0%" />
            <WeatherPreview label="Domani" wind="17 km/h" waves="1.1 m" rain="10%" />
          </div>
        </AdminCard>

        <AdminCard padding="sm">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <CreditCard className="size-4 text-slate-500" aria-hidden="true" />
            Pagamenti e disponibilità
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <CompactMetric icon={Euro} label="Incassato oggi" value="€ 2.400" />
            <CompactMetric icon={CreditCard} label="Da incassare" value="€ 3.150" hint="4 saldi aperti" />
            <CompactMetric icon={Ship} label="Mezzi in uscita" value="4 / 4" hint="28 persone totali" />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

function DepartureList({ variant, selectedId }: { variant: Variant; selectedId: string }) {
  return (
    <div className="space-y-2">
      {departures.map((departure) => {
        const Icon = departure.icon;
        const active = departure.id === selectedId;
        const paidAmount = departure.bookings.reduce((total, booking) => total + booking.paidAmount, 0);
        const balanceAmount = departure.bookings.reduce((total, booking) => total + booking.balanceAmount, 0);
        return (
          <Link
            key={departure.id}
            href={mockupHref(variant, departure.id)}
            className={`grid grid-cols-[auto_minmax(0,1fr)_110px_110px_70px_auto] items-center gap-3 rounded-xl border p-3 transition ${
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
                <ExperienceBadge departure={departure} />
              </span>
              <span className="mt-1 block truncate text-xs text-slate-500">
                {departure.experience} · {departure.departureLabel} · {departure.bookings.length} prenotazioni
              </span>
            </span>
            <span className="text-right">
              <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">Incassato</span>
              <span className="mt-1 block text-sm font-black tabular-nums text-emerald-700">{formatMockEur(paidAmount)}</span>
            </span>
            <span className="text-right">
              <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">Da incassare</span>
              <span className={`mt-1 block text-sm font-black tabular-nums ${balanceAmount > 0 ? "text-amber-700" : "text-slate-500"}`}>
                {formatMockEur(balanceAmount)}
              </span>
            </span>
            <span className="text-right">
              <span className="block text-2xl font-black tabular-nums text-slate-950">{departure.people}</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">persone</span>
            </span>
            <ChevronRight className="size-4 text-slate-400" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}

function DepartureCards({ variant, selectedId }: { variant: Variant; selectedId: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {departures.map((departure) => {
        const Icon = departure.icon;
        const active = departure.id === selectedId;
        const fill = Math.round((departure.people / departure.capacity) * 100);
        return (
          <Link
            key={departure.id}
            href={mockupHref(variant, departure.id)}
            className={`rounded-xl border p-4 transition ${
              active ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950" : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="flex items-start justify-between gap-3">
              <span className={`flex size-10 items-center justify-center rounded-xl ${departure.tone}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <ExperienceBadge departure={departure} />
            </span>
            <span className="mt-3 block font-bold text-slate-950">{departure.shortName}</span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">{departure.experience}</span>
            <span className="mt-4 flex items-end justify-between gap-3">
              <span>
                <strong className="text-3xl font-black tabular-nums text-slate-950">{departure.people}</strong>
                <span className="ml-1 text-xs text-slate-500">persone</span>
              </span>
              <span className="text-xs text-slate-500">{departure.bookings.length} prenot.</span>
            </span>
            <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-slate-100">
              <span
                className={`block h-full rounded-full ${departure.exclusive ? "bg-fuchsia-500" : fill >= 100 ? "bg-rose-500" : "bg-blue-500"}`}
                style={{ width: `${Math.min(100, fill)}%` }}
              />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function DepartureTable({ variant, selectedId }: { variant: Variant; selectedId: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-[1fr_1.4fr_90px_90px_36px] gap-3 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        <span>Mezzo</span><span>Esperienza</span><span>Prenot.</span><span>Persone</span><span />
      </div>
      <div className="divide-y divide-slate-100">
        {departures.map((departure) => (
          <Link
            key={departure.id}
            href={mockupHref(variant, departure.id)}
            className={`grid grid-cols-[1fr_1.4fr_90px_90px_36px] items-center gap-3 px-3 py-3 text-sm transition ${
              departure.id === selectedId ? "bg-blue-50" : "hover:bg-slate-50"
            }`}
          >
            <span className="truncate font-semibold text-slate-950">{departure.shortName}</span>
            <span className="min-w-0">
              <span className="block truncate text-slate-800">{departure.experience}</span>
              <span className="mt-0.5 block"><ExperienceBadge departure={departure} /></span>
            </span>
            <span className="tabular-nums text-slate-600">{departure.bookings.length}</span>
            <span className="font-black tabular-nums text-slate-950">{departure.people}</span>
            <ChevronRight className="size-4 text-slate-400" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function QuickBookingPanel({ departure }: { departure: MockDeparture }) {
  const Icon = departure.icon;
  const paidAmount = departure.bookings.reduce((total, booking) => total + booking.paidAmount, 0);
  const balanceAmount = departure.bookings.reduce((total, booking) => total + booking.balanceAmount, 0);
  return (
    <AdminCard padding="none" className="self-start overflow-hidden xl:sticky xl:top-4">
      <div className="border-b border-slate-200 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Prenotazioni del mezzo selezionato</p>
        <div className="mt-2 flex items-start gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${departure.tone}`}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="truncate text-lg font-bold text-slate-950">{departure.boatName}</h2>
              <ExperienceBadge departure={departure} />
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">{departure.experience}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <SummaryBox icon={Users} value={String(departure.people)} label="persone" />
          <SummaryBox icon={CalendarDays} value={String(departure.bookings.length)} label="prenotazioni" />
          <SummaryBox icon={Euro} value={formatMockEur(paidAmount)} label="incassato" tone="success" />
          <SummaryBox icon={CreditCard} value={formatMockEur(balanceAmount)} label="da incassare" tone="warn" />
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {departure.bookings.map((booking) => (
          <Link
            key={booking.id}
            href={`/admin/prenotazioni/${booking.id}`}
            aria-label={`Apri il dettaglio della prenotazione ${booking.code}`}
            className="grid grid-cols-[minmax(0,1fr)_70px_92px] items-center gap-2 px-4 py-3 text-xs transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-500"
          >
            <div className="min-w-0">
              <p className="font-mono font-bold text-blue-700">{booking.code}</p>
              <p className="mt-0.5 truncate font-medium text-slate-900">{booking.customer}</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">{booking.source}</p>
              <p className="mt-1 truncate text-[10px] font-medium text-slate-600">
                <span className="text-emerald-700">Incassato {formatMockEur(booking.paidAmount)}</span>
                <span className="mx-1 text-slate-300">·</span>
                <span className={booking.balanceAmount > 0 ? "text-amber-700" : "text-slate-500"}>
                  Da incassare {formatMockEur(booking.balanceAmount)}
                </span>
              </p>
            </div>
            <span className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-bold tabular-nums text-slate-700">
              <Users className="size-3" aria-hidden="true" /> {booking.people}
            </span>
            <span className="inline-flex items-center justify-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800">
              <Check className="size-3" aria-hidden="true" /> {booking.status}
            </span>
          </Link>
        ))}
      </div>
    </AdminCard>
  );
}

function ExperienceBadge({ departure }: { departure: MockDeparture }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
      departure.exclusive ? "bg-fuchsia-100 text-fuchsia-800" : "bg-blue-100 text-blue-800"
    }`}>
      {departure.experienceKind}
    </span>
  );
}

function SummaryPill({ value, label }: { value: string; label: string }) {
  return (
    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
      <strong className="tabular-nums text-slate-950">{value}</strong> <span className="text-slate-500">{label}</span>
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
      <p className="flex items-center gap-1 text-[10px] text-slate-500"><Icon className="size-3" /> {label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

function WeatherPreview({ label, wind, waves, rain }: { label: string; wind: string; waves: string; rain: string }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-sm text-emerald-950">{label}</strong>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-800">Buono</span>
      </div>
      <p className="mt-2 text-[11px] text-emerald-900">Vento {wind} · Onde {waves} · Pioggia {rain}</p>
    </div>
  );
}

function CompactMetric({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}<Icon className="size-3.5" aria-hidden="true" />
      </p>
      <p className="mt-1 text-xl font-black tabular-nums text-slate-950">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function mockupHref(variant: Variant, boatId: string): string {
  return `/admin/mockup-dashboard-uscite?variant=${variant}&boat=${boatId}`;
}

function formatMockEur(amount: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}
