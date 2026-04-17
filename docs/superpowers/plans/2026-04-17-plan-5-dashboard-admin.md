# Plan 5 — Dashboard Admin Completa

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard admin completa con 13 sezioni (Dashboard, Prenotazioni, Calendario, Disponibilità, Prezzi, Servizi, Clienti, Crew, Finanza, Canali, Meteo, Sync & Log, Impostazioni). Integra i 3 source, gestione hot days con sync Bokun, CRM deduplicato, crew auto-assign, health channel monitoring.

**Architecture:** Server Components per lettura dati (fast), Server Actions per mutazioni, shadcn/ui per componenti. Sidebar fissa, layout responsive. Ogni mutazione critica passa per `auditLog` del Plan 1 e triggera `SyncQueue` quando tocca availability/pricing.

**Tech Stack:** Next.js 16 App Router, shadcn/ui, Recharts per grafici, React Hook Form + Zod, date-fns.

**Spec di riferimento:** `docs/superpowers/specs/2026-04-17-platform-v2-design.md`
**Prerequisiti:** Plan 1, 2, 3, 4 completati.

---

## File Structure

```
src/app/admin/
├── layout.tsx
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx                          # Dashboard home
│   ├── prenotazioni/
│   │   ├── page.tsx
│   │   ├── [id]/page.tsx
│   │   └── actions.ts
│   ├── calendario/
│   │   └── page.tsx
│   ├── disponibilita/
│   │   ├── page.tsx
│   │   └── actions.ts
│   ├── prezzi/
│   │   ├── page.tsx
│   │   └── actions.ts
│   ├── servizi/page.tsx
│   ├── clienti/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── crew/
│   │   ├── page.tsx
│   │   └── actions.ts
│   ├── finanza/page.tsx
│   ├── canali/page.tsx
│   ├── meteo/page.tsx
│   ├── sync-log/page.tsx
│   └── impostazioni/page.tsx
└── login/
    └── page.tsx                          # (esistente, riutilizzare)

src/components/admin/
├── admin-sidebar.tsx
├── admin-header.tsx
├── kpi-card.tsx
├── booking-table.tsx
├── calendar-grid.tsx
├── hot-day-editor.tsx
├── channel-health-widget.tsx
├── crew-assigner.tsx
└── ... (altri da tasks)
```

---

## Task 1: Layout admin + sidebar

**Files:**
- Modify: `src/app/admin/layout.tsx` (se esiste, altrimenti create)
- Create: `src/app/admin/(dashboard)/layout.tsx`
- Create: `src/components/admin/admin-sidebar.tsx`

- [ ] **Step 1: Sidebar**

Crea `src/components/admin/admin-sidebar.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ListChecks, Calendar, CalendarX, Coins, Boxes,
  Users, UserCog, LineChart, Plug, CloudSun, Activity, Settings,
} from "lucide-react";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/prenotazioni", label: "Prenotazioni", icon: ListChecks },
  { href: "/admin/calendario", label: "Calendario", icon: Calendar },
  { href: "/admin/disponibilita", label: "Disponibilità", icon: CalendarX },
  { href: "/admin/prezzi", label: "Prezzi", icon: Coins },
  { href: "/admin/servizi", label: "Servizi", icon: Boxes },
  { href: "/admin/clienti", label: "Clienti", icon: Users },
  { href: "/admin/crew", label: "Crew", icon: UserCog },
  { href: "/admin/finanza", label: "Finanza", icon: LineChart },
  { href: "/admin/canali", label: "Canali", icon: Plug },
  { href: "/admin/meteo", label: "Meteo", icon: CloudSun },
  { href: "/admin/sync-log", label: "Sync & Log", icon: Activity },
  { href: "/admin/impostazioni", label: "Impostazioni", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 bg-[#071934] text-white min-h-screen p-4 sticky top-0">
      <h1 className="text-xl font-bold mb-8 px-2">Egadisailing</h1>
      <nav className="space-y-1">
        {items.map((it) => {
          const active = pathname === it.href || (it.href !== "/admin" && pathname.startsWith(it.href));
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="size-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Dashboard layout**

Crea `src/app/admin/(dashboard)/layout.tsx`:

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(dashboard\)/layout.tsx src/components/admin/admin-sidebar.tsx
git commit -m "feat(admin): sidebar with 13 sections + protected dashboard layout"
```

---

## Task 2: Dashboard home — KPI + alert

**Files:**
- Create: `src/app/admin/(dashboard)/page.tsx`
- Create: `src/components/admin/kpi-card.tsx`

- [ ] **Step 1: KPI card component**

Crea `src/components/admin/kpi-card.tsx`:

```typescript
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500">{label}</span>
        <Icon className="size-5 text-slate-400" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Dashboard page**

Crea `src/app/admin/(dashboard)/page.tsx`:

```typescript
import { db } from "@/lib/db";
import { KpiCard } from "@/components/admin/kpi-card";
import { Prisma } from "@prisma/client";
import { Euro, Calendar, Clock, AlertTriangle } from "lucide-react";
import { listPendingManualAlerts } from "@/lib/charter/manual-alerts";
import Link from "next/link";

export default async function DashboardHome() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [revenueAgg, bookingsCount, upcomingTrips, balancesAgg, pendingAlerts, channelStatuses] = await Promise.all([
    db.payment.aggregate({
      where: {
        status: "SUCCEEDED",
        type: { in: ["DEPOSIT", "BALANCE", "FULL"] },
        processedAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    db.booking.count({
      where: { createdAt: { gte: monthStart }, status: { in: ["CONFIRMED", "PENDING"] } },
    }),
    db.booking.count({
      where: { status: "CONFIRMED", startDate: { gte: now } },
    }),
    db.directBooking.aggregate({
      where: { paymentSchedule: "DEPOSIT_BALANCE", balancePaidAt: null, booking: { startDate: { gte: now } } },
      _sum: { balanceAmount: true },
    }),
    listPendingManualAlerts(),
    db.channelSyncStatus.findMany(),
  ]);

  const revenue = (revenueAgg._sum.amount ?? new Prisma.Decimal(0)).toNumber();
  const balances = (balancesAgg._sum.balanceAmount ?? new Prisma.Decimal(0)).toNumber();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Revenue mese" value={`€${revenue.toFixed(2)}`} icon={Euro} />
        <KpiCard label="Prenotazioni mese" value={String(bookingsCount)} icon={Calendar} />
        <KpiCard label="Uscite future" value={String(upcomingTrips)} icon={Clock} />
        <KpiCard label="Saldi pendenti" value={`€${balances.toFixed(2)}`} icon={AlertTriangle} />
      </div>

      {pendingAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="font-bold text-red-800 mb-3">🚨 Alert manuali</h2>
          <ul className="space-y-2 text-sm">
            {pendingAlerts.slice(0, 5).map((a) => (
              <li key={a.id} className="flex justify-between">
                <span>{a.targetChannel.replace("_MANUAL", "")} — {(a.payload as { date: string }).date}</span>
                <Link href="/admin/sync-log" className="text-red-600 underline">Gestisci</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-3">Channel health</h2>
        <div className="flex gap-4 flex-wrap">
          {channelStatuses.map((c) => (
            <span
              key={c.channel}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                c.healthStatus === "GREEN"
                  ? "bg-emerald-100 text-emerald-800"
                  : c.healthStatus === "YELLOW"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {c.channel} {c.healthStatus === "GREEN" ? "🟢" : c.healthStatus === "YELLOW" ? "🟡" : "🔴"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(dashboard\)/page.tsx src/components/admin/kpi-card.tsx
git commit -m "feat(admin): dashboard home with KPIs, alerts, channel health"
```

---

## Task 3: Prenotazioni — lista unificata

**Files:**
- Create: `src/app/admin/(dashboard)/prenotazioni/page.tsx`
- Create: `src/components/admin/booking-table.tsx`

- [ ] **Step 1: Table component**

Crea `src/components/admin/booking-table.tsx`:

```typescript
import Link from "next/link";

export interface BookingRow {
  id: string;
  confirmationCode: string;
  source: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startDate: Date;
  numPeople: number;
  totalPrice: number;
  paidAmount: number;
  status: string;
}

export function BookingTable({ rows }: { rows: BookingRow[] }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left p-3">Codice</th>
            <th className="text-left p-3">Data</th>
            <th className="text-left p-3">Servizio</th>
            <th className="text-left p-3">Cliente</th>
            <th className="text-left p-3">Source</th>
            <th className="text-right p-3">Totale</th>
            <th className="text-right p-3">Pagato</th>
            <th className="text-left p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t hover:bg-slate-50">
              <td className="p-3">
                <Link href={`/admin/prenotazioni/${r.id}`} className="font-mono text-blue-600 hover:underline">
                  {r.confirmationCode}
                </Link>
              </td>
              <td className="p-3">{r.startDate.toLocaleDateString("it-IT")}</td>
              <td className="p-3">{r.serviceName}</td>
              <td className="p-3">
                <div className="font-medium">{r.customerName}</div>
                <div className="text-xs text-slate-500">{r.customerEmail}</div>
              </td>
              <td className="p-3">
                <span className="px-2 py-1 rounded bg-slate-100 text-xs">{r.source}</span>
              </td>
              <td className="p-3 text-right">€{r.totalPrice.toFixed(2)}</td>
              <td className="p-3 text-right">€{r.paidAmount.toFixed(2)}</td>
              <td className="p-3">
                <span className={`text-xs font-semibold ${
                  r.status === "CONFIRMED" ? "text-emerald-700" :
                  r.status === "CANCELLED" ? "text-red-700" :
                  r.status === "REFUNDED" ? "text-amber-700" : "text-slate-700"
                }`}>
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="p-8 text-center text-slate-500">
                Nessuna prenotazione trovata
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Page**

Crea `src/app/admin/(dashboard)/prenotazioni/page.tsx`:

```typescript
import { db } from "@/lib/db";
import { BookingTable, type BookingRow } from "@/components/admin/booking-table";

interface Props {
  searchParams: Promise<{ source?: string; status?: string }>;
}

export default async function PrenotazioniPage({ searchParams }: Props) {
  const sp = await searchParams;

  const bookings = await db.booking.findMany({
    where: {
      ...(sp.source ? { source: sp.source as never } : {}),
      ...(sp.status ? { status: sp.status as never } : {}),
    },
    include: { customer: true, service: true, payments: true },
    orderBy: { startDate: "desc" },
    take: 200,
  });

  const rows: BookingRow[] = bookings.map((b) => ({
    id: b.id,
    confirmationCode: b.confirmationCode,
    source: b.source,
    customerName: `${b.customer.firstName} ${b.customer.lastName}`,
    customerEmail: b.customer.email,
    serviceName: b.service.name,
    startDate: b.startDate,
    numPeople: b.numPeople,
    totalPrice: b.totalPrice.toNumber(),
    paidAmount: b.payments
      .filter((p) => p.status === "SUCCEEDED" && p.type !== "REFUND")
      .reduce((acc, p) => acc + p.amount.toNumber(), 0),
    status: b.status,
  }));

  const sources = ["DIRECT", "BOKUN", "BOATAROUND", "SAMBOAT", "CLICKANDBOAT", "NAUTAL"];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Prenotazioni</h1>

      <div className="flex gap-2 flex-wrap">
        <a href="/admin/prenotazioni" className={`px-3 py-1 rounded-full text-xs border ${!sp.source ? "bg-slate-900 text-white" : "bg-white"}`}>Tutte</a>
        {sources.map((s) => (
          <a
            key={s}
            href={`/admin/prenotazioni?source=${s}`}
            className={`px-3 py-1 rounded-full text-xs border ${sp.source === s ? "bg-slate-900 text-white" : "bg-white"}`}
          >
            {s}
          </a>
        ))}
      </div>

      <BookingTable rows={rows} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(dashboard\)/prenotazioni/ src/components/admin/booking-table.tsx
git commit -m "feat(admin): prenotazioni list with source filters"
```

---

## Task 4: Booking detail + actions (cancel/refund/note)

**Files:**
- Create: `src/app/admin/(dashboard)/prenotazioni/[id]/page.tsx`
- Create: `src/app/admin/(dashboard)/prenotazioni/actions.ts`

- [ ] **Step 1: Server actions**

Crea `src/app/admin/(dashboard)/prenotazioni/actions.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { auditLog } from "@/lib/audit/log";
import { refundPayment } from "@/lib/stripe/payment-intents";
import { releaseDates } from "@/lib/availability/service";
import { revalidatePath } from "next/cache";

export async function cancelBooking(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const b = await db.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true, directBooking: true },
  });
  if (!b) throw new Error("Booking not found");

  // Refund Stripe (solo payments succeeded)
  for (const p of b.payments) {
    if (p.status === "SUCCEEDED" && p.stripeChargeId && p.type !== "REFUND") {
      try {
        const ref = await refundPayment(p.stripeChargeId);
        await db.payment.update({
          where: { id: p.id },
          data: { status: "REFUNDED", stripeRefundId: ref.id },
        });
      } catch {
        // già loggato nel helper
      }
    }
  }

  await db.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  await releaseDates(b.boatId, b.startDate, b.endDate, "ADMIN_OVERRIDE");

  await auditLog({
    userId: session.user.id,
    action: "CANCEL",
    entity: "Booking",
    entityId: bookingId,
    before: { status: b.status },
    after: { status: "CANCELLED" },
  });

  revalidatePath(`/admin/prenotazioni/${bookingId}`);
  revalidatePath("/admin/prenotazioni");
}

export async function addBookingNote(bookingId: string, note: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  if (!note.trim()) return;

  await db.bookingNote.create({
    data: { bookingId, note: note.trim(), authorId: session.user.id },
  });

  await auditLog({
    userId: session.user.id,
    action: "ADD_NOTE",
    entity: "Booking",
    entityId: bookingId,
    after: { note },
  });

  revalidatePath(`/admin/prenotazioni/${bookingId}`);
}

export async function registerManualPayment(
  bookingId: string,
  amount: number,
  method: "CASH" | "BANK_TRANSFER" | "POS",
  type: "DEPOSIT" | "BALANCE" | "FULL",
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  await db.payment.create({
    data: {
      bookingId,
      amount,
      type,
      method,
      status: "SUCCEEDED",
      processedAt: new Date(),
    },
  });

  if (type === "BALANCE") {
    await db.directBooking.update({
      where: { bookingId },
      data: { balancePaidAt: new Date() },
    });
  }

  await auditLog({
    userId: session.user.id,
    action: "REGISTER_PAYMENT",
    entity: "Booking",
    entityId: bookingId,
    after: { amount, method, type },
  });

  revalidatePath(`/admin/prenotazioni/${bookingId}`);
}
```

- [ ] **Step 2: Detail page**

Crea `src/app/admin/(dashboard)/prenotazioni/[id]/page.tsx`:

```typescript
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { cancelBooking, addBookingNote, registerManualPayment } from "../actions";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const b = await db.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      service: true,
      boat: true,
      payments: { orderBy: { createdAt: "asc" } },
      bookingNotes: { orderBy: { createdAt: "desc" } },
      directBooking: true,
      bokunBooking: true,
      charterBooking: true,
    },
  });
  if (!b) notFound();

  const cancelAction = cancelBooking.bind(null, b.id);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Prenotazione {b.confirmationCode}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border p-5 space-y-2">
          <h2 className="font-bold">Dettagli</h2>
          <p><strong>Servizio:</strong> {b.service.name}</p>
          <p><strong>Barca:</strong> {b.boat.name}</p>
          <p><strong>Data:</strong> {b.startDate.toLocaleDateString("it-IT")} → {b.endDate.toLocaleDateString("it-IT")}</p>
          <p><strong>Persone:</strong> {b.numPeople}</p>
          <p><strong>Source:</strong> {b.source}</p>
          <p><strong>Status:</strong> {b.status}</p>
          <p><strong>Totale:</strong> €{b.totalPrice.toNumber().toFixed(2)}</p>
        </section>

        <section className="bg-white rounded-xl border p-5 space-y-2">
          <h2 className="font-bold">Cliente</h2>
          <p><strong>Nome:</strong> {b.customer.firstName} {b.customer.lastName}</p>
          <p><strong>Email:</strong> {b.customer.email}</p>
          <p><strong>Telefono:</strong> {b.customer.phone ?? "-"}</p>
          <p><strong>Nazionalità:</strong> {b.customer.nationality ?? "-"}</p>
        </section>
      </div>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-3">Pagamenti</h2>
        <ul className="space-y-2 text-sm">
          {b.payments.map((p) => (
            <li key={p.id} className="flex justify-between">
              <span>{p.type} · {p.method} · {p.status}</span>
              <span>€{p.amount.toNumber().toFixed(2)}</span>
            </li>
          ))}
        </ul>

        <form
          action={async (fd) => {
            "use server";
            const amount = parseFloat(String(fd.get("amount") ?? ""));
            const method = fd.get("method") as "CASH" | "BANK_TRANSFER" | "POS";
            const type = fd.get("type") as "DEPOSIT" | "BALANCE" | "FULL";
            await registerManualPayment(b.id, amount, method, type);
          }}
          className="mt-4 flex gap-2 flex-wrap"
        >
          <input name="amount" type="number" step="0.01" placeholder="Importo" required className="border px-3 py-2 rounded text-sm" />
          <select name="type" className="border px-3 py-2 rounded text-sm">
            <option value="DEPOSIT">Acconto</option>
            <option value="BALANCE">Saldo</option>
            <option value="FULL">Pagamento intero</option>
          </select>
          <select name="method" className="border px-3 py-2 rounded text-sm">
            <option value="CASH">Cash</option>
            <option value="POS">POS</option>
            <option value="BANK_TRANSFER">Bonifico</option>
          </select>
          <button className="bg-slate-900 text-white px-4 py-2 rounded text-sm">Registra pagamento</button>
        </form>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-3">Note interne</h2>
        <form
          action={async (fd) => {
            "use server";
            const note = String(fd.get("note") ?? "");
            await addBookingNote(b.id, note);
          }}
          className="space-y-2 mb-4"
        >
          <textarea name="note" rows={3} className="w-full border rounded px-3 py-2 text-sm" placeholder="Aggiungi nota..." />
          <button className="bg-slate-900 text-white px-4 py-2 rounded text-sm">Salva nota</button>
        </form>
        <ul className="space-y-2 text-sm">
          {b.bookingNotes.map((n) => (
            <li key={n.id} className="border-l-2 border-slate-200 pl-3 py-1">
              <div className="text-slate-600 text-xs">{n.createdAt.toLocaleString("it-IT")}</div>
              <div>{n.note}</div>
            </li>
          ))}
        </ul>
      </section>

      {b.status !== "CANCELLED" && (
        <form action={cancelAction}>
          <button className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">
            Cancella prenotazione
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(dashboard\)/prenotazioni/
git commit -m "feat(admin): booking detail page - cancel, manual payment, internal notes"
```

---

## Task 5: Calendario master

**Files:**
- Create: `src/app/admin/(dashboard)/calendario/page.tsx`
- Create: `src/components/admin/calendar-grid.tsx`

- [ ] **Step 1: Calendar grid**

Crea `src/components/admin/calendar-grid.tsx`:

```typescript
interface DayCell {
  date: Date;
  bookings: Array<{ id: string; source: string; serviceName: string; confirmationCode: string }>;
  status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
}

const sourceColors: Record<string, string> = {
  DIRECT: "bg-blue-100 text-blue-800",
  BOKUN: "bg-purple-100 text-purple-800",
  BOATAROUND: "bg-emerald-100 text-emerald-800",
  SAMBOAT: "bg-cyan-100 text-cyan-800",
  CLICKANDBOAT: "bg-amber-100 text-amber-800",
  NAUTAL: "bg-rose-100 text-rose-800",
};

export function CalendarGrid({ days, boatName }: { days: DayCell[]; boatName: string }) {
  return (
    <div>
      <h2 className="font-bold mb-3">{boatName}</h2>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
          <div key={d} className="text-center font-semibold text-slate-500 p-2">{d}</div>
        ))}
        {days.map((day, i) => {
          const dayNum = day.date.getDate();
          return (
            <div
              key={i}
              className={`aspect-square border rounded p-1 flex flex-col ${
                day.status === "BLOCKED" ? "bg-red-50" :
                day.status === "PARTIALLY_BOOKED" ? "bg-amber-50" :
                "bg-white"
              }`}
            >
              <div className="text-slate-500">{dayNum}</div>
              <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-hidden">
                {day.bookings.map((b) => (
                  <span
                    key={b.id}
                    className={`px-1 rounded text-[10px] truncate ${sourceColors[b.source] ?? "bg-slate-100"}`}
                    title={`${b.confirmationCode} · ${b.serviceName}`}
                  >
                    {b.source[0]}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Page**

Crea `src/app/admin/(dashboard)/calendario/page.tsx`:

```typescript
import { db } from "@/lib/db";
import { CalendarGrid } from "@/components/admin/calendar-grid";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const month = sp.month ? parseInt(sp.month) : now.getMonth() + 1;
  const year = sp.year ? parseInt(sp.year) : now.getFullYear();

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));

  const boats = await db.boat.findMany({ orderBy: { name: "asc" } });

  const bookings = await db.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "PENDING"] },
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    include: { service: { select: { name: true } } },
  });

  const availability = await db.boatAvailability.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
  });

  // Padding per griglia settimane da Lun a Dom
  const firstWeekday = (monthStart.getUTCDay() + 6) % 7; // 0=Lun
  const daysInMonth = monthEnd.getUTCDate();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Calendario · {year}-{String(month).padStart(2, "0")}</h1>
        <div className="flex gap-2">
          <a
            href={`/admin/calendario?year=${year}&month=${month === 1 ? 12 : month - 1}${month === 1 ? `&year=${year - 1}` : ""}`}
            className="px-3 py-1 border rounded text-sm"
          >
            ← Prec
          </a>
          <a
            href={`/admin/calendario?year=${year}&month=${month === 12 ? 1 : month + 1}${month === 12 ? `&year=${year + 1}` : ""}`}
            className="px-3 py-1 border rounded text-sm"
          >
            Succ →
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {boats.map((boat) => {
          const days = [];
          for (let i = 0; i < firstWeekday; i++) {
            days.push({ date: new Date(0), bookings: [], status: "AVAILABLE" as const });
          }
          for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(Date.UTC(year, month - 1, d));
            const avail = availability.find(
              (a) => a.boatId === boat.id && a.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10),
            );
            const dayBookings = bookings.filter(
              (b) => b.boatId === boat.id && b.startDate <= date && b.endDate >= date,
            );
            days.push({
              date,
              bookings: dayBookings.map((b) => ({
                id: b.id,
                source: b.source,
                serviceName: b.service.name,
                confirmationCode: b.confirmationCode,
              })),
              status: (avail?.status ?? "AVAILABLE") as "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED",
            });
          }
          return <CalendarGrid key={boat.id} days={days} boatName={boat.name} />;
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(dashboard\)/calendario/ src/components/admin/calendar-grid.tsx
git commit -m "feat(admin): calendario mensile per barca con color coding per source"
```

---

## Task 6: Prezzi — lista periods + hot day editor

**Files:**
- Create: `src/app/admin/(dashboard)/prezzi/page.tsx`
- Create: `src/app/admin/(dashboard)/prezzi/actions.ts`
- Create: `src/components/admin/hot-day-editor.tsx`

- [ ] **Step 1: Actions**

Crea `src/app/admin/(dashboard)/prezzi/actions.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { auditLog } from "@/lib/audit/log";
import { scheduleBokunPricingSync } from "@/lib/pricing/bokun-sync";
import { revalidatePath } from "next/cache";

export async function upsertPricingPeriod(input: {
  id?: string;
  serviceId: string;
  label: string;
  startDate: string;
  endDate: string;
  pricePerPerson: number;
  year: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const data = {
    serviceId: input.serviceId,
    label: input.label,
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
    pricePerPerson: new Prisma.Decimal(input.pricePerPerson),
    year: input.year,
  };

  const result = input.id
    ? await db.pricingPeriod.update({ where: { id: input.id }, data })
    : await db.pricingPeriod.create({ data });

  await auditLog({
    userId: session.user.id,
    action: input.id ? "UPDATE" : "CREATE",
    entity: "PricingPeriod",
    entityId: result.id,
    after: data,
  });

  // Schedule sync Bokun per le date coperte
  const dates: Date[] = [];
  const cursor = new Date(result.startDate);
  while (cursor <= result.endDate) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  await scheduleBokunPricingSync({ dates, serviceIds: [input.serviceId] });

  revalidatePath("/admin/prezzi");
}

export async function upsertHotDayRule(input: {
  id?: string;
  name: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  weekdays: number[];
  multiplier: number;
  roundTo: number;
  priority: number;
  active: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const data = {
    name: input.name,
    dateRangeStart: new Date(input.dateRangeStart),
    dateRangeEnd: new Date(input.dateRangeEnd),
    weekdays: input.weekdays,
    multiplier: new Prisma.Decimal(input.multiplier),
    roundTo: input.roundTo,
    priority: input.priority,
    active: input.active,
  };

  const result = input.id
    ? await db.hotDayRule.update({ where: { id: input.id }, data })
    : await db.hotDayRule.create({ data });

  await auditLog({
    userId: session.user.id,
    action: input.id ? "UPDATE" : "CREATE",
    entity: "HotDayRule",
    entityId: result.id,
    after: data,
  });

  // Schedule sync per tutte le date coperte
  const dates: Date[] = [];
  const cursor = new Date(result.dateRangeStart);
  while (cursor <= result.dateRangeEnd) {
    if (result.weekdays.length === 0 || result.weekdays.includes(cursor.getUTCDay())) {
      dates.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  await scheduleBokunPricingSync({ dates });

  revalidatePath("/admin/prezzi");
}

export async function deleteHotDayRule(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  const before = await db.hotDayRule.findUnique({ where: { id } });
  await db.hotDayRule.delete({ where: { id } });
  await auditLog({
    userId: session.user.id,
    action: "DELETE",
    entity: "HotDayRule",
    entityId: id,
    before: before as never,
  });
  revalidatePath("/admin/prezzi");
}
```

- [ ] **Step 2: Page**

Crea `src/app/admin/(dashboard)/prezzi/page.tsx`:

```typescript
import { db } from "@/lib/db";
import { upsertPricingPeriod, upsertHotDayRule } from "./actions";

export default async function PrezziPage() {
  const services = await db.service.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const periods = await db.pricingPeriod.findMany({
    include: { service: true },
    orderBy: [{ year: "desc" }, { startDate: "asc" }],
  });
  const hotDayRules = await db.hotDayRule.findMany({ orderBy: { priority: "desc" } });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Prezzi</h1>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-3">Pricing periods</h2>
        <table className="w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left p-2">Servizio</th>
              <th className="text-left p-2">Label</th>
              <th className="text-left p-2">Da</th>
              <th className="text-left p-2">A</th>
              <th className="text-right p-2">€/pax</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.service.name}</td>
                <td className="p-2">{p.label}</td>
                <td className="p-2">{p.startDate.toLocaleDateString("it-IT")}</td>
                <td className="p-2">{p.endDate.toLocaleDateString("it-IT")}</td>
                <td className="p-2 text-right">€{p.pricePerPerson.toNumber().toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <form
          action={async (fd) => {
            "use server";
            await upsertPricingPeriod({
              serviceId: String(fd.get("serviceId")),
              label: String(fd.get("label")),
              startDate: String(fd.get("startDate")),
              endDate: String(fd.get("endDate")),
              pricePerPerson: parseFloat(String(fd.get("pricePerPerson"))),
              year: parseInt(String(fd.get("year"))),
            });
          }}
          className="mt-4 grid grid-cols-6 gap-2"
        >
          <select name="serviceId" className="border rounded px-2 py-1" required>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input name="label" placeholder="Label (es. alta)" className="border rounded px-2 py-1" required />
          <input name="startDate" type="date" className="border rounded px-2 py-1" required />
          <input name="endDate" type="date" className="border rounded px-2 py-1" required />
          <input name="pricePerPerson" type="number" step="0.01" placeholder="€/pax" className="border rounded px-2 py-1" required />
          <input name="year" type="number" placeholder="Anno" defaultValue={new Date().getFullYear()} className="border rounded px-2 py-1" required />
          <button className="col-span-6 bg-slate-900 text-white rounded py-2 text-sm">Aggiungi period</button>
        </form>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-3">Hot day rules</h2>
        <ul className="space-y-2 text-sm">
          {hotDayRules.map((r) => (
            <li key={r.id} className="flex justify-between border-b pb-2">
              <div>
                <strong>{r.name}</strong> · {r.dateRangeStart.toLocaleDateString("it-IT")} → {r.dateRangeEnd.toLocaleDateString("it-IT")} · x{r.multiplier.toNumber()} · round €{r.roundTo}
              </div>
              <span className={`text-xs ${r.active ? "text-emerald-600" : "text-slate-400"}`}>
                {r.active ? "ATTIVA" : "OFF"}
              </span>
            </li>
          ))}
        </ul>

        <form
          action={async (fd) => {
            "use server";
            const weekdaysStr = String(fd.get("weekdays") ?? "");
            await upsertHotDayRule({
              name: String(fd.get("name")),
              dateRangeStart: String(fd.get("dateRangeStart")),
              dateRangeEnd: String(fd.get("dateRangeEnd")),
              weekdays: weekdaysStr ? weekdaysStr.split(",").map((n) => parseInt(n.trim())) : [],
              multiplier: parseFloat(String(fd.get("multiplier"))),
              roundTo: parseInt(String(fd.get("roundTo"))),
              priority: parseInt(String(fd.get("priority"))),
              active: fd.get("active") === "on",
            });
          }}
          className="mt-4 grid grid-cols-6 gap-2"
        >
          <input name="name" placeholder="Nome" className="border rounded px-2 py-1 col-span-2" required />
          <input name="dateRangeStart" type="date" className="border rounded px-2 py-1" required />
          <input name="dateRangeEnd" type="date" className="border rounded px-2 py-1" required />
          <input name="multiplier" type="number" step="0.01" defaultValue="1.25" className="border rounded px-2 py-1" required />
          <input name="roundTo" type="number" defaultValue="10" className="border rounded px-2 py-1" required />
          <input name="weekdays" placeholder="Weekdays es. 6,0 (sab,dom) o vuoto per tutti" className="border rounded px-2 py-1 col-span-3" />
          <input name="priority" type="number" defaultValue="10" className="border rounded px-2 py-1" />
          <label className="flex items-center gap-2 text-sm col-span-2">
            <input type="checkbox" name="active" defaultChecked /> Attiva
          </label>
          <button className="col-span-6 bg-slate-900 text-white rounded py-2 text-sm">Aggiungi regola</button>
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(dashboard\)/prezzi/
git commit -m "feat(admin): prezzi page - pricing periods + hot day rules CRUD with Bokun sync"
```

---

## Task 7: Servizi, Clienti, Crew pages

**Files:**
- Create: `src/app/admin/(dashboard)/servizi/page.tsx`
- Create: `src/app/admin/(dashboard)/clienti/page.tsx`
- Create: `src/app/admin/(dashboard)/clienti/[id]/page.tsx`
- Create: `src/app/admin/(dashboard)/crew/page.tsx`
- Create: `src/app/admin/(dashboard)/crew/actions.ts`

- [ ] **Step 1: Servizi (read-only catalog)**

Crea `src/app/admin/(dashboard)/servizi/page.tsx`:

```typescript
import { db } from "@/lib/db";

export default async function ServiziPage() {
  const services = await db.service.findMany({ include: { boat: true }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Servizi</h1>
      <p className="text-slate-500 text-sm">
        Catalogo dei servizi. Questi dati sono seed-populated; per modifiche strutturali contattare il team tech.
      </p>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-left p-3">Barca</th>
              <th className="text-left p-3">Durata</th>
              <th className="text-center p-3">Capacity</th>
              <th className="text-left p-3">Payment</th>
              <th className="text-center p-3">Deposit %</th>
              <th className="text-left p-3">Bokun ID</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.type}</td>
                <td className="p-3">{s.boat.name}</td>
                <td className="p-3">{s.durationType}</td>
                <td className="p-3 text-center">{s.capacityMax}</td>
                <td className="p-3">{s.defaultPaymentSchedule}</td>
                <td className="p-3 text-center">{s.defaultDepositPercentage ?? "-"}</td>
                <td className="p-3 text-xs">{s.bokunProductId ?? <span className="text-red-500">non mappato</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Clienti list**

Crea `src/app/admin/(dashboard)/clienti/page.tsx`:

```typescript
import { db } from "@/lib/db";
import Link from "next/link";

export default async function ClientiPage() {
  const customers = await db.customer.findMany({
    include: { _count: { select: { bookings: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Clienti</h1>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Telefono</th>
              <th className="text-center p-3">Prenotazioni</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t hover:bg-slate-50">
                <td className="p-3">
                  <Link href={`/admin/clienti/${c.id}`} className="text-blue-600 hover:underline">
                    {c.firstName} {c.lastName}
                  </Link>
                </td>
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.phone ?? "-"}</td>
                <td className="p-3 text-center">{c._count.bookings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Cliente detail**

Crea `src/app/admin/(dashboard)/clienti/[id]/page.tsx`:

```typescript
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      bookings: { include: { service: true }, orderBy: { startDate: "desc" } },
    },
  });
  if (!customer) notFound();

  const totalSpent = customer.bookings
    .filter((b) => b.status !== "CANCELLED")
    .reduce((acc, b) => acc + b.totalPrice.toNumber(), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        {customer.firstName} {customer.lastName}
      </h1>

      <section className="bg-white rounded-xl border p-5 space-y-2">
        <p><strong>Email:</strong> {customer.email}</p>
        <p><strong>Telefono:</strong> {customer.phone ?? "-"}</p>
        <p><strong>Nazionalità:</strong> {customer.nationality ?? "-"}</p>
        <p><strong>Prenotazioni:</strong> {customer.bookings.length}</p>
        <p><strong>Speso totale:</strong> €{totalSpent.toFixed(2)}</p>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-3">Prenotazioni</h2>
        <ul className="space-y-2 text-sm">
          {customer.bookings.map((b) => (
            <li key={b.id} className="flex justify-between border-b pb-2">
              <div>
                <Link href={`/admin/prenotazioni/${b.id}`} className="font-mono text-blue-600 hover:underline">
                  {b.confirmationCode}
                </Link>
                {" · "}
                {b.service.name} · {b.startDate.toLocaleDateString("it-IT")}
              </div>
              <div>€{b.totalPrice.toNumber().toFixed(2)} · {b.status}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Crew actions**

Crea `src/app/admin/(dashboard)/crew/actions.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { auditLog } from "@/lib/audit/log";
import { revalidatePath } from "next/cache";

export async function upsertCrewMember(input: {
  id?: string;
  name: string;
  role: "SKIPPER" | "CHEF" | "HOSTESS";
  phone?: string;
  email?: string;
  dailyRate?: number;
  active: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const data = {
    name: input.name,
    role: input.role,
    phone: input.phone,
    email: input.email,
    dailyRate: input.dailyRate,
    active: input.active,
  };
  const result = input.id
    ? await db.crewMember.update({ where: { id: input.id }, data })
    : await db.crewMember.create({ data });

  await auditLog({
    userId: session.user.id,
    action: input.id ? "UPDATE" : "CREATE",
    entity: "CrewMember",
    entityId: result.id,
    after: data,
  });

  revalidatePath("/admin/crew");
}

export async function assignCrewToBooking(bookingId: string, crewMemberId: string, role: "SKIPPER" | "CHEF" | "HOSTESS") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  await db.tripCrew.upsert({
    where: { bookingId_crewMemberId: { bookingId, crewMemberId } },
    update: { role },
    create: { bookingId, crewMemberId, role },
  });

  await auditLog({
    userId: session.user.id,
    action: "ASSIGN_CREW",
    entity: "Booking",
    entityId: bookingId,
    after: { crewMemberId, role },
  });

  revalidatePath(`/admin/prenotazioni/${bookingId}`);
  revalidatePath("/admin/crew");
}
```

- [ ] **Step 5: Crew page**

Crea `src/app/admin/(dashboard)/crew/page.tsx`:

```typescript
import { db } from "@/lib/db";
import { upsertCrewMember } from "./actions";

export default async function CrewPage() {
  const members = await db.crewMember.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Crew</h1>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Ruolo</th>
              <th className="text-left p-3">Telefono</th>
              <th className="text-left p-3">Email</th>
              <th className="text-right p-3">Tariffa</th>
              <th className="text-center p-3">Attivo</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="p-3">{m.name}</td>
                <td className="p-3">{m.role}</td>
                <td className="p-3">{m.phone ?? "-"}</td>
                <td className="p-3">{m.email ?? "-"}</td>
                <td className="p-3 text-right">€{m.dailyRate?.toNumber().toFixed(2) ?? "-"}</td>
                <td className="p-3 text-center">{m.active ? "✓" : "✗"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        action={async (fd) => {
          "use server";
          await upsertCrewMember({
            name: String(fd.get("name")),
            role: fd.get("role") as "SKIPPER" | "CHEF" | "HOSTESS",
            phone: String(fd.get("phone") ?? "") || undefined,
            email: String(fd.get("email") ?? "") || undefined,
            dailyRate: fd.get("dailyRate") ? parseFloat(String(fd.get("dailyRate"))) : undefined,
            active: true,
          });
        }}
        className="bg-white rounded-xl border p-5 grid grid-cols-5 gap-2"
      >
        <input name="name" placeholder="Nome" className="border rounded px-3 py-2" required />
        <select name="role" className="border rounded px-3 py-2">
          <option value="SKIPPER">Skipper</option>
          <option value="CHEF">Chef</option>
          <option value="HOSTESS">Hostess</option>
        </select>
        <input name="phone" placeholder="Telefono" className="border rounded px-3 py-2" />
        <input name="email" type="email" placeholder="Email" className="border rounded px-3 py-2" />
        <input name="dailyRate" type="number" step="0.01" placeholder="€/giorno" className="border rounded px-3 py-2" />
        <button className="col-span-5 bg-slate-900 text-white rounded py-2 text-sm">Aggiungi membro</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/\(dashboard\)/servizi/ src/app/admin/\(dashboard\)/clienti/ src/app/admin/\(dashboard\)/crew/
git commit -m "feat(admin): servizi (read-only), clienti list+detail, crew CRUD"
```

---

## Task 8: Finanza, Canali, Meteo, Sync & Log, Impostazioni

**Files:**
- Create: `src/app/admin/(dashboard)/finanza/page.tsx`
- Create: `src/app/admin/(dashboard)/canali/page.tsx`
- Create: `src/app/admin/(dashboard)/meteo/page.tsx`
- Create: `src/app/admin/(dashboard)/sync-log/page.tsx`
- Create: `src/app/admin/(dashboard)/impostazioni/page.tsx`

- [ ] **Step 1: Finanza**

Crea `src/app/admin/(dashboard)/finanza/page.tsx`:

```typescript
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export default async function FinanzaPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [byMonth, byYear, bySource, byService] = await Promise.all([
    db.payment.aggregate({
      where: { status: "SUCCEEDED", type: { in: ["DEPOSIT", "BALANCE", "FULL"] }, processedAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { status: "SUCCEEDED", type: { in: ["DEPOSIT", "BALANCE", "FULL"] }, processedAt: { gte: yearStart } },
      _sum: { amount: true },
    }),
    db.booking.groupBy({
      by: ["source"],
      where: { status: { in: ["CONFIRMED", "REFUNDED"] }, createdAt: { gte: yearStart } },
      _sum: { totalPrice: true },
      _count: true,
    }),
    db.booking.groupBy({
      by: ["serviceId"],
      where: { status: "CONFIRMED", createdAt: { gte: yearStart } },
      _sum: { totalPrice: true },
      _count: true,
    }),
  ]);

  const services = await db.service.findMany();
  const svcName = (id: string) => services.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Finanza</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <div className="text-sm text-slate-500">Revenue mese</div>
          <div className="text-2xl font-bold">€{(byMonth._sum.amount ?? new Prisma.Decimal(0)).toNumber().toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <div className="text-sm text-slate-500">Revenue anno</div>
          <div className="text-2xl font-bold">€{(byYear._sum.amount ?? new Prisma.Decimal(0)).toNumber().toFixed(2)}</div>
        </div>
      </div>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-3">Per source (anno)</h2>
        <ul className="text-sm space-y-1">
          {bySource.map((s) => (
            <li key={s.source} className="flex justify-between">
              <span>{s.source} · {s._count} prenotazioni</span>
              <span>€{(s._sum.totalPrice ?? new Prisma.Decimal(0)).toNumber().toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-3">Per servizio (anno)</h2>
        <ul className="text-sm space-y-1">
          {byService.map((s) => (
            <li key={s.serviceId} className="flex justify-between">
              <span>{svcName(s.serviceId)} · {s._count} prenotazioni</span>
              <span>€{(s._sum.totalPrice ?? new Prisma.Decimal(0)).toNumber().toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Canali**

Crea `src/app/admin/(dashboard)/canali/page.tsx`:

```typescript
import { db } from "@/lib/db";

export default async function CanaliPage() {
  const channels = await db.channelSyncStatus.findMany();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Canali</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((c) => (
          <div key={c.channel} className="bg-white rounded-xl border p-5">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold">{c.channel}</h2>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                c.healthStatus === "GREEN" ? "bg-emerald-100 text-emerald-800" :
                c.healthStatus === "YELLOW" ? "bg-amber-100 text-amber-800" :
                "bg-red-100 text-red-800"
              }`}>
                {c.healthStatus}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Ultimo sync: {c.lastSyncAt ? c.lastSyncAt.toLocaleString("it-IT") : "mai"}
            </p>
            {c.lastError && <p className="text-xs text-red-600 mt-1">{c.lastError}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Meteo (placeholder — worker dal Plan 6 popolerà)**

Crea `src/app/admin/(dashboard)/meteo/page.tsx`:

```typescript
import { db } from "@/lib/db";

export default async function MeteoPage() {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const trips = await db.booking.findMany({
    where: { status: "CONFIRMED", startDate: { gte: now, lte: weekEnd } },
    include: { service: true },
    orderBy: { startDate: "asc" },
  });

  const forecasts = await db.weatherForecastCache.findMany({
    where: { date: { gte: now, lte: weekEnd } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meteo — prossimi 7 giorni</h1>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-3">Uscite programmate</h2>
        <ul className="space-y-2 text-sm">
          {trips.map((t) => {
            const fc = forecasts.find(
              (f) => f.date.toISOString().slice(0, 10) === t.startDate.toISOString().slice(0, 10),
            );
            const fcData = fc?.forecast as { suitability?: string } | null;
            return (
              <li key={t.id} className="flex justify-between border-b pb-2">
                <div>
                  <span className="font-mono text-xs">{t.confirmationCode}</span> ·{" "}
                  {t.service.name} · {t.startDate.toLocaleDateString("it-IT")}
                </div>
                <div>{fcData?.suitability ?? "forecast non disponibile"}</div>
              </li>
            );
          })}
          {trips.length === 0 && <li className="text-slate-500">Nessuna uscita nei prossimi 7 giorni</li>}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Sync & Log**

Crea `src/app/admin/(dashboard)/sync-log/page.tsx`:

```typescript
import { db } from "@/lib/db";

export default async function SyncLogPage() {
  const [pending, failed, recent, audit] = await Promise.all([
    db.syncQueue.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.syncQueue.findMany({ where: { status: "FAILED" }, orderBy: { updatedAt: "desc" }, take: 50 }),
    db.syncQueue.findMany({ where: { status: "SYNCED" }, orderBy: { updatedAt: "desc" }, take: 50 }),
    db.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 50, include: { user: true } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Sync & Log</h1>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-3">Coda pending ({pending.length})</h2>
        <ul className="text-sm space-y-1">
          {pending.map((j) => (
            <li key={j.id} className="font-mono text-xs">
              {j.targetChannel} · {j.operation} · attempt {j.attempts} · {j.createdAt.toLocaleString("it-IT")}
            </li>
          ))}
          {pending.length === 0 && <li className="text-slate-500">Nessun job pending</li>}
        </ul>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-3">Falliti ({failed.length})</h2>
        <ul className="text-sm space-y-1">
          {failed.map((j) => (
            <li key={j.id} className="font-mono text-xs">
              {j.targetChannel} · {j.operation} · {j.lastError?.slice(0, 80)}
            </li>
          ))}
          {failed.length === 0 && <li className="text-slate-500">Tutto ok</li>}
        </ul>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-3">Audit log (ultimi 50)</h2>
        <ul className="text-sm space-y-1">
          {audit.map((a) => (
            <li key={a.id} className="flex justify-between border-b pb-1">
              <span>{a.timestamp.toLocaleString("it-IT")} · {a.user?.name ?? "system"} · {a.action} · {a.entity}/{a.entityId}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Impostazioni**

Crea `src/app/admin/(dashboard)/impostazioni/page.tsx`:

```typescript
import { auth } from "@/lib/auth";

export default async function ImpostazioniPage() {
  const session = await auth();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Impostazioni</h1>

      <section className="bg-white rounded-xl border p-5 space-y-2">
        <h2 className="font-bold">Account</h2>
        <p><strong>Email:</strong> {session?.user?.email}</p>
        <p><strong>Nome:</strong> {session?.user?.name}</p>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-3">Configurazione</h2>
        <p className="text-sm text-slate-500">
          Le configurazioni sensibili (credenziali API, markup Bokun, soglie meteo, rate limiting)
          sono gestite tramite variabili d'ambiente sul VPS. Contattare il team tech per modifiche.
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/\(dashboard\)/finanza/ src/app/admin/\(dashboard\)/canali/ src/app/admin/\(dashboard\)/meteo/ src/app/admin/\(dashboard\)/sync-log/ src/app/admin/\(dashboard\)/impostazioni/
git commit -m "feat(admin): finanza (KPI aggregates), canali (health), meteo (forecast list), sync-log, impostazioni"
```

---

## Task 9: Disponibilità admin (block/unblock manuali)

**Files:**
- Create: `src/app/admin/(dashboard)/disponibilita/page.tsx`
- Create: `src/app/admin/(dashboard)/disponibilita/actions.ts`

- [ ] **Step 1: Actions**

Crea `src/app/admin/(dashboard)/disponibilita/actions.ts`:

```typescript
"use server";

import { auth } from "@/lib/auth";
import { auditLog } from "@/lib/audit/log";
import { blockDates, releaseDates } from "@/lib/availability/service";
import { revalidatePath } from "next/cache";

export async function manualBlockRange(boatId: string, startDate: string, endDate: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  await blockDates(boatId, new Date(startDate), new Date(endDate), "ADMIN_OVERRIDE");
  await auditLog({
    userId: session.user.id,
    action: "MANUAL_BLOCK",
    entity: "Boat",
    entityId: boatId,
    after: { startDate, endDate, reason },
  });
  revalidatePath("/admin/disponibilita");
  revalidatePath("/admin/calendario");
}

export async function manualReleaseRange(boatId: string, startDate: string, endDate: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  await releaseDates(boatId, new Date(startDate), new Date(endDate), "ADMIN_OVERRIDE");
  await auditLog({
    userId: session.user.id,
    action: "MANUAL_RELEASE",
    entity: "Boat",
    entityId: boatId,
    after: { startDate, endDate },
  });
  revalidatePath("/admin/disponibilita");
  revalidatePath("/admin/calendario");
}
```

- [ ] **Step 2: Page**

Crea `src/app/admin/(dashboard)/disponibilita/page.tsx`:

```typescript
import { db } from "@/lib/db";
import { manualBlockRange, manualReleaseRange } from "./actions";

export default async function DisponibilitaPage() {
  const boats = await db.boat.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Disponibilità</h1>
      <p className="text-slate-500 text-sm">
        Blocca manualmente date per manutenzione, ferie, eventi privati. Le azioni propagano a tutti i canali esterni.
      </p>

      {boats.map((boat) => (
        <section key={boat.id} className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-bold">{boat.name}</h2>

          <form
            action={async (fd) => {
              "use server";
              await manualBlockRange(
                boat.id,
                String(fd.get("startDate")),
                String(fd.get("endDate")),
                String(fd.get("reason") ?? ""),
              );
            }}
            className="grid grid-cols-4 gap-2"
          >
            <input name="startDate" type="date" className="border rounded px-3 py-2" required />
            <input name="endDate" type="date" className="border rounded px-3 py-2" required />
            <input name="reason" placeholder="Motivo" className="border rounded px-3 py-2" />
            <button className="bg-red-600 text-white rounded py-2 text-sm">Blocca</button>
          </form>

          <form
            action={async (fd) => {
              "use server";
              await manualReleaseRange(
                boat.id,
                String(fd.get("startDate")),
                String(fd.get("endDate")),
              );
            }}
            className="grid grid-cols-4 gap-2"
          >
            <input name="startDate" type="date" className="border rounded px-3 py-2" required />
            <input name="endDate" type="date" className="border rounded px-3 py-2" required />
            <div />
            <button className="bg-emerald-600 text-white rounded py-2 text-sm">Rilascia</button>
          </form>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(dashboard\)/disponibilita/
git commit -m "feat(admin): disponibilità - manual block/release with fan-out to all channels"
```

---

## Task 10: Build + smoke test

- [ ] **Step 1: TypeScript**

Run: `npx tsc --noEmit`

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: tutte le pagine admin compilate.

- [ ] **Step 3: Smoke manuale**

Run: `npm run dev` e visita in browser (con admin loggato):
- `/admin` → vede KPI
- `/admin/prenotazioni` → vede tabella
- `/admin/calendario` → vede calendari boat
- `/admin/prezzi` → può creare regola hot day (triggera sync Bokun in queue)
- `/admin/disponibilita` → può bloccare date
- `/admin/crew` → può aggiungere crew

- [ ] **Step 4: Commit finale**

```bash
git status
```

---

## Self-review

- [x] **Spec coverage**: dashboard home ✓, prenotazioni unificate con tab source ✓, calendar master per boat ✓, hot days CRUD con sync Bokun ✓, CRM clienti ✓, crew CRUD + assignment ✓, finanza aggregati ✓, canali health ✓, meteo con forecast cache ✓, sync & log ✓, impostazioni ✓, disponibilità manuale con fan-out ✓.
- [x] **Placeholder scan**: nessun TBD.
- [x] **Type consistency**: `BookingSource` enum usato coerentemente nei filtri. `HotDayRule.weekdays` è `number[]` dove 0=domenica (convenzione JS `getUTCDay`). Revalidation paths allineati.
