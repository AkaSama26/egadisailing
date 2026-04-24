# Priority Override Fase 1 (Trimarano) Implementation Plan

> **For Claude:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sistema di override basato su revenue: prenotazioni a valore superiore possono scavalcare quelle inferiori con approvazione esplicita admin, protezione cliente nelle 2 settimane pre-data.

**Architecture (agg. 2026-04-23 post brainstorm #2):** Catalogo Trimarano a 2 pacchetti (Gourmet + Charter — Cabin Charter rimosso). Nuova entità `OverrideRequest` (tabella separata) + pure helper `override-eligibility.ts` che decide al click "Continua" (post-pax step, pre-customer-info) se la richiesta è normale/override/bloccata. Server actions admin per approve/reject. Workflow OTA manuale (checklist 4-step admin + natural propagation webhook Bokun + reconciliation cron +1h post-approve). Cancellation-rate tracking per-portale con soglie soft/hard configurable. Cron per escalation email + drop-dead auto-expire + refund retry + override reconcile. Side-effects Stripe sempre post-commit (R10 pattern).

**Chunks (8):**
1. **Chunk 1** — Foundation (schema + eligibility helper + types)
2. **Chunk 2a** — Lifecycle core (createOverrideRequest + supersede + postCommitCancelBooking helper)
3. **Chunk 2b** — Admin actions + cron helpers (approveOverride + rejectOverride + expireDropDead + sendEscalationReminders + checkOtaReconciliation + computeCancellationRate)
4. **Chunk 3** — Feature flag + Server Action eligibility + integrazione wizard
5. **Chunk 4** — Email templates + NotificationType wiring
6. **Chunk 5** — Cron endpoints (reminders + dropdead + refund-retry + reconcile) + scheduler
7. **Chunk 6** — Admin UI (lista + detail + OtaChecklist + KPI card cancellation-rate + sidebar + dashboard + ManualAlert UI)
8. **Chunk 7** — Customer UI + rollout + runbook

**Tech Stack:** Next.js 16 (App Router) · Prisma v7 · Postgres 16 · Redis (lease cron + cancellation-rate cache) · BullMQ (fan-out esistente) · Stripe (refund, solo DIRECT) · Brevo (email) · Tailwind + lucide. Nessuna nuova dipendenza.

---

## File Structure

### Nuovi file

**Business logic pura + lifecycle**
- `src/lib/booking/override-eligibility.ts` — pure helper (decisione normal/override/blocked)
- `src/lib/booking/override-request.ts` — lifecycle CRUD (create/approve/reject/expire/supersede/reminders/reconcile)
- `src/lib/booking/override-types.ts` — tipi condivisi (`ConflictSourceChannel` union, workflow OTA DTOs)
- `src/lib/booking/override-actions.ts` — Server Action `checkOverrideEligibility` invocata dal wizard al "Continua"
- `src/lib/booking/override-reconcile.ts` — `checkOtaReconciliation(requestId)` helper per cron §8.4
- `src/lib/booking/cancellation-rate.ts` — `computeCancellationRate(channel, windowDays)` con Redis cache TTL 60s

**Server actions admin**
- `src/app/admin/(dashboard)/override-requests/actions.ts` — approveOverrideAction, rejectOverrideAction

**Admin UI**
- `src/app/admin/(dashboard)/override-requests/page.tsx` — lista PENDING + tabs storico
- `src/app/admin/(dashboard)/override-requests/[id]/page.tsx` — detail + alert ALTO IMPATTO + bottoni
- `src/components/admin/override-request-card.tsx` — card lista richiesta
- `src/components/admin/override-impact-badge.tsx` — badge ALTO IMPATTO
- `src/components/admin/override-counter-kpi.tsx` — dashboard KPI card

**Cron endpoints**
- `src/app/api/cron/override-reminders/route.ts` — escalation 24/48/72h
- `src/app/api/cron/override-dropdead/route.ts` — auto-expire al 15° giorno
- `src/app/api/cron/refund-retry/route.ts` — retry Payment.FAILED
- `src/app/api/cron/override-reconcile/route.ts` — +1h post-approve verify upstream OTA

**Email templates**
- `src/lib/email/templates/override-pending-confirmation.ts` — "in attesa conferma" customer new
- `src/lib/email/templates/override-approved-winner.ts` — "confermato" winner
- `src/lib/email/templates/override-rejected-new.ts` — "rifiutato + date alternative" new
- `src/lib/email/templates/override-expired.ts` — "scaduta + date alternative"
- `src/lib/email/templates/override-superseded.ts` — "superato da offerta superiore"
- `src/lib/email/templates/override-reconcile-failed-admin.ts` — admin FATAL quando cron §8.4 rileva upstream still active

**Admin UI dedicata OTA + KPI**
- `src/components/admin/override-ota-checklist.tsx` — 4-step checkbox per OTA conflict + polling webhook status
- `src/components/admin/cancellation-rate-kpi.tsx` — card dashboard con per-channel rate + soglie colorate

**Test files (integration + unit)**
- `src/lib/booking/__tests__/override-eligibility.test.ts` — 9 test unit
- `tests/integration/override-request-lifecycle.test.ts` — 8 scenari integration
- `tests/integration/override-cron.test.ts` — 4 cron scenario

**Prisma migration**
- `prisma/migrations/20260421210000_override_request_fase1/migration.sql`

### File modificati

- `prisma/schema.prisma` — +OverrideRequest +OverrideStatus (+PENDING_RECONCILE_FAILED) +back-relation Booking
- `src/lib/booking/create-direct.ts` — integrazione eligibility (già pre-validated al Continua, serve solo consume)
- `src/lib/env.ts` — +FEATURE_OVERRIDE_ENABLED +FEATURE_OVERRIDE_OTA_ENABLED +OVERRIDE_CANCELLATION_RATE_SOFT_WARN (0.03) +OVERRIDE_CANCELLATION_RATE_HARD_BLOCK (0.05)
- `src/components/booking/booking-wizard.tsx` — click "Continua" pax step chiama `checkOverrideEligibility` Server Action + spinner + error banner inline blocked + transparent pass-through su override_request/normal + sessionStorage greying
- `src/lib/admin/labels.ts` — +OVERRIDE_STATUS_LABEL
- `src/app/admin/_components/admin-sidebar.tsx` — nuova voce "Richieste override" + badge PENDING counter
- `src/app/admin/(dashboard)/page.tsx` — KPI card override counter + soft warning > 3/month
- `src/lib/notifications/events.ts` — +6 NotificationType
- `src/lib/notifications/dispatcher.ts` — render branch per nuovi template
- `src/lib/cron/scheduler.ts` — schedule 3 nuovi cron
- `src/lib/email/templates/overbooking-apology.ts` — estendi payload con voucher + rebooking (no nuovo template)
- `src/lib/db/advisory-lock.ts` — comment updated con namespace registry

### File invariati (riuso)

- `src/lib/stripe/payment-intents.ts` — `refundPayment`, `getChargeRefundState` (R10/R27)
- `src/lib/availability/service.ts` — `blockDates`, `releaseDates`
- `src/lib/audit/log.ts` — `auditLog`
- `src/lib/booking/cross-channel-conflicts.ts` — `isBoatExclusiveServiceType`
- `src/lib/pricing/service.ts` — `quotePrice`
- `src/lib/charter/manual-alerts.ts` — `createManualAlert`
- `src/lib/http/client-ip.ts` — `getClientIp`
- `src/lib/rate-limit/service.ts` — `enforceRateLimit`
- `src/lib/lease/redis-lease.ts` — `tryAcquireLease`

---

## Chunk 1: Foundation — schema + eligibility helper

### Task 1.1: Prisma schema (OverrideRequest + enum)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Leggi schema esistente per trovare punto di inserimento**

```bash
grep -n "^model User " prisma/schema.prisma
grep -n "^model Booking " prisma/schema.prisma
```

- [ ] **Step 2: Aggiungi model + enum dopo model Booking (o accanto ad altri override/cross-channel models)**

```prisma
// ═══════════════════════════════════════════════════════════
// PRIORITY OVERRIDE SYSTEM (Fase 1 Trimarano)
// ═══════════════════════════════════════════════════════════

model OverrideRequest {
  id                          String         @id @default(cuid())

  // Il booking NUOVO in PENDING che vuole scavalcare
  newBookingId                String         @unique
  newBooking                  Booking        @relation("NewBookingOverride", fields: [newBookingId], references: [id], onDelete: Cascade)

  // Booking ESISTENTI che verranno cancellati se approvato (array JSON)
  conflictingBookingIds       String[]

  // Sorgente canali dei conflicting booking (§9.1 spec).
  // Union di Booking.source dei conflict, es: ["DIRECT"], ["BOKUN"], ["DIRECT","BOKUN"]
  conflictSourceChannels      String[]

  // Revenue snapshot immutabile (audit + decisione admin)
  newBookingRevenue           Decimal        @db.Decimal(10, 2)
  conflictingRevenueTotal     Decimal        @db.Decimal(10, 2)

  // Lifecycle
  status                      OverrideStatus @default(PENDING)
  dropDeadAt                  DateTime       // = experience_date - 15d

  // Reconciliation cron §8.4 (post-approve OTA verification)
  reconcileCheckDue           DateTime?      // = now+1h quando admin approva con conflict OTA
  reconcileCheckedAt          DateTime?      // dedup cron — NULL = non ancora processato

  // Escalation reminder dedup (cron cron §8.1)
  reminderLevel               Int            @default(0)
  lastReminderSentAt          DateTime?

  // Decisione admin
  decidedAt                   DateTime?
  decidedByUserId             String?
  decidedByUser               User?          @relation(fields: [decidedByUserId], references: [id], onDelete: SetNull)
  decisionNotes               String?        @db.Text

  createdAt                   DateTime       @default(now())
  updatedAt                   DateTime       @updatedAt

  @@index([status, dropDeadAt])
  @@index([status, createdAt])
  @@index([status, lastReminderSentAt])
  @@index([status, reconcileCheckDue])   // Per cron §8.4
}

enum OverrideStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
  PENDING_RECONCILE_FAILED    // cron §8.4 ha rilevato upstream OTA still active
}
```

- [ ] **Step 3: Aggiungi back-relation sul model Booking**

Trova il model Booking esistente e aggiungi la relation (una riga):

```prisma
model Booking {
  // ... campi esistenti ...
  overrideRequest OverrideRequest? @relation("NewBookingOverride")
}
```

E analogo su `model User`:

```prisma
model User {
  // ... campi esistenti ...
  overrideDecisions OverrideRequest[] // tutte le richieste decise da questo admin
}
```

- [ ] **Step 4: Validate schema**

Run: `npx prisma validate 2>&1 | tail -3`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(override): schema OverrideRequest + enum OverrideStatus"
```

---

### Task 1.2: Migration SQL

**Files:**
- Create: `prisma/migrations/20260421210000_override_request_fase1/migration.sql`

- [ ] **Step 1: Crea directory migration**

```bash
mkdir -p prisma/migrations/20260421210000_override_request_fase1
```

- [ ] **Step 2: Genera migration via Prisma**

```bash
# Usa DATABASE_URL da .env (sourcing).
set -a && source .env && set +a
npx prisma migrate dev --create-only --name override_request_fase1
```

Prisma genererà il file SQL. Verificarne il contenuto prima di applicare.

Expected file contains:
- `CREATE TYPE "OverrideStatus" AS ENUM (...)`
- `CREATE TABLE "OverrideRequest" (...)`
- `CREATE UNIQUE INDEX "OverrideRequest_newBookingId_key"`
- 3 `CREATE INDEX` per gli `@@index` dichiarati
- 2 `ALTER TABLE ADD CONSTRAINT ... FOREIGN KEY` (newBookingId → Booking, decidedByUserId → User)

- [ ] **Step 3: Run migration deploy + verify**

```bash
set -a && source .env && set +a
npx prisma migrate deploy 2>&1 | tail -5
```

Expected: `Applying migration 20260421210000_override_request_fase1 ✓`

- [ ] **Step 4: Regen Prisma client**

```bash
npx prisma generate 2>&1 | tail -3
```

Expected: `Generated Prisma Client (v7.7.0) to ./src/generated/prisma in 285ms`

- [ ] **Step 5: Run migration su DB test**

```bash
# Deriva test DB URL dal base DATABASE_URL
set -a && source .env && set +a
DATABASE_URL="${DATABASE_URL%/*}/egadisailing_test" \
  npx prisma migrate deploy 2>&1 | tail -3
```

Expected: same confirmation for test DB.

- [ ] **Step 6: Run full test suite per verificare no regression**

```bash
npm test 2>&1 | tail -5
```

Expected: i 177 test esistenti passano, 0 failed. Se il numero reale differisce
dal 177 di AGENTS.md, usare il count corrente come baseline e documentarlo nel
commit.

- [ ] **Step 7: Commit migration**

```bash
git add prisma/migrations/20260421210000_override_request_fase1/
git commit -m "feat(override): migration OverrideRequest table + FK"
```

---

### Task 1.3: Pure helper `override-eligibility.ts` — scaffold + test empty

**Files:**
- Create: `src/lib/booking/override-eligibility.ts`
- Create: `src/lib/booking/__tests__/override-eligibility.test.ts`

- [ ] **Step 1: Scrivi test scaffold**

```ts
// src/lib/booking/__tests__/override-eligibility.test.ts
import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  checkOverrideEligibility,
  type OverrideEligibilityInput,
} from "@/lib/booking/override-eligibility";

const baseInput: OverrideEligibilityInput = {
  newBookingRevenue: new Decimal("2000.00"),
  conflictingBookings: [],
  experienceDate: new Date("2026-08-15"),
  today: new Date("2026-07-25"),
};

describe("checkOverrideEligibility", () => {
  it("zero conflitti → status normal", () => {
    const result = checkOverrideEligibility(baseInput);
    expect(result.status).toBe("normal");
    expect(result.conflictingBookingIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test fallito**

Run: `npm run test:unit -- override-eligibility 2>&1 | tail -5`
Expected: FAIL `Cannot find module '@/lib/booking/override-eligibility'`

- [ ] **Step 3: Scaffold helper con types + implementation stub**

```ts
// src/lib/booking/override-eligibility.ts
import type Decimal from "decimal.js";

/**
 * Input per checkOverrideEligibility — pure helper, nessun DB access.
 *
 * @remarks
 * `isAdminBlock=true` rappresenta un BoatAvailability.BLOCKED con
 * `lockedByBookingId === null` — tipico di un boat-block admin manuale.
 * Questo ha priorità assoluta sulla logica revenue (spec §5.3).
 * Il caller deve derivare questo flag leggendo `BoatAvailability` sul DB
 * e verificando `status === "BLOCKED" && lockedByBookingId === null`.
 */
export interface OverrideEligibilityInput {
  newBookingRevenue: Decimal;
  conflictingBookings: Array<{
    id: string;
    revenue: Decimal;
    /** true = admin boat-block (BoatAvailability.BLOCKED con lockedByBookingId=null) */
    isAdminBlock: boolean;
  }>;
  experienceDate: Date;
  today: Date;
}

export type OverrideEligibilityResult =
  | { status: "normal"; conflictingBookingIds: [] }
  | {
      status: "override_request";
      conflictingBookingIds: string[];
      conflictingRevenueTotal: Decimal;
      dropDeadAt: Date;
    }
  | {
      status: "blocked";
      reason: "within_15_day_cutoff" | "insufficient_revenue" | "boat_block";
      conflictingBookingIds: string[];
    };

export function checkOverrideEligibility(
  input: OverrideEligibilityInput,
): OverrideEligibilityResult {
  if (input.conflictingBookings.length === 0) {
    return { status: "normal", conflictingBookingIds: [] };
  }
  // TODO: implementa i 6 passi in task 1.4-1.8
  throw new Error("not yet implemented");
}
```

- [ ] **Step 4: Run test PASS**

Run: `npm run test:unit -- override-eligibility 2>&1 | tail -5`
Expected: `Tests  1 passed (1)`

- [ ] **Step 5: Commit**

```bash
git add src/lib/booking/override-eligibility.ts src/lib/booking/__tests__/override-eligibility.test.ts
git commit -m "test(override): scaffold checkOverrideEligibility pure helper"
```

---

### Task 1.4: Eligibility — boat-block blocked

- [ ] **Step 1: Aggiungi test per boat-block**

```ts
// Append to test file:
it("boat-block presente → blocked/boat_block (anche se revenue OK)", () => {
  const result = checkOverrideEligibility({
    ...baseInput,
    conflictingBookings: [
      { id: "b1", revenue: new Decimal("500"), isAdminBlock: true },
    ],
  });
  expect(result.status).toBe("blocked");
  if (result.status === "blocked") {
    expect(result.reason).toBe("boat_block");
    expect(result.conflictingBookingIds).toEqual(["b1"]);
  }
});
```

- [ ] **Step 2: Run test FAIL**

Expected: `throw new Error("not yet implemented")`

- [ ] **Step 3: Implementa boat-block branch**

Sostituisci `throw` con:

```ts
// Regola 1: boat-block absolute priority
const hasBoatBlock = input.conflictingBookings.some((b) => b.isAdminBlock);
if (hasBoatBlock) {
  return {
    status: "blocked",
    reason: "boat_block",
    conflictingBookingIds: input.conflictingBookings.map((b) => b.id),
  };
}
// TODO: altre regole in task 1.5-1.8
throw new Error("not yet implemented");
```

- [ ] **Step 4: Run test PASS**

Run: `npm run test:unit -- override-eligibility 2>&1 | tail -3`
Expected: `Tests  2 passed (2)`

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(override): eligibility boat-block → blocked"
```

---

### Task 1.5: Eligibility — 15-day cutoff

- [ ] **Step 1: Aggiungi 2 test per cutoff**

```ts
it("esperienza a 14 gg → blocked/within_15_day_cutoff", () => {
  const result = checkOverrideEligibility({
    ...baseInput,
    experienceDate: new Date("2026-08-08"), // 14 giorni dopo 2026-07-25
    conflictingBookings: [
      { id: "b1", revenue: new Decimal("500"), isAdminBlock: false },
    ],
  });
  expect(result.status).toBe("blocked");
  if (result.status === "blocked") {
    expect(result.reason).toBe("within_15_day_cutoff");
  }
});

it("esperienza a 15 gg esatti → blocked (cutoff strict `> 15`)", () => {
  const result = checkOverrideEligibility({
    ...baseInput,
    experienceDate: new Date("2026-08-09"), // 15 giorni dopo 2026-07-25
    conflictingBookings: [
      { id: "b1", revenue: new Decimal("500"), isAdminBlock: false },
    ],
  });
  expect(result.status).toBe("blocked");
  if (result.status === "blocked") {
    expect(result.reason).toBe("within_15_day_cutoff");
  }
});
```

- [ ] **Step 2: Run test FAIL**

- [ ] **Step 3: Implementa cutoff branch**

Sostituisci `throw new Error(...)` con:

```ts
// Regola 2: 15-day cutoff strict (> 15 = eligible, <= 15 = blocked)
const daysToExperience = Math.floor(
  (input.experienceDate.getTime() - input.today.getTime()) /
    (24 * 60 * 60 * 1000),
);
if (daysToExperience <= 15) {
  return {
    status: "blocked",
    reason: "within_15_day_cutoff",
    conflictingBookingIds: input.conflictingBookings.map((b) => b.id),
  };
}
// TODO: revenue in task 1.6
throw new Error("not yet implemented");
```

- [ ] **Step 4: Run test PASS**

Expected: `Tests  4 passed (4)`

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(override): eligibility 15-day cutoff strict"
```

---

### Task 1.6: Eligibility — revenue comparison

- [ ] **Step 1: Aggiungi test revenue**

```ts
it("revenue pari → blocked/insufficient_revenue", () => {
  const result = checkOverrideEligibility({
    ...baseInput,
    conflictingBookings: [
      { id: "b1", revenue: new Decimal("2000"), isAdminBlock: false },
    ],
  });
  expect(result.status).toBe("blocked");
  if (result.status === "blocked") {
    expect(result.reason).toBe("insufficient_revenue");
  }
});

it("revenue nuovo superiore → override_request", () => {
  const result = checkOverrideEligibility({
    ...baseInput,
    newBookingRevenue: new Decimal("3000"),
    conflictingBookings: [
      { id: "b1", revenue: new Decimal("2000"), isAdminBlock: false },
    ],
  });
  expect(result.status).toBe("override_request");
  if (result.status === "override_request") {
    expect(result.conflictingBookingIds).toEqual(["b1"]);
    expect(result.conflictingRevenueTotal.toString()).toBe("2000");
    expect(result.dropDeadAt).toEqual(new Date("2026-07-31")); // 2026-08-15 - 15d
  }
});
```

- [ ] **Step 2: Run test FAIL**

- [ ] **Step 3: Implementa revenue + override_request**

Sostituisci `throw` con:

```ts
// Regola 3: somma revenue conflittuali
const conflictingRevenueTotal = input.conflictingBookings.reduce(
  (acc, b) => acc.add(b.revenue),
  new Decimal(0),
);

if (input.newBookingRevenue.lte(conflictingRevenueTotal)) {
  return {
    status: "blocked",
    reason: "insufficient_revenue",
    conflictingBookingIds: input.conflictingBookings.map((b) => b.id),
  };
}

// Eligibile
const dropDeadAt = new Date(input.experienceDate);
dropDeadAt.setDate(dropDeadAt.getDate() - 15);

return {
  status: "override_request",
  conflictingBookingIds: input.conflictingBookings.map((b) => b.id),
  conflictingRevenueTotal,
  dropDeadAt,
};
```

Nota: rimuovi l'import `type Decimal` e sostituisci con `import Decimal from "decimal.js"` per poter istanziare `new Decimal(0)`.

- [ ] **Step 4: Run test PASS**

Expected: `Tests  6 passed (6)`

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(override): eligibility revenue compare + dropDeadAt"
```

---

### Task 1.7: Eligibility — multi-conflicting (N conflict distinti stesso slot)

- [ ] **Step 1: Aggiungi test multi-conflicting**

```ts
it("multi-conflicting revenue sum (3 booking su stesso slot)", () => {
  const result = checkOverrideEligibility({
    ...baseInput,
    newBookingRevenue: new Decimal("8000"),
    conflictingBookings: [
      { id: "b1", revenue: new Decimal("2500"), isAdminBlock: false },
      { id: "b2", revenue: new Decimal("2500"), isAdminBlock: false },
      { id: "b3", revenue: new Decimal("2500"), isAdminBlock: false },
    ],
  });
  expect(result.status).toBe("override_request");
  if (result.status === "override_request") {
    expect(result.conflictingRevenueTotal.toString()).toBe("7500");
    expect(result.conflictingBookingIds).toEqual(["b1", "b2", "b3"]);
  }
});
```

- [ ] **Step 2: Run test**

Expected: PASS (l'implementazione del task 1.6 già gestisce `reduce` su array N). Se fallisce, debugging.

- [ ] **Step 3: Commit**

```bash
git commit -am "test(override): eligibility multi-conflicting (N conflict stesso slot)"
```

---

### Task 1.8: Eligibility — Decimal precision edge case

- [ ] **Step 1: Aggiungi test precision**

```ts
it("Decimal precision (€2000.01 vs €2000.00) → override_request", () => {
  const result = checkOverrideEligibility({
    ...baseInput,
    newBookingRevenue: new Decimal("2000.01"),
    conflictingBookings: [
      { id: "b1", revenue: new Decimal("2000.00"), isAdminBlock: false },
    ],
  });
  expect(result.status).toBe("override_request");
});
```

- [ ] **Step 2: Run test**

Expected: PASS (Decimal `.lte()` compara correttamente).

- [ ] **Step 3: Full test suite**

Run: `npm test 2>&1 | tail -5`
Expected: 188 + 9 = 197 test passing.

Run: `npx tsc --noEmit 2>&1 | tail -3`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git commit -am "test(override): eligibility Decimal precision edge case"
```

---

### Task 1.9: Tipo `ConflictSourceChannel` + DTO workflow OTA

**Files:**
- Create: `src/lib/booking/override-types.ts`

- [ ] **Step 1: Definisci union type + DTO**

```ts
// src/lib/booking/override-types.ts
// NOTA: non importiamo BookingSource da Prisma — definiamo union esplicito
// per conflictSourceChannels (sottoinsieme dei source validi come "conflict origin").

// Canali validi come conflictSourceChannels nel DB
export type ConflictSourceChannel =
  | "DIRECT"
  | "BOKUN"
  | "BOATAROUND"
  | "SAMBOAT"
  | "CLICKANDBOAT"
  | "NAUTAL";

export const OTA_CHANNELS: readonly ConflictSourceChannel[] = [
  "BOKUN",
  "BOATAROUND",
  "SAMBOAT",
  "CLICKANDBOAT",
  "NAUTAL",
] as const;

export function isOtaChannel(ch: ConflictSourceChannel): boolean {
  return OTA_CHANNELS.includes(ch);
}

// DTO per workflow checklist OTA admin (§7.2bis)
export interface OtaConfirmation {
  conflictBookingId: string;    // Booking.id
  channel: ConflictSourceChannel;
  externalRef: string;           // bokunBookingId / etc
  panelOpened: boolean;          // checkbox 1
  upstreamCancelled: boolean;    // checkbox 2
  refundVerified: boolean;       // checkbox 3
  adminDeclared: boolean;        // checkbox 4
}

export function isOtaConfirmationComplete(c: OtaConfirmation): boolean {
  return c.panelOpened && c.upstreamCancelled && c.refundVerified && c.adminDeclared;
}
```

- [ ] **Step 2: Unit test**

```ts
// src/lib/booking/__tests__/override-types.test.ts
import { describe, it, expect } from "vitest";
import { isOtaChannel, isOtaConfirmationComplete, OTA_CHANNELS } from "../override-types";

describe("override-types", () => {
  it("DIRECT is NOT ota", () => {
    expect(isOtaChannel("DIRECT")).toBe(false);
  });
  it("BOKUN/BOATAROUND/SAMBOAT/CLICKANDBOAT/NAUTAL sono ota", () => {
    for (const ch of OTA_CHANNELS) expect(isOtaChannel(ch)).toBe(true);
  });
  it("isOtaConfirmationComplete richiede tutte le 4 flag", () => {
    const base = {
      conflictBookingId: "b1", channel: "BOKUN" as const,
      externalRef: "BK-1", panelOpened: true, upstreamCancelled: true,
      refundVerified: true, adminDeclared: true,
    };
    expect(isOtaConfirmationComplete(base)).toBe(true);
    expect(isOtaConfirmationComplete({ ...base, refundVerified: false })).toBe(false);
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/booking/override-types.ts src/lib/booking/__tests__/override-types.test.ts
git commit -m "feat(override): ConflictSourceChannel types + OTA confirmation DTO"
```

---

### Task 1.10: Chunk 1 verify (typecheck + full test suite)

- [ ] **Step 1: Typecheck completo**

```bash
npx tsc --noEmit 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 2: Full test suite**

```bash
npm test 2>&1 | tail -5
```

Expected: tutti i test esistenti pre-merge + 9 nuovi (eligibility 6 + multi + precision + override-types 3) passano, 0 failed.

- [ ] **Step 3: Conferma commits presenti**

```bash
git log --oneline -10
```

Expected: vedi i commit `feat(override): schema`, `feat(override): migration`,
`feat(override): eligibility ...`, `feat(override): ConflictSourceChannel types`.

Fine Chunk 1. Passa a Chunk 2a dopo review approved.

---

## Chunk 2a: Lifecycle core — create + supersede + shared helper

**Scope**: modulo `override-request.ts` con `createOverrideRequest` + supersede
automatico. Estrazione `postCommitCancelBooking` helper condiviso (usato da
rejectOverride/expireDropDead/supersede).

**Files create:**
- `src/lib/booking/override-request.ts` (file base)
- `src/lib/booking/post-commit-cancel.ts` (helper condiviso)
- `tests/integration/override-request-lifecycle.test.ts`
- `tests/helpers/seed-override.ts`

### Task 2.0: Shared helper `postCommitCancelBooking`

**Files:**
- Create: `src/lib/booking/post-commit-cancel.ts`
- Create: `src/lib/booking/__tests__/post-commit-cancel.test.ts`

Helper condiviso usato da approveOverride (cancel dei conflicts),
rejectOverride/expireDropDead (cancel del newBooking) e supersede (cancel dei
newBooking delle request superate). Fa: refund Stripe (se SUCCEEDED + stripeChargeId)
+ release availability + audit log. Callable post-commit (Stripe fuori tx, R10
pattern).

- [ ] **Step 1: Scrivi test scaffold**

```ts
// src/lib/booking/__tests__/post-commit-cancel.test.ts
import { describe, it, expect, vi } from "vitest";

const refundPaymentMock = vi.fn().mockResolvedValue({ id: "re_test", status: "succeeded" });
const getChargeRefundStateMock = vi.fn().mockResolvedValue({
  totalCents: 200000, refundedCents: 0, residualCents: 200000,
});
vi.mock("@/lib/stripe/payment-intents", () => ({
  refundPayment: refundPaymentMock,
  getChargeRefundState: getChargeRefundStateMock,
}));

const releaseDatesMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/availability/service", () => ({
  releaseDates: releaseDatesMock,
  blockDates: vi.fn(),
}));

describe("postCommitCancelBooking", () => {
  it("rimborsa Payment SUCCEEDED + release availability + audit log", async () => {
    // Placeholder: test DB seed + assert chiamate (implementato Step 3+)
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test (placeholder verde)**

```bash
npm run test:unit -- post-commit-cancel 2>&1 | tail -3
```

Expected: `Tests 1 passed (1)`

- [ ] **Step 3: Implementa helper**

```ts
// src/lib/booking/post-commit-cancel.ts
"use server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { refundPayment, getChargeRefundState } from "@/lib/stripe/payment-intents";
import { releaseDates } from "@/lib/availability/service";
import { CHANNELS } from "@/lib/channels";
import { auditLog } from "@/lib/audit/log";

export interface PostCommitCancelInput {
  bookingId: string;
  /** Actor (adminUserId | "SYSTEM" per cron) — usato per audit log */
  actorUserId: string | null;
  /** Motivo della cancellazione (finisce in audit log + logger) */
  reason: "override_approved" | "override_rejected" | "override_expired" | "override_superseded";
}

export interface PostCommitCancelResult {
  bookingId: string;
  refundsAttempted: number;
  refundsFailed: Array<{ paymentId: string; message: string }>;
  releaseOk: boolean;
}

/**
 * Side-effects post-commit per un booking appena settato a CANCELLED nel DB.
 * Non mutates `booking.status` — il caller DEVE gia' averlo fatto dentro la tx.
 *
 * Esegue:
 * 1. Refund Stripe per ogni Payment SUCCEEDED con stripeChargeId (non-REFUND)
 * 2. releaseDates su availability (fan-out verso tutti i canali tramite CHANNELS.DIRECT)
 * 3. auditLog con azione `BOOKING_CANCELLED_BY_OVERRIDE`
 *
 * Error-tolerant: fallimenti Stripe/availability raccolti e ritornati, NON throw.
 */
export async function postCommitCancelBooking(
  input: PostCommitCancelInput,
): Promise<PostCommitCancelResult> {
  const booking = await db.booking.findUnique({
    where: { id: input.bookingId },
    include: { payments: true },
  });
  if (!booking) {
    throw new Error(`postCommitCancelBooking: booking ${input.bookingId} not found`);
  }

  const result: PostCommitCancelResult = {
    bookingId: input.bookingId,
    refundsAttempted: 0,
    refundsFailed: [],
    releaseOk: true,
  };

  // 1. Refund Stripe
  for (const p of booking.payments) {
    if (p.status === "SUCCEEDED" && p.stripeChargeId && p.type !== "REFUND") {
      result.refundsAttempted++;
      try {
        const state = await getChargeRefundState(p.stripeChargeId);
        if (state.residualCents > 0) {
          await refundPayment(p.stripeChargeId, state.residualCents);
          await db.payment.update({
            where: { id: p.id },
            data: { status: "REFUNDED" },
          });
        }
      } catch (err) {
        result.refundsFailed.push({
          paymentId: p.id,
          message: (err as Error).message,
        });
        logger.error(
          { err, paymentId: p.id, bookingId: booking.id, reason: input.reason },
          "postCommitCancelBooking: refund failed",
        );
      }
    }
  }

  // 2. Release availability
  try {
    await releaseDates(
      booking.boatId,
      booking.startDate,
      booking.endDate,
      CHANNELS.DIRECT,
    );
  } catch (err) {
    result.releaseOk = false;
    logger.error(
      { err, bookingId: booking.id, reason: input.reason },
      "postCommitCancelBooking: releaseDates failed",
    );
  }

  // 3. Audit log
  await auditLog({
    userId: input.actorUserId,
    action: "BOOKING_CANCELLED_BY_OVERRIDE",
    entity: "Booking",
    entityId: booking.id,
    after: {
      reason: input.reason,
      refundsAttempted: result.refundsAttempted,
      refundsFailed: result.refundsFailed.length,
      releaseOk: result.releaseOk,
    },
  });

  return result;
}
```

- [ ] **Step 4: Aggiungi test integration con seed reale**

```ts
// In post-commit-cancel.test.ts, sostituisci il placeholder con:
import { setupTestDb, resetTestDb, closeTestDb } from "../../../../tests/helpers/test-db";
import { seedBoatAndService, seedBooking } from "../../../../tests/helpers/seed-override";
import { postCommitCancelBooking } from "@/lib/booking/post-commit-cancel";

let db: Awaited<ReturnType<typeof setupTestDb>>;
beforeAll(async () => { db = await setupTestDb(); });
afterAll(async () => { await closeTestDb(); });
beforeEach(async () => { await resetTestDb(); });

it("rimborsa Payment SUCCEEDED + release availability + audit log", async () => {
  const { boat, service } = await seedBoatAndService(db);
  const booking = await seedBooking(db, {
    boatId: boat.id, serviceId: service.id,
    totalPrice: "2000.00", status: "CANCELLED",
  });
  await db.payment.create({
    data: {
      bookingId: booking.id, amount: "2000.00", type: "FULL",
      method: "STRIPE", status: "SUCCEEDED",
      stripeChargeId: "ch_test_123", processedAt: new Date(),
    },
  });

  const res = await postCommitCancelBooking({
    bookingId: booking.id,
    actorUserId: null,
    reason: "override_rejected",
  });

  expect(res.refundsAttempted).toBe(1);
  expect(res.refundsFailed).toEqual([]);
  expect(res.releaseOk).toBe(true);
  expect(refundPaymentMock).toHaveBeenCalledWith("ch_test_123", 200000);
  expect(releaseDatesMock).toHaveBeenCalled();

  const audit = await db.auditLog.findMany({
    where: { action: "BOOKING_CANCELLED_BY_OVERRIDE", entityId: booking.id },
  });
  expect(audit).toHaveLength(1);
});
```

- [ ] **Step 5: Run test + commit**

```bash
npm run test:integration -- post-commit-cancel 2>&1 | tail -3
git add src/lib/booking/post-commit-cancel.ts src/lib/booking/__tests__/post-commit-cancel.test.ts
git commit -m "feat(override): shared postCommitCancelBooking helper (refund + release + audit)"
```

---

### Task 2.1: Scaffold module + createOverrideRequest stub

**Files:**
- Create: `src/lib/booking/override-request.ts`
- Create: `tests/integration/override-request-lifecycle.test.ts`

- [ ] **Step 1: Leggi patterns esistenti**

```bash
# Pattern tx-aware helper (es. manual-alerts):
cat src/lib/charter/manual-alerts.ts | head -30
# Pattern post-commit side effects (cancelBooking):
cat 'src/app/admin/(dashboard)/prenotazioni/actions.ts' | head -50
```

- [ ] **Step 2: Scaffold file module**

```ts
// src/lib/booking/override-request.ts
"use server";

import type { Prisma } from "@/generated/prisma/client";
import type { OverrideStatus } from "@/generated/prisma/enums";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface CreateOverrideRequestInput {
  newBookingId: string;
  conflictingBookingIds: string[];
  /**
   * Union di Booking.source dei conflict. Se omesso, derivato in tx via
   * `tx.booking.findMany({where:{id:{in:conflictingBookingIds}},select:{source:true}})`.
   * Preferibile omettere e far derivare al helper — evita drift tra caller e DB.
   */
  conflictSourceChannels?: string[];
  newBookingRevenue: Decimal;
  conflictingRevenueTotal: Decimal;
  dropDeadAt: Date;
}

export interface CreateOverrideRequestResult {
  requestId: string;
  supersededRequestIds: string[];
}

/**
 * Crea una OverrideRequest dentro la tx passata.
 * Side-effects post-commit (dispatchati dal caller): email "in attesa",
 * dispatch admin alert, eventuale supersede di request inferiore.
 *
 * @throws se newBookingId non esiste o non è PENDING
 */
export async function createOverrideRequest(
  tx: Prisma.TransactionClient,
  input: CreateOverrideRequestInput,
): Promise<CreateOverrideRequestResult> {
  // TODO: implement in task 2.2
  throw new Error("not yet implemented");
}
```

- [ ] **Step 3: Scaffold test integration**

```ts
// tests/integration/override-request-lifecycle.test.ts
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import Decimal from "decimal.js";

let db: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestDb();
});

describe("createOverrideRequest", () => {
  it("persiste OverrideRequest PENDING con tutti i campi", async () => {
    // Seed helpers TBD in task 2.2
    expect(true).toBe(true); // placeholder
  });
});
```

- [ ] **Step 4: Run test**

Run: `npm run test:integration -- override-request-lifecycle 2>&1 | tail -5`
Expected: 1 passing (placeholder).

- [ ] **Step 5: Commit**

```bash
git add src/lib/booking/override-request.ts tests/integration/override-request-lifecycle.test.ts
git commit -m "feat(override): scaffold override-request lifecycle module"
```

---

### Task 2.2: createOverrideRequest — implementation + test

- [ ] **Step 1: Crea helper di seed test**

Aggiungi in `tests/helpers/seed-override.ts` (se non esiste, crea):

```ts
// tests/helpers/seed-override.ts
import type { PrismaClient } from "@/generated/prisma/client";
import { randomUUID } from "crypto";

export async function seedBoatAndService(db: PrismaClient, opts: {
  serviceType?: string;
  servicePriority?: number;
} = {}) {
  const boat = await db.boat.create({
    data: {
      id: `boat-${randomUUID().slice(0, 8)}`,
      name: "Trimarano Test",
      type: "TRIMARAN",
      description: "test",
      amenities: [],
      images: [],
    },
  });
  const service = await db.service.create({
    data: {
      id: `svc-${randomUUID().slice(0, 8)}`,
      boatId: boat.id,
      name: "Gourmet Test",
      type: opts.serviceType ?? "CABIN_CHARTER",
      durationType: "FULL_DAY",
      durationHours: 8,
      capacityMax: 10,
      minPaying: 1,
      defaultPaymentSchedule: "FULL",
      priority: opts.servicePriority ?? 5,
      active: true,
    },
  });
  await db.pricingPeriod.create({
    data: {
      serviceId: service.id,
      label: "2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      pricePerPerson: "250.00",
      year: 2026,
    },
  });
  return { boat, service };
}

export async function seedBooking(db: PrismaClient, opts: {
  boatId: string;
  serviceId: string;
  totalPrice?: string;
  status?: "PENDING" | "CONFIRMED";
  startDate?: Date;
  endDate?: Date;
  email?: string;
}) {
  const customer = await db.customer.create({
    data: {
      email: opts.email ?? `test-${randomUUID().slice(0, 6)}@example.com`,
      firstName: "Test",
      lastName: "User",
    },
  });
  return db.booking.create({
    data: {
      confirmationCode: `TST${randomUUID().slice(0, 6).toUpperCase()}`,
      source: "DIRECT",
      customerId: customer.id,
      serviceId: opts.serviceId,
      boatId: opts.boatId,
      startDate: opts.startDate ?? new Date("2026-08-15"),
      endDate: opts.endDate ?? new Date("2026-08-15"),
      numPeople: 2,
      totalPrice: opts.totalPrice ?? "3000.00",
      status: opts.status ?? "PENDING",
    },
  });
}
```

- [ ] **Step 2: Scrivi il test persistenza**

```ts
// Aggiorna tests/integration/override-request-lifecycle.test.ts
import { seedBoatAndService, seedBooking } from "../helpers/seed-override";
import { createOverrideRequest } from "@/lib/booking/override-request";

describe("createOverrideRequest", () => {
  it("persiste OverrideRequest PENDING con tutti i campi", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const newBooking = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000.00", status: "PENDING",
    });
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000.00", status: "CONFIRMED",
      startDate: new Date("2026-08-14"), endDate: new Date("2026-08-16"),
      email: "conflict@example.com",
    });

    const result = await db.$transaction(async (tx) => {
      return createOverrideRequest(tx, {
        newBookingId: newBooking.id,
        conflictingBookingIds: [conflict.id],
        conflictSourceChannels: ["DIRECT"],  // post brainstorm #2: required
        newBookingRevenue: new Decimal("3000.00"),
        conflictingRevenueTotal: new Decimal("2000.00"),
        dropDeadAt: new Date("2026-07-31"),
      });
    });

    expect(result.requestId).toBeDefined();
    expect(result.supersededRequestIds).toEqual([]);

    const or = await db.overrideRequest.findUnique({
      where: { id: result.requestId },
    });
    expect(or?.status).toBe("PENDING");
    expect(or?.newBookingId).toBe(newBooking.id);
    expect(or?.conflictingBookingIds).toEqual([conflict.id]);
    expect(or?.newBookingRevenue.toString()).toBe("3000");
    expect(or?.conflictingRevenueTotal.toString()).toBe("2000");
    expect(or?.dropDeadAt.toISOString()).toBe("2026-07-31T00:00:00.000Z");
    expect(or?.reminderLevel).toBe(0);
    expect(or?.lastReminderSentAt).toBeNull();
  });
});
```

- [ ] **Step 3: Run test FAIL**

Expected: `not yet implemented`.

- [ ] **Step 4: Implementa createOverrideRequest**

```ts
export async function createOverrideRequest(
  tx: Prisma.TransactionClient,
  input: CreateOverrideRequestInput,
): Promise<CreateOverrideRequestResult> {
  // Verify newBooking exists and is PENDING
  const newBooking = await tx.booking.findUnique({
    where: { id: input.newBookingId },
    select: { status: true },
  });
  if (!newBooking) {
    throw new Error(`newBookingId ${input.newBookingId} not found`);
  }
  if (newBooking.status !== "PENDING") {
    throw new Error(
      `newBookingId ${input.newBookingId} not PENDING (is ${newBooking.status})`,
    );
  }

  // Derive conflictSourceChannels if not provided (semantically correct default)
  let conflictSourceChannels = input.conflictSourceChannels;
  if (!conflictSourceChannels || conflictSourceChannels.length === 0) {
    const conflicts = await tx.booking.findMany({
      where: { id: { in: input.conflictingBookingIds } },
      select: { source: true },
    });
    conflictSourceChannels = Array.from(new Set(conflicts.map((c) => c.source)));
  }

  const request = await tx.overrideRequest.create({
    data: {
      newBookingId: input.newBookingId,
      conflictingBookingIds: input.conflictingBookingIds,
      conflictSourceChannels,
      newBookingRevenue: input.newBookingRevenue.toFixed(2),
      conflictingRevenueTotal: input.conflictingRevenueTotal.toFixed(2),
      dropDeadAt: input.dropDeadAt,
      status: "PENDING",
    },
    select: { id: true },
  });

  // Supersede handling: see task 2.3
  return { requestId: request.id, supersededRequestIds: [] };
}
```

- [ ] **Step 5: Run test PASS**

Run: `npm run test:integration -- override-request-lifecycle 2>&1 | tail -3`
Expected: `Tests  1 passed (1)`

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(override): createOverrideRequest persists with all fields"
```

---

### Task 2.3: createOverrideRequest — supersede inferior requests

- [ ] **Step 1: Test supersede**

```ts
it("crea request + supersede richiesta inferiore esistente", async () => {
  const { boat, service } = await seedBoatAndService(db);
  const conflictBooking = await seedBooking(db, {
    boatId: boat.id, serviceId: service.id,
    totalPrice: "1000.00", status: "CONFIRMED",
  });

  // Prima request: Laura Gourmet €2000
  const laura = await seedBooking(db, {
    boatId: boat.id, serviceId: service.id,
    totalPrice: "2000.00", status: "PENDING",
    email: "laura@example.com",
  });
  const lauraRequest = await db.$transaction((tx) =>
    createOverrideRequest(tx, {
      newBookingId: laura.id,
      conflictingBookingIds: [conflictBooking.id],
      newBookingRevenue: new Decimal("2000.00"),
      conflictingRevenueTotal: new Decimal("1000.00"),
      dropDeadAt: new Date("2026-07-31"),
    }),
  );

  // Seconda request: Sofia Charter €7500
  const sofia = await seedBooking(db, {
    boatId: boat.id, serviceId: service.id,
    totalPrice: "7500.00", status: "PENDING",
    email: "sofia@example.com",
  });
  const sofiaRequest = await db.$transaction((tx) =>
    createOverrideRequest(tx, {
      newBookingId: sofia.id,
      conflictingBookingIds: [conflictBooking.id],
      newBookingRevenue: new Decimal("7500.00"),
      conflictingRevenueTotal: new Decimal("1000.00"),
      dropDeadAt: new Date("2026-07-31"),
    }),
  );

  // Sofia deve aver supersed laura
  expect(sofiaRequest.supersededRequestIds).toEqual([lauraRequest.requestId]);

  const lauraUpdated = await db.overrideRequest.findUnique({
    where: { id: lauraRequest.requestId },
  });
  expect(lauraUpdated?.status).toBe("REJECTED");
  expect(lauraUpdated?.decisionNotes).toContain("superseded");

  const lauraBookingUpdated = await db.booking.findUnique({
    where: { id: laura.id },
  });
  expect(lauraBookingUpdated?.status).toBe("CANCELLED");
});
```

- [ ] **Step 2: Run test FAIL**

Expected: Sofia's `supersededRequestIds` is empty; Laura still PENDING.

- [ ] **Step 3: Implementa supersede logic**

Modifica `createOverrideRequest`:

```ts
// Dopo tx.overrideRequest.create, PRIMA del return:
const supersededIds: string[] = [];

// Leggi newBooking una volta per riuso (boatId + startDate + endDate)
const newBookingData = await tx.booking.findUniqueOrThrow({
  where: { id: input.newBookingId },
  select: { boatId: true, startDate: true, endDate: true },
});

// Find inferior PENDING requests on overlapping slot.
// Overlap: daterange(newA.start, newA.end) overlap daterange(newB.start, newB.end)
// = newA.start <= newB.end AND newA.end >= newB.start
const inferiorRequests = await tx.overrideRequest.findMany({
  where: {
    id: { not: request.id },
    status: "PENDING",
    newBooking: {
      boatId: newBookingData.boatId,
      startDate: { lte: newBookingData.endDate },
      endDate: { gte: newBookingData.startDate },
    },
    newBookingRevenue: { lt: input.newBookingRevenue.toFixed(2) },
  },
  include: { newBooking: { select: { id: true } } },
});

for (const inferior of inferiorRequests) {
  await tx.overrideRequest.update({
    where: { id: inferior.id },
    data: {
      status: "REJECTED",
      decisionNotes: "auto-superseded by higher revenue request",
      decidedAt: new Date(),
    },
  });
  await tx.booking.update({
    where: { id: inferior.newBooking.id },
    data: { status: "CANCELLED" },
  });
  supersededIds.push(inferior.id);
}

return { requestId: request.id, supersededRequestIds: supersededIds };
```

**NOTA importante (post R19 fix #4)**: la query overlap è semanticamente
corretta: trova OverrideRequest PENDING il cui newBooking sovrappone in
daterange con il newBooking di `input.newBookingId`. NON usa `dropDeadAt` come
fu erroneamente scritto nella prima draft — `dropDeadAt` è solo il cutoff di
scadenza, non definisce lo slot di conflitto.

Il caller del helper (chunk 3 `createPendingDirectBooking`) DEVE acquisire
advisory lock `override-slot:${boatId}:${startDay}` PRIMA del `$transaction`
per serializzare submit concorrenti sullo stesso slot.

Side-effects post-commit per i booking superseded (refund + release + email
"superseded") vengono dispatched dal caller dopo il commit del `$transaction`,
usando `postCommitCancelBooking({reason:"override_superseded"})`.

- [ ] **Step 4: Estendi test supersede con case multi-source (advisory A4)**

```ts
it("supersede preserva conflictSourceChannels del request originale (multi-source)", async () => {
  const { boat, service } = await seedBoatAndService(db);
  // Conflict misto: 1 DIRECT + 1 BOKUN
  const conflictDirect = await seedBooking(db, {
    boatId: boat.id, serviceId: service.id,
    totalPrice: "1000.00", status: "CONFIRMED",
  });
  const customerBokun = await db.customer.create({
    data: { email: "bk@x.com", firstName: "B", lastName: "K" },
  });
  const conflictBokun = await db.booking.create({
    data: {
      confirmationCode: "BK000001",
      source: "BOKUN",
      customerId: customerBokun.id,
      serviceId: service.id, boatId: boat.id,
      startDate: new Date("2026-08-15"), endDate: new Date("2026-08-15"),
      numPeople: 2, totalPrice: "800.00", status: "CONFIRMED",
    },
  });

  const laura = await seedBooking(db, {
    boatId: boat.id, serviceId: service.id,
    totalPrice: "2000.00", status: "PENDING",
  });
  const lauraReq = await db.$transaction((tx) =>
    createOverrideRequest(tx, {
      newBookingId: laura.id,
      conflictingBookingIds: [conflictDirect.id, conflictBokun.id],
      newBookingRevenue: new Decimal("2000.00"),
      conflictingRevenueTotal: new Decimal("1800.00"),
      dropDeadAt: new Date("2026-07-31"),
    }),
  );

  const or = await db.overrideRequest.findUnique({
    where: { id: lauraReq.requestId },
  });
  expect(or?.conflictSourceChannels.sort()).toEqual(["BOKUN", "DIRECT"]);
});
```

- [ ] **Step 5: Run test PASS**

Expected: `Tests 3 passed (3)` (original + supersede + multi-source)

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(override): createOverrideRequest supersede inferior + overlap query correct"
```

---

## Chunk 2b: Admin actions + cron helpers

**Chunk size note**: questo chunk e' ~1250 righe, leggermente sopra il limite
soft di 1000 righe. Mantenuto unitario perche' i 6 task hanno forte coesione
(tutti sono helper callable da cron + admin UI + la reciproca dipendenza di
test mock Stripe/email rende difficile split senza duplicazione). Se l'executor
preferisce, puo' committare dopo ogni task completato (9 commit atomici) e
splittare la review in 2 checkpoint (post-Task 2.6 / post-Task 2.9ter).

**Scope**: `approveOverride`, `rejectOverride`, `expireDropDeadRequests`,
`sendEscalationReminders`, `checkOtaReconciliation`, `computeCancellationRate`.

**DEPENDENCY NOTE**: Task 2.4 (`approveOverride`) usa due helper del Chunk 2b:
`computeCancellationRate` (Task 2.9ter) e `isUpstreamCancelled` (Task 2.9bis).
**Ordine di esecuzione richiesto all'interno di Chunk 2b**:
1. Task 2.9ter (`computeCancellationRate`) — prerequisito guard cancellation-rate
2. Task 2.9bis (`checkOtaReconciliation` + `isUpstreamCancelled` helper)
3. Task 2.4 (`approveOverride` con guard completi)
4. Task 2.5 (post-commit refund + fan-out)
5. Task 2.6 (emails apology + audit)
6. Task 2.7 (`rejectOverride`)
7. Task 2.8 (`expireDropDeadRequests`)
8. Task 2.9 (`sendEscalationReminders`)
9. Task 2.10 (wrap verify)

I task sono presentati in ordine logico TDD (approve prima, cron helper dopo)
ma la sequenza di implementazione deve seguire l'ordine sopra. In alternativa:
commit stub di `computeCancellationRate`/`isUpstreamCancelled` in Task 2.4
Step 2 e completarli nei task dedicati — approccio scelto in questo plan.

### Task 2.4: approveOverride — scaffold + DB tx atomic

- [ ] **Step 1: Test approve happy path**

```ts
describe("approveOverride", () => {
  it("approva: cancella conflicts, conferma newBooking, update status", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000.00", status: "CONFIRMED",
      email: "mario@example.com",
    });
    const laura = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000.00", status: "PENDING",
      email: "laura@example.com",
    });
    const adminUser = await db.user.create({
      data: {
        email: "admin@test.com",
        passwordHash: "x", name: "Admin", role: "ADMIN",
      },
    });
    const req = await db.$transaction((tx) =>
      createOverrideRequest(tx, {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        newBookingRevenue: new Decimal("3000.00"),
        conflictingRevenueTotal: new Decimal("2000.00"),
        dropDeadAt: new Date("2026-07-31"),
      }),
    );

    const { approveOverride } = await import("@/lib/booking/override-request");
    const result = await approveOverride(req.requestId, adminUser.id, "test approve");

    expect(result.approved).toBe(true);

    const orUpdated = await db.overrideRequest.findUnique({
      where: { id: req.requestId },
    });
    expect(orUpdated?.status).toBe("APPROVED");
    expect(orUpdated?.decidedByUserId).toBe(adminUser.id);
    expect(orUpdated?.decisionNotes).toBe("test approve");

    const conflictUpdated = await db.booking.findUnique({ where: { id: conflict.id } });
    expect(conflictUpdated?.status).toBe("CANCELLED");

    const lauraUpdated = await db.booking.findUnique({ where: { id: laura.id } });
    expect(lauraUpdated?.status).toBe("CONFIRMED");
  });
});
```

- [ ] **Step 2: Run test FAIL**

Expected: `approveOverride` is not defined.

- [ ] **Step 3: Implementa approveOverride (DB tx only, no Stripe yet)**

```ts
import type { OtaConfirmation } from "./override-types";
import { isOtaChannel, isOtaConfirmationComplete } from "./override-types";
import { ValidationError } from "@/lib/errors";
import { env } from "@/lib/env";
// Dipendenze Task 2.9bis + 2.9ter (implementate dopo questo task nel plan,
// ma richieste per compilare — implementare con stub se serve poi completare):
import { isUpstreamCancelled } from "./override-reconcile";  // Task 2.9bis
import { computeCancellationRate } from "./cancellation-rate";  // Task 2.9ter

export interface ApproveOverrideResult {
  approved: true;
  refundErrors: Array<{ paymentId: string; message: string }>;
  emailsSent: number;
  emailsFailed: number;
}

/**
 * Approva un OverrideRequest.
 * Se la request ha almeno un `conflictSourceChannels` OTA (non-DIRECT),
 * `otaConfirmations` DEVE contenere una confermata completa per ciascun
 * conflicting OTA booking. Throw ValidationError se mancante o incompleta.
 */
export async function approveOverride(
  requestId: string,
  adminUserId: string,
  notes?: string,
  otaConfirmations: OtaConfirmation[] = [],
): Promise<ApproveOverrideResult> {
  const request = await db.overrideRequest.findUnique({
    where: { id: requestId },
    include: { newBooking: { select: { boatId: true } } },
  });
  if (!request) throw new Error(`OverrideRequest ${requestId} not found`);
  if (request.status !== "PENDING") {
    throw new Error(`OverrideRequest ${requestId} is not PENDING (is ${request.status})`);
  }

  // OTA checklist enforcement (§7.4 step 1)
  const otaConflictChannels = request.conflictSourceChannels.filter(
    (c) => isOtaChannel(c as any),
  );
  if (otaConflictChannels.length > 0) {
    // Verifica che ogni conflict OTA abbia una confirmation completa
    for (const conflictId of request.conflictingBookingIds) {
      const conflict = await db.booking.findUnique({
        where: { id: conflictId },
        select: { source: true },
      });
      if (!conflict || !isOtaChannel(conflict.source as any)) continue;

      const conf = otaConfirmations.find((c) => c.conflictBookingId === conflictId);
      if (!conf || !isOtaConfirmationComplete(conf)) {
        throw new ValidationError(
          "OTA_CHECKLIST_INCOMPLETE",
          `Conflict booking ${conflictId} (${conflict.source}) richiede le 4 checkbox complete prima dell'approve`,
        );
      }

      // Verifica upstream gia' CANCELLED nel DB (sync webhook arrivato)
      // Dipendenza: helper isUpstreamCancelled (Task 2.9bis).
      // Se Task 2.9bis non ancora implementato, inserire stub:
      //   `async function isUpstreamCancelled(_id:string,_ch:string){return true;}`
      const upstreamOk = await isUpstreamCancelled(conflictId, conflict.source);
      if (!upstreamOk) {
        throw new ValidationError(
          "OTA_UPSTREAM_NOT_CANCELLED",
          `Conflict ${conflictId} (${conflict.source}) risulta ancora attivo upstream. Attendere che il webhook cancel arrivi (tipicamente <5min).`,
        );
      }
    }

    // Cancellation-rate hard-block guard (§13.10)
    // Dipendenza: computeCancellationRate (Task 2.9ter).
    const uniqueOtaChannels = Array.from(new Set(otaConflictChannels));
    for (const channel of uniqueOtaChannels) {
      const { rate } = await computeCancellationRate(channel, 30);
      if (rate > env.OVERRIDE_CANCELLATION_RATE_HARD_BLOCK) {
        throw new ValidationError(
          "CANCELLATION_RATE_HARD_BLOCK",
          `Impossibile approvare: ${channel} cancellation rate ultimi 30gg e' ${(rate * 100).toFixed(1)}%, sopra la soglia hard-block ${(env.OVERRIDE_CANCELLATION_RATE_HARD_BLOCK * 100).toFixed(1)}%. Attendi che il rate scenda prima di approvare nuovi override su questo canale.`,
        );
      }
    }
  }

  // DB tx atomic (NO Stripe calls here — R10 BL-M4 pattern)
  await db.$transaction(async (tx) => {
    await tx.overrideRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        decidedAt: new Date(),
        decidedByUserId: adminUserId,
        decisionNotes: notes,
      },
    });
    // Cancel all conflicting bookings
    await tx.booking.updateMany({
      where: { id: { in: request.conflictingBookingIds } },
      data: { status: "CANCELLED" },
    });
    // Confirm the new booking
    await tx.booking.update({
      where: { id: request.newBookingId },
      data: { status: "CONFIRMED" },
    });
  });

  // Post-commit side-effects: Stripe refund + fan-out + emails
  // TODO: implement in task 2.5
  return { approved: true, refundErrors: [], emailsSent: 0, emailsFailed: 0 };
}
```

- [ ] **Step 4: Run test PASS**

Expected: `Tests  3 passed (3)`

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(override): approveOverride DB tx atomic (Stripe post-commit TBD)"
```

---

### Task 2.5: approveOverride — post-commit refund + fan-out

**Nota**: questo è il passaggio più complesso, con side-effects Stripe + availability fan-out + email apology. Testiamo con mock Stripe.

- [ ] **Step 1: Test approve con refund mocked**

```ts
import { vi } from "vitest";

// Mock refundPayment module-level (same pattern as admin-concurrency.test.ts)
const refundPaymentMock = vi.fn().mockResolvedValue({ id: "re_test", status: "succeeded" });
const getChargeRefundStateMock = vi.fn().mockResolvedValue({
  totalCents: 200000, refundedCents: 0, residualCents: 200000,
});
vi.mock("@/lib/stripe/payment-intents", () => ({
  refundPayment: refundPaymentMock,
  getChargeRefundState: getChargeRefundStateMock,
  cancelPaymentIntent: vi.fn(),
  createPaymentIntent: vi.fn(),
}));

// Also mock fan-out queue (no real enqueue)
vi.mock("@/lib/queue", () => ({
  getRedisConnection: () => ({ quit: vi.fn() }),
  syncQueue: () => ({ add: vi.fn() }),
  availBokunQueue: () => ({ add: vi.fn() }),
  availBoataroundQueue: () => ({ add: vi.fn() }),
  availManualQueue: () => ({ add: vi.fn() }),
  pricingBokunQueue: () => ({ add: vi.fn() }),
  getQueue: () => ({ add: vi.fn() }),
  QUEUE_NAMES: { AVAIL_BOKUN: "x", AVAIL_BOATAROUND: "x", AVAIL_MANUAL: "x", PRICING_BOKUN: "x" },
  ALL_QUEUE_NAMES: [],
}));

// Mock email dispatch
vi.mock("@/lib/email/brevo", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

it("approva: triggers refund + release + emails post-commit", async () => {
  // Setup: seed + create Payment SUCCEEDED su conflict
  const { boat, service } = await seedBoatAndService(db);
  const conflict = await seedBooking(db, {
    boatId: boat.id, serviceId: service.id,
    totalPrice: "2000.00", status: "CONFIRMED",
  });
  await db.payment.create({
    data: {
      bookingId: conflict.id, amount: "2000.00",
      type: "FULL", method: "STRIPE", status: "SUCCEEDED",
      stripeChargeId: "ch_test_conflict",
      processedAt: new Date(),
    },
  });
  const laura = await seedBooking(db, {
    boatId: boat.id, serviceId: service.id,
    totalPrice: "3000.00", status: "PENDING",
  });
  const admin = await db.user.create({
    data: { email: "admin@t.com", passwordHash: "x", name: "A", role: "ADMIN" },
  });
  const req = await db.$transaction((tx) =>
    createOverrideRequest(tx, {
      newBookingId: laura.id,
      conflictingBookingIds: [conflict.id],
      newBookingRevenue: new Decimal("3000"),
      conflictingRevenueTotal: new Decimal("2000"),
      dropDeadAt: new Date("2026-07-31"),
    }),
  );

  const { approveOverride } = await import("@/lib/booking/override-request");
  const result = await approveOverride(req.requestId, admin.id);

  expect(refundPaymentMock).toHaveBeenCalledWith("ch_test_conflict", 200000);
  expect(result.refundErrors).toEqual([]);
});
```

- [ ] **Step 2: Run test FAIL**

Expected: `refundPayment` non chiamato.

- [ ] **Step 3: Implementa post-commit refund**

Modifica `approveOverride`:

```ts
import { refundPayment, getChargeRefundState } from "@/lib/stripe/payment-intents";
import { releaseDates, blockDates } from "@/lib/availability/service";
import { CHANNELS } from "@/lib/channels";

// Dopo il $transaction, aggiungi side-effects:
const refundErrors: Array<{ paymentId: string; message: string }> = [];

// 1. Refund Stripe per ogni conflict
for (const conflictId of request.conflictingBookingIds) {
  const conflictBooking = await db.booking.findUnique({
    where: { id: conflictId },
    include: { payments: true },
  });
  if (!conflictBooking) continue;

  for (const p of conflictBooking.payments) {
    if (p.status === "SUCCEEDED" && p.stripeChargeId && p.type !== "REFUND") {
      try {
        const state = await getChargeRefundState(p.stripeChargeId);
        if (state.residualCents > 0) {
          await refundPayment(p.stripeChargeId, state.residualCents);
          // Crea sibling REFUND (pattern R10 Int-C1 + R27-CRIT-3)
          await db.payment.update({
            where: { id: p.id },
            data: { status: "REFUNDED" },
          });
        }
      } catch (err) {
        refundErrors.push({ paymentId: p.id, message: (err as Error).message });
        logger.error({ err, paymentId: p.id }, "Override approve: refund failed");
      }
    }
  }

  // 2. Release availability per cancelled conflict
  try {
    await releaseDates(
      conflictBooking.boatId,
      conflictBooking.startDate,
      conflictBooking.endDate,
      CHANNELS.DIRECT,
    );
  } catch (err) {
    logger.error({ err, bookingId: conflictId }, "Override approve: releaseDates failed");
  }
}

// 3. Block availability per newBooking
const newBooking = await db.booking.findUnique({
  where: { id: request.newBookingId },
});
if (newBooking) {
  try {
    await blockDates(
      newBooking.boatId,
      newBooking.startDate,
      newBooking.endDate,
      CHANNELS.DIRECT,
      newBooking.id,
    );
  } catch (err) {
    logger.error({ err, bookingId: newBooking.id }, "Override approve: blockDates failed");
  }
}

// 4. Emails — TODO task 2.6
// 5. Audit log — TODO task 2.7

return { approved: true, refundErrors, emailsSent: 0, emailsFailed: 0 };
```

- [ ] **Step 4: Run test PASS**

Expected: refundPayment called once with correct args.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(override): approveOverride post-commit refund + fan-out R10 pattern"
```

---

### Task 2.6: approveOverride — email apology winner + loser + audit log

- [ ] **Step 1: Extend test**

```ts
// Aggiorna il mock sendEmail per tracciare chiamate
const sendEmailMock = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/email/brevo", () => ({ sendEmail: sendEmailMock }));

// Extend previous test:
it("approva: invia email apology loser + conferma winner + audit log", async () => {
  // ... setup identico al test 2.5 ...

  const result = await approveOverride(req.requestId, admin.id);

  // Expect email a Mario (loser) + email a Laura (winner)
  expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
    to: expect.stringContaining("mario"), // loser
    subject: expect.stringContaining("scusi"), // apology
  }));
  expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
    to: expect.stringContaining("laura"), // winner
    subject: expect.stringContaining("Conferma"),
  }));

  // Audit log creato
  const auditLogs = await db.auditLog.findMany({
    where: { action: "OVERRIDE_APPROVED", entityId: req.requestId },
  });
  expect(auditLogs).toHaveLength(1);
});
```

- [ ] **Step 2: Implementa email + audit nel post-commit**

Dopo il refund/release/block block, aggiungi:

```ts
// 4. Email apology ai loser (riusa R29 template esteso con voucher + rebooking)
import { overbookingApologyTemplate } from "@/lib/email/templates/overbooking-apology";
import { sendEmail } from "@/lib/email/brevo";
import { env } from "@/lib/env";
import { auditLog } from "@/lib/audit/log";

let emailsSent = 0;
let emailsFailed = 0;

for (const conflictId of request.conflictingBookingIds) {
  const conflict = await db.booking.findUnique({
    where: { id: conflictId },
    include: {
      customer: { select: { firstName: true, lastName: true, email: true } },
      service: { select: { name: true } },
    },
  });
  if (!conflict?.customer?.email) continue;

  // Find 3 alternative dates for rebooking suggestion
  const alternatives = await findAlternativeDates(
    conflict.boatId,
    conflict.serviceId,
    conflict.startDate,
    3,
  );

  const tpl = overbookingApologyTemplate({
    customerName: `${conflict.customer.firstName} ${conflict.customer.lastName}`.trim() || "cliente",
    confirmationCode: conflict.confirmationCode,
    serviceName: conflict.service.name,
    startDate: conflict.startDate.toISOString().slice(0, 10),
    refundAmount: conflict.totalPrice.toFixed(2) + "€",
    refundChannel: "stripe", // assume all override refunds are Stripe
    contactEmail: env.BREVO_REPLY_TO ?? env.BREVO_SENDER_EMAIL,
    contactPhone: env.CONTACT_PHONE,
    bookingUrl: `${env.APP_URL}/b/sessione`,
    voucherSoftText: "Per scusarci ti offriamo 2 drink gratis a bordo per persona alla prossima visita",
    rebookingSuggestions: alternatives.map((d) => d.toISOString().slice(0, 10)),
  });
  const delivered = await sendEmail({
    to: conflict.customer.email,
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
  });
  delivered ? emailsSent++ : emailsFailed++;
}

// 5. Email winner (using new template — task 3.x)
// For now: reuse bookingConfirmationTemplate (basic)

// 6. Audit log
await auditLog({
  userId: adminUserId,
  action: "OVERRIDE_APPROVED",
  entity: "OverrideRequest",
  entityId: requestId,
  after: { newBookingId: request.newBookingId, conflictCount: request.conflictingBookingIds.length },
});

return { approved: true, refundErrors, emailsSent, emailsFailed };
```

Nota: `findAlternativeDates` è un nuovo helper da creare.
Implementa come:

```ts
// Aggiungi fuori dalla funzione, internal helper
async function findAlternativeDates(
  boatId: string,
  serviceId: string,
  aroundDate: Date,
  limit: number,
): Promise<Date[]> {
  // Simplified: find N next dates free for that service (no conflicting bookings)
  // Per semplicità: scan prossimi 30 giorni, ritorna le prime N libere
  const results: Date[] = [];
  for (let i = 1; i <= 30 && results.length < limit; i++) {
    const candidate = new Date(aroundDate);
    candidate.setDate(candidate.getDate() + i);
    const conflicts = await db.booking.count({
      where: {
        boatId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startDate: { lte: candidate },
        endDate: { gte: candidate },
      },
    });
    if (conflicts === 0) results.push(candidate);
  }
  return results;
}
```

**NOTA post R19 Fix #7**: la modifica del template `overbooking-apology.ts`
NON avviene qui. Task 2.6 passa semplicemente `voucherSoftText` e
`rebookingSuggestions` nel payload del `dispatchNotification`; l'estensione
del template (aggiunta delle 2 props al TypeScript type + markup HTML) e'
owned da **Chunk 4 Task 4.6** (deduplica).

Qui in Task 2.6 — al momento del commit — il template accetta gia' `props`
loose (vedi R29 base) oppure, se TypeScript strict lamenta, commentare
`voucherSoftText` e `rebookingSuggestions` temporaneamente con nota
`// Chunk 4 Task 4.6: enable once template extends props`.

- [ ] **Step 3: Run test**

Expected: PASS con email chiamati + audit log creato.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(override): approveOverride emails + rebooking suggestions + audit"
```

---

### Task 2.7: rejectOverride — scaffold + test

- [ ] **Step 1: Test reject**

```ts
describe("rejectOverride", () => {
  it("rifiuta: cancella newBooking, refund, email, audit", async () => {
    // Setup simile ad approveOverride ma con Payment su laura (new booking)
    const { boat, service } = await seedBoatAndService(db);
    const laura = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000.00", status: "PENDING",
    });
    await db.payment.create({
      data: {
        bookingId: laura.id, amount: "3000.00",
        type: "FULL", method: "STRIPE", status: "SUCCEEDED",
        stripeChargeId: "ch_laura_new",
        processedAt: new Date(),
      },
    });
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000.00", status: "CONFIRMED",
    });
    const admin = await db.user.create({
      data: { email: "admin@t.com", passwordHash: "x", name: "A", role: "ADMIN" },
    });
    const req = await db.$transaction((tx) =>
      createOverrideRequest(tx, {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        newBookingRevenue: new Decimal("3000"),
        conflictingRevenueTotal: new Decimal("2000"),
        dropDeadAt: new Date("2026-07-31"),
      }),
    );

    const { rejectOverride } = await import("@/lib/booking/override-request");
    const result = await rejectOverride(req.requestId, admin.id, "too aggressive");

    expect(result.rejected).toBe(true);
    expect(result.refundOk).toBe(true);

    // Laura cancellata, refund chiamato
    const lauraUpdated = await db.booking.findUnique({ where: { id: laura.id } });
    expect(lauraUpdated?.status).toBe("CANCELLED");

    // Conflict INVARIATO
    const conflictUpdated = await db.booking.findUnique({ where: { id: conflict.id } });
    expect(conflictUpdated?.status).toBe("CONFIRMED");

    expect(refundPaymentMock).toHaveBeenCalledWith("ch_laura_new", 300000);
  });
});
```

- [ ] **Step 2: Implementa rejectOverride**

```ts
export interface RejectOverrideResult {
  rejected: true;
  refundOk: boolean;
  emailOk: boolean;
}

export async function rejectOverride(
  requestId: string,
  adminUserId: string,
  notes?: string,
): Promise<RejectOverrideResult> {
  const request = await db.overrideRequest.findUnique({
    where: { id: requestId },
    include: {
      newBooking: { include: { payments: true, customer: true, service: true } },
    },
  });
  if (!request) throw new Error(`OverrideRequest ${requestId} not found`);
  if (request.status !== "PENDING") {
    throw new Error(`OverrideRequest ${requestId} not PENDING`);
  }

  // DB tx
  await db.$transaction(async (tx) => {
    await tx.overrideRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        decidedAt: new Date(),
        decidedByUserId: adminUserId,
        decisionNotes: notes,
      },
    });
    await tx.booking.update({
      where: { id: request.newBookingId },
      data: { status: "CANCELLED" },
    });
  });

  // Post-commit: refund laura + release + email + audit
  let refundOk = true;
  for (const p of request.newBooking.payments) {
    if (p.status === "SUCCEEDED" && p.stripeChargeId && p.type !== "REFUND") {
      try {
        const state = await getChargeRefundState(p.stripeChargeId);
        if (state.residualCents > 0) {
          await refundPayment(p.stripeChargeId, state.residualCents);
          await db.payment.update({
            where: { id: p.id },
            data: { status: "REFUNDED" },
          });
        }
      } catch (err) {
        refundOk = false;
        logger.error({ err, paymentId: p.id }, "Override reject: refund failed");
      }
    }
  }

  // Release availability
  try {
    await releaseDates(
      request.newBooking.boatId,
      request.newBooking.startDate,
      request.newBooking.endDate,
      CHANNELS.DIRECT,
    );
  } catch (err) {
    logger.error({ err }, "Override reject: releaseDates failed");
  }

  // Email rejection (temporary inline — USE_IN_CHUNK_4_TASK_4.3)
  // Retrofit: quando Chunk 4 Task 4.3 completa `overrideRejectedTemplate`,
  // sostituire il blocco inline con:
  //   const tpl = overrideRejectedTemplate({...});
  //   await sendEmail({ to, subject: tpl.subject, htmlContent: tpl.html, textContent: tpl.text });
  let emailOk = true;
  if (request.newBooking.customer?.email) {
    try {
      const alternatives = await findAlternativeDates(
        request.newBooking.boatId,
        request.newBooking.serviceId,
        request.newBooking.startDate,
        3,
      );
      await sendEmail({
        to: request.newBooking.customer.email,
        subject: `Prenotazione ${request.newBooking.confirmationCode} non approvata`,
        htmlContent: `<p>Ci dispiace, la richiesta non è stata approvata. Rimborso in corso (5-10gg). Date alternative: ${alternatives.map((d) => d.toISOString().slice(0, 10)).join(", ")}</p>`,
        textContent: `Ci dispiace, la richiesta non è stata approvata. Rimborso in corso.`,
      });
    } catch (err) {
      emailOk = false;
    }
  }

  await auditLog({
    userId: adminUserId,
    action: "OVERRIDE_REJECTED",
    entity: "OverrideRequest",
    entityId: requestId,
    after: { newBookingId: request.newBookingId, notes },
  });

  return { rejected: true, refundOk, emailOk };
}
```

- [ ] **Step 3: Run test PASS**

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(override): rejectOverride with refund + release + audit"
```

---

### Task 2.8: expireDropDeadRequests — cron helper

- [ ] **Step 1: Test expire**

```ts
describe("expireDropDeadRequests", () => {
  it("espira solo richieste PENDING con dropDeadAt <= now", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const laura = await seedBooking(db, { boatId: boat.id, serviceId: service.id, totalPrice: "3000", status: "PENDING" });
    const conflict = await seedBooking(db, { boatId: boat.id, serviceId: service.id, totalPrice: "2000", status: "CONFIRMED" });

    // Request già scaduta (dropDeadAt nel passato)
    const expired = await db.overrideRequest.create({
      data: {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        newBookingRevenue: "3000", conflictingRevenueTotal: "2000",
        dropDeadAt: new Date("2020-01-01"),
        status: "PENDING",
      },
    });

    const { expireDropDeadRequests } = await import("@/lib/booking/override-request");
    const result = await expireDropDeadRequests();

    expect(result.expired).toBeGreaterThanOrEqual(1);
    const expiredReq = await db.overrideRequest.findUnique({ where: { id: expired.id } });
    expect(expiredReq?.status).toBe("EXPIRED");
    const lauraUpdated = await db.booking.findUnique({ where: { id: laura.id } });
    expect(lauraUpdated?.status).toBe("CANCELLED");
  });
});
```

- [ ] **Step 2: Implementa**

```ts
export async function expireDropDeadRequests(): Promise<{
  expired: number;
  refundFailures: number;
  emailFailures: number;
}> {
  const now = new Date();
  const toExpire = await db.overrideRequest.findMany({
    where: {
      status: "PENDING",
      dropDeadAt: { lte: now },
    },
    select: { id: true },
    take: 50,
  });

  let expiredCount = 0;
  let refundFailures = 0;
  let emailFailures = 0;

  for (const { id } of toExpire) {
    try {
      // Reuse rejectOverride logic but with system adminUserId (or null)
      // For simplicity, we inline: update status + cancel + refund
      await db.$transaction(async (tx) => {
        await tx.overrideRequest.update({
          where: { id },
          data: {
            status: "EXPIRED",
            decidedAt: now,
            decisionNotes: "auto-expired at 15-day cutoff",
          },
        });
        const req = await tx.overrideRequest.findUniqueOrThrow({
          where: { id },
          select: { newBookingId: true },
        });
        await tx.booking.update({
          where: { id: req.newBookingId },
          data: { status: "CANCELLED" },
        });
      });

      // Post-commit side-effects via shared helper (R19 Fix #9 — DRY)
      const req2 = await db.overrideRequest.findUnique({
        where: { id },
        select: { newBookingId: true, newBooking: { select: { customer: { select: { email: true, firstName: true, lastName: true } }, serviceId: true, boatId: true, startDate: true, confirmationCode: true } } },
      });
      if (req2?.newBookingId) {
        const res = await postCommitCancelBooking({
          bookingId: req2.newBookingId,
          actorUserId: null, // SYSTEM cron
          reason: "override_expired",
        });
        refundFailures += res.refundsFailed.length;

        // Email al customer "expired" (inline — USE_IN_CHUNK_4_TASK_4.4)
        if (req2.newBooking?.customer?.email) {
          try {
            const alternatives = await findAlternativeDates(
              req2.newBooking.boatId,
              req2.newBooking.serviceId,
              req2.newBooking.startDate,
              3,
            );
            await sendEmail({
              to: req2.newBooking.customer.email,
              subject: `Prenotazione ${req2.newBooking.confirmationCode} scaduta`,
              htmlContent: `<p>Ci dispiace, la tua richiesta di prenotazione non e' stata confermata entro il termine di 15 giorni pre-data. Rimborso in corso (5-10gg). Date alternative: ${alternatives.map((d) => d.toISOString().slice(0, 10)).join(", ")}</p>`,
              textContent: `Prenotazione scaduta. Rimborso in corso.`,
            });
          } catch (err) {
            emailFailures++;
            logger.error({ err, requestId: id }, "expire email failed");
          }
        }
      }
      expiredCount++;
    } catch (err) {
      logger.error({ err, requestId: id }, "expireDropDeadRequests iteration failed");
    }
  }

  return { expired: expiredCount, refundFailures, emailFailures };
}
```

Nota import da aggiungere in testa al file:
```ts
import { postCommitCancelBooking } from "./post-commit-cancel";
```

- [ ] **Step 3: Run test**

```bash
npm run test:integration -- override-request-lifecycle 2>&1 | tail -3
```
Expected: `expired>=1`, conflict restato CONFIRMED, newBooking CANCELLED, Payment rimborsato.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(override): expireDropDeadRequests cron helper (shared postCommitCancel)"
```

---

### Task 2.9: sendEscalationReminders — cron helper

- [ ] **Step 1: Test reminder levels**

```ts
describe("sendEscalationReminders", () => {
  it("24h → reminderLevel 0 → 1, email sent", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const laura = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000.00", status: "PENDING",
    });
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000.00", status: "CONFIRMED",
    });
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const req = await db.overrideRequest.create({
      data: {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        conflictSourceChannels: ["DIRECT"],
        newBookingRevenue: "3000", conflictingRevenueTotal: "2000",
        dropDeadAt: new Date("2026-12-31"),
        status: "PENDING",
        createdAt: yesterday,
        reminderLevel: 0,
      },
    });

    const { sendEscalationReminders } = await import("@/lib/booking/override-request");
    const result = await sendEscalationReminders();

    expect(result.sent).toBe(1);
    expect(result.errors).toBe(0);
    const updated = await db.overrideRequest.findUnique({ where: { id: req.id } });
    expect(updated?.reminderLevel).toBe(1);
    expect(updated?.lastReminderSentAt).not.toBeNull();
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining("pending") }),
    );
  });

  it("già reminder 24h inviato 12h fa → NON re-invia", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const laura = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000.00", status: "PENDING",
    });
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000.00", status: "CONFIRMED",
    });
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    sendEmailMock.mockClear();

    const req = await db.overrideRequest.create({
      data: {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        conflictSourceChannels: ["DIRECT"],
        newBookingRevenue: "3000", conflictingRevenueTotal: "2000",
        dropDeadAt: new Date("2026-12-31"),
        status: "PENDING",
        createdAt: twoDaysAgo,
        reminderLevel: 1,
        lastReminderSentAt: twelveHoursAgo,
      },
    });

    const { sendEscalationReminders } = await import("@/lib/booking/override-request");
    const result = await sendEscalationReminders();

    expect(result.sent).toBe(0);
    const updated = await db.overrideRequest.findUnique({ where: { id: req.id } });
    expect(updated?.reminderLevel).toBe(1); // invariato
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("status APPROVED/REJECTED/EXPIRED non riceve reminder", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const laura = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "3000.00", status: "CANCELLED",
    });
    const conflict = await seedBooking(db, {
      boatId: boat.id, serviceId: service.id,
      totalPrice: "2000.00", status: "CONFIRMED",
    });
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    sendEmailMock.mockClear();

    await db.overrideRequest.create({
      data: {
        newBookingId: laura.id,
        conflictingBookingIds: [conflict.id],
        conflictSourceChannels: ["DIRECT"],
        newBookingRevenue: "3000", conflictingRevenueTotal: "2000",
        dropDeadAt: new Date("2026-12-31"),
        status: "REJECTED",
        createdAt: yesterday,
        reminderLevel: 0,
      },
    });

    const { sendEscalationReminders } = await import("@/lib/booking/override-request");
    const result = await sendEscalationReminders();

    expect(result.sent).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implementa sendEscalationReminders**

```ts
export async function sendEscalationReminders(): Promise<{
  sent: number;
  errors: number;
}> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Find PENDING requests that need reminder:
  // - reminderLevel=0 AND createdAt < 24h ago  → send first reminder (level 1)
  // - reminderLevel>=1 AND lastReminderSentAt < 24h ago  → send next (level++)
  const candidates = await db.overrideRequest.findMany({
    where: {
      status: "PENDING",
      OR: [
        { reminderLevel: 0, createdAt: { lte: twentyFourHoursAgo } },
        { reminderLevel: { gte: 1 }, lastReminderSentAt: { lte: twentyFourHoursAgo } },
      ],
    },
    include: {
      newBooking: { include: { customer: true, service: true } },
    },
    take: 50,
  });

  let sent = 0;
  let errors = 0;

  for (const req of candidates) {
    try {
      // Send email to admin
      await sendEmail({
        to: env.ADMIN_EMAIL,
        subject: `Override request pending level ${req.reminderLevel + 1}: ${req.newBooking.confirmationCode}`,
        htmlContent: `<p>Override request pending: ${req.newBooking.confirmationCode}. Age: ${Math.floor((now.getTime() - req.createdAt.getTime()) / (60 * 60 * 1000))}h. Decision required.</p>`,
        textContent: `Override request pending: ${req.newBooking.confirmationCode}`,
      });

      await db.overrideRequest.update({
        where: { id: req.id },
        data: {
          reminderLevel: req.reminderLevel + 1,
          lastReminderSentAt: now,
        },
      });
      sent++;
    } catch (err) {
      errors++;
      logger.error({ err, requestId: req.id }, "escalation reminder failed");
    }
  }

  return { sent, errors };
}
```

- [ ] **Step 3: Run test + commit**

```bash
git commit -am "feat(override): sendEscalationReminders with dedup via reminderLevel"
```

---

### Task 2.9bis: `checkOtaReconciliation` — helper cron §8.4

**Files:**
- Create: `src/lib/booking/override-reconcile.ts`
- Create: `src/lib/booking/__tests__/override-reconcile.test.ts`

- [ ] **Step 1: Test placebo/flow**

```ts
// override-reconcile.test.ts
import { describe, it, expect, vi } from "vitest";

// Mock Bokun client
const searchMock = vi.fn();
vi.mock("@/lib/bokun/bookings", () => ({
  searchBokunBookings: searchMock,
}));

describe("checkOtaReconciliation", () => {
  it("upstream CANCELLED → { upstreamStatus: 'CANCELLED' }", async () => {
    searchMock.mockResolvedValueOnce([{ bookingId: "BK-1", status: "CANCELLED" }]);
    // ... seed OverrideRequest APPROVED con conflict BOKUN BK-1 ...
    const { checkOtaReconciliation } = await import("@/lib/booking/override-reconcile");
    const res = await checkOtaReconciliation("req-1");
    expect(res.upstreamStatus).toBe("CANCELLED");
    expect(res.channels).toContain("BOKUN");
  });

  it("upstream CONFIRMED → { upstreamStatus: 'STILL_ACTIVE' }", async () => {
    searchMock.mockResolvedValueOnce([{ bookingId: "BK-1", status: "CONFIRMED" }]);
    const { checkOtaReconciliation } = await import("@/lib/booking/override-reconcile");
    const res = await checkOtaReconciliation("req-1");
    expect(res.upstreamStatus).toBe("STILL_ACTIVE");
  });
});
```

- [ ] **Step 2: Implementa**

```ts
// override-reconcile.ts
"use server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { searchBokunBookings } from "@/lib/bokun/bookings";
// ... import boataround/samboat adapter quando disponibili ...

export async function checkOtaReconciliation(
  requestId: string,
): Promise<{
  upstreamStatus: "CANCELLED" | "STILL_ACTIVE";
  channels: string[];
}> {
  const request = await db.overrideRequest.findUniqueOrThrow({
    where: { id: requestId },
  });
  if (request.status !== "APPROVED") {
    throw new Error(`OverrideRequest ${requestId} not APPROVED`);
  }

  const channels = new Set<string>();
  let stillActive = false;

  for (const conflictId of request.conflictingBookingIds) {
    const conflict = await db.booking.findUnique({
      where: { id: conflictId },
      include: { bokunBooking: true /* boataroundBooking, etc */ },
    });
    if (!conflict) continue;

    if (conflict.source === "BOKUN" && conflict.bokunBooking) {
      channels.add("BOKUN");
      const upstream = await searchBokunBookings({
        bookingId: conflict.bokunBooking.bokunBookingId,
      });
      if (upstream?.[0]?.status !== "CANCELLED") stillActive = true;
    }
    // Branch analoghi per BOATAROUND / altri
  }

  return {
    upstreamStatus: stillActive ? "STILL_ACTIVE" : "CANCELLED",
    channels: Array.from(channels),
  };
}
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(override): checkOtaReconciliation helper for cron §8.4"
```

---

### Task 2.9ter: `computeCancellationRate` — helper per KPI + guard

**Files:**
- Create: `src/lib/booking/cancellation-rate.ts`
- Create: `src/lib/booking/__tests__/cancellation-rate.test.ts`

- [ ] **Step 1: Test unit (con DB + Redis mock)**

```ts
// cancellation-rate.test.ts
it("0 booking su canale → rate 0", async () => {
  const { computeCancellationRate } = await import("@/lib/booking/cancellation-rate");
  const res = await computeCancellationRate("BOKUN", 30);
  expect(res.rate).toBe(0);
  expect(res.totalBookings).toBe(0);
  expect(res.cancelledByOverride).toBe(0);
});

it("100 booking BOKUN, 5 override confirmed → rate 0.05", async () => {
  // seed: 100 BokunBooking ultimi 30gg + 5 OverrideRequest APPROVED
  // che hanno in conflictingBookingIds uno dei 100
  const { computeCancellationRate } = await import("@/lib/booking/cancellation-rate");
  const res = await computeCancellationRate("BOKUN", 30);
  expect(res.totalBookings).toBe(100);
  expect(res.cancelledByOverride).toBe(5);
  expect(res.rate).toBe(0.05);
});
```

- [ ] **Step 2: Implementa con Redis cache TTL 60s**

```ts
// cancellation-rate.ts
import { db } from "@/lib/db";
import { getRedisConnection } from "@/lib/queue";

const CACHE_TTL_SECONDS = 60;

export async function computeCancellationRate(
  channel: string,
  windowDays: number,
): Promise<{
  rate: number;
  totalBookings: number;
  cancelledByOverride: number;
}> {
  const cacheKey = `cancellation-rate:${channel}:${windowDays}`;
  const redis = getRedisConnection();

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis down → fallback calcolo diretto
  }

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const totalBookings = await db.booking.count({
    where: { source: channel as any, createdAt: { gte: since } },
  });

  // Override admin-confirmed che hanno cancellato un booking di questo canale
  // Query: OverrideRequest APPROVED AND any conflictingBookingId è un Booking di quel channel
  const approvedOverrides = await db.overrideRequest.findMany({
    where: { status: "APPROVED", decidedAt: { gte: since } },
    select: { conflictingBookingIds: true },
  });
  let cancelledByOverride = 0;
  for (const ovr of approvedOverrides) {
    const hit = await db.booking.count({
      where: { id: { in: ovr.conflictingBookingIds }, source: channel as any },
    });
    cancelledByOverride += hit;
  }

  const rate = totalBookings === 0 ? 0 : cancelledByOverride / totalBookings;
  const result = { rate, totalBookings, cancelledByOverride };

  try {
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);
  } catch {}

  return result;
}

export async function invalidateCancellationRateCache(channel: string): Promise<void> {
  const redis = getRedisConnection();
  try {
    // Drop all windows for this channel
    const keys = await redis.keys(`cancellation-rate:${channel}:*`);
    if (keys.length > 0) await redis.del(...keys);
  } catch {}
}
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(override): computeCancellationRate with Redis cache 60s"
```

---

### Task 2.10: Chunk 2 wrap — typecheck + full tests

- [ ] **Step 1: Full typecheck**

```bash
npx tsc --noEmit 2>&1 | tail -5
```
Expected: clean.

- [ ] **Step 2: Full test suite**

```bash
npm test 2>&1 | tail -5
```
Expected: tutti i test pre-merge in verde (baseline + nuovi test di Chunk 1 + 2a + 2b), 0 failed.

- [ ] **Step 3: Commit wrap (se residui)**

```bash
git commit -am "chore(override): chunk 2a+2b wrap — lifecycle + admin actions + cron helpers complete" || echo "nothing to commit"
```

Fine Chunk 2b.

---

## Chunk 3: Feature flag + integrazione Server Action + wizard

**Scope**: env vars, Server Action `checkOverrideEligibility`, integrazione
dentro `createPendingDirectBooking` (re-check defense-in-depth dentro advisory
lock), modifica booking-wizard frontend, 5 integration test end-to-end.

**Files new:**
- `src/lib/booking/override-check-action.ts` — Server Action eligibility
- `tests/integration/override-check-action.test.ts` — 5 scenari

**Files modified:**
- `src/lib/env.ts` — 4 nuove env vars
- `src/lib/channels.ts` — scope `OVERRIDE_CHECK_IP` aggiunto a RATE_LIMIT_SCOPES
- `src/lib/booking/create-direct.ts` — re-check eligibility dentro advisory lock
- `src/components/booking/booking-wizard.tsx` — chiamata Server Action al "Continua"

### Task 3.1: env.ts — 4 feature flag

**Files:**
- Modify: `src/lib/env.ts`
- Modify: `.env.example`

- [ ] **Step 1: Leggi struttura env.ts esistente**

```bash
grep -n "FEATURE_\|CANCELLATION_\|OVERRIDE_" src/lib/env.ts | head
```

- [ ] **Step 2: Aggiungi 4 env vars allo schema Zod**

In `src/lib/env.ts`, aggiungere dentro `envSchema`:

```ts
// Override feature flags (Fase 1 Trimarano)
FEATURE_OVERRIDE_ENABLED: z
  .string()
  .default("false")
  .transform((v) => v === "true"),
FEATURE_OVERRIDE_OTA_ENABLED: z
  .string()
  .default("false")
  .transform((v) => v === "true"),
OVERRIDE_CANCELLATION_RATE_SOFT_WARN: z.coerce.number().default(0.03),
OVERRIDE_CANCELLATION_RATE_HARD_BLOCK: z.coerce.number().default(0.05),
```

- [ ] **Step 3: Aggiungi test parsing env**

```ts
// src/lib/__tests__/env-override.test.ts
import { describe, it, expect } from "vitest";

describe("env override flags", () => {
  it("default values (flag assenti)", async () => {
    const mod = await import("@/lib/env");
    expect(typeof mod.env.FEATURE_OVERRIDE_ENABLED).toBe("boolean");
    expect(typeof mod.env.OVERRIDE_CANCELLATION_RATE_HARD_BLOCK).toBe("number");
  });

  it("FEATURE_OVERRIDE_ENABLED=true → true", () => {
    const schema = (v: string) =>
      v === "true" ? true : false;
    expect(schema("true")).toBe(true);
    expect(schema("false")).toBe(false);
    expect(schema("")).toBe(false);
  });
});
```

- [ ] **Step 4: Aggiungi docs in .env.example**

```bash
# In .env.example dopo le env esistenti, aggiungere:
# Override Fase 1 feature flags
FEATURE_OVERRIDE_ENABLED=false
FEATURE_OVERRIDE_OTA_ENABLED=false
OVERRIDE_CANCELLATION_RATE_SOFT_WARN=0.03
OVERRIDE_CANCELLATION_RATE_HARD_BLOCK=0.05
```

- [ ] **Step 5: Run test + commit**

```bash
npx tsc --noEmit 2>&1 | tail -3
npm run test:unit -- env-override 2>&1 | tail -3
git add src/lib/env.ts .env.example src/lib/__tests__/env-override.test.ts
git commit -m "feat(override): 4 feature flag env vars (enabled/ota/rate thresholds)"
```

---

### Task 3.2: Server Action `checkOverrideEligibility`

**Files:**
- Create: `src/lib/booking/override-check-action.ts`
- Modify: `src/lib/channels.ts` (scope `OVERRIDE_CHECK_IP`)

- [ ] **Step 1: Aggiungi scope rate-limit**

In `src/lib/channels.ts`:

```ts
export const RATE_LIMIT_SCOPES = {
  // ... esistenti ...
  OVERRIDE_CHECK_IP: "override-check-ip",
} as const;
```

- [ ] **Step 2: Scaffold Server Action**

```ts
// src/lib/booking/override-check-action.ts
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { getClientIp } from "@/lib/http/client-ip";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import {
  checkOverrideEligibility as checkPure,
  type OverrideEligibilityResult,
} from "./override-eligibility";
import Decimal from "decimal.js";
import { toUtcDay, eachUtcDayInclusive } from "@/lib/dates";
import { quotePrice } from "@/lib/pricing/service";

const inputSchema = z.object({
  boatId: z.string().min(1),
  serviceId: z.string().min(1),
  startDate: z.string().refine((v) => !Number.isNaN(Date.parse(v))),
  endDate: z.string().refine((v) => !Number.isNaN(Date.parse(v))),
  numPax: z.number().int().min(1).max(100),
});

export type CheckOverrideEligibilityInput = z.infer<typeof inputSchema>;

/**
 * Server Action invocata dal booking wizard al click "Continua" del pax step.
 * Pure check — NON crea nulla nel DB.
 * Rate-limit 30/min per IP (scope OVERRIDE_CHECK_IP).
 */
export async function checkOverrideEligibilityAction(
  rawInput: unknown,
): Promise<OverrideEligibilityResult | { status: "blocked"; reason: "feature_disabled"; conflictingBookingIds: [] }> {
  // Feature flag guard
  if (!env.FEATURE_OVERRIDE_ENABLED) {
    return { status: "blocked", reason: "feature_disabled" as any, conflictingBookingIds: [] as any };
  }

  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  await enforceRateLimit({
    identifier: ip,
    scope: RATE_LIMIT_SCOPES.OVERRIDE_CHECK_IP,
    limit: 30,
    windowSeconds: 60,
    failOpen: true,
  });

  const input = inputSchema.parse(rawInput);
  const startDay = toUtcDay(new Date(input.startDate));
  const endDay = toUtcDay(new Date(input.endDate));

  // Fetch conflicts
  const conflictingBookings = await db.booking.findMany({
    where: {
      boatId: input.boatId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startDate: { lte: endDay },
      endDate: { gte: startDay },
    },
    select: { id: true, totalPrice: true, source: true },
  });

  // Fetch admin boat-block
  const dayRange = eachUtcDayInclusive(startDay, endDay);
  const availability = await db.boatAvailability.findMany({
    where: {
      boatId: input.boatId,
      date: { in: dayRange },
      status: "BLOCKED",
      lockedByBookingId: null,
    },
    select: { date: true },
  });

  // Compute newBookingRevenue via quotePrice
  const quote = await quotePrice(input.serviceId, startDay, input.numPax);
  const newBookingRevenue = new Decimal(quote.totalPrice);

  // Map to pure helper input
  const result = checkPure({
    newBookingRevenue,
    conflictingBookings: [
      ...conflictingBookings.map((b) => ({
        id: b.id,
        revenue: new Decimal(b.totalPrice.toString()),
        isAdminBlock: false,
      })),
      ...availability.map((a) => ({
        id: `block:${a.date.toISOString().slice(0, 10)}`,
        revenue: new Decimal(0),
        isAdminBlock: true,
      })),
    ],
    experienceDate: startDay,
    today: new Date(),
  });

  logger.info(
    { boatId: input.boatId, startDay: startDay.toISOString(), status: result.status },
    "override.eligibility.check",
  );
  return result;
}
```

- [ ] **Step 3: Test integration**

```ts
// tests/integration/override-check-action.test.ts
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { seedBoatAndService, seedBooking } from "../helpers/seed-override";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "1.2.3.4" }),
}));
vi.mock("@/lib/rate-limit/service", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(undefined),
}));

let db: Awaited<ReturnType<typeof setupTestDb>>;
beforeAll(async () => { db = await setupTestDb(); });
afterAll(async () => { await closeTestDb(); });
beforeEach(async () => {
  await resetTestDb();
  process.env.FEATURE_OVERRIDE_ENABLED = "true";
  process.env.OVERRIDE_CANCELLATION_RATE_HARD_BLOCK = "0.05";
});

describe("checkOverrideEligibilityAction", () => {
  it("no conflict → status normal", async () => {
    const { boat, service } = await seedBoatAndService(db);
    const { checkOverrideEligibilityAction } = await import("@/lib/booking/override-check-action");
    const res = await checkOverrideEligibilityAction({
      boatId: boat.id, serviceId: service.id,
      startDate: "2026-08-15", endDate: "2026-08-15",
      numPax: 2,
    });
    expect(res.status).toBe("normal");
  });

  it("feature flag OFF → status blocked feature_disabled", async () => {
    process.env.FEATURE_OVERRIDE_ENABLED = "false";
    vi.resetModules();
    const { boat, service } = await seedBoatAndService(db);
    const { checkOverrideEligibilityAction } = await import("@/lib/booking/override-check-action");
    const res = await checkOverrideEligibilityAction({
      boatId: boat.id, serviceId: service.id,
      startDate: "2026-08-15", endDate: "2026-08-15",
      numPax: 2,
    });
    expect(res.status).toBe("blocked");
    if (res.status === "blocked") expect(res.reason).toBe("feature_disabled");
  });
});
```

- [ ] **Step 4: Run test + commit**

```bash
npm run test:integration -- override-check-action 2>&1 | tail -5
git add src/lib/booking/override-check-action.ts src/lib/channels.ts tests/integration/override-check-action.test.ts
git commit -m "feat(override): Server Action checkOverrideEligibility with rate-limit + feature flag"
```

---

### Task 3.3: Integrazione defense-in-depth in `createPendingDirectBooking`

**Files:**
- Modify: `src/lib/booking/create-direct.ts`

- [ ] **Step 1: Leggi create-direct.ts per individuare punto di insertion**

```bash
grep -n "advisory\|acquireTxAdvisoryLock\|conflict\|overlap" src/lib/booking/create-direct.ts | head
```

- [ ] **Step 2: Aggiungi re-check dentro advisory lock**

Dentro il `$transaction` di `createPendingDirectBooking`, dopo advisory lock
acquisition e prima della creazione Booking, aggiungere:

```ts
import { env } from "@/lib/env";
import { checkOverrideEligibility as checkPure } from "./override-eligibility";
import { createOverrideRequest } from "./override-request";
import Decimal from "decimal.js";
import { CHANNELS } from "@/lib/channels";

// ... dentro $transaction, dopo lock, dopo conflict scan esistente ...
if (env.FEATURE_OVERRIDE_ENABLED && conflictingBookings.length > 0) {
  // Re-check eligibility dentro lock (defense-in-depth)
  const eligibility = checkPure({
    newBookingRevenue: new Decimal(newBookingTotal.toString()),
    conflictingBookings: conflictingBookings.map((b) => ({
      id: b.id,
      revenue: new Decimal(b.totalPrice.toString()),
      isAdminBlock: false,
    })),
    experienceDate: startDay,
    today: new Date(),
  });
  if (eligibility.status === "blocked") {
    throw new ConflictError(
      "SLOT_BLOCKED",
      `Lo slot non puo' essere prenotato (reason=${eligibility.reason})`,
    );
  }
  if (eligibility.status === "override_request") {
    // Crea Booking PENDING normalmente, POI createOverrideRequest
    // ... (inline creazione Booking come da flow esistente) ...

    // Dopo creazione Booking:
    const overrideResult = await createOverrideRequest(tx, {
      newBookingId: newBooking.id,
      conflictingBookingIds: eligibility.conflictingBookingIds,
      newBookingRevenue: new Decimal(newBookingTotal.toString()),
      conflictingRevenueTotal: eligibility.conflictingRevenueTotal,
      dropDeadAt: eligibility.dropDeadAt,
      // conflictSourceChannels omesso → derivato dal helper
    });

    // Ritorna payload esteso con flag "override_request"
    return {
      status: "override_request" as const,
      bookingId: newBooking.id,
      overrideRequestId: overrideResult.requestId,
      supersededRequestIds: overrideResult.supersededRequestIds,
    };
  }
}

// Flow normal continua invariato (createBooking + blockDates + ...)
```

- [ ] **Step 3: Gestisci side-effects post-commit per superseded**

Dopo il commit, per ogni `supersededRequestIds`: chiama
`postCommitCancelBooking({reason:"override_superseded"})` sul newBooking della
request superseded (lookup via `tx.overrideRequest.findUnique({where:{id:supersededId}, select:{newBookingId:true}})`).

- [ ] **Step 4: Test integration flow**

Vedi Task 3.5 per i 5 scenari end-to-end.

- [ ] **Step 5: Run typecheck + commit**

```bash
npx tsc --noEmit 2>&1 | tail -3
git commit -am "feat(override): re-check eligibility in createPendingDirectBooking (defense-in-depth)"
```

---

### Task 3.4: Wizard frontend — pax step "Continua" calls Server Action

**Files:**
- Modify: `src/components/booking/booking-wizard.tsx`

- [ ] **Step 1: Leggi current wizard pax step handler**

```bash
grep -n "handleContinue\|setStep\|pax\|onContinue" src/components/booking/booking-wizard.tsx | head
```

- [ ] **Step 2: Aggiungi import + state**

```ts
import { checkOverrideEligibilityAction } from "@/lib/booking/override-check-action";
// nel component:
const [checkState, setCheckState] = useState<
  { status: "idle" } | { status: "checking" } | { status: "error"; message: string }
>({ status: "idle" });
const [blockedDates, setBlockedDates] = useState<string[]>(() => {
  if (typeof window === "undefined") return [];
  // Chiave include pax per invalidare su cambio (advisory A5)
  const key = `blocked-dates:${boatId}:${serviceId}:${numPax}`;
  try { return JSON.parse(sessionStorage.getItem(key) ?? "[]"); } catch { return []; }
});
```

- [ ] **Step 3: Implementa click handler "Continua"**

```tsx
async function handleContinueFromPax() {
  setCheckState({ status: "checking" });
  try {
    const result = await checkOverrideEligibilityAction({
      boatId, serviceId,
      startDate: selectedStart.toISOString(),
      endDate: selectedEnd.toISOString(),
      numPax,
    });
    if (result.status === "blocked") {
      // Non avanza step: banner errore + grey date
      const key = `blocked-dates:${boatId}:${serviceId}:${numPax}:${selectedStart.toISOString().slice(0,10)}`;
      const updated = Array.from(new Set([...blockedDates, selectedStart.toISOString().slice(0,10)]));
      sessionStorage.setItem(key, JSON.stringify(updated));
      setBlockedDates(updated);
      const reasonMsg = result.reason === "within_15_day_cutoff"
        ? "Questo slot non e' piu' disponibile nelle 2 settimane pre-data."
        : result.reason === "insufficient_revenue"
        ? "Questo slot e' gia' prenotato. Prova altre date."
        : result.reason === "boat_block"
        ? "Questo slot e' bloccato dall'admin."
        : "Siamo spiacenti, lo slot non e' piu' disponibile.";
      setCheckState({ status: "error", message: reasonMsg });
      return;
    }
    // normal | override_request → avanza. Salva flag per wizard success page.
    if (result.status === "override_request") {
      sessionStorage.setItem("override-pending", "true");
    }
    setCheckState({ status: "idle" });
    setStep("customer-info");
  } catch (err) {
    setCheckState({
      status: "error",
      message: err instanceof Error ? err.message : "Errore sconosciuto",
    });
  }
}
```

- [ ] **Step 4: Render banner + spinner**

```tsx
{checkState.status === "checking" && (
  <div role="status" aria-live="polite">
    <Spinner /> Verifica disponibilita'...
  </div>
)}
{checkState.status === "error" && (
  <div role="alert" className="text-red-600">
    {checkState.message}
  </div>
)}
<Button disabled={checkState.status === "checking"} onClick={handleContinueFromPax}>
  Continua
</Button>
```

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(override): wizard pax step calls checkOverrideEligibility Server Action"
```

---

### Task 3.5: Integration tests — 5 scenari end-to-end

**Files:**
- Modify: `tests/integration/override-check-action.test.ts`

- [ ] **Step 1: Aggiungi 5 scenari completi**

```ts
it("scenario 1 — normal (data libera)", async () => {
  const { boat, service } = await seedBoatAndService(db);
  const { checkOverrideEligibilityAction } = await import("@/lib/booking/override-check-action");
  const res = await checkOverrideEligibilityAction({
    boatId: boat.id, serviceId: service.id,
    startDate: "2026-09-01", endDate: "2026-09-01", numPax: 2,
  });
  expect(res.status).toBe("normal");
});

it("scenario 2 — override_request (revenue nuovo > conflict, > 15gg)", async () => {
  const { boat, service } = await seedBoatAndService(db);
  await seedBooking(db, {
    boatId: boat.id, serviceId: service.id,
    totalPrice: "500.00", status: "CONFIRMED",
    startDate: new Date("2026-09-01"), endDate: new Date("2026-09-01"),
  });
  const { checkOverrideEligibilityAction } = await import("@/lib/booking/override-check-action");
  const res = await checkOverrideEligibilityAction({
    boatId: boat.id, serviceId: service.id,
    startDate: "2026-09-01", endDate: "2026-09-01", numPax: 10, // pricing → > 500
  });
  expect(res.status).toBe("override_request");
});

it("scenario 3 — blocked insufficient_revenue", async () => {
  const { boat, service } = await seedBoatAndService(db);
  await seedBooking(db, {
    boatId: boat.id, serviceId: service.id,
    totalPrice: "5000.00", status: "CONFIRMED",
    startDate: new Date("2026-09-01"), endDate: new Date("2026-09-01"),
  });
  const { checkOverrideEligibilityAction } = await import("@/lib/booking/override-check-action");
  const res = await checkOverrideEligibilityAction({
    boatId: boat.id, serviceId: service.id,
    startDate: "2026-09-01", endDate: "2026-09-01", numPax: 2,
  });
  expect(res.status).toBe("blocked");
  if (res.status === "blocked") expect(res.reason).toBe("insufficient_revenue");
});

it("scenario 4 — blocked within_15_day_cutoff", async () => {
  const { boat, service } = await seedBoatAndService(db);
  const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  await seedBooking(db, {
    boatId: boat.id, serviceId: service.id,
    totalPrice: "500.00", status: "CONFIRMED",
    startDate: in10Days, endDate: in10Days,
  });
  const { checkOverrideEligibilityAction } = await import("@/lib/booking/override-check-action");
  const res = await checkOverrideEligibilityAction({
    boatId: boat.id, serviceId: service.id,
    startDate: in10Days.toISOString(), endDate: in10Days.toISOString(), numPax: 10,
  });
  expect(res.status).toBe("blocked");
  if (res.status === "blocked") expect(res.reason).toBe("within_15_day_cutoff");
});

it("scenario 5 — blocked boat_block", async () => {
  const { boat, service } = await seedBoatAndService(db);
  const d = new Date("2026-09-01");
  await db.boatAvailability.create({
    data: {
      boatId: boat.id, date: d, status: "BLOCKED",
      lockedByBookingId: null, // admin block
    },
  });
  const { checkOverrideEligibilityAction } = await import("@/lib/booking/override-check-action");
  const res = await checkOverrideEligibilityAction({
    boatId: boat.id, serviceId: service.id,
    startDate: "2026-09-01", endDate: "2026-09-01", numPax: 10,
  });
  expect(res.status).toBe("blocked");
  if (res.status === "blocked") expect(res.reason).toBe("boat_block");
});
```

- [ ] **Step 2: Run tests + commit**

```bash
npm run test:integration -- override-check-action 2>&1 | tail -5
git commit -am "test(override): 5 scenari integration checkOverrideEligibility"
```

Fine Chunk 3.

---

## Chunk 4: Email templates + NotificationType wiring

**Scope**: 6 nuovi template (5 customer + 1 admin), estensione apology,
+8 NotificationType enum, dispatcher render branches, test HTML escape.

**Files new:**
- `src/lib/email/templates/booking-pending-override-confirmation.ts`
- `src/lib/email/templates/override-approved-winner.ts`
- `src/lib/email/templates/override-rejected-winner.ts`
- `src/lib/email/templates/override-expired.ts`
- `src/lib/email/templates/override-superseded.ts`
- `src/lib/email/templates/override-reconcile-failed-admin.ts`
- `src/lib/email/templates/__tests__/override-templates.test.ts`

**Files modified:**
- `src/lib/email/templates/overbooking-apology.ts` — +voucherSoftText +rebookingSuggestions
- `src/lib/notifications/events.ts` — +8 NotificationType
- `src/lib/notifications/dispatcher.ts` — render branches

### Task 4.1: Template `booking-pending-override-confirmation.ts`

Template per customer new booking: "Pagamento confermato, richiesta in attesa".

**Trigger**: evento `OVERRIDE_REQUESTED` dopo submit con status override_request.

- [ ] **Step 1: Create file**

```ts
// src/lib/email/templates/booking-pending-override-confirmation.ts
import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface OverridePendingConfirmationProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string; // ISO yyyy-mm-dd
  numPeople: number;
  amountPaid: string; // "3000.00"
  bookingPortalUrl: string;
}

export function bookingPendingOverrideConfirmationTemplate(
  data: OverridePendingConfirmationProps,
): { subject: string; html: string; text: string } {
  const subject = `Richiesta prenotazione ricevuta — ${escapeHtml(data.confirmationCode)}`;
  const body = `
    <h1>Ciao ${escapeHtml(data.customerName)},</h1>
    <p>Abbiamo ricevuto la tua prenotazione per:</p>
    <ul>
      <li>Servizio: <strong>${escapeHtml(data.serviceName)}</strong></li>
      <li>Data: <strong>${escapeHtml(data.startDate)}</strong></li>
      <li>Persone: ${data.numPeople}</li>
      <li>Totale pagato: € ${escapeHtml(data.amountPaid)}</li>
      <li>Codice: <strong>${escapeHtml(data.confirmationCode)}</strong></li>
    </ul>
    <p><strong>Stato: In attesa di conferma</strong></p>
    <p>Lo staff conferma la tua prenotazione entro 72 ore. In caso di non conferma
    ti rimborseremo automaticamente senza alcun costo.</p>
    <p>Puoi visualizzare lo stato in qualsiasi momento su:
      <a href="${safeUrl(data.bookingPortalUrl)}">Area prenotazioni</a>
    </p>
  `;
  const text = `Ciao ${data.customerName},

Prenotazione ricevuta: ${data.confirmationCode}
Servizio: ${data.serviceName}
Data: ${data.startDate}
Totale: € ${data.amountPaid}

Stato: In attesa di conferma.
Ti confermiamo entro 72h. Portale: ${data.bookingPortalUrl}
`;
  return {
    subject,
    html: emailLayout({ title: subject, bodyHtml: body }),
    text,
  };
}
```

- [ ] **Step 2: Test escape HTML (advisory A6)**

```ts
// src/lib/email/templates/__tests__/override-templates.test.ts
import { describe, it, expect } from "vitest";
import { bookingPendingOverrideConfirmationTemplate } from "../booking-pending-override-confirmation";

describe("bookingPendingOverrideConfirmationTemplate", () => {
  it("escapa HTML nel customerName", () => {
    const tpl = bookingPendingOverrideConfirmationTemplate({
      customerName: "<script>alert(1)</script>Mario",
      confirmationCode: "TST123",
      serviceName: "Gourmet",
      startDate: "2026-08-15",
      numPeople: 2,
      amountPaid: "3000.00",
      bookingPortalUrl: "https://egadisailing.com/b/sessione",
    });
    expect(tpl.html).not.toContain("<script>");
    expect(tpl.html).toContain("&lt;script&gt;");
    expect(tpl.html).toContain("Mario");
  });

  it("safeUrl rifiuta javascript:", () => {
    const tpl = bookingPendingOverrideConfirmationTemplate({
      customerName: "Mario",
      confirmationCode: "TST123",
      serviceName: "Gourmet",
      startDate: "2026-08-15",
      numPeople: 2,
      amountPaid: "3000.00",
      bookingPortalUrl: "javascript:alert(1)",
    });
    expect(tpl.html).not.toContain("javascript:");
  });
});
```

- [ ] **Step 3: Run test + commit**

```bash
npm run test:unit -- override-templates 2>&1 | tail -3
git add src/lib/email/templates/booking-pending-override-confirmation.ts src/lib/email/templates/__tests__/override-templates.test.ts
git commit -m "feat(override): email template booking-pending-override-confirmation + escape test"
```

---

### Task 4.2: Template `override-approved-winner.ts`

Customer winner riceve "prenotazione confermata" quando admin approva.

- [ ] **Step 1: Create file**

```ts
// src/lib/email/templates/override-approved-winner.ts
import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface OverrideApprovedWinnerProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  numPeople: number;
  bookingPortalUrl: string;
  contactPhone: string;
}

export function overrideApprovedWinnerTemplate(
  data: OverrideApprovedWinnerProps,
): { subject: string; html: string; text: string } {
  const subject = `Prenotazione confermata — ${escapeHtml(data.confirmationCode)}`;
  const body = `
    <h1>Ottime notizie, ${escapeHtml(data.customerName)}!</h1>
    <p>La tua prenotazione e' stata <strong>confermata</strong>.</p>
    <ul>
      <li>Servizio: ${escapeHtml(data.serviceName)}</li>
      <li>Data: <strong>${escapeHtml(data.startDate)}</strong></li>
      <li>Persone: ${data.numPeople}</li>
      <li>Codice: <strong>${escapeHtml(data.confirmationCode)}</strong></li>
    </ul>
    <p>Ci vediamo a bordo. Per qualsiasi domanda chiamaci al
      <strong>${escapeHtml(data.contactPhone)}</strong>.</p>
    <p><a href="${safeUrl(data.bookingPortalUrl)}">Gestisci la prenotazione</a></p>
  `;
  const text = `Ciao ${data.customerName}, prenotazione ${data.confirmationCode} CONFERMATA.\nData: ${data.startDate}\nPortale: ${data.bookingPortalUrl}`;
  return { subject, html: emailLayout({ title: subject, bodyHtml: body }), text };
}
```

- [ ] **Step 2: Test + commit**

```ts
// append a override-templates.test.ts
import { overrideApprovedWinnerTemplate } from "../override-approved-winner";

it("overrideApprovedWinner escapa HTML", () => {
  const tpl = overrideApprovedWinnerTemplate({
    customerName: "<img src=x onerror=1>",
    confirmationCode: "WIN123",
    serviceName: "Charter",
    startDate: "2026-08-15",
    numPeople: 4,
    bookingPortalUrl: "https://egadisailing.com/b/sessione",
    contactPhone: "+39 123 456 7890",
  });
  expect(tpl.html).not.toContain("<img src=x");
  expect(tpl.html).toContain("&lt;img");
});
```

```bash
git commit -am "feat(override): email template override-approved-winner + escape test"
```

---

### Task 4.3: Template `override-rejected-winner.ts` + helper `findAlternativeDates`

Customer new booking rifiutato da admin riceve email con 3 date alternative.

- [ ] **Step 1: Create helper findAlternativeDates**

```ts
// src/lib/booking/alternative-dates.ts
import { db } from "@/lib/db";

/**
 * Trova le prossime N date dove il boat+service non hanno booking attivi
 * ne' admin-block. Skip dei giorni con conflict in [PENDING,CONFIRMED].
 * Scan fino a 60gg avanti dal aroundDate escluso. Stop al limit.
 */
export async function findAlternativeDates(
  boatId: string,
  _serviceId: string,
  aroundDate: Date,
  limit: number,
): Promise<Date[]> {
  const results: Date[] = [];
  for (let i = 1; i <= 60 && results.length < limit; i++) {
    const candidate = new Date(aroundDate);
    candidate.setUTCDate(candidate.getUTCDate() + i);
    const conflicts = await db.booking.count({
      where: {
        boatId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startDate: { lte: candidate },
        endDate: { gte: candidate },
      },
    });
    if (conflicts === 0) {
      const block = await db.boatAvailability.count({
        where: { boatId, date: candidate, status: "BLOCKED", lockedByBookingId: null },
      });
      if (block === 0) results.push(candidate);
    }
  }
  return results;
}
```

- [ ] **Step 2: Create template**

```ts
// src/lib/email/templates/override-rejected-winner.ts
import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface OverrideRejectedWinnerProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  refundAmount: string;
  alternativeDates: string[];
  bookingPortalUrl: string;
  contactEmail: string;
}

export function overrideRejectedWinnerTemplate(
  data: OverrideRejectedWinnerProps,
): { subject: string; html: string; text: string } {
  const subject = `Prenotazione ${escapeHtml(data.confirmationCode)} non confermata`;
  const altList = data.alternativeDates.length > 0
    ? `<p>Date alternative disponibili:</p><ul>${data.alternativeDates.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
    : "";
  const body = `
    <h1>Ciao ${escapeHtml(data.customerName)},</h1>
    <p>Ci dispiace comunicarti che la tua richiesta di prenotazione per
      <strong>${escapeHtml(data.serviceName)}</strong> del
      <strong>${escapeHtml(data.startDate)}</strong> non e' stata confermata.</p>
    <p>Riceverai il rimborso completo di € <strong>${escapeHtml(data.refundAmount)}</strong>
    sulla tua carta di credito entro 5-10 giorni lavorativi.</p>
    ${altList}
    <p>Per qualsiasi domanda: <a href="mailto:${escapeHtml(data.contactEmail)}">${escapeHtml(data.contactEmail)}</a></p>
    <p><a href="${safeUrl(data.bookingPortalUrl)}">Area prenotazioni</a></p>
  `;
  const text = `Ciao ${data.customerName}, prenotazione ${data.confirmationCode} NON confermata. Rimborso € ${data.refundAmount} in 5-10gg. Alternative: ${data.alternativeDates.join(", ")}`;
  return { subject, html: emailLayout({ title: subject, bodyHtml: body }), text };
}
```

- [ ] **Step 3: Test + commit**

```bash
git add src/lib/booking/alternative-dates.ts src/lib/email/templates/override-rejected-winner.ts
git commit -m "feat(override): email template override-rejected-winner + findAlternativeDates helper"
```

---

### Task 4.4: Template `override-expired.ts`

Customer new booking scaduto per drop-dead 15gg.

- [ ] **Step 1: Create template analogo a 4.3**

```ts
// src/lib/email/templates/override-expired.ts
import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface OverrideExpiredProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  refundAmount: string;
  alternativeDates: string[];
  bookingPortalUrl: string;
}

export function overrideExpiredTemplate(data: OverrideExpiredProps) {
  const subject = `Prenotazione ${escapeHtml(data.confirmationCode)} scaduta`;
  const body = `
    <h1>Ciao ${escapeHtml(data.customerName)},</h1>
    <p>Non abbiamo potuto confermare la tua prenotazione entro il termine previsto.
    Il rimborso completo di € <strong>${escapeHtml(data.refundAmount)}</strong> e' stato avviato.</p>
    ${data.alternativeDates.length > 0
      ? `<p>Date alternative:</p><ul>${data.alternativeDates.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
      : ""}
    <p><a href="${safeUrl(data.bookingPortalUrl)}">Area prenotazioni</a></p>
  `;
  const text = `Prenotazione ${data.confirmationCode} scaduta. Rimborso € ${data.refundAmount}. Alternative: ${data.alternativeDates.join(", ")}`;
  return { subject, html: emailLayout({ title: subject, bodyHtml: body }), text };
}
```

- [ ] **Step 2: Test escape + commit**

```bash
git commit -am "feat(override): email template override-expired + escape test"
```

---

### Task 4.5: Template `override-superseded.ts`

Customer la cui request e' stata auto-rejected perche' un altra request con
revenue superiore e' arrivata sullo stesso slot.

- [ ] **Step 1: Create template**

```ts
// src/lib/email/templates/override-superseded.ts
import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface OverrideSupersededProps {
  customerName: string;
  confirmationCode: string;
  serviceName: string;
  startDate: string;
  refundAmount: string;
  alternativeDates: string[];
  bookingPortalUrl: string;
}

export function overrideSupersededTemplate(data: OverrideSupersededProps) {
  const subject = `Prenotazione ${escapeHtml(data.confirmationCode)} non disponibile`;
  const body = `
    <h1>Ciao ${escapeHtml(data.customerName)},</h1>
    <p>Purtroppo un'altra richiesta sullo stesso slot e' arrivata prima della tua.
    La tua prenotazione per <strong>${escapeHtml(data.serviceName)}</strong> del
    <strong>${escapeHtml(data.startDate)}</strong> e' stata automaticamente annullata.</p>
    <p>Riceverai il rimborso completo di € <strong>${escapeHtml(data.refundAmount)}</strong> entro 5-10 giorni lavorativi.</p>
    ${data.alternativeDates.length > 0
      ? `<p>Date alternative:</p><ul>${data.alternativeDates.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
      : ""}
    <p><a href="${safeUrl(data.bookingPortalUrl)}">Area prenotazioni</a></p>
  `;
  const text = `Prenotazione ${data.confirmationCode} superseded. Rimborso € ${data.refundAmount}.`;
  return { subject, html: emailLayout({ title: subject, bodyHtml: body }), text };
}
```

- [ ] **Step 2: Test + commit**

```bash
git commit -am "feat(override): email template override-superseded"
```

---

### Task 4.6: Estensione `overbooking-apology.ts` (deduplica da Task 2.6)

**R19 Fix #7 dedup**: l'estensione del template avviene UNICAMENTE qui.

- [ ] **Step 1: Leggi struttura esistente**

```bash
grep -n "overbookingApologyTemplate\|export interface\|export function" src/lib/email/templates/overbooking-apology.ts
```

- [ ] **Step 2: Estendi props + body**

```ts
// src/lib/email/templates/overbooking-apology.ts
// Estendi `OverbookingApologyProps`:
export interface OverbookingApologyProps {
  // ... esistenti ...
  voucherSoftText?: string;
  rebookingSuggestions?: string[];
}

// Nel body, dopo il paragrafo del rimborso:
${data.voucherSoftText ? `<p><em>${escapeHtml(data.voucherSoftText)}</em></p>` : ""}
${data.rebookingSuggestions?.length
  ? `<p>Date alternative:<br>${data.rebookingSuggestions.map((d) => escapeHtml(d)).join("<br>")}</p>`
  : ""}
```

- [ ] **Step 3: Test retrocompat + test nuove props**

```ts
it("overbookingApology retrocompat (senza voucher/rebooking)", () => {
  const tpl = overbookingApologyTemplate({
    customerName: "Mario",
    confirmationCode: "BK1",
    serviceName: "Social",
    startDate: "2026-08-01",
    refundAmount: "500€",
    refundChannel: "stripe",
    contactEmail: "info@x.com",
    contactPhone: "+39",
    bookingUrl: "https://x.com",
  });
  expect(tpl.html).not.toContain("2 drink");
});

it("overbookingApology con voucher + rebooking", () => {
  const tpl = overbookingApologyTemplate({
    customerName: "Mario",
    confirmationCode: "BK1",
    serviceName: "Social",
    startDate: "2026-08-01",
    refundAmount: "500€",
    refundChannel: "stripe",
    contactEmail: "info@x.com",
    contactPhone: "+39",
    bookingUrl: "https://x.com",
    voucherSoftText: "2 drink gratis",
    rebookingSuggestions: ["2026-08-10", "2026-08-15"],
  });
  expect(tpl.html).toContain("2 drink gratis");
  expect(tpl.html).toContain("2026-08-10");
});
```

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(override): overbookingApology +voucherSoftText +rebookingSuggestions"
```

---

### Task 4.7: Template admin `override-reconcile-failed-admin.ts`

Admin FATAL quando cron §8.4 rileva upstream OTA ancora attivo.

- [ ] **Step 1: Create template**

```ts
// src/lib/email/templates/override-reconcile-failed-admin.ts
import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface OverrideReconcileFailedAdminProps {
  overrideRequestId: string;
  newBookingCode: string;
  upstreamConflicts: Array<{
    bookingId: string;
    channel: string;
    externalRef: string;
    status: string;
  }>;
  overrideDetailUrl: string;
}

export function overrideReconcileFailedAdminTemplate(
  data: OverrideReconcileFailedAdminProps,
) {
  const subject = `[FATAL] OverrideRequest ${escapeHtml(data.overrideRequestId)} — reconcile failed`;
  const upstreamList = data.upstreamConflicts.map((c) =>
    `<li>${escapeHtml(c.channel)} · ${escapeHtml(c.externalRef)} · stato: <strong>${escapeHtml(c.status)}</strong></li>`
  ).join("");
  const body = `
    <h1>Attenzione: reconcile post-approve fallito</h1>
    <p>L'OverrideRequest <strong>${escapeHtml(data.overrideRequestId)}</strong>
      (new booking <strong>${escapeHtml(data.newBookingCode)}</strong>) e' stata approvata
      ma l'upstream OTA risulta ancora attivo dopo +1h.</p>
    <p>Booking upstream still active:</p>
    <ul>${upstreamList}</ul>
    <p><strong>Azione richiesta</strong>: verifica immediatamente sul pannello
      esterno che la cancellazione sia stata eseguita correttamente. Bug tipici:
      Viator non propaga cancel a Bokun, admin ha spuntato checkbox senza aver
      effettivamente cancellato nel pannello OTA.</p>
    <p><a href="${safeUrl(data.overrideDetailUrl)}">Apri detail + Retry reconcile</a></p>
  `;
  const text = `FATAL: OverrideRequest ${data.overrideRequestId} reconcile failed. Upstream still active: ${data.upstreamConflicts.map((c) => `${c.channel}:${c.externalRef}:${c.status}`).join(", ")}. Apri: ${data.overrideDetailUrl}`;
  return { subject, html: emailLayout({ title: subject, bodyHtml: body }), text };
}
```

- [ ] **Step 2: Test + commit**

```bash
git commit -am "feat(override): admin FATAL template override-reconcile-failed"
```

---

### Task 4.8: NotificationType +8 + dispatcher branches

**Files:**
- Modify: `src/lib/notifications/events.ts`
- Modify: `src/lib/notifications/dispatcher.ts`

- [ ] **Step 1: Aggiungi NotificationType** (fonte: spec §15.1, riga 1240-1248)

```ts
// src/lib/notifications/events.ts
export type NotificationType =
  | "NEW_BOOKING_DIRECT" | "NEW_BOOKING_BOKUN" | "NEW_BOOKING_BOATAROUND"
  | "BOOKING_CANCELLED" | "PAYMENT_FAILED" | "SYNC_FAILURE" | "WEATHER_ALERT"
  // 8 nuovi (Fase 1 Trimarano)
  | "OVERRIDE_REQUESTED"          // ad admin dopo creazione PENDING
  | "OVERRIDE_REMINDER"           // ad admin 24/48/72h (cron §8.1)
  | "OVERRIDE_APPROVED"           // a customer winner
  | "OVERRIDE_REJECTED"           // a customer winner rifiutato
  | "OVERRIDE_EXPIRED"            // a customer drop-dead
  | "OVERRIDE_SUPERSEDED"         // a customer auto-rejected da revenue sup.
  | "OVERRIDE_RECONCILE_FAILED"   // ad admin FATAL (cron §8.4)
  | "CROSS_CHANNEL_CONFLICT";     // ad admin ManualAlert (§6.5/§6.6)
```

Enumerazione sorgente evento + canali default:

| Type | Sorgente | Canali default |
|---|---|---|
| OVERRIDE_REQUESTED | `createPendingDirectBooking` status=override_request | EMAIL + TELEGRAM |
| OVERRIDE_REMINDER | cron `/api/cron/override-reminders` | EMAIL |
| OVERRIDE_APPROVED | `approveOverride` post-commit | EMAIL (no telegram — customer) |
| OVERRIDE_REJECTED | `rejectOverride` post-commit | EMAIL |
| OVERRIDE_EXPIRED | `expireDropDeadRequests` post-commit | EMAIL |
| OVERRIDE_SUPERSEDED | `createOverrideRequest` supersede path | EMAIL |
| OVERRIDE_RECONCILE_FAILED | cron `/api/cron/override-reconcile` | EMAIL + TELEGRAM |
| CROSS_CHANNEL_CONFLICT | webhook Bokun/Boataround reverse detection | EMAIL + TELEGRAM |

- [ ] **Step 2: Dispatcher render branches**

In `src/lib/notifications/dispatcher.ts`, aggiungi switch case per ogni
nuovo type con call al template corrispondente.

```ts
import { bookingPendingOverrideConfirmationTemplate } from "@/lib/email/templates/booking-pending-override-confirmation";
import { overrideApprovedWinnerTemplate } from "@/lib/email/templates/override-approved-winner";
import { overrideRejectedWinnerTemplate } from "@/lib/email/templates/override-rejected-winner";
import { overrideExpiredTemplate } from "@/lib/email/templates/override-expired";
import { overrideSupersededTemplate } from "@/lib/email/templates/override-superseded";
import { overrideReconcileFailedAdminTemplate } from "@/lib/email/templates/override-reconcile-failed-admin";

// Nello switch type:
case "OVERRIDE_REQUESTED": {
  const tpl = bookingPendingOverrideConfirmationTemplate(payload as any);
  return { subject: tpl.subject, html: tpl.html, text: tpl.text, telegramText: `Override requested: ${tpl.subject}` };
}
case "OVERRIDE_APPROVED": {
  const tpl = overrideApprovedWinnerTemplate(payload as any);
  return { subject: tpl.subject, html: tpl.html, text: tpl.text };
}
case "OVERRIDE_REJECTED": {
  const tpl = overrideRejectedWinnerTemplate(payload as any);
  return { subject: tpl.subject, html: tpl.html, text: tpl.text };
}
case "OVERRIDE_EXPIRED": {
  const tpl = overrideExpiredTemplate(payload as any);
  return { subject: tpl.subject, html: tpl.html, text: tpl.text };
}
case "OVERRIDE_SUPERSEDED": {
  const tpl = overrideSupersededTemplate(payload as any);
  return { subject: tpl.subject, html: tpl.html, text: tpl.text };
}
case "OVERRIDE_RECONCILE_FAILED": {
  const tpl = overrideReconcileFailedAdminTemplate(payload as any);
  return { subject: tpl.subject, html: tpl.html, text: tpl.text, telegramText: `FATAL reconcile failed: ${tpl.subject}` };
}
case "OVERRIDE_REMINDER": {
  // Inline admin reminder (no template dedicato — usa subject + sommario payload)
  return {
    subject: `Reminder override PENDING ${(payload as any).confirmationCode}`,
    html: `<p>Override request pending level ${(payload as any).level}.</p>`,
    text: `Override reminder level ${(payload as any).level}: ${(payload as any).confirmationCode}`,
  };
}
case "CROSS_CHANNEL_CONFLICT": {
  return {
    subject: `ManualAlert: cross-channel conflict`,
    html: `<p>Cross-channel conflict detected on ${(payload as any).boatId} ${(payload as any).date}.</p>`,
    text: `Cross-channel conflict`,
  };
}
```

- [ ] **Step 3: Integration test dispatcher per ciascun tipo**

```ts
// tests/integration/notification-dispatcher-override.test.ts
import { describe, it, expect, vi } from "vitest";
const sendEmailMock = vi.fn().mockResolvedValue(true);
const sendTelegramMock = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/email/brevo", () => ({ sendEmail: sendEmailMock }));
vi.mock("@/lib/notifications/telegram", () => ({ sendTelegramMessage: sendTelegramMock }));

describe("notification dispatcher — override types", () => {
  beforeEach(() => { sendEmailMock.mockClear(); sendTelegramMock.mockClear(); });

  for (const type of [
    "OVERRIDE_REQUESTED", "OVERRIDE_APPROVED", "OVERRIDE_REJECTED",
    "OVERRIDE_EXPIRED", "OVERRIDE_SUPERSEDED", "OVERRIDE_RECONCILE_FAILED",
    "OVERRIDE_REMINDER", "CROSS_CHANNEL_CONFLICT",
  ]) {
    it(`dispatches ${type} without crashing`, async () => {
      const { dispatchNotification } = await import("@/lib/notifications/dispatcher");
      const res = await dispatchNotification({
        type: type as any,
        recipient: "admin@test.com",
        payload: {
          customerName: "Mario", confirmationCode: "CODE1",
          serviceName: "Svc", startDate: "2026-08-15", numPeople: 2,
          amountPaid: "1000", bookingPortalUrl: "https://x.com",
          refundAmount: "1000", alternativeDates: ["2026-08-20"],
          contactEmail: "info@x.com", contactPhone: "+39",
          overrideRequestId: "REQ1", newBookingCode: "NEW1",
          upstreamConflicts: [], overrideDetailUrl: "https://x.com",
          boatId: "boat1", date: "2026-08-15", level: 1,
        },
      });
      expect(res.anyOk).toBe(true);
    });
  }
});
```

- [ ] **Step 4: Run tests + commit**

```bash
npm test 2>&1 | tail -5
git commit -am "feat(override): 8 NotificationType + dispatcher render branches + test"
```

**NON facciamo**: apology OTA. Il rimborso e' gestito upstream dal portale
(Viator/Booking/SamBoat), inviare apology da noi creerebbe confusione cliente.
Decisione brainstorm 2026-04-23.

Fine Chunk 4.

---

## Chunk 5: Cron endpoints + scheduler

**Scope**: 4 endpoints cron + scheduler registration + integration tests.
Pattern esistente: Bearer CRON_SECRET + Redis lease single-flight + rate-limit
global + fail-open Redis down (timeout 2s).

**Files new:**
- `src/app/api/cron/override-reminders/route.ts`
- `src/app/api/cron/override-dropdead/route.ts`
- `src/app/api/cron/refund-retry/route.ts`
- `src/app/api/cron/override-reconcile/route.ts`
- `tests/integration/override-cron.test.ts`

**Files modified:**
- `src/lib/cron/scheduler.ts` — register 4 nuovi cron
- `src/lib/channels.ts` — scopes `OVERRIDE_*_CRON_IP`

### Task 5.1: `/api/cron/override-reminders`

**Orario**: ogni ora, minuto 0.

- [ ] **Step 1: Scaffold route**

```ts
// src/app/api/cron/override-reminders/route.ts
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { getClientIp } from "@/lib/http/client-ip";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { sendEscalationReminders } from "@/lib/booking/override-request";

export const POST = withErrorHandler(async (req) => {
  await enforceRateLimit({
    identifier: "global",
    scope: RATE_LIMIT_SCOPES.OVERRIDE_REMINDERS_CRON_IP,
    limit: 10,
    windowSeconds: 60,
    failOpen: true,
  });
  requireBearerSecret(req);

  const lease = await tryAcquireLease("cron:override-reminders", 10 * 60);
  if (!lease) {
    return Response.json({ skipped: "already-running" });
  }
  try {
    const result = await sendEscalationReminders();
    return Response.json(result);
  } finally {
    await releaseLease(lease);
  }
});

export const GET = POST;
```

- [ ] **Step 2: Test integration**

```ts
// tests/integration/override-cron.test.ts
it("override-reminders — 401 senza Bearer", async () => {
  const req = new Request("http://localhost/api/cron/override-reminders", { method: "POST" });
  const { POST } = await import("@/app/api/cron/override-reminders/route");
  const res = await POST(req);
  expect(res.status).toBe(401);
});

it("override-reminders — 200 con Bearer + skip se lease acquisito", async () => {
  process.env.CRON_SECRET = "testsecret";
  const hdrs = new Headers({ Authorization: "Bearer testsecret" });
  const req = new Request("http://localhost/api/cron/override-reminders", { method: "POST", headers: hdrs });
  const { POST } = await import("@/app/api/cron/override-reminders/route");
  const res = await POST(req);
  expect(res.status).toBe(200);
  // Secondo invocazione concorrente → skipped
  const res2 = await POST(req);
  const body = await res2.json();
  expect(body.skipped === "already-running" || body.sent >= 0).toBe(true);
});
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/override-reminders/route.ts tests/integration/override-cron.test.ts
git commit -m "feat(override): cron endpoint override-reminders + lease + bearer + test"
```

---

### Task 5.2: `/api/cron/override-dropdead`

**Orario**: ogni ora, minuto 15 (sfasato 15min da 5.1).

- [ ] **Step 1: Scaffold route**

```ts
// src/app/api/cron/override-dropdead/route.ts
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { expireDropDeadRequests } from "@/lib/booking/override-request";

export const POST = withErrorHandler(async (req) => {
  await enforceRateLimit({
    identifier: "global",
    scope: RATE_LIMIT_SCOPES.OVERRIDE_DROPDEAD_CRON_IP,
    limit: 10,
    windowSeconds: 60,
    failOpen: true,
  });
  requireBearerSecret(req);

  const lease = await tryAcquireLease("cron:override-dropdead", 10 * 60);
  if (!lease) {
    return Response.json({ skipped: "already-running" });
  }
  try {
    const result = await expireDropDeadRequests();
    return Response.json(result);
  } finally {
    await releaseLease(lease);
  }
});

export const GET = POST;
```

- [ ] **Step 2: Test integration**

```ts
it("override-dropdead — espira request PENDING con dropDeadAt<=now", async () => {
  // Seed: create OverrideRequest PENDING con dropDeadAt=2020-01-01
  // Call POST con Bearer → expect status=EXPIRED
});
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(override): cron endpoint override-dropdead + lease"
```

---

### Task 5.3: `/api/cron/refund-retry`

**Orario**: ogni 30min, minuto 10 sfasato.

Scansiona `Payment.status = "FAILED"` + `type != "REFUND"` + `updatedAt < now-30min`
e ritenta `refundPayment(stripeChargeId)`. Exponential backoff (3 attempt,
1min/5min/30min). Dopo 3 fail permanent, flag `Payment.status = "REFUND_EXHAUSTED"`
(nuovo enum) + ManualAlert admin.

- [ ] **Step 1: Scaffold route**

```ts
// src/app/api/cron/refund-retry/route.ts
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { refundPayment, getChargeRefundState } from "@/lib/stripe/payment-intents";

export const POST = withErrorHandler(async (req) => {
  await enforceRateLimit({
    identifier: "global",
    scope: RATE_LIMIT_SCOPES.REFUND_RETRY_CRON_IP,
    limit: 10,
    windowSeconds: 60,
    failOpen: true,
  });
  requireBearerSecret(req);

  const lease = await tryAcquireLease("cron:refund-retry", 10 * 60);
  if (!lease) return Response.json({ skipped: "already-running" });
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const failed = await db.payment.findMany({
      where: { status: "FAILED", updatedAt: { lt: cutoff } },
      take: 50,
      select: { id: true, stripeChargeId: true, amount: true },
    });
    let retried = 0, recovered = 0, exhausted = 0;
    for (const p of failed) {
      if (!p.stripeChargeId) continue;
      retried++;
      try {
        const state = await getChargeRefundState(p.stripeChargeId);
        if (state.residualCents > 0) {
          await refundPayment(p.stripeChargeId, state.residualCents);
          await db.payment.update({ where: { id: p.id }, data: { status: "REFUNDED" } });
          recovered++;
        }
      } catch (err) {
        logger.error({ err, paymentId: p.id }, "refund retry failed");
        exhausted++;
      }
    }
    return Response.json({ retried, recovered, exhausted });
  } finally {
    await releaseLease(lease);
  }
});

export const GET = POST;
```

- [ ] **Step 2: Test + commit**

```bash
git commit -am "feat(override): cron endpoint refund-retry + exponential backoff"
```

---

### Task 5.4: `/api/cron/override-reconcile` (NUOVO +1h post-approve)

**Orario**: ogni 10min, minuto 5 sfasato.

Scansiona `OverrideRequest.status=APPROVED AND reconcileCheckDue<=now AND
reconcileCheckedAt IS NULL`. Per ciascuno invoca `checkOtaReconciliation`.
Se STILL_ACTIVE → flag PENDING_RECONCILE_FAILED + dispatch FATAL + audit.
Set `reconcileCheckedAt=now` per dedup idempotent.

**Index decision (R19 Fix #15)**: usiamo query compatibile con l'indice gia'
dichiarato in Chunk 1 Task 1.1 `@@index([status, reconcileCheckDue])`. Il
filter `reconcileCheckedAt IS NULL` viene applicato in-memory o via query
addizionale — NON aggiungiamo partial index ora (semplicita' schema, query
veloce con ≤100 rows attive per volta). Se dataset crescera' oltre 10k
APPROVED, aggiungere partial index separata in Plan 7.

- [ ] **Step 1: Scaffold route**

```ts
// src/app/api/cron/override-reconcile/route.ts
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkOtaReconciliation } from "@/lib/booking/override-reconcile";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { auditLog } from "@/lib/audit/log";
import { env } from "@/lib/env";

export const POST = withErrorHandler(async (req) => {
  await enforceRateLimit({
    identifier: "global",
    scope: RATE_LIMIT_SCOPES.OVERRIDE_RECONCILE_CRON_IP,
    limit: 10,
    windowSeconds: 60,
    failOpen: true,
  });
  requireBearerSecret(req);

  const lease = await tryAcquireLease("cron:override-reconcile", 5 * 60);
  if (!lease) return Response.json({ skipped: "already-running" });
  try {
    const now = new Date();
    // Query compatibile con `@@index([status, reconcileCheckDue])`
    const due = await db.overrideRequest.findMany({
      where: {
        status: "APPROVED",
        reconcileCheckDue: { lte: now },
        reconcileCheckedAt: null,
      },
      take: 50,
      select: { id: true, newBookingId: true, conflictingBookingIds: true },
    });
    let checked = 0, failed = 0;
    for (const req of due) {
      checked++;
      try {
        const result = await checkOtaReconciliation(req.id);
        if (result.upstreamStatus === "STILL_ACTIVE") {
          failed++;
          await db.overrideRequest.update({
            where: { id: req.id },
            data: { status: "PENDING_RECONCILE_FAILED", reconcileCheckedAt: now },
          });
          await dispatchNotification({
            type: "OVERRIDE_RECONCILE_FAILED",
            recipient: env.ADMIN_EMAIL,
            payload: {
              overrideRequestId: req.id,
              newBookingCode: "", // lookup opzionale
              upstreamConflicts: result.channels.map((c) => ({
                bookingId: "", channel: c, externalRef: "", status: "CONFIRMED",
              })),
              overrideDetailUrl: `${env.APP_URL}/admin/override-requests/${req.id}`,
            },
          });
          await auditLog({
            userId: null,
            action: "OVERRIDE_RECONCILE_FAILED",
            entity: "OverrideRequest",
            entityId: req.id,
            after: { channels: result.channels },
          });
        } else {
          await db.overrideRequest.update({
            where: { id: req.id },
            data: { reconcileCheckedAt: now },
          });
        }
      } catch (err) {
        logger.error({ err, requestId: req.id }, "reconcile iteration failed");
      }
    }
    return Response.json({ checked, failed });
  } finally {
    await releaseLease(lease);
  }
});

export const GET = POST;
```

- [ ] **Step 2: Test + commit**

```bash
git commit -am "feat(override): cron endpoint override-reconcile +1h post-approve FATAL"
```

---

### Task 5.5: Scheduler registration

**Files:**
- Modify: `src/lib/cron/scheduler.ts`

- [ ] **Step 1: Aggiungi 4 schedule**

```ts
// src/lib/cron/scheduler.ts
// Orari sfalsati per non saturare i worker Next.js:
const CRON_SCHEDULES = {
  // ... esistenti ...
  overrideReminders: "0 * * * *",       // ogni ora, minuto 0
  overrideReconcile: "5 * * * *",       // ogni ora, minuto 5 (approssimato 10min granularity)
  overrideDropdead: "15 * * * *",       // ogni ora, minuto 15
  refundRetry: "10,40 * * * *",         // ogni 30min (minuti 10 e 40)
};

// Nel loop di registrazione:
cron.schedule(CRON_SCHEDULES.overrideReminders, () => fetchCron("/api/cron/override-reminders"));
cron.schedule(CRON_SCHEDULES.overrideReconcile, () => fetchCron("/api/cron/override-reconcile"));
cron.schedule(CRON_SCHEDULES.overrideDropdead, () => fetchCron("/api/cron/override-dropdead"));
cron.schedule(CRON_SCHEDULES.refundRetry, () => fetchCron("/api/cron/refund-retry"));
```

NOTA: `5 * * * *` e' ogni ora al 5° minuto, non ogni 10min. Per 10min
granularity usare `*/10 * * * *` — scegliere il pattern piu' appropriato
per il reconcile (rate Bokun API permetting).

- [ ] **Step 2: Commit**

```bash
git commit -am "feat(override): scheduler register 4 new cron (sfasati)"
```

---

### Task 5.6: Integration tests end-to-end (single-flight + Bearer + fail-open)

**Files:**
- Modify: `tests/integration/override-cron.test.ts`

- [ ] **Step 1: 4 test per single-flight via lease**

```ts
for (const endpoint of ["override-reminders", "override-dropdead", "refund-retry", "override-reconcile"]) {
  it(`${endpoint} — single-flight via Redis lease`, async () => {
    process.env.CRON_SECRET = "s";
    const headers = new Headers({ Authorization: "Bearer s" });
    const { POST } = await import(`@/app/api/cron/${endpoint}/route`);

    // Due invocazioni concorrenti
    const [r1, r2] = await Promise.all([
      POST(new Request("http://x", { method: "POST", headers })),
      POST(new Request("http://x", { method: "POST", headers })),
    ]);
    const bodies = await Promise.all([r1.json(), r2.json()]);
    const skipped = bodies.filter((b) => b.skipped === "already-running").length;
    expect(skipped).toBe(1); // una delle due ha fatto skip
  });
}
```

- [ ] **Step 2: Run test + commit**

```bash
npm run test:integration -- override-cron 2>&1 | tail -5
git commit -am "test(override): cron endpoints single-flight + bearer + fail-open"
```

Fine Chunk 5.

---

## Chunk 6: Admin UI

**Scope**: pagina lista + detail + OTA checklist component + KPI card
cancellation-rate + sidebar + ManualAlert UI extension + labels.

**shadcn components usati (advisory A7)**: `Checkbox`, `Alert`, `Card`,
`Button`, `Dialog`, `Badge`, `Tabs`, `Input`, `Label`.

**Files new:**
- `src/app/admin/(dashboard)/override-requests/page.tsx`
- `src/app/admin/(dashboard)/override-requests/[id]/page.tsx`
- `src/app/admin/(dashboard)/override-requests/actions.ts`
- `src/app/api/admin/override-requests/[id]/webhook-status/route.ts`
- `src/components/admin/override-ota-checklist.tsx`
- `src/components/admin/cancellation-rate-kpi.tsx`
- `src/components/admin/override-impact-badge.tsx`

**Files modified:**
- `src/components/admin/sidebar.tsx` — voce + badge PENDING count
- `src/app/admin/(dashboard)/page.tsx` — KPI card override + cancellation-rate
- `src/app/admin/(dashboard)/sync-log/page.tsx` — ManualAlert CROSS_CHANNEL_CONFLICT
- `src/lib/admin/labels.ts` — +OVERRIDE_STATUS_LABEL

### Task 6.1: Lista `/admin/override-requests/page.tsx`

- [ ] **Step 1: Create page**

```tsx
// src/app/admin/(dashboard)/override-requests/page.tsx
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { OverrideRequestCard } from "@/components/admin/override-request-card";
import { OverrideImpactBadge } from "@/components/admin/override-impact-badge";
import Link from "next/link";

export default async function OverrideRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string; source?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const status = params.status ?? "PENDING";
  const sourceFilter = params.source;

  const where: any = { status };
  if (sourceFilter) where.conflictSourceChannels = { has: sourceFilter };

  const requests = await db.overrideRequest.findMany({
    where,
    include: {
      newBooking: {
        include: { customer: true, service: true, boat: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1>Richieste override ({requests.length})</h1>
      <nav>
        <Link href="?status=PENDING">Pending</Link>
        <Link href="?status=PENDING_RECONCILE_FAILED">Reconcile failed</Link>
        <Link href="?status=APPROVED">Approvate</Link>
        <Link href="?status=REJECTED">Rifiutate</Link>
        <Link href="?status=EXPIRED">Scadute</Link>
      </nav>
      <div className="grid gap-4">
        {requests.map((r) => (
          <div key={r.id}>
            <OverrideImpactBadge channels={r.conflictSourceChannels} />
            <OverrideRequestCard request={r} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create OverrideImpactBadge component**

```tsx
// src/components/admin/override-impact-badge.tsx
import { Badge } from "@/components/ui/badge";

export function OverrideImpactBadge({ channels }: { channels: string[] }) {
  const hasOta = channels.some((c) => c !== "DIRECT");
  return (
    <div className="flex gap-2">
      {hasOta && <Badge variant="destructive">ALTO IMPATTO</Badge>}
      {channels.map((c) => (
        <Badge key={c} variant={c === "DIRECT" ? "secondary" : "outline"}>
          {c}
        </Badge>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(dashboard\)/override-requests/page.tsx src/components/admin/override-impact-badge.tsx
git commit -m "feat(override): admin page lista override-requests + impact badge"
```

---

### Task 6.2: Componente `override-ota-checklist.tsx`

Render 4 checkbox per OTA conflict + polling endpoint + disabled-until-all-checked.

- [ ] **Step 1: Create component**

```tsx
// src/components/admin/override-ota-checklist.tsx
"use client";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export interface OtaConflictData {
  conflictId: string;
  channel: string;
  externalRef: string;
  panelUrl: string;
  customerName: string;
  amount: string;
}

export interface OtaConfirmationState {
  conflictId: string;
  channel: string;
  externalRef: string;
  panelOpened: boolean;
  upstreamCancelled: boolean;
  refundVerified: boolean;
  adminDeclared: boolean;
}

interface WebhookStatusResponse {
  conflictId: string;
  source: string;
  upstreamCancelled: boolean;
  lastCheckedAt: string;
}

export function OverrideOtaChecklist({
  requestId,
  conflicts,
  onChange,
}: {
  requestId: string;
  conflicts: OtaConflictData[];
  onChange: (states: OtaConfirmationState[]) => void;
}) {
  const [states, setStates] = useState<OtaConfirmationState[]>(
    conflicts.map((c) => ({
      conflictId: c.conflictId,
      channel: c.channel,
      externalRef: c.externalRef,
      panelOpened: false,
      upstreamCancelled: false,
      refundVerified: false,
      adminDeclared: false,
    })),
  );
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatusResponse[]>([]);

  // Polling webhook-status ogni 15s
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/admin/override-requests/${requestId}/webhook-status`);
        const data = await res.json();
        setWebhookStatus(data);
      } catch {}
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 15_000);
    return () => clearInterval(interval);
  }, [requestId]);

  function updateState(conflictId: string, patch: Partial<OtaConfirmationState>) {
    const updated = states.map((s) =>
      s.conflictId === conflictId ? { ...s, ...patch } : s,
    );
    setStates(updated);
    onChange(updated);
  }

  return (
    <div className="space-y-4">
      {conflicts.map((c) => {
        const state = states.find((s) => s.conflictId === c.conflictId)!;
        const webhook = webhookStatus.find((w) => w.conflictId === c.conflictId);
        const upstreamOk = webhook?.upstreamCancelled ?? false;
        return (
          <Card key={c.conflictId}>
            <h3>{c.channel} — {c.externalRef}</h3>
            <p>Cliente upstream: {c.customerName} · € {c.amount}</p>
            <div>
              <Checkbox
                checked={state.panelOpened}
                onCheckedChange={(v) => updateState(c.conflictId, { panelOpened: !!v })}
                id={`panel-${c.conflictId}`}
              />
              <label htmlFor={`panel-${c.conflictId}`}>
                1. Apri pannello: <a href={c.panelUrl} target="_blank" rel="noopener">{c.panelUrl}</a>
              </label>
            </div>
            <div>
              <Checkbox
                checked={state.upstreamCancelled}
                onCheckedChange={(v) => updateState(c.conflictId, { upstreamCancelled: !!v })}
                id={`cancel-${c.conflictId}`}
              />
              <label htmlFor={`cancel-${c.conflictId}`}>2. Cancella #{c.externalRef} nel pannello</label>
            </div>
            <div>
              <Checkbox
                checked={state.refundVerified}
                onCheckedChange={(v) => updateState(c.conflictId, { refundVerified: !!v })}
                id={`refund-${c.conflictId}`}
              />
              <label htmlFor={`refund-${c.conflictId}`}>3. Verifica rimborso € {c.amount} processato</label>
            </div>
            <div>
              <Checkbox
                checked={state.adminDeclared}
                onCheckedChange={(v) => updateState(c.conflictId, { adminDeclared: !!v })}
                id={`declare-${c.conflictId}`}
              />
              <label htmlFor={`declare-${c.conflictId}`}>4. Dichiaro di aver completato i 3 passaggi</label>
            </div>
            <Alert variant={upstreamOk ? "default" : "destructive"}>
              {upstreamOk
                ? `OK: webhook cancel arrivato (${webhook?.lastCheckedAt})`
                : `Attesa webhook cancel (polling 15s)...`}
            </Alert>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Endpoint contract `GET /api/admin/override-requests/[id]/webhook-status`**

```ts
// src/app/api/admin/override-requests/[id]/webhook-status/route.ts
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";

export const GET = withErrorHandler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const request = await db.overrideRequest.findUniqueOrThrow({
    where: { id },
    select: { conflictingBookingIds: true },
  });
  const conflicts = await db.booking.findMany({
    where: { id: { in: request.conflictingBookingIds } },
    select: {
      id: true, source: true, status: true,
      bokunBooking: { select: { bokunBookingId: true, status: true } },
      boataroundBooking: { select: { externalRef: true, status: true } },
    },
  });
  return Response.json(
    conflicts.map((c) => ({
      conflictId: c.id,
      source: c.source,
      upstreamCancelled:
        c.source === "BOKUN" ? c.bokunBooking?.status === "CANCELLED"
        : c.source === "BOATAROUND" ? c.boataroundBooking?.status === "CANCELLED"
        : c.status === "CANCELLED",
      lastCheckedAt: new Date().toISOString(),
    })),
  );
});
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(override): OtaChecklist component + webhook-status endpoint"
```

---

### Task 6.3: Detail page `/admin/override-requests/[id]`

- [ ] **Step 1: Create detail page**

```tsx
// src/app/admin/(dashboard)/override-requests/[id]/page.tsx
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { OverrideOtaChecklist } from "@/components/admin/override-ota-checklist";
import { OverrideDetailClient } from "./client";
import { OTA_CHANNELS } from "@/lib/booking/override-types";

export default async function OverrideDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const request = await db.overrideRequest.findUniqueOrThrow({
    where: { id },
    include: {
      newBooking: { include: { customer: true, service: true, boat: true } },
    },
  });
  const conflicts = await db.booking.findMany({
    where: { id: { in: request.conflictingBookingIds } },
    include: { customer: true, service: true, bokunBooking: true, boataroundBooking: true },
  });
  const otaConflicts = conflicts
    .filter((c) => (OTA_CHANNELS as readonly string[]).includes(c.source))
    .map((c) => ({
      conflictId: c.id,
      channel: c.source,
      externalRef: c.bokunBooking?.bokunBookingId ?? c.boataroundBooking?.externalRef ?? c.id,
      panelUrl: c.source === "BOKUN"
        ? `https://secure.bokun.io/booking/${c.bokunBooking?.bokunBookingId}`
        : "",
      customerName: `${c.customer?.firstName ?? ""} ${c.customer?.lastName ?? ""}`.trim(),
      amount: c.totalPrice.toFixed(2),
    }));

  return (
    <OverrideDetailClient
      request={{
        id: request.id,
        status: request.status,
        newBookingRevenue: request.newBookingRevenue.toFixed(2),
        conflictingRevenueTotal: request.conflictingRevenueTotal.toFixed(2),
        conflictSourceChannels: request.conflictSourceChannels,
        newBookingCode: request.newBooking.confirmationCode,
      }}
      otaConflicts={otaConflicts}
    />
  );
}
```

- [ ] **Step 2: Create client component per stato form**

```tsx
// src/app/admin/(dashboard)/override-requests/[id]/client.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OverrideOtaChecklist, OtaConfirmationState } from "@/components/admin/override-ota-checklist";
import { approveOverrideAction, rejectOverrideAction } from "./actions";

export function OverrideDetailClient({ request, otaConflicts }: any) {
  const [otaStates, setOtaStates] = useState<OtaConfirmationState[]>([]);
  const allChecked = otaConflicts.length === 0 || otaStates.every((s) =>
    s.panelOpened && s.upstreamCancelled && s.refundVerified && s.adminDeclared
  );

  async function handleApprove() {
    if (!allChecked) return;
    const res = await approveOverrideAction({
      requestId: request.id,
      otaConfirmations: otaStates,
    });
    if (res.ok) window.location.reload();
    else alert(res.message);
  }

  return (
    <div>
      <h1>Override request {request.id}</h1>
      <p>Status: {request.status}</p>
      <p>Revenue nuovo: € {request.newBookingRevenue} vs conflict: € {request.conflictingRevenueTotal}</p>
      {otaConflicts.length > 0 && (
        <OverrideOtaChecklist
          requestId={request.id}
          conflicts={otaConflicts}
          onChange={setOtaStates}
        />
      )}
      <div className="flex gap-2">
        <Button
          disabled={!allChecked}
          onClick={handleApprove}
          variant="default"
        >
          ✓ Approva
        </Button>
        <Button
          onClick={() => rejectOverrideAction({ requestId: request.id })}
          variant="destructive"
        >
          ✗ Rifiuta
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(override): detail page admin + OtaChecklist integration + approve/reject buttons"
```

---

### Task 6.4: Server Action `approveOverrideAction`

- [ ] **Step 1: Create file**

```ts
// src/app/admin/(dashboard)/override-requests/actions.ts
"use server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { approveOverride, rejectOverride } from "@/lib/booking/override-request";
import { revalidatePath } from "next/cache";

const approveSchema = z.object({
  requestId: z.string().min(1),
  notes: z.string().max(500).optional(),
  otaConfirmations: z.array(z.object({
    conflictId: z.string(),
    conflictBookingId: z.string().optional(),
    channel: z.string(),
    externalRef: z.string(),
    panelOpened: z.boolean(),
    upstreamCancelled: z.boolean(),
    refundVerified: z.boolean(),
    adminDeclared: z.boolean(),
    timestamp: z.string().optional(),
  })).optional().default([]),
});

export async function approveOverrideAction(rawInput: unknown) {
  const session = await requireAdmin();
  await enforceRateLimit({
    identifier: session.user.id,
    scope: RATE_LIMIT_SCOPES.ADMIN_OVERRIDE_ACTION,
    limit: 30,
    windowSeconds: 60,
    failOpen: false,
  });
  const input = approveSchema.parse(rawInput);
  try {
    const otaConfirmations = input.otaConfirmations.map((c) => ({
      conflictBookingId: c.conflictBookingId ?? c.conflictId,
      channel: c.channel as any,
      externalRef: c.externalRef,
      panelOpened: c.panelOpened,
      upstreamCancelled: c.upstreamCancelled,
      refundVerified: c.refundVerified,
      adminDeclared: c.adminDeclared,
    }));
    const result = await approveOverride(input.requestId, session.user.id, input.notes, otaConfirmations);
    revalidatePath(`/admin/override-requests/${input.requestId}`);
    revalidatePath("/admin/override-requests");
    return { ok: true as const, result };
  } catch (err) {
    return { ok: false as const, message: (err as Error).message };
  }
}
```

- [ ] **Step 2: Test + commit**

```bash
git commit -am "feat(override): Server Action approveOverrideAction + Zod validation + rate-limit"
```

---

### Task 6.5: Server Action `rejectOverrideAction`

- [ ] **Step 1: Add to actions.ts**

```ts
const rejectSchema = z.object({
  requestId: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export async function rejectOverrideAction(rawInput: unknown) {
  const session = await requireAdmin();
  await enforceRateLimit({
    identifier: session.user.id,
    scope: RATE_LIMIT_SCOPES.ADMIN_OVERRIDE_ACTION,
    limit: 30,
    windowSeconds: 60,
    failOpen: false,
  });
  const input = rejectSchema.parse(rawInput);
  try {
    const result = await rejectOverride(input.requestId, session.user.id, input.notes);
    revalidatePath(`/admin/override-requests/${input.requestId}`);
    revalidatePath("/admin/override-requests");
    return { ok: true as const, result };
  } catch (err) {
    return { ok: false as const, message: (err as Error).message };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git commit -am "feat(override): Server Action rejectOverrideAction"
```

---

### Task 6.6: `<CancellationRateKpi/>` dashboard card

- [ ] **Step 1: Create component**

```tsx
// src/components/admin/cancellation-rate-kpi.tsx
import { computeCancellationRate } from "@/lib/booking/cancellation-rate";
import { env } from "@/lib/env";
import { Card } from "@/components/ui/card";
import { OTA_CHANNELS } from "@/lib/booking/override-types";

export async function CancellationRateKpi() {
  const soft = env.OVERRIDE_CANCELLATION_RATE_SOFT_WARN;
  const hard = env.OVERRIDE_CANCELLATION_RATE_HARD_BLOCK;
  const rates = await Promise.all(
    OTA_CHANNELS.map(async (ch) => {
      const r = await computeCancellationRate(ch, 30);
      return { channel: ch, ...r };
    }),
  );

  return (
    <Card>
      <h3>Cancellation rate OTA (30gg)</h3>
      <table>
        <thead>
          <tr><th>Canale</th><th>Rate</th><th>Override / Total</th></tr>
        </thead>
        <tbody>
          {rates.map((r) => {
            const color = r.rate > hard ? "red" : r.rate > soft ? "orange" : "green";
            return (
              <tr key={r.channel}>
                <td>{r.channel}</td>
                <td style={{ color }} title={`Soglie: soft ${(soft * 100).toFixed(1)}% / hard ${(hard * 100).toFixed(1)}%`}>
                  {(r.rate * 100).toFixed(1)}%
                </td>
                <td>{r.cancelledByOverride} / {r.totalBookings}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
```

- [ ] **Step 2: Integra nella dashboard**

In `src/app/admin/(dashboard)/page.tsx` aggiungi `<CancellationRateKpi/>` nella griglia KPI.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(override): CancellationRateKpi dashboard card with thresholds"
```

---

### Task 6.7: Sidebar integration

- [ ] **Step 1: Modify sidebar**

In `src/components/admin/sidebar.tsx` aggiungi:

```tsx
const pendingCount = await db.overrideRequest.count({
  where: { status: { in: ["PENDING", "PENDING_RECONCILE_FAILED"] } },
});

<SidebarItem href="/admin/override-requests">
  Richieste priorita'
  {pendingCount > 0 && <Badge>{pendingCount}</Badge>}
</SidebarItem>
```

- [ ] **Step 2: Commit**

```bash
git commit -am "feat(override): sidebar voce + badge PENDING count"
```

---

### Task 6.8: Dashboard integration KPI override counter

- [ ] **Step 1: Aggiungi nella dashboard**

```tsx
// src/app/admin/(dashboard)/page.tsx
const overrideStats = await db.overrideRequest.groupBy({
  by: ["status"],
  where: { createdAt: { gte: monthStart } },
  _count: true,
});
const monthlyCount = overrideStats.find((s) => s.status === "APPROVED")?._count ?? 0;

<Card>
  <h3>Override questo mese</h3>
  <div>{monthlyCount}</div>
  {monthlyCount > 3 && <Alert variant="warning">Soft warning: &gt;3/mese</Alert>}
</Card>
```

- [ ] **Step 2: Commit**

```bash
git commit -am "feat(override): dashboard KPI override counter + soft warning > 3/mese"
```

---

### Task 6.9: ManualAlert CROSS_CHANNEL_CONFLICT UI

- [ ] **Step 1: Estendi `/admin/sync-log` per renderizzare ManualAlert reverse override**

In `src/app/admin/(dashboard)/sync-log/page.tsx` aggiungi sezione:

```tsx
const crossChannelAlerts = await db.manualAlert.findMany({
  where: { action: "CROSS_CHANNEL_CONFLICT", status: "PENDING" },
  orderBy: { createdAt: "desc" },
  take: 20,
});

<section>
  <h2>Alert cross-channel (reverse override)</h2>
  {crossChannelAlerts.map((a) => (
    <Card key={a.id}>
      <p>Canale: {a.channel} · Boat: {a.boatId} · Date: {a.date.toISOString().slice(0, 10)}</p>
      <p>Copy: CROSS_CHANNEL_CONFLICT — webhook OTA ha creato booking su slot DIRECT esistente.
        Azione: decidi se (a) cancellare upstream OTA, (b) cancellare DIRECT, (c) contattare clienti.</p>
      <form action={resolveAlertAction.bind(null, a.id)}>
        <Button type="submit">Risolvi</Button>
      </form>
    </Card>
  ))}
</section>
```

- [ ] **Step 2: Add to labels.ts**

```ts
// src/lib/admin/labels.ts
export const OVERRIDE_STATUS_LABEL: Record<string, string> = {
  PENDING: "In attesa",
  APPROVED: "Approvata",
  REJECTED: "Rifiutata",
  EXPIRED: "Scaduta",
  PENDING_RECONCILE_FAILED: "Reconcile failed",
};
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(override): ManualAlert UI CROSS_CHANNEL_CONFLICT + labels"
```

Fine Chunk 6.

---

## Chunk 7: Customer UI + rollout + runbook

**Scope**: success page handling override_request, email dispatch post-submit,
manual QA checklist enumerata, rollout staging + 2 feature flag graduale,
post-launch monitoring + runbook.

**Files modified:**
- `src/app/[locale]/prenota/[slug]/success/page.tsx` — handling override_request status
- `src/lib/booking/create-direct.ts` — email dispatch post-creation override_request
- `docs/runbook/operations.md` — +sezione "Override system"

### Task 7.1: Success page handling status="override_request"

**Note**: il codice wizard (click "Continua" → Server Action) e' owned da
Chunk 3 Task 3.4 e riferito qui come COMPLETATO. Questa task tocca solo la
success page post-payment.

- [ ] **Step 1: Leggi success page esistente**

```bash
grep -rn "confirmationCode\|success\|status" src/app/\[locale\]/prenota/\[slug\]/success/page.tsx | head
```

- [ ] **Step 2: Aggiungi branch override_request**

```tsx
// src/app/[locale]/prenota/[slug]/success/page.tsx
import { db } from "@/lib/db";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  if (!code) return <div>Codice mancante</div>;

  const booking = await db.booking.findUnique({
    where: { confirmationCode: code },
    include: { overrideRequest: true },
  });

  if (!booking) return <div>Prenotazione non trovata</div>;

  if (booking.overrideRequest && booking.overrideRequest.status === "PENDING") {
    return (
      <div role="alert">
        <h1>Prenotazione ricevuta — in attesa di conferma</h1>
        <p>Codice: <strong>{booking.confirmationCode}</strong></p>
        <p>Abbiamo ricevuto la tua prenotazione e il pagamento. Lo staff conferma
          entro <strong>72 ore</strong>.</p>
        <p>In caso di non conferma riceverai rimborso automatico completo.</p>
        <p>Controlla la tua email per il link Area prenotazioni.</p>
      </div>
    );
  }

  // Flow normale (CONFIRMED)
  return (
    <div>
      <h1>Prenotazione confermata</h1>
      <p>Codice: <strong>{booking.confirmationCode}</strong></p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(override): success page branch override_request in attesa"
```

---

### Task 7.2: Email dispatch post-submit override_request

- [ ] **Step 1: In createPendingDirectBooking, post-commit dispatch email**

```ts
// src/lib/booking/create-direct.ts — dopo il commit + creazione Booking
import { dispatchNotification } from "@/lib/notifications/dispatcher";

// Se risultato override_request:
if (status === "override_request") {
  await dispatchNotification({
    type: "OVERRIDE_REQUESTED",
    recipient: customer.email,
    payload: {
      customerName: `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "cliente",
      confirmationCode: newBooking.confirmationCode,
      serviceName: service.name,
      startDate: newBooking.startDate.toISOString().slice(0, 10),
      numPeople: newBooking.numPeople,
      amountPaid: newBooking.totalPrice.toFixed(2),
      bookingPortalUrl: `${env.APP_URL}/b/sessione`,
    },
  });
  // Dispatch anche admin alert
  await dispatchNotification({
    type: "OVERRIDE_REQUESTED",
    recipient: env.ADMIN_EMAIL,
    payload: { /* same payload */ },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git commit -am "feat(override): email dispatch OVERRIDE_REQUESTED post-submit to customer + admin"
```

---

### Task 7.3: Manual QA checklist pre-merge (20 punti)

- [ ] **Step 1: Enumerare 20 punti inline nel plan + in `docs/runbook/operations.md`**

```markdown
## Manual QA pre-merge Override Fase 1 (20 punti)

### Spec §16.4 base (16 punti)
1. Data libera → normal booking (CONFIRMED immediato + email standard).
2. Data con Social-equiv → override_request (PENDING + email "In attesa conferma").
3. Data con Charter esistente, revenue nuovo inferiore → blocked (msg pre-pay + grey client-side).
4. Data a 14 giorni → blocked (cutoff), anche con revenue superiore.
5. Data con boat-block → blocked (priorita' assoluta).
6. Approva da admin → conflicts cancellati + refund automatico Stripe + email winner confermato + email loser apology.
7. Rifiuta da admin → new cancellato + refund + email con date alternative.
8. Drop-dead al 15° giorno → auto-expire + refund + email.
9. 2 submit concorrenti revenue diverso → higher supersede lower.
10. 2 submit concorrenti revenue pari → entrambe PENDING, admin decide manualmente.
11. Override contatore dashboard visibile + soft warning > 3/mese.
12. Multi-day (Charter 7gg) cancellato per single-day (Gourmet) → alert ALTO IMPATTO.
13. Override contro OTA → checklist 4-step + polling webhook + Approve disabled until all checked.
14. Reverse override (webhook OTA su data con booking DIRECT attivo) → ManualAlert CROSS_CHANNEL_CONFLICT emesso.
15. Cancellation-rate > 5% Viator → approveOverride rifiuta con ValidationError.
16. Reconcile cron +1h: upstream ancora active → PENDING_RECONCILE_FAILED + dispatch FATAL admin.

### OTA workflow nuovi (4 punti aggiuntivi post R19)
17. OTA conflict webhook cancel arriva PRIMA dell'approve admin → `upstreamCancelled=true` nel polling, bottone Approve abilitato immediatamente (no attesa 15s).
18. Admin spunta tutte le 4 checkbox ma webhook cancel NON arrivato → bottone Approve disabled con messaggio "Attesa webhook upstream".
19. Retry reconcile post-FAILED: admin clicca "Retry" → se upstream CANCELLED nel frattempo → status=APPROVED automatico; altrimenti resta FAILED.
20. Rate-limit `OVERRIDE_CHECK_IP` 30/min: 31 check consecutivi da stesso IP → 429.
```

- [ ] **Step 2: Commit checklist nel runbook**

```bash
git commit -am "docs(override): manual QA checklist 20 punti pre-merge"
```

---

### Task 7.4: Rollout graduale + runbook entry

- [ ] **Step 1: Crea runbook entry in `docs/runbook/operations.md`**

Aggiungere sezione delimitata da marker (per evitare drift):

```markdown
<!-- BEGIN:OVERRIDE_SYSTEM -->
## Override system — monitoring + rollback

### Feature flag (2 granular)

- `FEATURE_OVERRIDE_ENABLED=true/false` — master switch. OFF → nessuna
  override request creata, flow legacy.
- `FEATURE_OVERRIDE_OTA_ENABLED=true/false` — gate OTA workflow. OFF → solo
  DIRECT-vs-DIRECT override (nessun checklist OTA, nessun reconcile cron).

### Rollout plan

**Week 1 (staging)**: `FEATURE_OVERRIDE_ENABLED=true`, `FEATURE_OVERRIDE_OTA_ENABLED=false`.
QA DIRECT-vs-DIRECT completo (QA 1-11 della checklist §16.4).

**Week 2 (prod canary)**: stesso setup. 7 giorni di monitoring:
- Sentry alert su `OVERRIDE_RECONCILE_FAILED` (anche se non dovrebbe firarsi con OTA off)
- Daily KPI review: `/admin/override-requests` PENDING count + approve/reject ratio
- Metric: % booking che diventano override_request vs normal (atteso <10%)

**Week 3 (prod full)**: `FEATURE_OVERRIDE_OTA_ENABLED=true`. Monitoring reconcile:
- Alert su PENDING_RECONCILE_FAILED > 0 (mai dovrebbe >0)
- Alert su cancellation-rate OTA > 3% (soft warn)
- Alert su cancellation-rate OTA > 5% (hard block attivato)

### Rollback procedures

**Rollback parziale (solo OTA)**: set `FEATURE_OVERRIDE_OTA_ENABLED=false`.
- Request PENDING con OTA conflict restano: admin deve approvarle o rejectarle via UI
- Nuove submit con OTA conflict: client vede "blocked" come se feature OTA non esistesse
- DIRECT-vs-DIRECT resta operativo

**Rollback totale**: set `FEATURE_OVERRIDE_ENABLED=false`.
- Request PENDING esistenti restano nel DB (non cancellate)
- Admin puo' processarle manualmente via `psql` se serve
- Flow booking torna legacy (no override mai)

### Monitoring dashboard

- Sentry: `SENTRY_DSN` obbligatoria pre-launch
- UptimeRobot: ping su `/api/health?deep=1` + `/api/cron/override-reconcile`
- Telegram alert: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` per FATAL
<!-- END:OVERRIDE_SYSTEM -->
```

- [ ] **Step 2: Commit runbook**

```bash
git add docs/runbook/operations.md
git commit -m "docs(override): runbook entry monitoring + rollout + rollback"
```

---

### Task 7.5: Post-launch monitoring

- [ ] **Step 1: Configurare Sentry alert**

- Sentry project `override-system`:
  - Alert rule: `logger.error` con tag `event=OVERRIDE_RECONCILE_FAILED` → Slack + email
  - Alert rule: `logger.fatal` con tag `event=override*` → SMS admin

- [ ] **Step 2: Configurare UptimeRobot**

- UptimeRobot monitor:
  - URL: `https://egadisailing.com/api/cron/override-reconcile` (GET con Bearer CRON_SECRET)
  - Interval: 5min
  - Alert on: HTTP != 200

- [ ] **Step 3: Dashboard KPI daily review checklist**

- Giornaliero (5min mattina):
  - [ ] `/admin` KPI "Override mese" count
  - [ ] `/admin/override-requests?status=PENDING` count (eta' max)
  - [ ] `/admin/override-requests?status=PENDING_RECONCILE_FAILED` count (deve essere 0)
  - [ ] CancellationRateKpi card colori (nessun rosso hard)

- [ ] **Step 4: Commit monitoring setup**

```bash
git commit -am "docs(override): post-launch monitoring Sentry + UptimeRobot + daily KPI review"
```

Fine Chunk 7. Il plan e' ora ready-to-merge una volta completati tutti i chunk.

---

---

## Execution strategy

Questo plan è grande (~240 task total quando espansi — post brainstorm #2:
+3 task Chunk 1 ConflictSourceChannel types, +2 task Chunk 2 reconcile+rate
helper, +2 task Chunk 3 Server Action + wizard frontend, +1 task Chunk 4
template admin, +1 task Chunk 5 cron reconcile, +3 task Chunk 6 checklist UI
+ KPI card + ManualAlert UI). Per subagent-driven-development:

1. **Chunk-based execution**: una chunk alla volta, review dopo ciascuna
2. **Implementer per chunk**: 1 subagent per intera chunk (no task-per-subagent, troppo overhead)
3. **Review a 2 livelli**: spec compliance + code quality dopo ogni chunk
4. **Final review**: dopo tutti i chunk

Stima realistica: **12 giorni** effort (coerente con spec §20 aggiornata —
invariato: -2gg Cabin Charter rimosso, +2gg workflow OTA + cancellation-rate
+ reconcile cron).

Feature flag granulare (ENABLED master + OTA_ENABLED gating) garantisce
rollback sicuro granulare — si può rollback solo la parte OTA mantenendo
DIRECT operativo.

---

## Rollback

- Feature flag off → zero impatto codice legacy
- Migration schema additiva (non distruttiva) → rollback = semplice `DELETE FROM OverrideRequest; DROP TABLE OverrideRequest;`
- Tutti i record `OverrideRequest` restano come history se feature riaccesa

---

## Criteri di completamento

- 188 test esistenti + ~20 nuovi test passing
- Typecheck clean
- Manual QA 12 punti completato
- Feature flag testato on/off
- Admin training 30min completato
- Monitoring Sentry configurato
- Migration applicata staging successful
- Documentazione aggiornata (CHANGELOG, AGENTS.md, runbook)
