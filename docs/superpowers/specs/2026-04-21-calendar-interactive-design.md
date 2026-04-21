# Calendario admin interattivo — design

Data: 2026-04-21
Status: approved

## Problema

`/admin/calendario` oggi mostra griglia mensile read-only con colori status
(Prenotato / Parzialmente prenotato / Disponibile) e badge source per cella.
Le azioni blocca/rilascia sono in form `<details>` collapsible sotto ciascuna
barca (R29 merge di `/admin/disponibilita` in `/admin/calendario`).

Admin workflow attuale:

1. Vede calendario → identifica data di interesse (es. "bloccare il 15 Luglio")
2. Scrolla sotto la griglia → apre `<details>` del boat giusto
3. Compila data manualmente nel form
4. Submit

Context switch visivo + inserimento manuale della data già nota → UX frizionale.

## Obiettivo

Click su una cella del calendario apre modal con:

- Info contestuale: cosa c'è su quella data (booking attivi, blocco admin, status)
- Form azioni: blocca/rilascia range pre-popolato alla data cliccata
- Bottoni condizionali: disabilitati se l'azione non ha senso (es. blocca su
  data con booking attivo — viola R26-P4 business rule)

Obiettivo non-funzionale: zero cambiamenti a logica business. Solo nuovo
wrapper UI sopra `manualBlockRange` / `manualReleaseRange` esistenti.

## Non-goal

- Range selection via drag/shift-click (click + edit "a" nel form è sufficiente)
- Meteo/crew info nel modal (YAGNI — admin apre booking detail per dettagli)
- iCal pubblicazione automatica cambi (già in fan-out esistente)
- Notifica customer su admin-block (non previsto)

## Scope

**In**:

- `src/app/admin/(dashboard)/calendario/page.tsx` — estendere server query con booking per cella + auditLog lookup batchato
- `src/app/admin/(dashboard)/calendario/calendar-client.tsx` — **nuovo** client wrapper
- `src/components/admin/calendar-grid.tsx` — aggiungere prop `onDayClick` + cell id stabili
- `src/components/admin/day-actions-modal.tsx` — **nuovo** modal component
- Rimozione `ManualAvailabilityActions` function + `<details>` form in `page.tsx`

**Out**:

- Server actions `manualBlockRange` / `manualReleaseRange` — invariate (include gia' validazione endDate >= startDate, max 90g range, overlap pre-check R10 BL-C1). Errori server surfano via `useActionState` toast.
- Schema DB — invariato
- Altri admin pagine — invariate
- `/admin/disponibilita` route handler — gia' redirect 308 a `/admin/calendario` dal commit R29 merge; nessun residuo da pulire

## Design UX

### Flusso

```
Admin → /admin/calendario
  └─ vede griglia (server-rendered, invariata)
       └─ click cella giorno-barca
            └─ modal appare (client-side, no network call)
                 ├─ Header: "Mar 15 Lug 2026 · Trimarano · Disponibile"
                 ├─ Info booking (se presenti): lista + link
                 ├─ Form Blocca: Da / A (pre-popolati) / Motivo / bottone
                 └─ Form Rilascia: Da / A / bottone
       └─ submit → server action → revalidatePath
            └─ modal chiude + griglia aggiorna
```

### Stati del modal (contestuali)

| Stato cella | Blocca | Rilascia | Info visibile |
|---|---|---|---|
| AVAILABLE nessun booking | Attivo | Disabled | "Nessuna prenotazione" |
| AVAILABLE con booking CANCELLED/REFUNDED | Attivo | Disabled | Lista storica grigia |
| BLOCKED (admin manual) | Disabled | Attivo | Motivo originale + data blocco (fallback: solo timestamp se `reason` redacted dal retention cron dopo 90g) |
| BLOCKED (booking attivo DIRECT) | Disabled | Disabled | Link booking + tooltip "cancella prima" |
| BLOCKED (booking attivo BOKUN/charter) | Disabled | Disabled | Link booking + ManualAlert esistente (auto-generato da `cancelBooking` R10-BL-C2) + shortcut "apri panel OTA upstream" |
| PARTIALLY_BOOKED (social tour) | Attivo (con warning) | Disabled | Lista passeggeri + avviso "bloccare annulla il tour per N clienti paganti" |

**Nota PARTIALLY_BOOKED**: admin puo' forzare il blocco (es. crew illness forza cancellazione dell'uscita condivisa). Il click Blocca apre conferma che elenca i booking social coinvolti → admin sa che deve poi cancellare manualmente ciascun booking e rimborsare. Non silent-disabled, perche' workflow emergenza legittimo.

## Design tecnico

### Struttura componenti

```
src/app/admin/(dashboard)/calendario/
├── page.tsx                 # Server — fetch + aggrega + pass to client
├── actions.ts               # Server actions (invariate)
└── calendar-client.tsx      # Client wrapper — stato selectedDay

src/components/admin/
├── calendar-grid.tsx        # + prop onDayClick
└── day-actions-modal.tsx    # Nuovo — modal + 2 form
```

### Dati passati al client

```ts
interface DayCellEnriched {
  date: Date;
  dateIso: string;             // "YYYY-MM-DD"
  status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
  bookings: Array<{
    id: string;
    confirmationCode: string;
    source: BookingSource;
    status: BookingStatus;
    serviceName: string;
    customerName: string;
  }>;
  isAdminBlock: boolean;       // BoatAvailability.BLOCKED con lockedByBookingId null
  adminBlockInfo?: {
    reason?: string;           // da AuditLog MANUAL_BLOCK.after.reason
    blockedAt: string;         // AuditLog.timestamp
  };
}
```

Query server estesa — già fa `booking.findMany` del mese, estende `select`
per includere `confirmationCode + customer.firstName/lastName + service.name`.

`adminBlockInfo` richiede lookup `AuditLog` per celle BLOCKED con
`lockedByBookingId IS NULL`. Strategia: **single batch query** al mese con
`findMany({where: { action: "MANUAL_BLOCK", entity: "Boat", entityId: { in: boatIds }, timestamp: { gte: monthStart } }, orderBy: { timestamp: "desc" } })` +
in-memory map per `(boatId, dateIso) → most recent log`. NON O(n) per cella.

**Fallback retention**: il retention cron redige `AuditLog.after` dopo 90g →
`reason` potrebbe essere null/stringa vuota. Mostrare solo `blockedAt` in quel
caso. Admin sa che il motivo e' andato perso per retention legale.

### Stato client

```ts
// calendar-client.tsx
"use client";
const [selectedDay, setSelectedDay] = useState<DayCellEnriched | null>(null);

// Data version signature: cambia quando il server rende con nuovi dati
// post-revalidatePath. useEffect chiude modal su cambio.
const dataVersion = useMemo(
  () => days.map((d) => `${d.dateIso}:${d.status}:${d.bookings.length}`).join("|"),
  [days],
);

useEffect(() => {
  setSelectedDay(null);
}, [dataVersion]);
```

### Focus return

Calendar grid cell: `id={`cell-${boatId}-${dateIso}`}` stabile. Modal
`onClose` chiama `document.getElementById(`cell-${boatId}-${dateIso}`)?.focus()`
per ripristinare focus WCAG.

### Accessibilità

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- Focus trap: primo input focusato on open, ritorna alla cella on close
- Escape closes
- Click backdrop closes
- Cell: `role="button"` + `tabIndex={0}` + keyboard accessible (Enter/Space)

### Performance

- Payload stimato: 3 barche × 31 giorni × 5 booking avg × ~150 bytes/booking = ~70 KB JSON base.
  Con JSON encoding + campi + overhead realistico: **100-150 KB**. Accettabile.
- Cap `take: 20` per cella (SOCIAL_BOATING puo' avere 20 passeggeri legittimi);
  oltre → "+ N altri" affordance nel modal + link al detail booking list filtrato.
- Client JS bundle: ~5 KB extra (React state + modal markup). Trascurabile.
- Nessun round-trip extra al click (dati già nel client).

### Rimozione codice

- `ManualAvailabilityActions` function in `page.tsx` (~80 LOC)
- Import `SubmitButton` + server actions (spostate in `day-actions-modal.tsx`)

## Testing

### Component (nuovo)

- `DayActionsModal` con 5 fixture scenari:
  - libero (available, no booking)
  - booking DIRECT attivo (blocca+rilascia disabled, link booking)
  - booking BOKUN attivo (blocca+rilascia disabled, ManualAlert info visibile)
  - admin-block (solo rilascia, con fallback reason vuoto)
  - partially-booked social (blocca attivo con conferma, rilascia disabled)
- Escape + backdrop close
- Focus trap smoke
- Focus return a cell id `cell-{boatId}-{dateIso}` on close

### Integration (esistenti — invariati)

- `manualBlockRange` / `manualReleaseRange` server actions: già coperti

### E2E (deferred — roadmap R17)

- Click cella → modal → blocca → refresh colore

### Manual pre-merge checklist

1. Click cella vuota → form pre-popolato, submit blocca
2. Click cella admin-block → solo rilascia, submit rilascia
3. Click cella con booking DIRECT → disabled + link funzionale
4. Click cella BOKUN → source badge visibile
5. Click cella partially-booked (social) → info-only
6. Escape chiude
7. Click backdrop chiude
8. Tab trap funziona
9. Mobile: modal scrollable
10. Keyboard cell activation (Enter/Space) apre modal

## Rollout

- Single commit `feat(admin): calendario interattivo modal day-actions`
- Nessuna migration DB
- Rollback: `git revert` singolo commit

## Rischi

| Rischio | Probabilità | Mitigazione |
|---|---|---|
| Focus trap malfatto → a11y regression | Media | Manual tab/shift-tab test pre-merge |
| Payload grande su mese affollato | Bassa | `take: 10` booking per cella |
| Admin confuso dal nuovo pattern | Bassa | Pattern standard (Google Calendar, Airbnb host) |

## Effort

~3-4h total implementation + testing.

## Cosa NON cambia

- Business logic blocca/rilascia (validazioni, fan-out, ManualAlert cross-channel)
- Server actions signature
- Schema DB
- Rotta `/admin/calendario` (URL invariato)
- Redirect `/admin/disponibilita` → `/admin/calendario` (già attivo da R29 merge)
- Funzionalità meteo / crew / i18n / notification dispatcher
