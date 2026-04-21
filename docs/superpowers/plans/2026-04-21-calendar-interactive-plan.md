# Calendario admin interattivo — Implementation Plan

> **For Claude:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Click su una cella del calendario admin apre un modal overlay con info contestuali del giorno + form blocca/rilascia pre-popolato alla data cliccata. Rimuove la friction del workflow attuale (scroll a form `<details>` + inserimento manuale data).

**Architecture:** 1 server component aggrega dati (`DayCellEnriched[]`) → passa a 1 nuovo client wrapper (`calendar-client.tsx`) → che rende `CalendarGrid` esistente + nuovo modal `DayActionsModal` condizionale. Server actions invariate.

**Tech Stack:** Next.js 16 App Router, React 19 (client components), TypeScript strict, Tailwind CSS. `useFormStatus` + `useActionState` per form state. No new dependencies.

---

## File Structure

### Create

- `src/components/admin/day-actions-modal.tsx` — Modal overlay con info booking + form blocca/rilascia. Client component. Accetta `DayCellEnriched` + `boatId/boatName` + `onClose` callback.
- `src/app/admin/(dashboard)/calendario/calendar-client.tsx` — Wrapper client component che mantiene stato `selectedDay` e rende `CalendarGrid` + `DayActionsModal` condizionale per ciascuna barca.
- `src/app/admin/(dashboard)/calendario/enrich.ts` — Pure helper `enrichDayCells()` testabile: prende raw `{bookings, availability, auditLogs, boats, monthStart/End}` → ritorna `Map<boatId, DayCellEnriched[]>`.
- `src/components/admin/__tests__/calendar-enrich.test.ts` — Unit test pure del helper.

### Modify

- `src/app/admin/(dashboard)/calendario/page.tsx` — Estendere server query booking + aggiungere AuditLog batch query + chiamare `enrichDayCells` + rendere `<CalendarClient>` per ciascuna barca. Rimuovere funzione `ManualAvailabilityActions` (~110 LOC) e i suoi import.
- `src/components/admin/calendar-grid.tsx` — Aggiungere prop `boatId` + prop opzionale `onDayClick(day)` + cell `id` stabile + `role="button"` + keyboard handlers (Enter/Space).

### Unchanged

- `src/app/admin/(dashboard)/calendario/actions.ts` — server actions già pronte, invariate
- Schema DB, altri admin pages, server-side business logic

---

## Chunk 1: Data enrichment server-side (pure, unit-testable)

### Task 1.1: DayCellEnriched type + placeholder enrichDayCells

**Files:**
- Create: `src/app/admin/(dashboard)/calendario/enrich.ts`
- Test: `src/components/admin/__tests__/calendar-enrich.test.ts`

- [ ] **Step 1: Scrivi test fallito su shape vuoto**

```ts
// src/components/admin/__tests__/calendar-enrich.test.ts
import { describe, it, expect } from "vitest";
import { enrichDayCells, type DayCellEnriched } from "@/app/admin/(dashboard)/calendario/enrich";

describe("enrichDayCells", () => {
  it("ritorna Map vuoto se zero boats", () => {
    const result = enrichDayCells({
      boats: [],
      bookings: [],
      availability: [],
      auditLogs: [],
      monthStart: new Date("2026-07-01"),
      monthEnd: new Date("2026-07-31"),
    });
    expect(result.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test per verificare fallimento**

Run: `npm run test:unit -- calendar-enrich 2>&1 | tail -5`
Expected: FAIL con "Cannot find module ..../enrich"

- [ ] **Step 3: Stub minimo che fa passare il test**

```ts
// src/app/admin/(dashboard)/calendario/enrich.ts
import type { BookingSource, BookingStatus } from "@/generated/prisma/enums";

export interface DayCellEnriched {
  date: Date;
  dateIso: string;
  status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
  bookings: Array<{
    id: string;
    confirmationCode: string;
    source: BookingSource;
    status: BookingStatus;
    serviceName: string;
    customerName: string;
  }>;
  isAdminBlock: boolean;
  adminBlockInfo?: {
    reason?: string;
    blockedAt: string;
  };
}

export interface EnrichInput {
  boats: Array<{ id: string; name: string }>;
  bookings: Array<{
    id: string;
    confirmationCode: string;
    source: BookingSource;
    status: BookingStatus;
    boatId: string;
    startDate: Date;
    endDate: Date;
    service: { name: string };
    customer: { firstName: string; lastName: string };
  }>;
  availability: Array<{
    boatId: string;
    date: Date;
    status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
    lockedByBookingId: string | null;
  }>;
  auditLogs: Array<{
    entityId: string;
    after: unknown;
    timestamp: Date;
  }>;
  monthStart: Date;
  monthEnd: Date;
}

export function enrichDayCells(input: EnrichInput): Map<string, DayCellEnriched[]> {
  return new Map();
}
```

- [ ] **Step 4: Run test — passa**

Run: `npm run test:unit -- calendar-enrich 2>&1 | tail -5`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/\(dashboard\)/calendario/enrich.ts src/components/admin/__tests__/calendar-enrich.test.ts
git commit -m "test(calendario): scaffold enrichDayCells pure helper"
```

---

### Task 1.2: enrichDayCells popola giorni del mese per ciascuna barca

**Files:**
- Modify: `src/app/admin/(dashboard)/calendario/enrich.ts`
- Test: `src/components/admin/__tests__/calendar-enrich.test.ts`

- [ ] **Step 1: Scrivi test per "giorni del mese generati"**

```ts
it("genera N giorni per ciascuna barca nel mese", () => {
  const result = enrichDayCells({
    boats: [{ id: "boat-1", name: "Trimarano" }],
    bookings: [],
    availability: [],
    auditLogs: [],
    monthStart: new Date(Date.UTC(2026, 6, 1)), // Luglio
    monthEnd: new Date(Date.UTC(2026, 6, 31)),
  });
  expect(result.size).toBe(1);
  const days = result.get("boat-1")!;
  expect(days).toHaveLength(31);
  expect(days[0].dateIso).toBe("2026-07-01");
  expect(days[30].dateIso).toBe("2026-07-31");
  expect(days[0].status).toBe("AVAILABLE"); // default
  expect(days[0].bookings).toEqual([]);
  expect(days[0].isAdminBlock).toBe(false);
});
```

- [ ] **Step 2: Run test — FAIL**

Run: `npm run test:unit -- calendar-enrich`
Expected: FAIL (expected 1, received 0)

- [ ] **Step 3: Implementa loop giorni**

```ts
export function enrichDayCells(input: EnrichInput): Map<string, DayCellEnriched[]> {
  const { boats, monthStart, monthEnd } = input;
  const result = new Map<string, DayCellEnriched[]>();
  for (const boat of boats) {
    const days: DayCellEnriched[] = [];
    const cursor = new Date(monthStart);
    while (cursor.getTime() <= monthEnd.getTime()) {
      const dateIso = cursor.toISOString().slice(0, 10);
      days.push({
        date: new Date(cursor),
        dateIso,
        status: "AVAILABLE",
        bookings: [],
        isAdminBlock: false,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    result.set(boat.id, days);
  }
  return result;
}
```

- [ ] **Step 4: Run test — PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(calendario): enrich genera giorni mese per boat"
```

---

### Task 1.3: enrich merge availability status

- [ ] **Step 1: Test "status BLOCKED letto da availability"**

```ts
it("merge availability status su cella giusta", () => {
  const result = enrichDayCells({
    boats: [{ id: "boat-1", name: "T" }],
    bookings: [],
    availability: [
      {
        boatId: "boat-1",
        date: new Date(Date.UTC(2026, 6, 15)),
        status: "BLOCKED",
        lockedByBookingId: null, // admin-block
      },
    ],
    auditLogs: [],
    monthStart: new Date(Date.UTC(2026, 6, 1)),
    monthEnd: new Date(Date.UTC(2026, 6, 31)),
  });
  const days = result.get("boat-1")!;
  const day15 = days.find((d) => d.dateIso === "2026-07-15")!;
  expect(day15.status).toBe("BLOCKED");
  expect(day15.isAdminBlock).toBe(true);
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implementa availability map lookup**

```ts
// Dentro enrichDayCells, dopo boats loop:
const availMap = new Map<string, (typeof input.availability)[number]>();
for (const a of input.availability) {
  const key = `${a.boatId}|${a.date.toISOString().slice(0, 10)}`;
  availMap.set(key, a);
}

// Nel loop giorni, sostituisci il push con:
const avail = availMap.get(`${boat.id}|${dateIso}`);
days.push({
  date: new Date(cursor),
  dateIso,
  status: avail?.status ?? "AVAILABLE",
  bookings: [],
  isAdminBlock: !!avail && avail.status === "BLOCKED" && avail.lockedByBookingId === null,
});
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(calendario): enrich merge availability + isAdminBlock flag"
```

---

### Task 1.4: enrich merge bookings attivi per giorno

- [ ] **Step 1: Test "bookings del range appaiono su giorni coperti"**

```ts
it("booking multi-day appare su tutti i giorni del range", () => {
  const result = enrichDayCells({
    boats: [{ id: "boat-1", name: "T" }],
    bookings: [
      {
        id: "bk-1",
        confirmationCode: "ABC123",
        source: "DIRECT",
        status: "CONFIRMED",
        boatId: "boat-1",
        startDate: new Date(Date.UTC(2026, 6, 10)),
        endDate: new Date(Date.UTC(2026, 6, 12)),
        service: { name: "Cabin Charter" },
        customer: { firstName: "Mario", lastName: "Rossi" },
      },
    ],
    availability: [],
    auditLogs: [],
    monthStart: new Date(Date.UTC(2026, 6, 1)),
    monthEnd: new Date(Date.UTC(2026, 6, 31)),
  });
  const days = result.get("boat-1")!;
  const day9 = days.find((d) => d.dateIso === "2026-07-09")!;
  const day10 = days.find((d) => d.dateIso === "2026-07-10")!;
  const day11 = days.find((d) => d.dateIso === "2026-07-11")!;
  const day12 = days.find((d) => d.dateIso === "2026-07-12")!;
  const day13 = days.find((d) => d.dateIso === "2026-07-13")!;
  expect(day9.bookings).toHaveLength(0);
  expect(day10.bookings).toHaveLength(1);
  expect(day11.bookings).toHaveLength(1);
  expect(day12.bookings).toHaveLength(1);
  expect(day13.bookings).toHaveLength(0);
  expect(day10.bookings[0].confirmationCode).toBe("ABC123");
  expect(day10.bookings[0].customerName).toBe("Mario Rossi");
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implementa merge bookings**

```ts
// Sopra il loop boat, index bookings per boat:
const bookingsByBoat = new Map<string, typeof input.bookings>();
for (const b of input.bookings) {
  const list = bookingsByBoat.get(b.boatId) ?? [];
  list.push(b);
  bookingsByBoat.set(b.boatId, list);
}

// Nel loop boat, prima di push day cell, calcola bookings attive:
const boatBookings = bookingsByBoat.get(boat.id) ?? [];

// Nel loop giorno, sostituisci bookings: [] con filter:
const dayMs = cursor.getTime();
const dayBookings = boatBookings
  .filter((b) => b.startDate.getTime() <= dayMs && b.endDate.getTime() >= dayMs)
  .slice(0, 20) // cap R17 perf
  .map((b) => ({
    id: b.id,
    confirmationCode: b.confirmationCode,
    source: b.source,
    status: b.status,
    serviceName: b.service.name,
    customerName: `${b.customer.firstName} ${b.customer.lastName}`.trim(),
  }));

days.push({
  date: new Date(cursor),
  dateIso,
  status: avail?.status ?? "AVAILABLE",
  bookings: dayBookings,
  isAdminBlock: !!avail && avail.status === "BLOCKED" && avail.lockedByBookingId === null,
});
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(calendario): enrich merge bookings attivi per range overlap"
```

---

### Task 1.5: enrich merge AuditLog MANUAL_BLOCK per admin-block reason

- [ ] **Step 1: Test "admin-block con reason da AuditLog"**

```ts
it("admin-block arricchito con reason + blockedAt da AuditLog", () => {
  const blockedAt = new Date("2026-06-28T10:00:00Z");
  const result = enrichDayCells({
    boats: [{ id: "boat-1", name: "T" }],
    bookings: [],
    availability: [
      {
        boatId: "boat-1",
        date: new Date(Date.UTC(2026, 6, 15)),
        status: "BLOCKED",
        lockedByBookingId: null,
      },
    ],
    auditLogs: [
      {
        entityId: "boat-1",
        after: {
          boatName: "T",
          startDate: "2026-07-15",
          endDate: "2026-07-15",
          reason: "manutenzione motore",
        },
        timestamp: blockedAt,
      },
    ],
    monthStart: new Date(Date.UTC(2026, 6, 1)),
    monthEnd: new Date(Date.UTC(2026, 6, 31)),
  });
  const day15 = result.get("boat-1")!.find((d) => d.dateIso === "2026-07-15")!;
  expect(day15.adminBlockInfo?.reason).toBe("manutenzione motore");
  expect(day15.adminBlockInfo?.blockedAt).toBe(blockedAt.toISOString());
});

it("admin-block con reason redatto mostra solo blockedAt", () => {
  const blockedAt = new Date("2026-06-28T10:00:00Z");
  const result = enrichDayCells({
    boats: [{ id: "boat-1", name: "T" }],
    bookings: [],
    availability: [
      {
        boatId: "boat-1",
        date: new Date(Date.UTC(2026, 6, 15)),
        status: "BLOCKED",
        lockedByBookingId: null,
      },
    ],
    auditLogs: [
      {
        entityId: "boat-1",
        after: { _redacted: true }, // retention cron marker
        timestamp: blockedAt,
      },
    ],
    monthStart: new Date(Date.UTC(2026, 6, 1)),
    monthEnd: new Date(Date.UTC(2026, 6, 31)),
  });
  const day15 = result.get("boat-1")!.find((d) => d.dateIso === "2026-07-15")!;
  expect(day15.adminBlockInfo?.reason).toBeUndefined();
  expect(day15.adminBlockInfo?.blockedAt).toBe(blockedAt.toISOString());
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implementa helper + merge audit**

```ts
// Helper esportato per testing:
function extractAuditBlockInfo(log: EnrichInput["auditLogs"][number]):
  | { reason?: string; blockedAt: string; startDate?: string; endDate?: string }
  | null {
  const after = log.after as Record<string, unknown> | null;
  if (!after || typeof after !== "object") return null;
  const result: { reason?: string; blockedAt: string; startDate?: string; endDate?: string } = {
    blockedAt: log.timestamp.toISOString(),
  };
  if (typeof after.reason === "string" && after.reason.trim()) {
    result.reason = after.reason;
  }
  if (typeof after.startDate === "string") result.startDate = after.startDate;
  if (typeof after.endDate === "string") result.endDate = after.endDate;
  return result;
}

// Costruisci map (boatId, dateIso) → log piu' recente:
const blockInfoByKey = new Map<string, { reason?: string; blockedAt: string }>();
const sortedLogs = [...input.auditLogs].sort(
  (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
);
for (const log of sortedLogs) {
  const info = extractAuditBlockInfo(log);
  if (!info) continue;
  const from = info.startDate ? new Date(info.startDate) : null;
  const to = info.endDate ? new Date(info.endDate) : from;
  if (!from || !to) continue;
  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    const key = `${log.entityId}|${cursor.toISOString().slice(0, 10)}`;
    if (!blockInfoByKey.has(key)) {
      blockInfoByKey.set(key, { reason: info.reason, blockedAt: info.blockedAt });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

// Nel loop push, se isAdminBlock, aggiungi adminBlockInfo:
const isAdminBlock =
  !!avail && avail.status === "BLOCKED" && avail.lockedByBookingId === null;
const blockInfo = isAdminBlock
  ? blockInfoByKey.get(`${boat.id}|${dateIso}`)
  : undefined;

days.push({
  date: new Date(cursor),
  dateIso,
  status: avail?.status ?? "AVAILABLE",
  bookings: dayBookings,
  isAdminBlock,
  adminBlockInfo: blockInfo,
});
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(calendario): enrich merge AuditLog MANUAL_BLOCK con fallback retention"
```

---

### Task 1.6: page.tsx fetch esteso + chiamata enrichDayCells

**Files:**
- Modify: `src/app/admin/(dashboard)/calendario/page.tsx`

- [ ] **Step 1: Leggi file attuale**

Run: `cat src/app/admin/\(dashboard\)/calendario/page.tsx | head -60`
Conferma presenza `db.booking.findMany` + `db.boatAvailability.findMany`.

- [ ] **Step 1.5: Verifica enum AuditAction**

Run: `grep -n "action:" /home/akasama/Scrivania/egadisailing/src/app/admin/\(dashboard\)/calendario/actions.ts | grep -i MANUAL`
Expected: conferma che `manualBlockRange` scrive `action: "MANUAL_BLOCK"`. Se usa un altro valore (es. `BLOCK_RANGE`), aggiorna `Task 1.6 Step 2` di conseguenza.

- [ ] **Step 2: Estendi booking select + aggiungi auditLogs query + chiama enrich**

Modifica il blocco `Promise.all` attuale (righe ~23-45):

```ts
const [boats, bookings, availability, auditLogs] = await Promise.all([
  db.boat.findMany({ orderBy: { name: "asc" } }),
  db.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "PENDING"] },
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    select: {
      id: true,
      confirmationCode: true,
      source: true,
      status: true,
      boatId: true,
      startDate: true,
      endDate: true,
      service: { select: { name: true } },
      customer: { select: { firstName: true, lastName: true } },
    },
  }),
  db.boatAvailability.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
    select: { boatId: true, date: true, status: true, lockedByBookingId: true },
  }),
  db.auditLog.findMany({
    where: {
      action: "MANUAL_BLOCK",
      entity: "Boat",
      timestamp: { gte: new Date(monthStart.getTime() - 90 * 24 * 60 * 60 * 1000) },
    },
    select: { entityId: true, after: true, timestamp: true },
    orderBy: { timestamp: "desc" },
    take: 500,
  }),
]);

const enriched = enrichDayCells({
  boats,
  bookings,
  availability,
  auditLogs,
  monthStart,
  monthEnd,
});
```

Aggiungi import in testa:
```ts
import { enrichDayCells } from "./enrich";
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: clean

- [ ] **Step 4: Run full test suite**

Run: `npm test 2>&1 | tail -5`
Expected: tutti PASS (enrich test + 178 esistenti)

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(calendario): page.tsx chiama enrichDayCells con AuditLog batch query"
```

---

## Chunk 2: Client wrapper + CalendarGrid aggiornato

### Task 2.1: CalendarGrid accetta onDayClick + cell id + a11y

**Files:**
- Modify: `src/components/admin/calendar-grid.tsx`

- [ ] **Step 1: Leggi file attuale**

Run: `cat src/components/admin/calendar-grid.tsx | head -80`
Nota prop `days: DayCell[]`, `boatName: string`.

- [ ] **Step 2: Aggiungi prop + cell interactive**

```tsx
import type { DayCellEnriched } from "@/app/admin/(dashboard)/calendario/enrich";

export interface DayCellBooking {
  id: string;
  source: string;
  serviceName: string;
  confirmationCode: string;
}

export interface DayCell {
  date: Date;
  bookings: DayCellBooking[];
  status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
  isPadding?: boolean;
}

const sourceColors: Record<string, string> = {
  DIRECT: "bg-blue-100 text-blue-800",
  BOKUN: "bg-purple-100 text-purple-800",
  BOATAROUND: "bg-emerald-100 text-emerald-800",
  SAMBOAT: "bg-cyan-100 text-cyan-800",
  CLICKANDBOAT: "bg-amber-100 text-amber-800",
  NAUTAL: "bg-rose-100 text-rose-800",
};

export interface CalendarGridProps {
  days: DayCell[];
  boatName: string;
  boatId?: string;
  onDayClick?: (dateIso: string) => void;
  /** Mapping dateIso → DayCellEnriched per lookup al click. Opzionale per retrocompat. */
  enrichedByDate?: Map<string, DayCellEnriched>;
}

export function CalendarGrid({
  days,
  boatName,
  boatId,
  onDayClick,
}: CalendarGridProps) {
  return (
    <div>
      <h2 className="font-bold text-slate-900 mb-3">{boatName}</h2>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
          <div key={d} className="text-center font-semibold text-slate-500 p-2">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (day.isPadding) {
            return <div key={i} className="aspect-square bg-slate-50/40 rounded" />;
          }
          const dayNum = day.date.getUTCDate();
          const dateIso = day.date.toISOString().slice(0, 10);
          const cellId = boatId ? `cell-${boatId}-${dateIso}` : undefined;
          const bg =
            day.status === "BLOCKED"
              ? "bg-red-50 border-red-200"
              : day.status === "PARTIALLY_BOOKED"
                ? "bg-amber-50 border-amber-200"
                : "bg-white border-slate-200";
          const isInteractive = !!onDayClick;
          const interactiveCls = isInteractive
            ? "cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
            : "";

          const content = (
            <>
              <div className="text-slate-600 text-[11px] font-medium">{dayNum}</div>
              <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-hidden">
                {day.bookings.slice(0, 3).map((b) => (
                  <span
                    key={b.id}
                    className={`px-1 rounded text-[9px] truncate ${
                      sourceColors[b.source] ?? "bg-slate-100 text-slate-700"
                    }`}
                    title={`${b.confirmationCode} · ${b.serviceName}`}
                  >
                    {b.source.slice(0, 3)}
                  </span>
                ))}
                {day.bookings.length > 3 && (
                  <span className="text-[9px] text-slate-500">
                    +{day.bookings.length - 3}
                  </span>
                )}
              </div>
            </>
          );

          if (!isInteractive) {
            return (
              <div
                key={i}
                id={cellId}
                className={`aspect-square border rounded p-1 flex flex-col ${bg}`}
              >
                {content}
              </div>
            );
          }
          return (
            <button
              key={i}
              id={cellId}
              type="button"
              onClick={() => onDayClick?.(dateIso)}
              className={`aspect-square border rounded p-1 flex flex-col text-left ${bg} ${interactiveCls}`}
              aria-label={`${dayNum} — ${day.status}, ${day.bookings.length} prenotazioni`}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(calendar-grid): prop onDayClick + cell id + keyboard a11y"
```

---

### Task 2.2: CalendarClient wrapper con stato selectedDay

**Files:**
- Create: `src/app/admin/(dashboard)/calendario/calendar-client.tsx`

- [ ] **Step 1: Crea file con stub minimale**

```tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { CalendarGrid, type DayCell } from "@/components/admin/calendar-grid";
import type { DayCellEnriched } from "./enrich";

export interface CalendarClientProps {
  boatId: string;
  boatName: string;
  days: DayCell[];
  enriched: DayCellEnriched[];
}

export function CalendarClient({ boatId, boatName, days, enriched }: CalendarClientProps) {
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);

  const enrichedByIso = useMemo(() => {
    const map = new Map<string, DayCellEnriched>();
    for (const e of enriched) map.set(e.dateIso, e);
    return map;
  }, [enriched]);

  const dataVersion = useMemo(
    () => enriched.map((d) => `${d.dateIso}:${d.status}:${d.bookings.length}`).join("|"),
    [enriched],
  );

  // R29-calendar: post-revalidatePath → enriched prop cambia → dataVersion
  // cambia → chiudiamo il modal eventualmente aperto.
  useEffect(() => {
    setSelectedDateIso(null);
  }, [dataVersion]);

  const selectedDay = selectedDateIso ? enrichedByIso.get(selectedDateIso) ?? null : null;

  return (
    <>
      <CalendarGrid
        days={days}
        boatName={boatName}
        boatId={boatId}
        onDayClick={(dateIso) => setSelectedDateIso(dateIso)}
      />
      {selectedDay && (
        <div className="p-4 bg-yellow-50 border rounded mt-3 text-sm">
          Modal placeholder — day: {selectedDay.dateIso}
          <button
            type="button"
            className="ml-2 px-2 py-1 border rounded bg-white text-xs"
            onClick={() => setSelectedDateIso(null)}
          >
            Chiudi
          </button>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(dashboard\)/calendario/calendar-client.tsx
git commit -m "feat(calendario): calendar-client wrapper con stato selectedDay"
```

---

### Task 2.3: page.tsx usa CalendarClient invece di CalendarGrid + rimuove ManualAvailabilityActions

**Files:**
- Modify: `src/app/admin/(dashboard)/calendario/page.tsx`

- [ ] **Step 1: Sostituisci render block**

Trova il blocco `return (...)` che itera boats e rende `<CalendarGrid>` + `<ManualAvailabilityActions>`. Sostituiscilo cosi':

```tsx
import { CalendarClient } from "./calendar-client";
// (rimuovi import SubmitButton + manualBlockRange/manualReleaseRange dall'alto)

// Dentro il map boats:
return (
  <div key={boat.id} className="bg-white rounded-xl border p-5 space-y-4">
    <CalendarClient
      boatId={boat.id}
      boatName={boat.name}
      days={days}
      enriched={enriched.get(boat.id) ?? []}
    />
  </div>
);
```

- [ ] **Step 2: Rimuovi intera funzione `ManualAvailabilityActions`**

Elimina le righe tra `function ManualAvailabilityActions(...)` fino alla sua chiusura `}` finale.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: clean (alcuni unused import potrebbero segnalare — rimuovili)

- [ ] **Step 4: Avvia dev server + verifica manuale**

Run: `npm run dev &` (oppure in un altro terminale)
Apri `http://localhost:3000/admin/calendario`, login admin, click su una cella → verifica placeholder giallo appare + "Chiudi" funziona.

- [ ] **Step 5: Run full test suite**

Run: `npm test 2>&1 | tail -5`
Expected: 178+ PASS

- [ ] **Step 6: Commit**

```bash
git commit -am "refactor(calendario): page.tsx usa CalendarClient; rimuove ManualAvailabilityActions"
```

---

## Chunk 3: DayActionsModal component (presentation + form)

### Task 3.1: DayActionsModal scaffold con markup dialog + close handlers

**Files:**
- Create: `src/components/admin/day-actions-modal.tsx`

- [ ] **Step 1: Crea component con dialog + close on Escape/backdrop**

```tsx
"use client";

import { useEffect, useRef } from "react";
import type { DayCellEnriched } from "@/app/admin/(dashboard)/calendario/enrich";
import { formatItDay } from "@/lib/dates";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_SOURCE_LABEL,
  AVAILABILITY_STATUS_LABEL,
  labelOrRaw,
} from "@/lib/admin/labels";

export interface DayActionsModalProps {
  boatId: string;
  boatName: string;
  day: DayCellEnriched;
  onClose: () => void;
}

export function DayActionsModal({ boatId, boatName, day, onClose }: DayActionsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // R29-calendar: Escape closes (WCAG 2.1.1).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Focus trap minimale: focus primo elemento interattivo on mount, ritorna
  // focus a cell id on unmount.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const firstInput = dialog.querySelector<HTMLElement>(
      "input, button:not([disabled]), a, [tabindex]:not([tabindex='-1'])",
    );
    firstInput?.focus();

    return () => {
      const cell = document.getElementById(`cell-${boatId}-${day.dateIso}`);
      cell?.focus();
    };
  }, [boatId, day.dateIso]);

  const statusLabel = labelOrRaw(AVAILABILITY_STATUS_LABEL, day.status);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-actions-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        // Click on backdrop (non sul dialog interno) → close
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <header className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 id="day-actions-title" className="font-bold text-slate-900">
              {formatItDay(day.date)}
            </h2>
            <p className="text-xs text-slate-500">
              {boatName} · {statusLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-slate-100"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </header>
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-500">Modal in costruzione — task 3.2.</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/day-actions-modal.tsx
git commit -m "feat(day-actions-modal): scaffold dialog + Escape/backdrop close"
```

---

### Task 3.2: DayActionsModal info section (booking list + admin-block info)

**Files:**
- Modify: `src/components/admin/day-actions-modal.tsx`

- [ ] **Step 1: Sostituisci placeholder con info section**

Nel blocco `<div className="p-4 space-y-4">`, sostituisci il `<p>` placeholder con:

```tsx
{day.isAdminBlock && day.adminBlockInfo && (
  <div className="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded text-sm">
    <div className="font-semibold text-indigo-900">Blocco manuale admin</div>
    {day.adminBlockInfo.reason ? (
      <div className="text-slate-700 mt-1">Motivo: {day.adminBlockInfo.reason}</div>
    ) : (
      <div className="text-slate-500 mt-1 italic">
        Motivo non disponibile (rimosso per retention)
      </div>
    )}
    <div className="text-xs text-slate-500 mt-1">
      Bloccato il {formatItDay(new Date(day.adminBlockInfo.blockedAt))}
    </div>
  </div>
)}

{day.bookings.length === 0 && !day.isAdminBlock && (
  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-sm text-emerald-800">
    ✓ Nessuna prenotazione su questa data
  </div>
)}

{day.bookings.length > 0 && (
  <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded text-sm">
    <div className="font-semibold text-amber-900 mb-2">
      {day.bookings.length} {day.bookings.length === 1 ? "prenotazione" : "prenotazioni"} su questa data
    </div>
    <ul className="space-y-1">
      {day.bookings.map((b) => (
        <li key={b.id} className="flex items-center gap-2 flex-wrap text-xs">
          <span className="px-2 py-0.5 rounded bg-white font-mono">
            {labelOrRaw(BOOKING_SOURCE_LABEL, b.source)}
          </span>
          <a
            href={`/admin/prenotazioni/${b.id}`}
            className="font-mono font-semibold text-blue-700 underline hover:no-underline"
          >
            {b.confirmationCode}
          </a>
          <span className="text-slate-600">
            · {b.serviceName} · {b.customerName} · {labelOrRaw(BOOKING_STATUS_LABEL, b.status)}
          </span>
        </li>
      ))}
    </ul>
  </div>
)}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: clean

- [ ] **Step 3: Collega modal a CalendarClient**

Modifica `src/app/admin/(dashboard)/calendario/calendar-client.tsx`, rimpiazza il placeholder giallo con:

```tsx
import { DayActionsModal } from "@/components/admin/day-actions-modal";

// Nel render, sostituisci il placeholder con:
{selectedDay && (
  <DayActionsModal
    boatId={boatId}
    boatName={boatName}
    day={selectedDay}
    onClose={() => setSelectedDateIso(null)}
  />
)}
```

- [ ] **Step 4: Verifica manuale browser**

Run dev server; apri calendario; click cella con booking → verifica lista visibile + link funzionante; click cella admin-block (se presente in dev data) → verifica info indigo; click cella vuota → verifica banner verde.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(day-actions-modal): info section (bookings, admin-block, vuoto)"
```

---

### Task 3.3: DayActionsModal form Blocca con disabled logic

- [ ] **Step 1: Determina stato bottoni (pure helper)**

Aggiungi sopra il component helper:

```tsx
interface ActionState {
  canBlock: boolean;
  canRelease: boolean;
  blockDisabledReason?: string;
  releaseDisabledReason?: string;
  blockWarning?: string; // per partially-booked social
}

function computeActionState(day: DayCellEnriched): ActionState {
  const activeBookings = day.bookings.filter(
    (b) => b.status === "PENDING" || b.status === "CONFIRMED",
  );
  const hasActiveBooking = activeBookings.length > 0;

  // Caso 1: AVAILABLE (o senza adminBlock + nessun active booking)
  if (day.status === "AVAILABLE") {
    return { canBlock: true, canRelease: false, releaseDisabledReason: "Niente da rilasciare" };
  }
  // Caso 2: BLOCKED admin manuale
  if (day.status === "BLOCKED" && day.isAdminBlock) {
    return { canBlock: false, canRelease: true, blockDisabledReason: "Gia' bloccato" };
  }
  // Caso 3: BLOCKED da booking attivo
  if (day.status === "BLOCKED" && hasActiveBooking) {
    return {
      canBlock: false,
      canRelease: false,
      blockDisabledReason: "Cancella prima la prenotazione attiva",
      releaseDisabledReason: "Cancella prima la prenotazione attiva",
    };
  }
  // Caso 4: PARTIALLY_BOOKED (social tour): blocca attivo con warning
  if (day.status === "PARTIALLY_BOOKED") {
    return {
      canBlock: true,
      canRelease: false,
      blockWarning: `Bloccare annulla il tour per ${activeBookings.length} cliente/i pagante/i — dovrai cancellare + rimborsare manualmente.`,
      releaseDisabledReason: "Non applicabile a tour condiviso",
    };
  }
  // Fallback (BLOCKED senza admin + senza booking attivo — edge case drift)
  return { canBlock: false, canRelease: true };
}
```

- [ ] **Step 2: Scrivi test helper (pure)**

```ts
// src/components/admin/__tests__/day-actions-state.test.ts
import { describe, it, expect } from "vitest";
import { computeActionState } from "../day-actions-modal";

const base = {
  date: new Date(),
  dateIso: "2026-07-15",
  status: "AVAILABLE" as const,
  bookings: [],
  isAdminBlock: false,
};

describe("computeActionState", () => {
  it("AVAILABLE → solo blocca", () => {
    expect(computeActionState(base)).toMatchObject({ canBlock: true, canRelease: false });
  });
  it("BLOCKED admin → solo rilascia", () => {
    expect(
      computeActionState({ ...base, status: "BLOCKED", isAdminBlock: true }),
    ).toMatchObject({ canBlock: false, canRelease: true });
  });
  it("BLOCKED con booking attivo → entrambi disabled", () => {
    expect(
      computeActionState({
        ...base,
        status: "BLOCKED",
        isAdminBlock: false,
        bookings: [
          {
            id: "b1",
            confirmationCode: "X",
            source: "DIRECT",
            status: "CONFIRMED",
            serviceName: "",
            customerName: "",
          },
        ],
      }),
    ).toMatchObject({ canBlock: false, canRelease: false });
  });
  it("PARTIALLY_BOOKED → blocca con warning", () => {
    const s = computeActionState({
      ...base,
      status: "PARTIALLY_BOOKED",
      bookings: [
        {
          id: "b1",
          confirmationCode: "X",
          source: "DIRECT",
          status: "CONFIRMED",
          serviceName: "",
          customerName: "",
        },
      ],
    });
    expect(s.canBlock).toBe(true);
    expect(s.canRelease).toBe(false);
    expect(s.blockWarning).toContain("1 cliente");
  });
});
```

Esporta `computeActionState` dal modal file:
```ts
export function computeActionState(day: DayCellEnriched): ActionState { ... }
```

- [ ] **Step 3: Run test**

Run: `npm run test:unit -- day-actions-state 2>&1 | tail -5`
Expected: 4 PASS

- [ ] **Step 4: Renderizza i 2 form condizionali**

Sotto l'info section nel dialog body, aggiungi:

```tsx
<ActionForms boatId={boatId} day={day} />
```

Crea sub-component:

```tsx
function ActionForms({ boatId, day }: { boatId: string; day: DayCellEnriched }) {
  const state = computeActionState(day);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <BlockForm boatId={boatId} day={day} state={state} />
      <ReleaseForm boatId={boatId} day={day} state={state} />
    </div>
  );
}

function BlockForm({
  boatId,
  day,
  state,
}: {
  boatId: string;
  day: DayCellEnriched;
  state: ActionState;
}) {
  return (
    <form
      action={async (fd) => {
        const { manualBlockRange } = await import(
          "@/app/admin/(dashboard)/calendario/actions"
        );
        await manualBlockRange(
          boatId,
          String(fd.get("startDate")),
          String(fd.get("endDate")),
          String(fd.get("reason") ?? ""),
        );
      }}
      className={`space-y-2 p-3 border rounded-lg ${
        state.canBlock
          ? "bg-red-50/40 border-red-200"
          : "bg-slate-50 border-slate-200 opacity-60"
      }`}
    >
      <h3 className="font-semibold text-sm text-red-800">Blocca range</h3>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">
          Da
          <input
            name="startDate"
            type="date"
            defaultValue={day.dateIso}
            className="block w-full border rounded px-2 py-1 text-sm"
            required
            disabled={!state.canBlock}
          />
        </label>
        <label className="text-xs">
          A
          <input
            name="endDate"
            type="date"
            defaultValue={day.dateIso}
            className="block w-full border rounded px-2 py-1 text-sm"
            required
            disabled={!state.canBlock}
          />
        </label>
      </div>
      <input
        name="reason"
        placeholder="Motivo (manutenzione, ferie...)"
        maxLength={500}
        className="w-full border rounded px-2 py-1 text-sm"
        disabled={!state.canBlock}
      />
      {state.blockWarning && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          ⚠ {state.blockWarning}
        </div>
      )}
      {state.blockDisabledReason && (
        <div className="text-xs text-slate-500">{state.blockDisabledReason}</div>
      )}
      <button
        type="submit"
        disabled={!state.canBlock}
        className="w-full bg-red-600 text-white rounded py-1.5 text-sm font-medium hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
      >
        Blocca
      </button>
    </form>
  );
}

function ReleaseForm({
  boatId,
  day,
  state,
}: {
  boatId: string;
  day: DayCellEnriched;
  state: ActionState;
}) {
  return (
    <form
      action={async (fd) => {
        const { manualReleaseRange } = await import(
          "@/app/admin/(dashboard)/calendario/actions"
        );
        await manualReleaseRange(
          boatId,
          String(fd.get("startDate")),
          String(fd.get("endDate")),
        );
      }}
      className={`space-y-2 p-3 border rounded-lg ${
        state.canRelease
          ? "bg-emerald-50/40 border-emerald-200"
          : "bg-slate-50 border-slate-200 opacity-60"
      }`}
    >
      <h3 className="font-semibold text-sm text-emerald-800">Rilascia range</h3>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">
          Da
          <input
            name="startDate"
            type="date"
            defaultValue={day.dateIso}
            className="block w-full border rounded px-2 py-1 text-sm"
            required
            disabled={!state.canRelease}
          />
        </label>
        <label className="text-xs">
          A
          <input
            name="endDate"
            type="date"
            defaultValue={day.dateIso}
            className="block w-full border rounded px-2 py-1 text-sm"
            required
            disabled={!state.canRelease}
          />
        </label>
      </div>
      {state.releaseDisabledReason && (
        <div className="text-xs text-slate-500">{state.releaseDisabledReason}</div>
      )}
      <button
        type="submit"
        disabled={!state.canRelease}
        className="w-full bg-emerald-600 text-white rounded py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
      >
        Rilascia
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Run typecheck + full test**

Run: `npx tsc --noEmit 2>&1 | tail -5` — clean
Run: `npm test 2>&1 | tail -5` — 182 PASS (4 nuovi)

- [ ] **Step 6: Verifica manuale**

Dev server attivo; click:
1. Cella vuota → form Blocca attivo + date pre-popolate, Rilascia disabled
2. Cella con booking attivo → entrambi disabled
3. Cella con admin-block → Rilascia attivo, Blocca disabled

- [ ] **Step 7: Commit**

```bash
git commit -am "feat(day-actions-modal): form Blocca/Rilascia con disabled logic contestuale"
```

---

## Chunk 4: Integration + smoke test + cleanup

### Task 4.1: Verifica integrazione end-to-end

- [ ] **Step 1: Rilancia dev server pulito**

Stop dev server precedente. Run: `npm run dev &`

- [ ] **Step 2: Manual checklist pre-merge (10 punti dallo spec)**

Apri `http://localhost:3000/admin/calendario`, login admin. Verifica:

1. ✓ Click cella vuota → modal appare → form Blocca pre-popolato → submit → modal chiude → cella cambia colore rosso.
2. ✓ Click cella admin-block appena creata → modal mostra reason + blockedAt → Rilascia pre-popolato → submit → cella torna bianca.
3. ✓ Click cella con booking DIRECT (seed) → bottoni disabled, link "prenotazione" naviga a `/admin/prenotazioni/[id]`.
4. ✓ Click cella BOKUN (se seed) → source badge "Bokun" visibile.
5. ✓ Click cella partially-booked → blocca attivo con warning ⚠ N clienti.
6. ✓ Escape chiude modal.
7. ✓ Click backdrop chiude.
8. ✓ Tab/Shift-Tab ciclano dentro il modal.
9. ✓ Mobile viewport (DevTools 375px) → modal scrollable.
10. ✓ Tastiera: Tab fino a una cella calendario, Enter apre modal.

- [ ] **Step 3: Run full test suite finale**

Run: `npm test 2>&1 | tail -5`
Expected: 182 PASS, 0 FAIL

- [ ] **Step 4: Typecheck finale**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: clean

- [ ] **Step 5: Build check**

Run: `npm run build 2>&1 | tail -15`
Expected: build OK, no warning bloccanti

- [ ] **Step 6: Nessun commit se tutto green (passo 4.2 è il finale)**

---

### Task 4.2: Commit finale + push-ready

- [ ] **Step 1: Verifica git status**

Run: `git status`
Expected: "nothing to commit, working tree clean" (tutti i commit precedenti gia' pushati)

- [ ] **Step 2: Se ci sono residui uncommitted, commit finale unificato**

```bash
git add -A
git commit -m "chore(calendario): finalize R30 interactive calendar"
```

- [ ] **Step 3: Log ultimi 10 commit per review**

Run: `git log --format="%h %s" -10`
Expected: serie di commit TDD chunk 1-4.

- [ ] **Step 4: (Opzionale) squash interactive se si vuole storia pulita**

```bash
# Se la storia e' troppo granulare per la PR:
git rebase -i HEAD~15
# squash commit di Chunk 1-4 in un singolo commit feat(admin)
```

NON obbligatorio — storia granulare TDD è preziosa per review.

---

## Chunk 5: Post-implementation review

### Task 5.1: Audit regressione

- [ ] **Step 1: Dispatch agent per verificare che i fix precedenti siano preservati**

Usa il pattern degli audit precedenti (R28/R29): agente che legge i file modificati + verifica:
- R26-P4: EXCLUSION constraint non toccato (schema invariato)
- R28-C1: `isBoatExclusiveServiceType` filter preservato (DIRECT create-direct non toccato)
- R29 lock: `acquireAvailabilityRangeLock` non toccato
- R29 apology email: flow `cancelBooking` non toccato

- [ ] **Step 2: Sanity check navigazione**

Verifica che non abbiamo rotto:
- `/admin/calendario` — principale modificato OK
- `/admin/disponibilita` — redirect ancora 308
- Sidebar 12 voci (era 13 pre-R29 merge)

- [ ] **Step 3: Commit finale se necessario**

```bash
git commit -m "docs: note R30 calendario interattivo nel runbook" # opzionale
```

---

## Test summary atteso post-plan

- **178 test esistenti** → pass (invariati)
- **+4 test unit** `day-actions-state` (computeActionState) → pass
- **+5 test unit** `calendar-enrich` (enrichDayCells) → pass
- **Totale**: 187 PASS, 0 FAIL
- Typecheck clean, build clean
- No new dependencies

---

## Rollback

Se qualcosa va storto in prod:
```bash
git revert <commit-sha-ultimo-chunk-4>
```
Singolo revert ripristina `<details>` form pre-R30. Server actions invariate, nessun DB change da annullare.

---

## Note implementation-sensitive

1. **Lucide icons**: se vuoi aggiungere icone (es. `<X>` invece di `✕`), importa da `lucide-react`. Non bloccante.

2. **Form submit in modal**: il modal resta aperto finche' il server action non completa + `revalidatePath` non triggera un re-render. Se il form fail con `ValidationError` (R10 BL-C1 overlap), l'errore bubble up via Next Error Boundary → pagina error.tsx attuale cattura. L'admin vede "Qualcosa è andato storto" + retry.

   **Miglioramento deferred (non-blocker R30)**: wrappa il form in `useActionState` + mostra errore inline nel modal con `<Toaster>` già montato nel layout.

3. **Focus trap minimale**: il pattern attuale (`firstInput?.focus()` on mount + `cell?.focus()` on unmount) copre ~80% dei casi WCAG. Trap completo (bloccare Tab fuori dal modal) richiederebbe una lib tipo `focus-trap-react` → deferred, YAGNI per admin interno.

4. **Mobile touch**: `<button>` cell funziona nativamente su touch. Testato in DevTools mobile emulator durante Task 4.1.

5. **Server action import**: il plan usa `await import("@/app/admin/...actions")` dinamico nel form action callback. **Fallback piu' sicuro** se il dynamic import non registra correttamente il server action boundary in Next 16: import statico in testa:
   ```ts
   import { manualBlockRange, manualReleaseRange } from "@/app/admin/(dashboard)/calendario/actions";
   ```
   Poi usa `manualBlockRange` direttamente nel form action (pattern gia' in `disponibilita/page.tsx` pre-R29 merge). Server action `"use server"` directive e' nel file stesso, quindi si comporta correttamente.

6. **Focus trap parziale — WCAG deferred**: il focus trap minimale copre ~80% WCAG 2.4.3. Trap completo (Tab intrappolato dentro il modal) rimandato tra i WCAG 2.1 AA items R19 (EAA 2025 obligation). Flag nel `docs/runbook/operational-playbook.md` o equivalente alla fine dell'implementation, NON silenziosamente.

7. **Server action error handling UX**: errori tipo `ValidationError` (R10 BL-C1 overlap booking attivo, max 90g range) oggi bubblano a `error.tsx` → pagina generica "Qualcosa e' andato storto". Per UX admin-internal accettabile, ma se vuoi error inline nel modal (preferibile) aggiungi `useActionState` wrapping in Task 3.3 Step 4 — 10 LOC extra, visualizza il messaggio errore sopra il bottone submit.
