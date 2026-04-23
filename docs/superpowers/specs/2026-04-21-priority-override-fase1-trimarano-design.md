# Sistema priorità + override booking — Fase 1 (Trimarano)

**Data**: 2026-04-21
**Status**: approved (post brainstorm con proprieta', 12 domande decise)
**Scope**: Trimarano only · 3 pacchetti · full-day/multi-day · no half-day

Brainstorm sorgente: discussione sessione 2026-04-21.
Documento cliente parallelo: `docs/client/2026-04-21-sistema-priorita-prenotazioni.md`.

---

## 1. Problema

Oggi il calendario tratta tutte le esperienze equamente: first-booked =
first-served. Un **Giornaliero Social** (€600-1.950) prenotato per un sabato
blocca lo stesso slot per un **Charter** (€7.500) o **Gourmet** (€2.000-3.000)
che arriverebbe dopo. Stima conservativa perdita: **€30-40.000/anno** di
revenue non catturato in alta stagione.

## 2. Obiettivo

Permettere a una richiesta di valore **revenue superiore** di scavalcare una
prenotazione preesistente a revenue inferiore, con **decisione admin esplicita**
e **protezione del cliente** nelle 2 settimane prima della data.

## 3. Non-goal (esplicito)

- Motoscafo con pacchetti half-day → **Fase 2** separata (brainstorm futuro)
- Social Giornaliero condiviso sul Trimarano → **rimosso dal catalogo**
- Override automatico (senza admin) → deciso contrario
- Regole basate su lettera priorità A/B/C → deciso: revenue e' re, lettere
  sono solo label descrittive per ordinamento UI admin
- Backfill retroattivo booking preesistenti → nessun booking esistente al go-live
- Override su blocco manutenzione admin → manutenzione ha priorita' assoluta

## 4. Catalogo Trimarano (post-modifica)

| # | Pacchetto | Durata | Modello prezzo | Esempi revenue |
|---|---|---|---|---|
| 1 | **Gourmet** | 1 giorno | Fisso gruppo | €2.000 (bassa) / ~€3.000 (alta) |
| 2 | **Charter** | 3-7 giorni | Fisso settimana | €7.500 (bassa) |
| 3 | **Cabin Charter** | 7 giorni | €2.500 × N cabine vendute (1-3) | €2.500 / €5.000 / €7.500 |

**Vendita**:
- Gourmet: 1 booking per 1 cliente (paga per il gruppo 8-10 pax)
- Charter: 1 booking per 1 cliente (paga per il gruppo 6 pax)
- Cabin Charter: **fino a 3 booking separati** (1 per cabina), ognuno 2 pax

## 5. Regole di override (decisioni brainstorm)

### 5.1 Regola revenue (sempre applicata)

Override eligibile se e solo se:

```
revenue(new_booking) > revenue(existing_conflicting_bookings_sum)
```

Dove:
- `revenue(new_booking)` = prezzo calcolato dal `quotePrice()` helper per il
  nuovo pacchetto + data + numPax specificati dal cliente
- `revenue(existing_conflicting_bookings_sum)` = **somma** dei `totalPrice`
  dei booking attivi (`PENDING|CONFIRMED`) che overlappano la data del nuovo.
  Per Cabin Charter parzialmente venduto = solo cabine vendute (non potenziale).

### 5.2 Finestra 15 giorni (cutoff)

Override eligibile **solo se**:

```
daysToExperience(today, experience_date) > 15
```

Esattamente `> 15` (strict): a 15 giorni esatti → blocked.
A 16 giorni → eligibile. `dropDeadAt = experience_date - 15 days` (computed
alla creazione): cron espira `OverrideRequest` quando `dropDeadAt <= now`.
Coerenza: un nuovo submit a 15.5 giorni e' blocked; un request esistente
creato a 16 gg attraversa la soglia a 15.0 gg e viene expired.

Se `≤ 15 giorni` all'esperienza: override disabilitato. Il cliente che ha
prenotato per primo e' "protetto" nelle 2 settimane prima della data.

### 5.3 Boat-block manuale (priorita' assoluta)

Se esiste `BoatAvailability.status=BLOCKED AND lockedByBookingId=null` su
quella data (blocco manuale admin per manutenzione/ferie), **nessun override
possibile** indipendentemente da revenue o finestra. Il boat-block vince
sempre.

### 5.4 Priorita' lettera A/B/C (SOLO ordinamento UI admin)

`Service.priority Int @default(5)` resta nel DB ma **non influenza** la
decisione override. Usata solo per:
- Ordinamento lista pacchetti in admin /servizi
- Eventuale sorting secondario in dashboard override request

## 6. Flusso cliente

### 6.1 Calendario: tutte le date selezionabili

Il customer-facing booking wizard mostra **tutte le date selezionabili** per
qualsiasi pacchetto. Nessuna pre-filtrazione lato client basata su priorita'.
Il check avviene al submit.

**Eccezione**: date nel passato + date con boat-block manuale = grey disabled.

### 6.2 Validazione al submit

Quando il cliente clicca "Conferma e paga", il server eseguira' il check
pre-payment (server action in `create-direct.ts` + nuovo helper
`override-eligibility.ts`):

```
Input:
  - boatId
  - serviceId (nuovo pacchetto)
  - startDate, endDate
  - numPax
  - totale calcolato (via quotePrice)

Output:
  - status: "normal" | "override_request" | "blocked"
  - reason?: "within_15_day_cutoff" | "insufficient_revenue" | "boat_block"
  - conflictingBookingIds?: string[]
  - conflictingRevenue?: Decimal
```

#### Scenario A — Data libera, no conflitti
- `status: "normal"` → booking creato CONFIRMED direttamente (via Stripe flow attuale)

#### Scenario B — Conflitti, revenue nuovo > esistenti, > 15gg
- `status: "override_request"` → **nessun warning cliente** (decisione 8.1)
- Customer paga normalmente via Stripe
- Booking creato in **PENDING** con flag `overrideRequestId` settato
- Riceve **email "Prenotazione in attesa di conferma entro 24-72 ore"**
- Admin riceve alert in dashboard

#### Scenario C — Blocked (revenue insufficiente OR ≤ 15gg OR boat-block)
- `status: "blocked"` → **messaggio pre-payment**: *"Siamo spiacenti, la data
  non e' piu' disponibile per questo pacchetto"*
- **Greying client-side** della data nel calendario di Laura (sessionStorage,
  persistenza solo di sessione browser — refresh OK, chiusura tab reset)
- NESSUN addebito Stripe
- Email automatica con **date alternative libere** (3 prossime bookabili per
  quel pacchetto) → integrato con template R29

### 6.3 2 richieste concorrenti sullo stesso slot

Scenario: Laura submit Gourmet €2.000 alle 10:00:00. Sofia submit Charter
€7.500 per range che include la data di Laura alle 10:00:05.

**Logica** (decisione 8.6):

```
Al submit di Sofia:
  1. Advisory lock `override-slot:boatId:isoDay(startDate)` (tx-scoped,
     namespace dedicato separato da "booking-slot" gia' usato in R28)
  2. Verifica esistono OverrideRequest PENDING per lo stesso slot
  3. Se esiste (Laura) AND revenue(Sofia) > revenue(Laura):
     a. Chiama `supersedeInferiorRequest(laura_request_id)` — vedi sotto §10.3
     b. Sofia diventa la nuova PENDING con override_request
  4. Se esiste AND revenue uguale:
     a. Entrambe restano PENDING
     b. Nessun flag in schema: derivato on-query via COUNT
        (vedi §10.3 `hasEqualRevenueCompetitor()`)
  5. Se esiste AND revenue(Sofia) < revenue(Laura):
     a. Sofia rifiutata al submit con msg "data non disponibile" (scenario C)
     b. Laura resta intatta
```

`supersedeInferiorRequest()` (pattern R10 post-commit):
- DB tx: Laura's `OverrideRequest.status = REJECTED`, Laura's
  `newBooking.status = CANCELLED`, notes="auto-superseded by higher revenue"
- Post-commit: refund Laura (R10 BL-M4) + email "Ci dispiace, richiesta
  superata da offerta piu' alta. Rimborso in corso + date alternative."
- Audit log action="OVERRIDE_SUPERSEDED_BY_HIGHER"

Equal-revenue flag derivation (no schema column needed — YAGNI):
```ts
async function hasEqualRevenueCompetitor(request): Promise<boolean> {
  const count = await db.overrideRequest.count({
    where: {
      id: { not: request.id },
      status: "PENDING",
      // Same slot overlap query
      newBooking: { boatId: request.newBooking.boatId, /* date overlap */ },
      newBookingRevenue: request.newBookingRevenue,
    },
  });
  return count > 0;
}
```

## 7. Flusso admin

### 7.1 Nuovo panel `/admin/override-requests`

**Sidebar**: nuova voce "Richieste override" con badge contatore richieste
PENDING. Visibile anche in `/admin` (dashboard home) come KPI.

**Lista richieste** (PENDING in ordine di creazione ASC):

```
┌────────────────────────────────────────────────────────────┐
│ ⚠ RICHIESTA OVERRIDE                                       │
│ Creata il 25 lug · Scade (drop-dead) il 26 lug            │
│                                                            │
│ 🆕 Nuovo booking                                           │
│    Laura Bianchi · Gourmet · 10 agosto · 8 pax            │
│    Revenue: €3.000 (Gourmet fisso alta stagione)          │
│    Codice: DRC-K8X2B                                       │
│    📧 laura@email.com · 📞 +39 ...                        │
│                                                            │
│ ⚠ In conflitto con                                        │
│    [1] Cabin Charter · Mario Rossi · 5-12 agosto          │
│        1 cabina su 3 venduta · €2.500 pagati              │
│        Link: /admin/prenotazioni/DRC-CABIN                │
│                                                            │
│ 💰 Analisi revenue                                        │
│    Nuovo:                 €3.000                           │
│    Esistente pagato:      €2.500 (1 cabina venduta)       │
│    Esistente potenziale:  €7.500 (se tutte 3 vendute)     │
│    ➜ Delta netto (approvi):  +€500 (3000 - 2500 refund)  │
│                                                            │
│ 🗓  Finestra                                              │
│    Dal today: 16 giorni · Cutoff: 26 luglio               │
│                                                            │
│ ⚠ IMPATTO (multi-day)                                     │
│    Approvi = cancelli 7 giorni di vacanza di Mario        │
│    per 1 giorno di Gourmet. Considerare reputazione.      │
│                                                            │
│ [✓ Approva]  [✗ Rifiuta]  [💬 Nota (opzionale)]          │
└────────────────────────────────────────────────────────────┘
```

### 7.2 Warning "ALTO IMPATTO" (decisione 8.4)

Per override che coinvolgono **multi-day** (Charter o Cabin Charter) scavalcati
da single-day (Gourmet): badge **⚠ ALTO IMPATTO** rosso sopra l'alert.
Testo aggiuntivo:

```
⚠ ATTENZIONE
Approvando cancellerai 7 giorni di Cabin Charter di Mario
(€2.500 rimborso, impatto reputazionale potenzialmente alto).
Il Gourmet nuovo guadagna solo €2.250.
Guadagno netto: -€250.
Considera rifiutare.
```

Admin vede comunque il bottone Approva — la decisione e' sua.

### 7.3 Contatore override/mese + soft warning

**Sidebar badge**: "Richieste override (2)" → contatore PENDING attuale.

**Dashboard KPI**: nuova card "Override questo mese: 3 / Mese scorso: 1".
Soglia soft warning **> 3/mese** (decisione 8.8): se admin sta per fare il 4°
override nel mese corrente, dialog di conferma extra:

```
Sei sul punto di effettuare il 4° override di questo mese.
Un numero elevato di cancellazioni puo' impattare:
- Reputazione (recensioni)
- Ranking su OTA (Bokun/Boataround)

Confermi comunque?  [Annulla]  [Si, procedi]
```

Non blocca — admin puo' continuare.

### 7.4 Azione Approva (click "✓ Approva")

Backend `approveOverride(requestId, adminUserId, notes?)` — pattern aligned con
R10 BL-M4 (Stripe refund post-commit, non dentro tx):

1. **Pre-check** (fuori tx): chiamata a `getChargeRefundState` per ciascun
   `Payment.stripeChargeId` dei conflicting booking. Se Stripe unreachable
   → error early, nessun cambiamento DB.
2. **DB transaction atomic**:
   a. `OverrideRequest.status = APPROVED, decidedAt, decidedByUserId, decisionNotes`
   b. Per ogni conflicting booking: `booking.status = CANCELLED` (updateMany)
   c. `newBooking.status = CONFIRMED`
   d. Se presente competitor a pari revenue (equal-revenue case §13.1): il
      competitor viene auto-rifiutato dentro stessa tx (`status=REJECTED`).
3. **Post-commit side effects** (try/catch, errori collezionati non-blocking):
   a. Per ogni conflicting booking: `refundPayment()` via Stripe (retry 3×,
      pattern R10 BL-M4). Se fallisce: scrivere `Payment.status=FAILED` +
      log fatal + alert admin; la reconciliation cron §8.3 recupera.
   b. `releaseDates(CHANNELS.DIRECT)` per ogni conflict → fan-out esterni +
      `ManualAlert` per source non-DIRECT (R10 BL-C2 pattern).
   c. `blockDates(CHANNELS.DIRECT)` per il newBooking → fan-out conferma.
   d. Email apology al cliente perdente (`overbookingApologyTemplate`
      esistente R29, esteso con voucher soft "2 drink gratis" nel body +
      rebooking suggestions 3 date libere auto-calcolate).
   e. Email conferma al cliente vincitore (`bookingConfirmationTemplate` R29).
   f. Auto-reject email al competitor equal-revenue (se scattato 2d).
   g. Audit log admin action (`auditLog action="OVERRIDE_APPROVED"`).
   h. Dispatch notification admin `OVERRIDE_APPROVED` (email+telegram) per log.

### 7.5 Azione Rifiuta (click "✗ Rifiuta")

Backend `rejectOverride(requestId, adminUserId, notes?)` — stesso pattern R10:

1. **DB transaction atomic**:
   a. `OverrideRequest.status = REJECTED, decidedAt, decidedByUserId, decisionNotes`
   b. `newBooking.status = CANCELLED`
2. **Post-commit side effects** (try/catch):
   a. `refundPayment()` via Stripe per newBooking payment (R10 pattern).
      Failure → Payment.status=FAILED + log fatal + reconciliation cron §8.3.
   b. `releaseDates(CHANNELS.DIRECT)` per newBooking (unlock slot nel calendar).
      Nota: i conflicting booking esistenti **restano** invariati (CONFIRMED),
      non vengono toccati — sono stati "protetti" dal rifiuto admin.
   c. Email customer rejected (`overrideRejectedTemplate` nuovo): "Ci dispiace,
      la data non e' stata approvata. Rimborso completo in corso (5-10 gg
      lavorativi). Date alternative: [3 date libere auto-computate]".
   d. Audit log `auditLog action="OVERRIDE_REJECTED"`.

## 8. Background jobs (cron)

### 8.1 Escalation reminder (decisione 8.5)

**Nuovo cron**: `/api/cron/override-reminders` ogni ora.

Scansiona `OverrideRequest.status = PENDING` usando i 2 nuovi campi schema
(§9.1) `lastReminderSentAt DateTime?` + `reminderLevel Int @default(0)`:

| reminderLevel | Trigger | Azione |
|---|---|---|
| 0 → 1 | createdAt < now - 24h | Email admin normale (priority low) |
| 1 → 2 | lastReminderSentAt < now - 24h (cumulativo 48h) | Email + Telegram (high) |
| 2 → 3+ | lastReminderSentAt < now - 24h | Ripete ogni 24h con priority alta |

Dopo ogni invio: `update({ lastReminderSentAt: now, reminderLevel: level+1 })`.
Previene re-invio multipli a ogni run cron (ogni ora).

Nessun auto-reject su timeout puro (l'admin deve decidere attivamente).

### 8.2 Drop-dead cutoff al 15° giorno (decisione 8.5)

**Stesso cron sopra** o separato `/api/cron/override-dropdead` (minuti sfasati):

Scansiona `OverrideRequest.status = PENDING AND dropDeadAt <= now`:

- DB tx atomic: `OverrideRequest.status = EXPIRED` + `newBooking.status = CANCELLED`
- Post-commit: `refundPayment` (R10 pattern) + `releaseDates(CHANNELS.DIRECT)`
- Email cliente `overrideExpiredTemplate` nuovo: "Ci dispiace, la richiesta e'
  scaduta senza conferma. Rimborso in corso (5-10 gg lavorativi)."
- Email escalation admin: "Override [id] scaduto senza decisione"
- Audit log `action="OVERRIDE_EXPIRED"`

`dropDeadAt = experience_date - 15 days` (calcolato al momento della creazione).

### 8.3 Refund reconciliation retry

**Nuovo cron**: `/api/cron/refund-retry` ogni 30min (o piggy-back sul cron
pending-gc esistente).

Scansiona `Payment.status = FAILED AND booking.status = CANCELLED`:

- Retry `refundPayment()` via Stripe (max 3 attempt totali cumulativi con
  backoff exponential).
- Success → `Payment.status = SUCCEEDED` + booking `refundedAt` timestamp
- Failure dopo 3 attempt → `Payment.status = FAILED_PERMANENT` + admin alert
  + UI admin retry manuale (bottone "Retry refund" nel booking detail)

Questo chiude il gap §13.5 "refund orphan state" — recupero automatico
+ fallback manuale admin senza perdita stato.

## 9. Modello dati

### 9.1 Schema Prisma

```prisma
model OverrideRequest {
  id                      String   @id @default(cuid())

  // Il booking NUOVO in stato PENDING che vuole scavalcare
  newBookingId            String   @unique
  newBooking              Booking  @relation("NewBookingOverride", fields: [newBookingId], references: [id], onDelete: Cascade)

  // Booking ESISTENTI che verranno cancellati se approvato
  // (array JSON perche' puo' essere 1..N booking, es. 3 cabine Cabin Charter)
  conflictingBookingIds   String[] // Booking.id array

  // Revenue snapshot al momento della richiesta (audit + immutabile)
  newBookingRevenue       Decimal  @db.Decimal(10, 2)
  conflictingRevenueTotal Decimal  @db.Decimal(10, 2)
  // Per Cabin Charter: revenue potenziale se tutte cabine vendute (info admin)
  conflictingRevenuePotential Decimal? @db.Decimal(10, 2)

  // Lifecycle
  status                  OverrideStatus @default(PENDING)
  dropDeadAt              DateTime  // = experience_date - 15d, usato da cron

  // Escalation reminder dedup (§8.1)
  reminderLevel           Int       @default(0)  // 0=none, 1=24h sent, 2=48h sent, 3+=subsequent
  lastReminderSentAt      DateTime?

  // Decisione admin
  decidedAt               DateTime?
  decidedByUserId         String?
  decidedByUser           User?     @relation(fields: [decidedByUserId], references: [id], onDelete: SetNull)
  decisionNotes           String?   @db.Text

  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  @@index([status, dropDeadAt])
  @@index([status, createdAt])
  @@index([status, lastReminderSentAt])  // Per cron reminder
}

enum OverrideStatus {
  PENDING   // in attesa decisione admin
  APPROVED  // admin ha cancellato conflitti e confermato newBooking
  REJECTED  // admin ha rifiutato, newBooking annullato + refund
  EXPIRED   // dropDeadAt passato, auto-reject
}
```

### State machine

```
                                supersedeInferiorRequest()
                                         │
                                         ▼
           ┌────────────┐    rejectOverride()    ┌────────────┐
           │  PENDING   │───────────────────────▶│  REJECTED  │
           │            │                        └────────────┘
           │            │                        (terminal)
           │            │    approveOverride()    ┌────────────┐
           │            │───────────────────────▶│  APPROVED  │
           │            │                        └────────────┘
           │            │                        (terminal)
           │            │    cron dropDead()      ┌────────────┐
           │            │───────────────────────▶│  EXPIRED   │
           └────────────┘                        └────────────┘
                                                 (terminal)
```

External triggers su PENDING:
- Admin action manuale `approveOverride` / `rejectOverride`
- Cron drop-dead scaduto → `expireDropDeadRequests`
- Nuova richiesta revenue superiore → `supersedeInferiorRequest` (source:
  submit customer stesso slot)
- Admin aggiunge boat-block su quella data → auto-rejected (§13.2)
- Admin cancella manualmente il newBooking via /admin/prenotazioni →
  auto-rejected (§13.3)

### 9.2 Estensioni esistenti

```prisma
model Booking {
  // ... fields esistenti ...
  // NO colonna FK sul Booking; relazione derivabile dalla back-relation:
  //   booking.overrideRequest = await db.overrideRequest.findUnique({where: {newBookingId: booking.id}})
  // L'unique su OverrideRequest.newBookingId e' sufficiente per query efficiente.
  overrideRequest OverrideRequest? @relation("NewBookingOverride")
}
```

Nessun campo duplicato `Booking.overrideRequestId` (YAGNI — back-relation
via `newBookingId @unique` gia' indicizzato). Per query admin "tutti i PENDING
booking con override attivo":
```ts
db.booking.findMany({
  where: { status: "PENDING", overrideRequest: { status: "PENDING" } },
  include: { overrideRequest: true },
});
```

### 9.3 Migration

- Aggiungi nuova tabella `OverrideRequest` + enum `OverrideStatus`
- Aggiungi colonna `Booking.overrideRequestId` (nullable, FK)
- Seed: nessun backfill, nessun dato retroattivo

## 10. Business logic pura (testabile)

### 10.1 `src/lib/booking/override-eligibility.ts`

Funzione pura, riceve dati necessari, ritorna decisione. Zero side-effect.

```ts
export interface OverrideEligibilityInput {
  newBookingRevenue: Decimal;
  conflictingBookings: Array<{
    id: string;
    revenue: Decimal;
    isAdminBlock: boolean;  // da BoatAvailability
  }>;
  experienceDate: Date;
  today: Date;
}

export type OverrideEligibilityResult =
  | { status: "normal"; conflictingBookingIds: []; }
  | { status: "override_request";
      conflictingBookingIds: string[];
      conflictingRevenueTotal: Decimal;
      dropDeadAt: Date;
    }
  | { status: "blocked";
      reason: "within_15_day_cutoff" | "insufficient_revenue" | "boat_block";
      conflictingBookingIds: string[];
    };

export function checkOverrideEligibility(
  input: OverrideEligibilityInput,
): OverrideEligibilityResult;
```

**Regole implementate in ordine**:
1. Se `conflictingBookings.length === 0` → `status: "normal"`
2. Se qualche conflicting e' `isAdminBlock=true` → `status: "blocked", reason: "boat_block"`
3. Calcola `daysToExperience = diffDays(today, experienceDate)`
4. Se `daysToExperience < 15` → `status: "blocked", reason: "within_15_day_cutoff"`
5. Calcola `conflictingRevenueTotal = sum(conflictingBookings.revenue)`
6. Se `newBookingRevenue.lte(conflictingRevenueTotal)` → `status: "blocked", reason: "insufficient_revenue"`
7. Altrimenti → `status: "override_request"` con tutti i campi popolati

### 10.2 Test unit

`src/lib/booking/__tests__/override-eligibility.test.ts`:

- ✅ 0 conflitti → normal
- ✅ Boat-block presente → blocked/boat_block (anche se revenue OK)
- ✅ Esperienza a 14 gg → blocked/within_15_day_cutoff
- ✅ Esperienza a 15 gg esatti → blocked (cutoff strict `> 15`)
- ✅ Esperienza a 16 gg + revenue pari → blocked/insufficient_revenue
- ✅ Esperienza a 16 gg + revenue nuovo superiore → override_request
- ✅ Multi-conflicting revenue sum (Cabin Charter 3 cabine) → somma corretta
- ✅ Cabin Charter 2/3 cabine vendute → revenue = 2×€2.500 (pagato reale,
   NON 3×€2.500 potenziale) — verifica regola §5.1
- ✅ Decimal precision (€2000.01 vs €2000.00) → override_request

### 10.3 `src/lib/booking/override-request.ts`

Lifecycle del record DB. Pattern post-commit per side-effects Stripe/email
(R10 BL-M4 pattern, no side-effect dentro tx).

```ts
// Creato dal submit cliente (dentro tx createPendingDirectBooking)
// Side-effect: NONE nella tx. Post-commit: email "in attesa conferma" +
// dispatch admin alert + eventuale supersede di request inferiore.
export async function createOverrideRequest(
  tx: Prisma.TransactionClient,
  input: {
    newBookingId: string;
    conflictingBookingIds: string[];
    newBookingRevenue: Decimal;
    conflictingRevenueTotal: Decimal;
    conflictingRevenuePotential?: Decimal;
    dropDeadAt: Date;
  },
): Promise<{ requestId: string; supersededRequestIds: string[] }>;

// Approvato da admin
// Side-effects post-commit: refund Stripe conflicts + fan-out release/block
//   + email apology loser + email conferma winner + audit log.
// Errors collected non-blocking (R10): refund failure → Payment.FAILED,
// email failure → logger.fatal, admin UI visible retry.
export async function approveOverride(
  requestId: string,
  adminUserId: string,
  notes?: string,
): Promise<{
  approved: true;
  refundErrors: Array<{ paymentId: string; message: string }>;
  emailsSent: number;
  emailsFailed: number;
}>;

// Rifiutato da admin
// Side-effects post-commit: refund new booking + email "rifiutato + date
// alternative" + release availability new booking.
export async function rejectOverride(
  requestId: string,
  adminUserId: string,
  notes?: string,
): Promise<{ rejected: true; refundOk: boolean; emailOk: boolean }>;

// Chiamato dal cron §8.2
// Side-effects: refund + release + email expired. R10 pattern.
export async function expireDropDeadRequests(): Promise<{
  expired: number;
  refundFailures: number;
  emailFailures: number;
}>;

// Auto-reject request inferiore quando higher-revenue arriva (regola 8.6)
// Side-effects post-commit: refund Laura + email "superseded" + release
// date Laura. Usato da createOverrideRequest al supersede automatico.
export async function supersedeInferiorRequest(
  inferiorRequestId: string,
  reason: "revenue_surpassed",
): Promise<{ superseded: true; refundOk: boolean }>;

// Cron §8.1 — escalation reminders con dedup
// Side-effects: email admin + update lastReminderSentAt, reminderLevel.
export async function sendEscalationReminders(): Promise<{
  sent: number;
  errors: number;
}>;
```

## 11. UI cliente

### 11.1 Calendario booking wizard

**Nessun cambio visuale** vs oggi. Tutte le date restano selezionabili.

**Eccezione**: data con boat-block → grey (gia' implementato).

### 11.2 Submit confirmation (nuovo comportamento)

Quando `status: "override_request"` (scenario B):
- Stripe paga come normale
- Redirect standard a pagina success
- Email **"In attesa conferma"** al customer (nuovo template `booking-pending-override-confirmation.ts`)

Quando `status: "blocked"` (scenario C):
- Modal pre-payment:
  ```
  Siamo spiacenti, la data selezionata non e' piu' disponibile per questo pacchetto.
  Riceverai un'email con date alternative. [OK]
  ```
- sessionStorage key: `blocked-dates:{boatId}:{serviceId}` array di dateIso.
  Chiave composita per evitare leak se customer cambia pacchetto o barca nel
  wizard (e.g. da Gourmet a Charter → grey diverso).
- Calendar re-render grey su quelle date (solo per questa sessione browser)
- Email con 3 date alternative auto-calcolate + link diretto a prenotazione

### 11.3 Template email nuovi

1. `booking-pending-override-confirmation.ts` — "Grazie, la richiesta e' in attesa di conferma entro 24-72 ore"
2. `override-approved-winner.ts` — "Confermato! Il tuo [pacchetto] per [data] e' confermato"
3. `override-rejected-winner.ts` — "Purtroppo non e' stato possibile. Rimborso in corso. Date alternative: [...]"
4. `override-expired.ts` — "La richiesta e' scaduta senza conferma. Rimborso in corso."
5. `overbooking-apology-enhanced.ts` — estensione del template R29 con voucher "2 drink" + rebooking suggestions

## 12. UI admin

### 12.1 Nuova pagina `/admin/override-requests`

Server component con tabella + drill-down per-richiesta.

**Filtri**:
- Status: PENDING (default), APPROVED, REJECTED, EXPIRED
- Periodo: ultime 30gg default
- Barca (Trimarano per Fase 1)

**Lista**: card layout verticale, mostra sintesi come §7.1.

### 12.2 Detail page `/admin/override-requests/[id]`

Full screen con:
- Info newBooking (link al booking)
- Info conflittuali (ogni booking linkato)
- Revenue analysis panel
- Finestra + timer drop-dead countdown
- ALTO IMPATTO badge se multi-day cancellato per single-day
- Action buttons: Approva (con dialog conferma) + Rifiuta + Nota text area

### 12.3 Integrazione dashboard `/admin`

Card KPI "Richieste override":
- Contatore PENDING (badge rosso se > 0)
- Contatore approvati questo mese
- Soft warning visibile: "3 override questo mese — soglia raggiunta"

### 12.4 Integrazione sidebar

Nuova voce "Richieste" sotto "Prenotazioni" con badge contatore PENDING.

## 13. Edge cases

### 13.1 2 richieste concorrenti revenue pari

Scenario: Laura Gourmet €2.000 submit alle 10:00:00. Sofia Gourmet €2.000
(stesso pacchetto, stessa stagione) alle 10:00:05.

- Laura crea `OverrideRequest-A` PENDING.
- Sofia submit → advisory lock, vede request A.
- Revenue Sofia == revenue Laura → **non auto-supersede**.
- Sofia crea `OverrideRequest-B` PENDING. Entrambe attive.
- Flag `hasEqualRevenueCompetitor=true` su entrambe.
- Admin dashboard: sezione "Conflitti a pari revenue" con 2 richieste elencate.
  Admin deve approvare UNA (l'altra auto-rifiutata + rimborsata).

### 13.2 Boat-block impostato DOPO una override request PENDING

Scenario: Override request PENDING per 10 agosto. Admin mette boat-block su
10 agosto per manutenzione.

- Boat-block prevale (decisione 8.11).
- Tutti i booking in conflitto con block vengono automaticamente cancellati
  (manualBlockRange ha gia' il guard R10 BL-C1 su booking attivi).
- Override request viene auto-rifiutata con reason "boat_block_added", refund
  cliente.

### 13.3 Cancellazione amministrativa del newBooking durante override PENDING

Scenario: admin apre detail del newBooking (non il panel override) e clicca
"Cancella" dalla pagina booking detail diretta.

- La cancellazione passa per il normale flow `cancelBooking` R29.
- Hook: al cancel di un booking che ha `overrideRequestId` non-null, chiudi
  l'override request come REJECTED con reason="admin_cancelled_new".

### 13.4 Drop-dead al 15° giorno esatto

Scenario: override request creata il 25 luglio per 10 agosto (16 gg).
Il 26 luglio alle 09:00 diventa 15 gg. Cron runs alle 10:00.

- dropDeadAt = 26 luglio 00:00 UTC (inizio del 15° giorno prima
  dell'esperienza).
- Cron alle 10:00 vede `dropDeadAt <= now` → auto-expire.
- Cliente vede email di rifiuto + rimborso.

### 13.5 Payment intent gia' confirmed al momento del reject

Scenario: Laura ha pagato, admin rifiuta alle 22:00 di un sabato (quando Stripe
API potrebbe essere lenta).

- `rejectOverride` → `refundPayment` via Stripe.
- Se Stripe fail transient: retry policy esistente + log fatal.
- `OverrideRequest.status = REJECTED` comunque (stato DB consistente).
- Email cliente include "rimborso in elaborazione" (non importo specifico).
- Cron reconciliation recupera refund successivamente.

### 13.6 2 cabine vendute di un Cabin Charter, override totale

Scenario: Cabin Charter 5-12 agosto venduto in 2 cabine (€5.000) a Mario +
Giulia. Arriva Charter €7.500 per 5-12 agosto.

- Revenue Charter €7.500 > conflicting €5.000 → eligibile.
- Admin alert: 2 clienti distinti coinvolti + email separate ciascuno.
- Approva → 2 booking cancellati + 2 refund + 2 email apology.

### 13.7 Boat-block admin aggiunto tra approve e refund success

Scenario: admin approve alle 22:00. Stripe refund parte async. Stripe lento
(2min). Admin alle 22:05 apre /admin/calendario e aggiunge boat-block manuale
sulla stessa data per "manutenzione urgente".

- Al momento dell'approve, newBooking e' CONFIRMED + conflicts CANCELLED.
- manualBlockRange (R10 BL-C1 guard) vede il newBooking CONFIRMED attivo →
  rifiuta il boat-block con `ValidationError "Impossibile bloccare: 1 booking
  attivo nel range"`.
- Admin riceve msg chiaro: "cancellare prima il booking Laura".
- Se admin vuole bloccare → deve esplicitamente cancellare Laura (refund
  automatico), poi ri-mettere boat-block.
- Nessun corner case — R10 BL-C1 gia' copre via symmetric overlap guard.

### 13.8 Feature flag off mid-session

Scenario: Laura ha aperto il wizard con feature flag ON. Mentre compila,
admin/DevOps cambia `FEATURE_OVERRIDE_ENABLED=false`. Laura clicca submit.

- Server action `createPendingDirectBooking` legge `env.FEATURE_OVERRIDE_ENABLED`
  al momento del submit.
- Se OFF: il check override salta → flow legacy (slot occupato = booking
  rifiutato con ConflictError R28-C1 filter).
- Laura vede messaggio generico "Dates not available" (behavior pre-feature).
- Zero side-effects parziali. Safe toggle.

## 14. Schema service (nessuna modifica strutturale)

`Service.priority` resta invariato. Non si introduce un nuovo campo "authority".
Le priorita' lettera A/B/C saranno attribuite solo a livello di **seed data**:

```ts
// In seed o admin /admin/servizi:
Gourmet      → priority 10 (alta label A, per UI sorting)
Charter      → priority 8  (label B)
Cabin Charter → priority 6  (label C)
```

UI admin mostra queste label in `/admin/servizi` pero' non le usa per
override. Documentazione chiara admin: "La priorita' e' solo etichetta visiva.
Decisioni override basate su revenue."

## 15. Notification + email

### 15.1 Nuovi eventi NotificationType

```ts
type NotificationType =
  | ... existing ...
  | "OVERRIDE_REQUESTED"      // ad admin dopo creazione richiesta
  | "OVERRIDE_REMINDER"       // ad admin dopo 24h/48h/72h (cron §8.1)
  | "OVERRIDE_APPROVED"       // a customer winner (nuovo template)
  | "OVERRIDE_REJECTED"       // a customer new-booking rifiutato (nuovo)
  | "OVERRIDE_EXPIRED"        // a customer dopo drop-dead (nuovo)
  | "OVERRIDE_SUPERSEDED"     // a customer auto-rifiutato da revenue superiore
```

**NOTA importante**: il template **apology al loser** riusa
`overbookingApologyTemplate` di R29 **senza estenderlo con variant**. Il
body viene enriched at call-site aggiungendo:
- `voucherSoftText: "2 drink gratis a bordo per persona alla prossima visita"`
- `rebookingSuggestions: string[]` (3 date libere calcolate al momento del dispatch)

Questo evita un nuovo template dedicato (YAGNI — R29 base copre apology
email, i 2 extra sono variabili del payload). Se in futuro servira' differenziare
notification/logica tracking, si potra' splittare.

### 15.2 Canali default

Override events: EMAIL + TELEGRAM (se configurato).
Apology: EMAIL solo (no telegram — va al customer esterno).

## 16. Testing

### 16.1 Unit (helper puro)

- `override-eligibility.ts` → 8 scenari §10.2
- `calcRevenue` stuff — esistente `quotePrice` riutilizzato

### 16.2 Integration (pglite + ioredis-mock)

- `createOverrideRequest` in tx con advisory lock
- `approveOverride` tx atomic: cancella conflicts + refund + conferma new
- `rejectOverride` tx atomic: cancel new + refund
- `expireDropDeadRequests` cron
- `supersedeInferiorRequests` race 2 submit concorrenti
- Concurrent same-slot submit con Promise.all (verifica single PENDING)
- 2 submit revenue pari → 2 PENDING entrambe, admin deve scegliere

### 16.3 E2E (deferred — roadmap R17)

Not required for go-live Fase 1. Manual QA checklist pre-merge.

### 16.4 Manual QA checklist pre-merge

1. ✓ Data libera → normal booking (CONFIRMED immediato)
2. ✓ Data con Social-equiv → override_request (PENDING + email in attesa)
3. ✓ Data con Charter esistente, revenue nuovo inferiore → blocked (msg pre-pay + grey client-side)
4. ✓ Data a 14 giorni → blocked (cutoff), anche con revenue superiore
5. ✓ Data con boat-block → blocked (priorita' assoluta)
6. ✓ Approva da admin → conflicts cancellati + refund + email winner confermato + email loser apology
7. ✓ Rifiuta da admin → new cancellato + refund + email con date alternative
8. ✓ Drop-dead al 15° giorno → auto-expire + refund + email
9. ✓ 2 submit concorrenti revenue diverso → higher supersede lower
10. ✓ 2 submit concorrenti revenue pari → entrambe PENDING, admin decide
11. ✓ Override contatore dashboard visibile + soft warning > 3/mese
12. ✓ Multi-day (Cabin Charter) cancellato per single-day (Gourmet) → alert ⚠ ALTO IMPATTO

## 17. Performance

- `OverrideRequest.status + dropDeadAt` index → cron drop-dead in O(log n)
- Advisory lock `override-slot:boatId:startDay` previene race concurrent submit.
  **Namespace registry** (da aggiornare in `src/lib/db/advisory-lock.ts`
  header comment per AGENTS invariant consistency):
  - `booking-slot:boatId:startDay` → R28-C1 createPendingDirectBooking
  - `override-slot:boatId:startDay` → F1 createOverrideRequest (nuovo)
  - `manual-alert:channel:boatId:isoDay:action` → R8 createManualAlert
  - `cron:<name>` → cron single-flight (Redis lease, non Postgres advisory)
- Cron reminder ogni ora: scan solo PENDING (max 100/run realistico in alta stagione) → trascurabile
- Query admin dashboard contatore = single COUNT su status=PENDING cached 60s

## 18. Sicurezza

- Endpoint admin protetti da `requireAdmin()` esistente (role ADMIN, decisione 8.9)
- Server action `approveOverride` + `rejectOverride`: rate-limit 30/min per user (coerenza R10 Sec-C1)
- Audit log completo di tutte azioni admin con `decidedByUserId`
- No auto-approve senza admin (decisione brainstorm fondamentale)

## 19. Rollout

### 19.1 Fasi deploy

1. Migration DB (tabella OverrideRequest, nessuna colonna extra su Booking)
2. Deploy business logic (helper + server actions) con **feature flag check
   al server-action entry point** (`if (!env.FEATURE_OVERRIDE_ENABLED) return
   { status: "blocked", reason: "feature_disabled" }`). Cosi' anche se l'UI
   va live, i submit col flag off continuano a vedere behavior legacy.
3. Deploy UI admin `/admin/override-requests` + sidebar + dashboard KPI
4. Deploy UI cliente (submit validation + sessionStorage greying)
5. Abilita feature flag staging → QA completo → abilita prod

### 19.2 Rollback

- Feature flag off → cliente flow torna al behavior attuale (no override, status blocked → "data non disponibile")
- DB schema resta, nessun reset necessario
- Record OverrideRequest eventualmente creati restano come storico

### 19.3 Feature flag

Env var: `FEATURE_OVERRIDE_ENABLED=true|false`. Default false in prod fino a test.

## 20. Effort stimato

Plan-level breakdown:

- Schema + migration: 0.5 gg
- Pure helper `override-eligibility.ts` + test: 0.5 gg
- Server action `createOverrideRequest` integrato in `create-direct.ts`: 1 gg
- Server actions `approveOverride` / `rejectOverride`: 1 gg
- Cron `override-dropdead` + `override-reminders`: 0.5 gg
- UI admin `/admin/override-requests`: 2 gg
- Integrazione sidebar + dashboard KPI: 0.5 gg
- UI cliente submit flow (modal + sessionStorage greying): 1 gg
- Template email × 5 (pending / approved / rejected / expired / apology enhanced): 1 gg
- Notification events + dispatcher integration: 0.5 gg
- Integration tests: 2 gg
- Manual QA: 1 gg

**Totale: 12 giorni effettivi** (coincide con stima doc cliente 12-17).

## 21. Open questions deferred

Nessuna bloccante per Fase 1. Le seguenti sono per Fase 2+ o iterazione:

- **Voucher hard-tracked**: oggi soft (solo testo email). Se admin vuole
  tracciare i redeem, serve modello DB `Voucher` + UI admin. Non in scope F1.
- **Admin multi-ruolo** (decisione 8.9 = singolo ruolo): se servira' distinguere
  SENIOR/JUNIOR admin in futuro, schema estendibile.
- **Motoscafo Fase 2**: brainstorm separato, 4 pacchetti inclusi half-day.
- **Half-day per Trimarano**: scartato, non in roadmap.

## 22. Dipendenze

Non introduce nuove dipendenze npm. Riusa:
- Prisma (gia' presente)
- BullMQ (per eventuale job background, non obbligatorio)
- Stripe refunds (pattern R29 esistente)
- Email Brevo + Telegram (pattern dispatcher esistente)
- Redis lease (pattern cron esistente)

## 23. Criteri di accettazione (go-live Fase 1)

- Tutti i test integration pass (coverage logic core > 80% realistico,
  "> 95%" era troppo ambizioso)
- Zero regression sul baseline test (~188 attuale post R30, da sincronizzare
  con AGENTS.md al momento della PR)
- Manual QA checklist §16.4 completa
- Feature flag testato on/off senza errori (entry point server-action)
- Admin training eseguito (1 sessione 30min col proprietario)
- Migration applicata staging + smoke test
- Monitoring: Sentry alert configurato per `logger.fatal` su dispatch failure
- Refund retry cron §8.3 verificato: simulated Stripe fail + recovery
