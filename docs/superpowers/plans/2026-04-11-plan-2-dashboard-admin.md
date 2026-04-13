# Plan 2: Dashboard Admin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire la dashboard admin completa con layout sidebar, navigazione, e tutti i moduli: calendario/prenotazioni, gestione prezzi, gestione crew, CRM clienti, dashboard finanziaria.

**Architecture:** Tutte le pagine admin vivono sotto `src/app/admin/(dashboard)/`. Server Actions per le mutazioni dati. Server Components dove possibile, Client Components solo per interattività (form, dialog, calendario). Layout admin con sidebar di navigazione.

**Tech Stack:** Next.js 16 App Router, Server Actions, shadcn/ui, Prisma v7 (`@/generated/prisma/client`), Tailwind CSS v4

**Spec di riferimento:** `docs/superpowers/specs/2026-04-10-egadisailing-platform-design.md`

**Contesto tecnico esistente:**
- Prisma singleton: `import { db } from "@/lib/db"` 
- Prisma client import: `import { ... } from "@/generated/prisma/client"`
- Auth: `import { auth } from "@/lib/auth"` — restituisce session con user.name, user.role
- Admin layout protetto: `src/app/admin/(dashboard)/layout.tsx` — redirect se non autenticato
- shadcn/ui components: button, card, input, label, table, dialog, calendar, select, separator, sheet, tabs, badge, dropdown-menu, avatar, chart, sonner

---

## File Structure

```
src/app/admin/(dashboard)/
├── layout.tsx              (MODIFY: add sidebar + topbar)
├── page.tsx                (MODIFY: dashboard overview con stats)
├── bookings/
│   ├── page.tsx            (lista prenotazioni con filtri)
│   └── [id]/
│       └── page.tsx        (dettaglio prenotazione)
├── calendar/
│   └── page.tsx            (vista calendario uscite)
├── trips/
│   ├── page.tsx            (lista uscite)
│   └── new/
│       └── page.tsx        (crea nuova uscita)
├── pricing/
│   └── page.tsx            (gestione prezzi per periodo)
├── crew/
│   └── page.tsx            (gestione crew)
├── customers/
│   ├── page.tsx            (lista clienti CRM)
│   └── [id]/
│       └── page.tsx        (dettaglio cliente)
├── finance/
│   └── page.tsx            (dashboard finanziaria)
└── settings/
    └── page.tsx            (impostazioni account)

src/app/admin/_components/
├── admin-sidebar.tsx       (sidebar navigazione)
├── admin-topbar.tsx        (topbar con user menu)
├── stats-card.tsx          (card statistiche dashboard)
├── booking-table.tsx       (tabella prenotazioni)
├── booking-form.tsx        (form prenotazione manuale)
├── trip-calendar.tsx       (calendario uscite)
├── trip-form.tsx           (form creazione uscita)
├── pricing-table.tsx       (tabella prezzi editabile)
├── pricing-form.tsx        (form periodo prezzo)
├── crew-table.tsx          (tabella crew)
├── crew-form.tsx           (form crew member)
├── customer-table.tsx      (tabella clienti)
├── finance-charts.tsx      (grafici finanziari)
└── finance-filters.tsx     (filtri periodo/servizio)

src/app/admin/_actions/
├── booking-actions.ts      (server actions prenotazioni)
├── trip-actions.ts         (server actions uscite)
├── pricing-actions.ts      (server actions prezzi)
├── crew-actions.ts         (server actions crew)
└── customer-actions.ts     (server actions clienti)
```

---

### Task 1: Admin Layout con Sidebar e Topbar

**Files:**
- Modify: `src/app/admin/(dashboard)/layout.tsx`
- Create: `src/app/admin/_components/admin-sidebar.tsx`, `src/app/admin/_components/admin-topbar.tsx`

- [ ] **Step 1: Crea `src/app/admin/_components/admin-sidebar.tsx`**

Sidebar di navigazione con link a tutte le sezioni admin. Usa shadcn/ui components (Button, Separator, Sheet per mobile). Icone da lucide-react.

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Ship,
  BookOpen,
  DollarSign,
  Users,
  UserCog,
  BarChart3,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/admin/trips", label: "Uscite", icon: Ship },
  { href: "/admin/bookings", label: "Prenotazioni", icon: BookOpen },
  { href: "/admin/pricing", label: "Prezzi", icon: DollarSign },
  { href: "/admin/crew", label: "Crew", icon: UserCog },
  { href: "/admin/customers", label: "Clienti", icon: Users },
  { href: "/admin/finance", label: "Finanza", icon: BarChart3 },
  { href: "/admin/settings", label: "Impostazioni", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
          <Ship className="h-6 w-6" />
          Egadisailing
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Button
              key={item.href}
              variant={isActive ? "secondary" : "ghost"}
              className={cn("w-full justify-start gap-2")}
              asChild
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Crea `src/app/admin/_components/admin-topbar.tsx`**

Topbar con titolo pagina, mobile menu toggle (Sheet per sidebar mobile), e user dropdown.

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, LogOut, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AdminSidebar } from "./admin-sidebar";

// Same navItems as sidebar — import from shared location or duplicate
import {
  CalendarDays,
  BookOpen,
  DollarSign,
  Users,
  UserCog,
  BarChart3,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/admin/trips", label: "Uscite", icon: Ship },
  { href: "/admin/bookings", label: "Prenotazioni", icon: BookOpen },
  { href: "/admin/pricing", label: "Prezzi", icon: DollarSign },
  { href: "/admin/crew", label: "Crew", icon: UserCog },
  { href: "/admin/customers", label: "Clienti", icon: Users },
  { href: "/admin/finance", label: "Finanza", icon: BarChart3 },
  { href: "/admin/settings", label: "Impostazioni", icon: Settings },
];

export function AdminTopbar({ userName }: { userName?: string | null }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();
  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "A";

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
              <Ship className="h-6 w-6" />
              Egadisailing
            </Link>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start gap-2")}
                  asChild
                  onClick={() => setSheetOpen(false)}
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{userName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/admin/login" })}>
            <LogOut className="mr-2 h-4 w-4" />
            Esci
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
```

- [ ] **Step 3: Aggiorna `src/app/admin/(dashboard)/layout.tsx`**

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "../_components/admin-sidebar";
import { AdminTopbar } from "../_components/admin-topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar userName={session.user?.name} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verifica layout**

```bash
npm run dev
```

Go to /admin — should show sidebar with navigation links and topbar with user avatar. Sidebar should collapse to hamburger menu on mobile width.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/
git commit -m "feat(admin): add sidebar navigation and topbar layout"
```

---

### Task 2: Dashboard Overview (Home Admin)

**Files:**
- Modify: `src/app/admin/(dashboard)/page.tsx`
- Create: `src/app/admin/_components/stats-card.tsx`

- [ ] **Step 1: Crea `src/app/admin/_components/stats-card.tsx`**

Reusable stats card component:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
}

export function StatsCard({ title, value, description, icon: Icon }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Aggiorna `src/app/admin/(dashboard)/page.tsx`**

Dashboard with 4 stats cards (prenotazioni oggi, guadagno mese, clienti totali, uscite programmate) + tabella ultime prenotazioni. Fetch data from database.

```typescript
import { db } from "@/lib/db";
import { StatsCard } from "../_components/stats-card";
import { CalendarDays, DollarSign, Users, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  CONFIRMED: "default",
  PENDING: "secondary",
  CANCELLED: "destructive",
  REFUNDED: "outline",
};

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [todayBookings, monthRevenue, totalCustomers, scheduledTrips, recentBookings] =
    await Promise.all([
      db.booking.count({
        where: {
          createdAt: { gte: today },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
      }),
      db.booking.aggregate({
        _sum: { totalPrice: true },
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: "CONFIRMED",
        },
      }),
      db.customer.count(),
      db.trip.count({ where: { status: "SCHEDULED", date: { gte: today } } }),
      db.booking.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true, email: true } },
          trip: { select: { date: true, service: { select: { name: true } } } },
        },
      }),
    ]);

  const revenue = monthRevenue._sum.totalPrice?.toNumber() ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Prenotazioni Oggi"
          value={todayBookings}
          icon={BookOpen}
        />
        <StatsCard
          title="Guadagno Mese"
          value={`€${revenue.toLocaleString("it-IT")}`}
          icon={DollarSign}
        />
        <StatsCard
          title="Clienti Totali"
          value={totalCustomers}
          icon={Users}
        />
        <StatsCard
          title="Uscite Programmate"
          value={scheduledTrips}
          icon={CalendarDays}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ultime Prenotazioni</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Servizio</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Persone</TableHead>
                <TableHead>Totale</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nessuna prenotazione ancora
                  </TableCell>
                </TableRow>
              ) : (
                recentBookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.customer.name}</TableCell>
                    <TableCell>{b.trip.service.name}</TableCell>
                    <TableCell>
                      {new Date(b.trip.date).toLocaleDateString("it-IT")}
                    </TableCell>
                    <TableCell>{b.numPeople}</TableCell>
                    <TableCell>€{b.totalPrice.toNumber().toLocaleString("it-IT")}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[b.status] as any}>
                        {b.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verifica dashboard**

Go to /admin — should show 4 stats cards (all zeros/empty since no bookings yet) and empty bookings table.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/
git commit -m "feat(admin): add dashboard overview with stats and recent bookings"
```

---

### Task 3: Gestione Uscite (Trips)

**Files:**
- Create: `src/app/admin/(dashboard)/trips/page.tsx`, `src/app/admin/(dashboard)/trips/new/page.tsx`, `src/app/admin/_actions/trip-actions.ts`, `src/app/admin/_components/trip-form.tsx`

- [ ] **Step 1: Crea `src/app/admin/_actions/trip-actions.ts`**

Server actions for CRUD trips:

```typescript
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createTrip(formData: FormData) {
  const serviceId = formData.get("serviceId") as string;
  const date = formData.get("date") as string;
  const departureTime = formData.get("departureTime") as string;
  const returnTime = formData.get("returnTime") as string;
  const notes = formData.get("notes") as string | null;

  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service) throw new Error("Servizio non trovato");

  await db.trip.create({
    data: {
      serviceId,
      date: new Date(date),
      departureTime,
      returnTime,
      availableSpots: service.capacityMax,
      notes: notes || null,
    },
  });

  revalidatePath("/admin/trips");
  revalidatePath("/admin/calendar");
}

export async function updateTripStatus(tripId: string, status: "SCHEDULED" | "COMPLETED" | "CANCELLED") {
  await db.trip.update({
    where: { id: tripId },
    data: { status },
  });
  revalidatePath("/admin/trips");
  revalidatePath("/admin/calendar");
}

export async function deleteTrip(tripId: string) {
  await db.trip.delete({ where: { id: tripId } });
  revalidatePath("/admin/trips");
  revalidatePath("/admin/calendar");
}
```

- [ ] **Step 2: Crea `src/app/admin/_components/trip-form.tsx`**

Client component form to create a new trip. Select service from dropdown, pick date, set departure/return time. Use shadcn Select, Input, Button, Label.

The form should:
- Fetch services list (passed as prop from server component)
- Have date input, departure time input (default "09:00"), return time input (default "17:00")
- Optional notes textarea
- Submit via server action createTrip
- Show success toast (sonner)

```typescript
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTrip } from "../_actions/trip-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Service {
  id: string;
  name: string;
  type: string;
}

export function TripForm({ services }: { services: Service[] }) {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    try {
      await createTrip(formData);
      toast.success("Uscita creata con successo");
      router.push("/admin/trips");
    } catch {
      toast.error("Errore nella creazione dell'uscita");
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Nuova Uscita</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serviceId">Servizio</Label>
            <Select name="serviceId" required>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona servizio" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input type="date" name="date" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departureTime">Partenza</Label>
              <Input type="time" name="departureTime" defaultValue="09:00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnTime">Ritorno</Label>
              <Input type="time" name="returnTime" defaultValue="17:00" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Note (opzionale)</Label>
            <Input name="notes" placeholder="Note aggiuntive..." />
          </div>
          <Button type="submit" className="w-full">Crea Uscita</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Crea `src/app/admin/(dashboard)/trips/page.tsx`**

Server component that lists all trips with service name, date, status, available spots. Link to create new trip. Status actions (complete, cancel).

```typescript
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { updateTripStatus } from "../../_actions/trip-actions";

const statusColors: Record<string, string> = {
  SCHEDULED: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export default async function TripsPage() {
  const trips = await db.trip.findMany({
    orderBy: { date: "desc" },
    include: {
      service: { select: { name: true, capacityMax: true } },
      _count: { select: { bookings: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Uscite</h1>
        <Button asChild>
          <Link href="/admin/trips/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuova Uscita
          </Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Servizio</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Orario</TableHead>
            <TableHead>Posti</TableHead>
            <TableHead>Prenotazioni</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trips.map((trip) => (
            <TableRow key={trip.id}>
              <TableCell>{trip.service.name}</TableCell>
              <TableCell>{new Date(trip.date).toLocaleDateString("it-IT")}</TableCell>
              <TableCell>{trip.departureTime} - {trip.returnTime}</TableCell>
              <TableCell>{trip.availableSpots}/{trip.service.capacityMax}</TableCell>
              <TableCell>{trip._count.bookings}</TableCell>
              <TableCell>
                <Badge variant={statusColors[trip.status] as any}>
                  {trip.status}
                </Badge>
              </TableCell>
              <TableCell className="space-x-1">
                {trip.status === "SCHEDULED" && (
                  <>
                    <form action={async () => { "use server"; await updateTripStatus(trip.id, "COMPLETED"); }} className="inline">
                      <Button variant="outline" size="sm" type="submit">Completa</Button>
                    </form>
                    <form action={async () => { "use server"; await updateTripStatus(trip.id, "CANCELLED"); }} className="inline">
                      <Button variant="destructive" size="sm" type="submit">Annulla</Button>
                    </form>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 4: Crea `src/app/admin/(dashboard)/trips/new/page.tsx`**

```typescript
import { db } from "@/lib/db";
import { TripForm } from "../../../_components/trip-form";

export default async function NewTripPage() {
  const services = await db.service.findMany({
    where: { active: true },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Nuova Uscita</h1>
      <TripForm services={services} />
    </div>
  );
}
```

- [ ] **Step 5: Verifica trips CRUD**

Create a trip, verify it appears in the list, change status to completed.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/
git commit -m "feat(admin): add trips management with create and status actions"
```

---

### Task 4: Gestione Prenotazioni (Bookings)

**Files:**
- Create: `src/app/admin/(dashboard)/bookings/page.tsx`, `src/app/admin/(dashboard)/bookings/[id]/page.tsx`, `src/app/admin/_actions/booking-actions.ts`, `src/app/admin/_components/booking-form.tsx`

- [ ] **Step 1: Crea `src/app/admin/_actions/booking-actions.ts`**

Server actions: createManualBooking, updateBookingStatus, deleteBooking.

```typescript
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createManualBooking(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const customerName = formData.get("customerName") as string;
  const customerEmail = formData.get("customerEmail") as string;
  const customerPhone = formData.get("customerPhone") as string | null;
  const numPeople = parseInt(formData.get("numPeople") as string);
  const totalPrice = parseFloat(formData.get("totalPrice") as string);
  const channel = formData.get("channel") as string || "MANUAL";
  const notes = formData.get("notes") as string | null;

  // Upsert customer
  const customer = await db.customer.upsert({
    where: { email: customerEmail },
    update: { name: customerName, phone: customerPhone || undefined },
    create: { name: customerName, email: customerEmail, phone: customerPhone || null },
  });

  // Create booking
  await db.booking.create({
    data: {
      tripId,
      customerId: customer.id,
      numPeople,
      totalPrice,
      status: "CONFIRMED",
      channel: channel as any,
      notes: notes || null,
    },
  });

  // Update available spots
  await db.trip.update({
    where: { id: tripId },
    data: { availableSpots: { decrement: numPeople } },
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/trips");
  revalidatePath("/admin");
}

export async function updateBookingStatus(
  bookingId: string,
  status: "CONFIRMED" | "PENDING" | "CANCELLED" | "REFUNDED"
) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("Prenotazione non trovata");

  await db.booking.update({
    where: { id: bookingId },
    data: { status },
  });

  // If cancelling, restore available spots
  if ((status === "CANCELLED" || status === "REFUNDED") && booking.status === "CONFIRMED") {
    await db.trip.update({
      where: { id: booking.tripId },
      data: { availableSpots: { increment: booking.numPeople } },
    });
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/trips");
  revalidatePath("/admin");
}
```

- [ ] **Step 2: Crea `src/app/admin/_components/booking-form.tsx`**

Client component for manual booking. Needs trip selection (passed as prop), customer name/email/phone, number of people, total price, channel selector, notes.

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { createManualBooking } from "../_actions/booking-actions";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useState } from "react";

interface Trip {
  id: string;
  date: Date;
  availableSpots: number;
  service: { name: string };
}

const channels = [
  { value: "MANUAL", label: "Manuale" },
  { value: "WEBSITE", label: "Sito Web" },
  { value: "GET_YOUR_GUIDE", label: "GetYourGuide" },
  { value: "AIRBNB", label: "Airbnb" },
  { value: "CLICK_AND_BOAT", label: "Click&Boat" },
  { value: "VIATOR", label: "Viator" },
  { value: "MUSEMENT", label: "Musement" },
  { value: "SAMBOAT", label: "SamBoat" },
];

export function BookingFormDialog({ trips }: { trips: Trip[] }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    try {
      await createManualBooking(formData);
      toast.success("Prenotazione creata");
      setOpen(false);
    } catch {
      toast.error("Errore nella creazione");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuova Prenotazione
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova Prenotazione Manuale</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Uscita</Label>
            <Select name="tripId" required>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona uscita" />
              </SelectTrigger>
              <SelectContent>
                {trips.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.service.name} — {new Date(t.date).toLocaleDateString("it-IT")} ({t.availableSpots} posti)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nome Cliente</Label>
            <Input name="customerName" required />
          </div>
          <div className="space-y-2">
            <Label>Email Cliente</Label>
            <Input name="customerEmail" type="email" required />
          </div>
          <div className="space-y-2">
            <Label>Telefono (opzionale)</Label>
            <Input name="customerPhone" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>N. Persone</Label>
              <Input name="numPeople" type="number" min="1" required />
            </div>
            <div className="space-y-2">
              <Label>Totale (€)</Label>
              <Input name="totalPrice" type="number" step="0.01" min="0" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Canale</Label>
            <Select name="channel" defaultValue="MANUAL">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {channels.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Note (opzionale)</Label>
            <Input name="notes" />
          </div>
          <Button type="submit" className="w-full">Crea Prenotazione</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Crea `src/app/admin/(dashboard)/bookings/page.tsx`**

List all bookings with filters (status, channel). Table with customer, service, date, people, total, status, channel. Manual booking dialog button.

```typescript
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { BookingFormDialog } from "../../_components/booking-form";

const statusColors: Record<string, string> = {
  CONFIRMED: "default",
  PENDING: "secondary",
  CANCELLED: "destructive",
  REFUNDED: "outline",
};

export default async function BookingsPage() {
  const bookings = await db.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true, email: true } },
      trip: {
        select: {
          date: true,
          service: { select: { name: true } },
        },
      },
    },
  });

  const availableTrips = await db.trip.findMany({
    where: { status: "SCHEDULED", availableSpots: { gt: 0 } },
    orderBy: { date: "asc" },
    include: { service: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Prenotazioni</h1>
        <BookingFormDialog trips={availableTrips} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Servizio</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Persone</TableHead>
            <TableHead>Totale</TableHead>
            <TableHead>Canale</TableHead>
            <TableHead>Stato</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nessuna prenotazione
              </TableCell>
            </TableRow>
          ) : (
            bookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <Link href={`/admin/bookings/${b.id}`} className="underline">
                    {b.customer.name}
                  </Link>
                </TableCell>
                <TableCell>{b.trip.service.name}</TableCell>
                <TableCell>{new Date(b.trip.date).toLocaleDateString("it-IT")}</TableCell>
                <TableCell>{b.numPeople}</TableCell>
                <TableCell>€{b.totalPrice.toNumber().toLocaleString("it-IT")}</TableCell>
                <TableCell>
                  <Badge variant="outline">{b.channel}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[b.status] as any}>{b.status}</Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 4: Crea `src/app/admin/(dashboard)/bookings/[id]/page.tsx`**

Booking detail page: customer info, trip info, payment info, status change actions.

```typescript
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { updateBookingStatus } from "../../../_actions/booking-actions";
import Link from "next/link";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      trip: { include: { service: true, crew: { include: { crewMember: true } } } },
    },
  });

  if (!booking) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Prenotazione</h1>
        <Badge variant="outline" className="text-lg">{booking.status}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Nome:</strong> {booking.customer.name}</p>
          <p><strong>Email:</strong> {booking.customer.email}</p>
          {booking.customer.phone && <p><strong>Telefono:</strong> {booking.customer.phone}</p>}
          {booking.customer.nationality && <p><strong>Nazionalità:</strong> {booking.customer.nationality}</p>}
          <Link href={`/admin/customers/${booking.customer.id}`} className="text-sm underline">
            Vedi profilo cliente
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dettagli</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Servizio:</strong> {booking.trip.service.name}</p>
          <p><strong>Data:</strong> {new Date(booking.trip.date).toLocaleDateString("it-IT")}</p>
          <p><strong>Orario:</strong> {booking.trip.departureTime} - {booking.trip.returnTime}</p>
          <p><strong>Persone:</strong> {booking.numPeople}</p>
          <p><strong>Totale:</strong> €{booking.totalPrice.toNumber().toLocaleString("it-IT")}</p>
          <p><strong>Canale:</strong> {booking.channel}</p>
          {booking.cabinNumber && <p><strong>Cabina:</strong> {booking.cabinNumber}</p>}
          {booking.notes && <p><strong>Note:</strong> {booking.notes}</p>}
          {booking.stripePaymentId && <p><strong>Stripe ID:</strong> {booking.stripePaymentId}</p>}
        </CardContent>
      </Card>

      {booking.status !== "CANCELLED" && booking.status !== "REFUNDED" && (
        <Card>
          <CardHeader><CardTitle>Azioni</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            {booking.status === "PENDING" && (
              <form action={async () => { "use server"; await updateBookingStatus(booking.id, "CONFIRMED"); }}>
                <Button type="submit">Conferma</Button>
              </form>
            )}
            <form action={async () => { "use server"; await updateBookingStatus(booking.id, "CANCELLED"); }}>
              <Button type="submit" variant="destructive">Annulla</Button>
            </form>
            <form action={async () => { "use server"; await updateBookingStatus(booking.id, "REFUNDED"); }}>
              <Button type="submit" variant="outline">Rimborsa</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verifica bookings**

Create a trip first, then create a manual booking from the bookings page dialog. Verify the booking appears in the list and the detail page works.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/
git commit -m "feat(admin): add bookings management with manual booking and detail view"
```

---

### Task 5: Gestione Prezzi Dinamica

**Files:**
- Create: `src/app/admin/(dashboard)/pricing/page.tsx`, `src/app/admin/_actions/pricing-actions.ts`, `src/app/admin/_components/pricing-form.tsx`, `src/app/admin/_components/pricing-table.tsx`

- [ ] **Step 1: Crea `src/app/admin/_actions/pricing-actions.ts`**

```typescript
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createPricingPeriod(formData: FormData) {
  const serviceId = formData.get("serviceId") as string;
  const label = formData.get("label") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const pricePerPerson = parseFloat(formData.get("pricePerPerson") as string);
  const year = parseInt(formData.get("year") as string);

  await db.pricingPeriod.create({
    data: {
      serviceId,
      label,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      pricePerPerson,
      year,
    },
  });

  revalidatePath("/admin/pricing");
}

export async function updatePricingPeriod(id: string, formData: FormData) {
  const pricePerPerson = parseFloat(formData.get("pricePerPerson") as string);
  const label = formData.get("label") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  await db.pricingPeriod.update({
    where: { id },
    data: {
      pricePerPerson,
      label,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  });

  revalidatePath("/admin/pricing");
}

export async function deletePricingPeriod(id: string) {
  await db.pricingPeriod.delete({ where: { id } });
  revalidatePath("/admin/pricing");
}
```

- [ ] **Step 2: Crea `src/app/admin/_components/pricing-form.tsx`**

Dialog form to create/edit pricing period. Fields: service (select), label (text), start date, end date, price per person, year.

- [ ] **Step 3: Crea `src/app/admin/_components/pricing-table.tsx`**

Client component table grouped by service, showing all pricing periods. Inline edit price (click to edit pattern). Delete button.

- [ ] **Step 4: Crea `src/app/admin/(dashboard)/pricing/page.tsx`**

Server component that fetches all services and pricing periods, renders PricingTable and PricingForm dialog.

```typescript
import { db } from "@/lib/db";
import { PricingTable } from "../../_components/pricing-table";
// Import PricingFormDialog

export default async function PricingPage() {
  const services = await db.service.findMany({
    where: { active: true },
    include: {
      pricingPeriods: { orderBy: { startDate: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestione Prezzi</h1>
        {/* PricingFormDialog button here */}
      </div>
      <PricingTable services={services} />
    </div>
  );
}
```

- [ ] **Step 5: Verifica pricing**

View pricing periods (should show seed data). Edit a price. Create a new period. Delete a period.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/
git commit -m "feat(admin): add dynamic pricing management with inline editing"
```

---

### Task 6: Gestione Crew

**Files:**
- Create: `src/app/admin/(dashboard)/crew/page.tsx`, `src/app/admin/_actions/crew-actions.ts`, `src/app/admin/_components/crew-table.tsx`, `src/app/admin/_components/crew-form.tsx`

- [ ] **Step 1: Crea `src/app/admin/_actions/crew-actions.ts`**

```typescript
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createCrewMember(formData: FormData) {
  const name = formData.get("name") as string;
  const role = formData.get("role") as "SKIPPER" | "CHEF" | "HOSTESS";
  const phone = formData.get("phone") as string | null;
  const email = formData.get("email") as string | null;

  await db.crewMember.create({
    data: { name, role, phone: phone || null, email: email || null },
  });

  revalidatePath("/admin/crew");
}

export async function updateCrewMember(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const role = formData.get("role") as "SKIPPER" | "CHEF" | "HOSTESS";
  const phone = formData.get("phone") as string | null;
  const email = formData.get("email") as string | null;
  const active = formData.get("active") === "true";

  await db.crewMember.update({
    where: { id },
    data: { name, role, phone: phone || null, email: email || null, active },
  });

  revalidatePath("/admin/crew");
}

export async function assignCrewToTrip(tripId: string, crewMemberId: string) {
  await db.tripCrew.create({
    data: { tripId, crewMemberId },
  });

  revalidatePath("/admin/trips");
  revalidatePath("/admin/crew");
  revalidatePath("/admin/calendar");
}

export async function removeCrewFromTrip(tripId: string, crewMemberId: string) {
  await db.tripCrew.deleteMany({
    where: { tripId, crewMemberId },
  });

  revalidatePath("/admin/trips");
  revalidatePath("/admin/crew");
  revalidatePath("/admin/calendar");
}
```

- [ ] **Step 2: Crea crew-form.tsx e crew-table.tsx**

crew-form.tsx: Dialog form with name, role (Select: SKIPPER/CHEF/HOSTESS), phone, email.
crew-table.tsx: Table showing all crew members with role badge, contact info, active status, edit button.

- [ ] **Step 3: Crea `src/app/admin/(dashboard)/crew/page.tsx`**

Server component listing crew members with create dialog.

- [ ] **Step 4: Verifica crew management**

View seed crew (Skipper, Chef, Hostess). Create new member. Edit existing.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/
git commit -m "feat(admin): add crew management with CRUD and trip assignment"
```

---

### Task 7: CRM Clienti

**Files:**
- Create: `src/app/admin/(dashboard)/customers/page.tsx`, `src/app/admin/(dashboard)/customers/[id]/page.tsx`, `src/app/admin/_actions/customer-actions.ts`, `src/app/admin/_components/customer-table.tsx`

- [ ] **Step 1: Crea `src/app/admin/_actions/customer-actions.ts`**

```typescript
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateCustomer(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string | null;
  const nationality = formData.get("nationality") as string | null;
  const language = formData.get("language") as string | null;
  const notes = formData.get("notes") as string | null;

  await db.customer.update({
    where: { id },
    data: {
      name, email,
      phone: phone || null,
      nationality: nationality || null,
      language: language || null,
      notes: notes || null,
    },
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
}

export async function exportCustomersCSV() {
  const customers = await db.customer.findMany({
    include: {
      bookings: {
        include: { trip: { select: { service: { select: { name: true } } } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = "Nome,Email,Telefono,Nazionalità,Lingua,N.Prenotazioni,Spesa Totale\n";
  const rows = customers.map((c) => {
    const totalSpent = c.bookings
      .filter((b) => b.status === "CONFIRMED")
      .reduce((sum, b) => sum + b.totalPrice.toNumber(), 0);
    return `"${c.name}","${c.email}","${c.phone || ""}","${c.nationality || ""}","${c.language || ""}",${c.bookings.length},${totalSpent}`;
  });

  return header + rows.join("\n");
}
```

- [ ] **Step 2: Crea customer-table.tsx**

Table with name, email, phone, nationality, num bookings, total spent. Link to detail page. Search/filter by name or email.

- [ ] **Step 3: Crea `src/app/admin/(dashboard)/customers/page.tsx`**

Server component listing all customers with search, export CSV button.

- [ ] **Step 4: Crea `src/app/admin/(dashboard)/customers/[id]/page.tsx`**

Customer detail: editable info card + booking history table.

- [ ] **Step 5: Verifica customers**

View customers page (empty initially, will populate from bookings). Check detail page.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/
git commit -m "feat(admin): add CRM customer management with detail view and CSV export"
```

---

### Task 8: Dashboard Finanziaria

**Files:**
- Create: `src/app/admin/(dashboard)/finance/page.tsx`, `src/app/admin/_components/finance-charts.tsx`, `src/app/admin/_components/finance-filters.tsx`

- [ ] **Step 1: Crea `src/app/admin/_components/finance-charts.tsx`**

Client component using shadcn/ui chart (recharts). Two charts:
1. Bar chart: guadagno per servizio (breakdown)
2. Line chart: guadagno nel tempo (daily/weekly/monthly)

Uses the recharts BarChart and LineChart with shadcn chart wrapper.

- [ ] **Step 2: Crea `src/app/admin/_components/finance-filters.tsx`**

Client component with period selector (date range), service filter, channel filter. Emits filter changes to parent via URL search params.

- [ ] **Step 3: Crea `src/app/admin/(dashboard)/finance/page.tsx`**

Server component that:
- Reads search params for date range, service, channel filters
- Aggregates booking data from database
- Shows summary cards: guadagno totale, commissioni stimate, prenotazioni totali, prezzo medio
- Breakdown per servizio (table)
- Breakdown per canale (table with estimated commissions)
- Charts

```typescript
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FinanceCharts } from "../../_components/finance-charts";
import { FinanceFilters } from "../../_components/finance-filters";

// Commission rates per channel (estimates)
const channelCommissions: Record<string, number> = {
  WEBSITE: 0, // direct booking, only Stripe fee
  MANUAL: 0,
  GET_YOUR_GUIDE: 0.25,
  AIRBNB: 0.20,
  CLICK_AND_BOAT: 0.18,
  VIATOR: 0.25,
  MUSEMENT: 0.20,
  SAMBOAT: 0.15,
};

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; service?: string; channel?: string }>;
}) {
  const params = await searchParams;
  const from = params.from ? new Date(params.from) : new Date(new Date().getFullYear(), 0, 1);
  const to = params.to ? new Date(params.to) : new Date();

  const where: any = {
    status: "CONFIRMED",
    createdAt: { gte: from, lte: to },
  };

  const bookings = await db.booking.findMany({
    where,
    include: {
      trip: { select: { date: true, service: { select: { name: true, type: true } } } },
    },
  });

  // Aggregate by service
  const byService: Record<string, { count: number; revenue: number }> = {};
  const byChannel: Record<string, { count: number; revenue: number; commission: number }> = {};
  let totalRevenue = 0;

  for (const b of bookings) {
    const price = b.totalPrice.toNumber();
    totalRevenue += price;

    const serviceName = b.trip.service.name;
    if (!byService[serviceName]) byService[serviceName] = { count: 0, revenue: 0 };
    byService[serviceName].count++;
    byService[serviceName].revenue += price;

    const channel = b.channel;
    if (!byChannel[channel]) byChannel[channel] = { count: 0, revenue: 0, commission: 0 };
    byChannel[channel].count++;
    byChannel[channel].revenue += price;
    byChannel[channel].commission += price * (channelCommissions[channel] ?? 0);
  }

  const totalCommissions = Object.values(byChannel).reduce((s, c) => s + c.commission, 0);

  // Prepare chart data (daily revenue)
  const dailyRevenue: Record<string, number> = {};
  for (const b of bookings) {
    const day = new Date(b.createdAt).toISOString().split("T")[0];
    dailyRevenue[day] = (dailyRevenue[day] || 0) + b.totalPrice.toNumber();
  }
  const chartData = Object.entries(dailyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  const serviceChartData = Object.entries(byService).map(([name, data]) => ({
    name,
    revenue: data.revenue,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Finanziaria</h1>

      <FinanceFilters />

      <div className="grid gap-4 md:grid-cols-4">
        {/* Stats cards: totalRevenue, totalCommissions, bookings.length, avg price */}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FinanceCharts dailyData={chartData} serviceData={serviceChartData} />
      </div>

      {/* Service breakdown table */}
      {/* Channel breakdown table with commissions */}
    </div>
  );
}
```

Implement the full page with all the tables and cards filled in.

- [ ] **Step 4: Verifica finance dashboard**

View finance page. With no bookings it should show zeros. Create some test bookings and verify numbers update.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/
git commit -m "feat(admin): add financial dashboard with charts and channel breakdown"
```

---

### Task 9: Vista Calendario

**Files:**
- Create: `src/app/admin/(dashboard)/calendar/page.tsx`, `src/app/admin/_components/trip-calendar.tsx`

- [ ] **Step 1: Crea `src/app/admin/_components/trip-calendar.tsx`**

Client component showing a monthly calendar view. Each day cell shows scheduled trips with service name, booked/total spots, and crew assigned. Uses a custom calendar grid (not shadcn Calendar which is a date picker). Color-coded by service type.

- [ ] **Step 2: Crea `src/app/admin/(dashboard)/calendar/page.tsx`**

Server component that fetches trips for the current month (with navigation to prev/next month via search params), passes to TripCalendar component.

```typescript
import { db } from "@/lib/db";
import { TripCalendar } from "../../_components/trip-calendar";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = params.month ? parseInt(params.month) - 1 : now.getMonth();
  const year = params.year ? parseInt(params.year) : now.getFullYear();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const trips = await db.trip.findMany({
    where: {
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    include: {
      service: { select: { name: true, type: true, capacityMax: true } },
      _count: { select: { bookings: true } },
      crew: { include: { crewMember: { select: { name: true, role: true } } } },
    },
    orderBy: { date: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Calendario</h1>
      <TripCalendar trips={trips} month={month} year={year} />
    </div>
  );
}
```

- [ ] **Step 3: Verifica calendario**

View calendar page. Navigate months. Create trips and verify they appear on correct dates.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/
git commit -m "feat(admin): add calendar view for trip scheduling"
```

---

### Task 10: Settings e Sonner Provider

**Files:**
- Create: `src/app/admin/(dashboard)/settings/page.tsx`
- Modify: `src/app/admin/(dashboard)/layout.tsx` (add Toaster from sonner)

- [ ] **Step 1: Aggiungi Toaster al layout admin**

Add `<Toaster />` from sonner to the dashboard layout so toast notifications work across all admin pages.

```typescript
import { Toaster } from "sonner";
// In the layout JSX, add <Toaster /> right after the closing main tag
```

- [ ] **Step 2: Crea `src/app/admin/(dashboard)/settings/page.tsx`**

Basic settings page: change password form, account info display.

```typescript
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">Impostazioni</h1>
      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Nome:</strong> {session?.user?.name}</p>
          <p><strong>Email:</strong> {session?.user?.email}</p>
          <p><strong>Ruolo:</strong> {(session?.user as any)?.role}</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verifica settings e toast**

Go to /admin/settings. Create a booking from bookings page and verify toast appears.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/
git commit -m "feat(admin): add settings page and sonner toast provider"
```

---

## Summary

Al completamento di questo piano, la dashboard admin avrà:

- Layout con sidebar navigazione e topbar con user menu
- Dashboard overview con statistiche real-time e ultime prenotazioni
- Gestione uscite (CRUD trips con status management)
- Gestione prenotazioni (lista, dettaglio, prenotazione manuale con selezione canale)
- Gestione prezzi dinamica (CRUD periodi, modifica prezzi dal pannello)
- Gestione crew (CRUD membri, assegnazione a uscite)
- CRM clienti (lista con ricerca, dettaglio con storico, export CSV)
- Dashboard finanziaria (grafici, breakdown per servizio e canale, commissioni)
- Vista calendario mensile con uscite programmate
- Impostazioni account
- Toast notifications su tutte le azioni
