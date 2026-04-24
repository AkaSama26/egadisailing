# Sistema priorità + override booking — Fase 1 (Trimarano)

**Data**: 2026-04-21 (agg. 2026-04-23 post brainstorm #2)
**Status**: approved (post brainstorm #1 con proprieta', 12 domande decise; post brainstorm #2 2026-04-23 workflow OTA + Cabin Charter rimosso)
**Scope**: Trimarano only · 2 pacchetti (Gourmet + Charter) · full-day/multi-day · no half-day

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
- **Cabin Charter Trimarano** → rimosso dal catalogo (operativamente problematico:
  prenota settimana senza garanzia riempimento 3 cabine, spina nel fianco per
  gestione operativa e revenue non prevedibile). Rimosso da catalogo, non in scope.

## 4. Catalogo Trimarano (post-modifica)

| # | Pacchetto | Durata | Modello prezzo | Esempi revenue |
|---|---|---|---|---|
| 1 | **Gourmet** | 1 giorno | Fisso gruppo | €2.000 (bassa) / ~€3.000 (alta) |
| 2 | **Charter** | 3-7 giorni | Fisso settimana | €7.500 (bassa) |

**Vendita** (entrambi "barca intera = 1 cliente = 1 pagamento"):
- Gourmet: 1 booking per 1 cliente (paga per il gruppo 8-10 pax)
- Charter: 1 booking per 1 cliente (paga per il gruppo 6 pax)

**Cabin Charter rimosso** dal catalogo (vedi §3 Non-goal).

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

### 6.2 Validazione al click "Continua" (post-pax step)

**Timing cambiato rispetto al primo brainstorm**: il check eligibility NON
avviene piu' al "Conferma e paga" finale, ma al click **"Continua"** dopo lo
step selezione pax (prima che il cliente inserisca i customer info e prima del
pagamento Stripe). Questo evita il pattern "cliente compila tutto, inserisce
carta, e solo lì scopre che la data non è disponibile".

**Flusso UX**:
1. Cliente sceglie pacchetto + data sul calendario
2. Step pax: seleziona numero persone
3. Click **"Continua"** → **spinner** mentre il server fa il check eligibility
4. In base al risultato:
   - `status: "normal"` → prosegue allo step customer info → pagamento
   - `status: "override_request"` → prosegue allo step customer info → pagamento
     (il cliente pagherà normalmente, booking creato PENDING con override)
   - `status: "blocked"` → **torna allo step pax** con banner error inline in
     rosso: *"Siamo spiacenti, data non disponibile per questo pacchetto. Scegli
     altra data o pacchetto."* (il cliente non inserisce dati né paga)

Il check e' implementato via Server Action dedicata (`checkOverrideEligibility`
in `src/lib/booking/override-actions.ts` o simile) che wrappa il pure helper
`override-eligibility.ts`:

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
- `status: "blocked"` → **redirect allo step pax** con **error banner inline
  rosso**: *"Siamo spiacenti, data non disponibile per questo pacchetto. Scegli
  altra data o pacchetto."* (il cliente non ha ancora inserito dati né pagato)
- **Greying client-side** della data nel calendario di Laura (sessionStorage,
  persistenza solo di sessione browser — refresh OK, chiusura tab reset)
- NESSUN addebito Stripe (il cliente era prima del customer info step)
- Nessuna email automatica (non ha lasciato contatti) — il cliente resta nel
  wizard e puo' scegliere altra data o pacchetto

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

### 6.4 Workflow override contro OTA (DIRECT-new vs OTA-existing)

**Scenario**: Laura prenota DIRECT Gourmet 10 agosto (€3.000). Il conflitto su
quella data e' un booking OTA (Mario da Viator tramite Bokun, Social €960).

A differenza di un override DIRECT-vs-DIRECT (dove il refund + cancel e'
interamente automatico via Stripe), un override contro OTA richiede un
**workflow manuale** perché:
1. Il pagamento di Mario è sui sistemi Viator (non sul nostro Stripe): non
   possiamo emettere il rimborso direttamente.
2. L'azione canonica e' **cancellare sul pannello OTA upstream** (Viator
   extranet). Bokun via webhook ci propagherà la cancellazione come evento
   naturale.
3. Chiamare direttamente `Bokun.cancelBooking()` via API sarebbe **chiamata
   lato vendor** (noi), non lato cliente: potrebbe violare policy OTA e conta
   come "supplier-initiated cancellation" nelle metriche Viator (impattando
   ranking e cancellation rate).

**Decisione**: trust natural propagation. Admin cancel manualmente upstream,
Viator → cascade a Bokun → webhook a noi → DB update `Mario CANCELLED`
(idempotente via `ProcessedBokunEvent`).

**Flusso workflow admin** (UI checklist 4 step):

```
┌────────────────────────────────────────────────────────────┐
│ ⚠ OVERRIDE CONTRO OTA — CHECKLIST MANUALE                  │
│                                                            │
│ Conflitto con booking VIATOR (via Bokun) BK-12345         │
│ Cliente upstream: Mario Rossi · Social €960               │
│                                                            │
│ Passo 1 — Apri il pannello esterno                        │
│   [ ] Apri Viator extranet                                │
│       → Link: https://www.viator.com/supplier/...         │
│                                                            │
│ Passo 2 — Cancella upstream                               │
│   [ ] Cancella prenotazione #BK-12345 su Viator           │
│                                                            │
│ Passo 3 — Verifica il rimborso                            │
│   [ ] Rimborso €960 processato da Viator                  │
│                                                            │
│ Passo 4 — Dichiarazione di responsabilità                 │
│   [ ] Confermo di aver completato manualmente tutti i     │
│       passaggi sul pannello OTA. Ho cancellato, verificato│
│       il rimborso, e rilascio la data.                    │
│                                                            │
│ Stato sync: ⏳ In attesa webhook Bokun `bookings/cancel`  │
│           (tipicamente < 5 min dal cancel upstream)       │
│                                                            │
│ [✓ Approva]  ← disabled finché webhook non arrivato       │
│ [✗ Rifiuta — rimborsa Laura, nessuna azione OTA]          │
└────────────────────────────────────────────────────────────┘
```

**Regole**:
- Le 4 checkbox devono essere spuntate dall'admin prima che il bottone
  "Approva" si abiliti.
- Aggiuntivo: il bottone Approva resta **disabled fino all'arrivo del
  webhook Bokun** `bookings/cancel` per quel `bokunBookingId`. Il sistema
  polling UI ogni 15s verifica se il `BokunBooking.status` e' passato a
  `CANCELLED` nel nostro DB.
- Quando entrambe le condizioni sono soddisfatte (4 checkbox + webhook
  arrivato), admin clicca Approva → newBooking passa a CONFIRMED, Laura
  riceve email di conferma.

**Diagramma sequenza**:

```
 Admin UI                Sistema               Bokun/Viator
  │                       │                         │
  │ click "Apri Viator"   │                         │
  │ ───────────────────── link esterno ───────────> │
  │                       │                         │
  │ [manually cancel on Viator extranet]            │
  │ ─────────────────────────────────────────────>  │
  │                       │                   Viator cascades
  │                       │                   to Bokun API
  │                       │ <── webhook bookings/cancel ──
  │                       │   processBokunWebhook
  │                       │   BokunBooking → CANCELLED
  │                       │   Booking → CANCELLED
  │                       │
  │ [4 checkbox spuntate] │
  │ [polling detects webhook arrived]               │
  │                       │
  │ click "Approva"       │
  │ ───────────────────>  │
  │                       │  approveOverride:
  │                       │   - newBooking CONFIRMED
  │                       │   - blockDates(DIRECT)
  │                       │   - email Laura CONFIRMED
  │                       │   - schedule reconcile cron +1h
  │                       │   - (nessun refund Mario — già fatto upstream)
  │                       │   - (nessuna email apology Mario — gestita Viator)
  │                       │
  │                       │  +1h → cron reconciliation
  │                       │   verifica Bokun API search
  │                       │   upstream status = CANCELLED?
  │                       │     ✓ OK, nessuna azione
  │                       │     ✗ flag PENDING_RECONCILE_FAILED + alert admin
```

**Reconciliation cron post-approve**: 1h dopo `approveOverride` su override
con conflicting source OTA, il cron `/api/cron/override-reconcile` (§8.4)
rileggere Bokun API `/booking.json/search?bookingId=...` per ogni conflicting
booking OTA. Se upstream risulta ancora `CONFIRMED` (il cancel manuale admin
non e' stato completato correttamente, o Viator non ha cascadato), il sistema
flagga `OverrideRequest.status = PENDING_RECONCILE_FAILED` + dispatch
notification admin fatal.

### 6.5 Reverse override (OTA new vs DIRECT existing)

**Scenario**: Laura ha booking DIRECT Gourmet 10 agosto (€3.000, CONFIRMED,
pagato). Dal webhook Bokun/Boataround/charter email arriva un nuovo booking
OTA (Mario Viator Social €960) sulla stessa data.

Il sistema **NON** applica override automatico lato OTA. Decisione di design:
proteggiamo Laura (DIRECT esistente) per default, rifiutiamo il webhook OTA
via cancel API + emettiamo ManualAlert urgente all'admin.

**Flusso sistema** (automatico, nessuna azione cliente):
1. Webhook Bokun `bookings/create` arriva, passa validazione HMAC/dedup
2. `importBokunBooking` rileva overlap con booking DIRECT attivo su stesso
   boat/date → NON crea il booking localmente in stato CONFIRMED
3. Invece: chiama `Bokun.cancelBooking(bokunBookingId)` via API (questa è
   "vendor-initiated" ma giustificata dal fatto che non avremmo mai
   potuto accettare la prenotazione perché la data era già occupata)
4. Crea `ManualAlert` urgente admin con:
   - Tipo: `CROSS_CHANNEL_CONFLICT`
   - Details: "Nuovo booking Viator BK-12345 (€960) rifiutato: data già
     occupata da Laura DIRECT DRC-ABCDE (€3.000)"
   - Action suggerita: "Verifica Viator extranet, conferma rimborso a Mario"

**Admin decide manualmente** cosa fare tramite la UI del ManualAlert:
- **Default "protezione Laura"**: nessuna azione richiesta — Mario è stato
  rifiutato automaticamente, il sistema e' in stato coerente
- **"Revenue wins"** (rara): se business decide che vuole tenere Mario invece
  di Laura, admin apre la prenotazione di Laura e clicca Cancel con motivo
  "OTA revenue priority". Email di scuse + voucher + refund Laura. Poi
  ri-importa Mario manualmente tramite admin action dedicata (oppure lascia
  che Viator ri-sincronizzi)

**Nota importante**: Laura è sempre pagata e confermata. Il flow non scala
alla frequenza alta (ogni ManualAlert richiede revisione umana). Se la
frequenza supera soglia (es. > 3 ManualAlert CROSS_CHANNEL_CONFLICT/settimana),
il sistema alerta l'admin per valutare se la sincronizzazione iCal/Bokun sta
funzionando correttamente (i portali non dovrebbero accettare booking su
date già bloccate upstream).

### 6.6 OTA-new vs OTA-existing (cross-portale)

**Scenario**: Mario ha Viator (via Bokun) Social 10 agosto CONFIRMED. Arriva
webhook Boataround con nuovo booking Social stesso 10 agosto (multi-OTA
race a livello di iCal propagation lag).

**Pattern identico a §6.5**: il sistema rifiuta automaticamente il secondo
webhook (via cancel API verso il portale entrante) + emette `ManualAlert
CROSS_CHANNEL_CONFLICT` admin. Admin decide protezione primo vs revenue
wins. Nessun override automatico cross-portale — queste sono
inconsistenze che richiedono revisione umana e (probabile) fix configurazione
iCal/Bokun upstream.

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
│    [1] Charter · Mario Rossi · 5-12 agosto                │
│        €7.500 pagati                                      │
│        Link: /admin/prenotazioni/DRC-MARIO                │
│                                                            │
│ 🏷  Conflitti sorgente                                    │
│    [1] Mario Rossi · Charter · 5-12 agosto                │
│        Sorgente: VIATOR (via Bokun) BK-12345              │
│        → Richiede workflow manuale OTA (§6.4)             │
│                                                            │
│ 💰 Analisi revenue                                        │
│    Nuovo:                 €3.000                           │
│    Esistente pagato:      €7.500                           │
│    ➜ Delta netto (approvi):  -€4.500 (override NON conviene) │
│    Status: BLOCKED — revenue insufficiente                │
│                                                            │
│ 🗓  Finestra                                              │
│    Dal today: 16 giorni · Cutoff: 26 luglio               │
│                                                            │
│ ⚠ IMPATTO (multi-day)                                     │
│    Approvi = cancelli 7 giorni di Charter di Mario        │
│    per 1 giorno di Gourmet. Considerare reputazione.      │
│                                                            │
│ [✓ Approva]  [✗ Rifiuta]  [💬 Nota (opzionale)]          │
└────────────────────────────────────────────────────────────┘
```

### 7.1bis Filtri e ordinamento lista

**Filtri aggiuntivi** oltre a status:
- **Sorgente conflitti**: DIRECT, VIATOR (Bokun), BOATAROUND, SAMBOAT,
  CLICKANDBOAT, NAUTAL, MULTIPLE (conflitti con source misti)
- **Impatto**: SINGLE_DAY, MULTI_DAY, ALTO_IMPATTO (auto-flag revenue delta
  negativo o multi-day scavalcato da single-day)

**Colonna lista**: "Sorgente conflitti" tra "Nuovo cliente" e "Drop-dead".

### 7.2 Warning "ALTO IMPATTO" (decisione 8.4)

Per override che coinvolgono **multi-day** (Charter 3-7 giorni) scavalcato
da single-day (Gourmet): badge **⚠ ALTO IMPATTO** rosso sopra l'alert.
Testo aggiuntivo:

```
⚠ ATTENZIONE
Approvando cancellerai 7 giorni di Charter di Mario
(€7.500 rimborso, impatto reputazionale potenzialmente alto).
Il Gourmet nuovo guadagna solo €3.000.
Guadagno netto: -€4.500 → override NON conviene.
Considera rifiutare.
```

Admin vede comunque il bottone Approva — la decisione e' sua.

### 7.2bis Override contro OTA: workflow checklist

Quando almeno un conflicting booking ha `source IN (BOKUN, BOATAROUND,
SAMBOAT, CLICKANDBOAT, NAUTAL)`, la detail page mostra un blocco workflow
specifico (vedi §6.4 per flusso completo). Mockup UI:

```
┌──────────────────────────────────────────────────────────────┐
│ 🏷  WORKFLOW OTA — 2 conflicting booking richiedono azione  │
│                                                              │
│ ── VIATOR (via Bokun) — BK-12345 ──                         │
│ Cliente upstream: Mario Rossi · Social €960                 │
│                                                              │
│  [ ] Passo 1 — Apri Viator extranet                         │
│       → https://www.viator.com/supplier/bookings/BK-12345   │
│  [ ] Passo 2 — Cancella #BK-12345 su Viator                 │
│  [ ] Passo 3 — Verifica rimborso €960 processato da Viator  │
│  [ ] Passo 4 — Dichiaro di aver completato i 3 passaggi    │
│                                                              │
│ Stato sync: ⏳ Webhook Bokun bookings/cancel non arrivato    │
│             (polling ogni 15s — tipicamente <5min)          │
│                                                              │
│ ── VIATOR (via Bokun) — BK-67890 ──                         │
│ Cliente upstream: Sofia Bianchi · Social €800               │
│  [ ] ... (analogo 4 checkbox)                               │
│                                                              │
│ ────────────────────────────────────────────────────────── │
│                                                              │
│ [✓ Approva] — disabled finché TUTTE le checkbox sono        │
│               spuntate E TUTTI i webhook Bokun arrivati     │
│ [✗ Rifiuta] — sempre abilitato (nessuna azione OTA richiesta)│
└──────────────────────────────────────────────────────────────┘
```

**Polling UI**: il componente React polla `GET /api/admin/override-requests/[id]/ota-sync-status`
ogni 15s. L'endpoint ritorna `{ conflictId, bokunBookingId, upstreamStatus }[]`
basato su query `BokunBooking.findMany({where: {bokunBookingId: in: [...], status: "CANCELLED"}})`.
Quando tutti i bokunBookingId richiesti risultano CANCELLED nel nostro DB
(sync via webhook), il bottone Approva si abilita (se anche le 4 checkbox
per ciascuno sono state spuntate).

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

Backend `approveOverride(requestId, adminUserId, notes?, otaConfirmations?)`
— pattern aligned con R10 BL-M4 (Stripe refund post-commit, non dentro tx):

1. **Pre-check natural propagation OTA**: se la request ha almeno un
   `conflictSourceChannels` OTA (non-DIRECT), verifica che:
   a. Tutte le checkbox admin sono state spuntate (parametro
      `otaConfirmations` contiene 4 bool per ogni conflicting OTA booking)
   b. Ogni `BokunBooking/BoataroundBooking/CharterBooking` conflicting ha
      `status = CANCELLED` nel DB locale (webhook gia' arrivato)
   Se qualsiasi delle due condizioni e' mancante → throw `ValidationError`
   con motivo chiaro (UI non deve mai permettere l'invio in questo stato,
   ma il server verifica comunque per difesa-in-profondita').
2. **Pre-check refund DIRECT** (fuori tx): chiamata a `getChargeRefundState`
   per ciascun `Payment.stripeChargeId` dei conflicting booking **DIRECT**
   (non-OTA — i booking OTA non hanno Stripe locale, il refund e' gia' stato
   fatto upstream dall'admin nel passo 3 della checklist). Se Stripe
   unreachable → error early, nessun cambiamento DB.
3. **DB transaction atomic**:
   a. `OverrideRequest.status = APPROVED, decidedAt, decidedByUserId, decisionNotes`
   b. Per ogni conflicting booking DIRECT: `booking.status = CANCELLED` (updateMany).
      I booking OTA sono già CANCELLED nel DB (sync via webhook Bokun ricevuto
      prima dell'approve, vedi §7.4 step 1).
   c. `newBooking.status = CONFIRMED`
   d. Se presente competitor a pari revenue (equal-revenue case §13.1): il
      competitor viene auto-rifiutato dentro stessa tx (`status=REJECTED`).
   e. Se `conflictSourceChannels` contiene almeno un source OTA: setta
      `reconcileCheckDue = now + 1h` (usato dal cron §8.4).
4. **Post-commit side effects** (try/catch, errori collezionati non-blocking):
   a. Per ogni conflicting booking **DIRECT**: `refundPayment()` via Stripe
      (retry 3×, pattern R10 BL-M4). Se fallisce: scrivere `Payment.status=FAILED`
      + log fatal + alert admin; la reconciliation cron §8.3 recupera.
      **NON viene fatto refund per booking OTA** (rimborso e' gia' stato
      gestito upstream dall'admin nel passo 3 della checklist §6.4).
   b. `releaseDates(CHANNELS.DIRECT)` per ogni conflict DIRECT → fan-out
      esterni (R10 BL-C2 pattern). Per conflict OTA: il webhook `bookings/cancel`
      ha già rilasciato l'availability, niente da fare qui.
   c. `blockDates(CHANNELS.DIRECT)` per il newBooking → fan-out conferma.
   d. Email apology **solo** per conflict DIRECT perdenti
      (`overbookingApologyTemplate` esistente R29, esteso con voucher soft
      "2 drink gratis" + rebooking suggestions 3 date libere auto-calcolate).
      **NON inviamo apology per conflict OTA** — il cliente OTA ha rapporto
      col portale upstream, che gestisce rimborso + eventuale apology da parte
      loro (decisione brainstorm 2026-04-23).
   e. Email conferma al cliente vincitore (`bookingConfirmationTemplate` R29).
   f. Auto-reject email al competitor equal-revenue (se scattato §13.1).
   g. Audit log admin action (`auditLog action="OVERRIDE_APPROVED"`) includendo
      `conflictSourceChannels` in `after` payload.
   h. Dispatch notification admin `OVERRIDE_APPROVED` (email+telegram) per log.
   i. **Se `reconcileCheckDue` e' stato settato in step 3.e**: il cron §8.4
      (schedulato separatamente, non async job enqueued) lo processerà +1h
      dopo per verificare lo stato upstream OTA e flaggare eventuale
      `PENDING_RECONCILE_FAILED`.

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

### 8.4 Reconciliation post-approve OTA (nuovo cron)

**Nuovo cron**: `/api/cron/override-reconcile` ogni 10min (sfasato 3min
dai crons §8.1/§8.2).

Scansiona `OverrideRequest.status = APPROVED AND reconcileCheckDue <= now
AND reconcileCheckedAt IS NULL`:

Per ogni request, per ogni `conflictingBookingId` che apparteneva a un
canale OTA (verificato via `Booking.source`):
- Chiama Bokun API `/booking.json/search?bookingId={bokunBookingId}` (o
  analogo per Boataround/SamBoat se applicabile)
- Se upstream `status === CANCELLED`: nessuna azione, conta come OK
- Se upstream `status IN (CONFIRMED, ARRIVED)` (cioè **still active**):
  il cancel manuale admin non e' stato completato correttamente (bug
  Viator, admin ha solo spuntato checkbox senza aver cancellato, o
  Viator non ha cascadato a Bokun):
  - Flag `OverrideRequest.status = PENDING_RECONCILE_FAILED`
  - Dispatch notification admin `OVERRIDE_RECONCILE_FAILED` (email +
    telegram FATAL priority)
  - Audit log `action="OVERRIDE_RECONCILE_FAILED"` con dettaglio booking
    upstream ancora attivo

Dopo processing (OK o failed), set `reconcileCheckedAt = now` per dedup.

UI admin: override request con status `PENDING_RECONCILE_FAILED` mostra
un banner rosso fisso in detail page con:
- Lista dei booking OTA ancora CONFIRMED upstream
- Bottone "Retry reconcile" che rilancia il check (re-invia query Bokun)
- Link al pannello OTA per cancellazione manuale tardiva

Se admin approva `Retry reconcile` e upstream nel frattempo e' stato
effettivamente cancellato, il sistema ripristina `status = APPROVED` +
alert auto-cleared. Altrimenti resta `PENDING_RECONCILE_FAILED` finché
non risolto.

**Single-flight guard**: Redis lease `cron:override-reconcile` TTL 5min
(pattern R14).

## 9. Modello dati

### 9.1 Schema Prisma

```prisma
model OverrideRequest {
  id                      String   @id @default(cuid())

  // Il booking NUOVO in stato PENDING che vuole scavalcare
  newBookingId            String   @unique
  newBooking              Booking  @relation("NewBookingOverride", fields: [newBookingId], references: [id], onDelete: Cascade)

  // Booking ESISTENTI che verranno cancellati se approvato
  // (array JSON perche' puo' essere 1..N booking in caso di conflitti multipli)
  conflictingBookingIds   String[] // Booking.id array

  // Sorgente canali dei conflicting booking (per sapere quali cancel
  // manuali upstream sono richiesti + workflow OTA). Union di Booking.source
  // dei conflict. Es: ["DIRECT"], ["BOKUN"], ["DIRECT","BOKUN"].
  // Usato dal cron §8.4 per sapere se fare reconciliation OTA.
  conflictSourceChannels  String[] // Es: ["BOKUN","DIRECT"]

  // Revenue snapshot al momento della richiesta (audit + immutabile)
  newBookingRevenue       Decimal  @db.Decimal(10, 2)
  conflictingRevenueTotal Decimal  @db.Decimal(10, 2)

  // Lifecycle
  status                  OverrideStatus @default(PENDING)
  dropDeadAt              DateTime  // = experience_date - 15d, usato da cron

  // Reconciliation cron §8.4 (post-approve OTA verification)
  reconcileCheckDue       DateTime? // set = now+1h se conflictSourceChannels OTA
  reconcileCheckedAt      DateTime? // dedup cron — NULL = non ancora processato

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
  @@index([status, lastReminderSentAt])          // Per cron reminder §8.1
  @@index([status, reconcileCheckDue])           // Per cron reconcile §8.4
}

enum OverrideStatus {
  PENDING                     // in attesa decisione admin
  APPROVED                    // admin ha cancellato conflitti e confermato newBooking
  REJECTED                    // admin ha rifiutato, newBooking annullato + refund
  EXPIRED                     // dropDeadAt passato, auto-reject
  PENDING_RECONCILE_FAILED    // approved ma upstream OTA non ha confermato
                              // il cancel entro 1h → admin intervention richiesta
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
           │            │───────────────────────▶│  APPROVED  │◀──┐
           │            │                        └────────────┘   │ retry
           │            │                        (terminal, oppure │ reconcile
           │            │                        → reconcile §8.4) │
           │            │                                 │        │
           │            │                                 ▼        │
           │            │                        ┌─────────────────┴─┐
           │            │                        │ PENDING_RECONCILE │
           │            │                        │ _FAILED           │
           │            │                        └───────────────────┘
           │            │                        (cron §8.4 verify
           │            │                         upstream still active)
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

External triggers su APPROVED (solo se conflictSourceChannels ha OTA):
- Cron §8.4 `checkOtaReconciliation` +1h post-approve rileva upstream
  ancora CONFIRMED → flag `PENDING_RECONCILE_FAILED`

External triggers su PENDING_RECONCILE_FAILED:
- Admin clicca "Retry reconcile" → rilancia check, se upstream cancelled
  → torna APPROVED, altrimenti resta FAILED

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

- Aggiungi nuova tabella `OverrideRequest` + enum `OverrideStatus` (con
  valore aggiuntivo `PENDING_RECONCILE_FAILED`)
- Nessuna colonna FK su Booking (back-relation via `newBookingId @unique`)
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
- ✅ Multi-conflicting revenue sum (3 conflitti) → somma corretta
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

// Cron §8.4 — reconciliation post-approve OTA
// Interroga Bokun/Boataround API per verificare che upstream booking sia
// effettivamente CANCELLED dopo admin approve.
// Se still active: flag PENDING_RECONCILE_FAILED + alert admin.
// Side-effects: possibile update status, dispatch notification, audit log.
export async function checkOtaReconciliation(
  requestId: string,
): Promise<{
  upstreamStatus: "CANCELLED" | "STILL_ACTIVE";
  channels: string[]; // quali canali verificati
}>;

// Helper puro (no side-effect DB) — calcola cancellation rate per canale
// rolling windowDays. Usato da dashboard admin KPI + guard in
// approveOverride (hard block se > soglia).
export async function computeCancellationRate(
  channel: string,
  windowDays: number,
): Promise<{
  rate: number;           // 0..1 (es. 0.042 = 4.2%)
  totalBookings: number;  // denominatore
  cancelledByOverride: number; // numeratore
}>;
```

## 11. UI cliente

### 11.1 Calendario booking wizard

**Nessun cambio visuale** vs oggi. Tutte le date restano selezionabili.

**Eccezione**: data con boat-block → grey (gia' implementato).

### 11.2 Check-at-continua behavior (timing post-brainstorm 2026-04-23)

Il check viene eseguito al click **"Continua"** dallo step pax (prima del
customer info step, prima di Stripe). I 3 scenari:

**Scenario A — `status: "normal"`**
- Wizard prosegue automaticamente allo step customer info → poi pagamento Stripe
- Nessun messaggio visibile al cliente, flusso fluido

**Scenario B — `status: "override_request"`**
- Wizard prosegue allo step customer info come in A (cliente non sa di essere
  in override). Paga Stripe normalmente.
- Booking creato PENDING con `overrideRequestId` (flag server-side)
- Post-payment: email **"In attesa conferma"** al customer (template
  `booking-pending-override-confirmation.ts`)
- Admin riceve dashboard alert + email

**Scenario C — `status: "blocked"`**
- Il wizard **torna allo step pax** (non prosegue a customer info)
- Error banner inline in rosso sopra lo step pax:
  ```
  ⚠ Siamo spiacenti, data non disponibile per questo pacchetto.
    Scegli altra data o pacchetto.
  ```
- sessionStorage key: `blocked-dates:{boatId}:{serviceId}` array di dateIso
  (stessa data ri-cliccata → stesso errore senza round-trip server)
- Calendar re-render grey sulla data bloccata (solo questa sessione browser)
- **Nessun addebito Stripe** (siamo prima del payment step)
- **Nessuna email** al cliente (non ha ancora fornito email — customer info
  step non ancora raggiunto)

### 11.3 Template email nuovi

1. `booking-pending-override-confirmation.ts` — "Grazie, la richiesta e' in attesa di conferma entro 24-72 ore"
2. `override-approved-winner.ts` — "Confermato! Il tuo [pacchetto] per [data] e' confermato"
3. `override-rejected-winner.ts` — "Purtroppo non e' stato possibile. Rimborso in corso. Date alternative: [...]"
4. `override-expired.ts` — "La richiesta e' scaduta senza conferma. Rimborso in corso."
5. `overbooking-apology-enhanced.ts` — estensione del template R29 con voucher "2 drink" + rebooking suggestions

**Apology email — quando viene inviata**:
- ✅ Inviata per override **DIRECT-vs-DIRECT** (Mario ha pagato sul nostro
  Stripe, lo cancelliamo noi, gli scriviamo noi).
- ❌ **NON inviata per override OTA** — il cliente OTA ha rapporto col
  portale upstream (Viator/Booking/SamBoat), che gestisce rimborso + eventuale
  apology da parte loro. Decisione brainstorm 2026-04-23.

## 12. UI admin

### 12.1 Nuova pagina `/admin/override-requests`

Server component con tabella + drill-down per-richiesta.

**Filtri**:
- Status: PENDING (default), APPROVED, REJECTED, EXPIRED, PENDING_RECONCILE_FAILED
- Periodo: ultime 30gg default
- Barca (Trimarano per Fase 1)
- **Sorgente conflitti** (aggiunta post-brainstorm 2026-04-23): DIRECT,
  VIATOR (Bokun), BOATAROUND, SAMBOAT, CLICKANDBOAT, NAUTAL, MULTIPLE

**Lista**: card layout verticale, mostra sintesi come §7.1 incluso badge
"🏷 Sorgente: VIATOR (via Bokun)" per conflitti OTA.

**Colonna "Sorgente conflitti"**: badge colorato per canale (es. blu per
DIRECT, viola per BOKUN, verde per BOATAROUND), "+N" se conflitti multipli.

### 12.2 Detail page `/admin/override-requests/[id]`

Full screen con:
- Info newBooking (link al booking)
- Info conflittuali (ogni booking linkato)
- **Sezione "Conflitti sorgente"**: raggruppa conflicting per canale, per
  ciascuno mostra `source + externalRef` (es. "VIATOR BK-12345")
- Se almeno un conflict e' OTA: **blocco workflow checklist 4-step** (§7.2bis)
  per ciascun OTA conflict separatamente
- Revenue analysis panel
- Finestra + timer drop-dead countdown
- ALTO IMPATTO badge se multi-day cancellato per single-day
- Banner rosso fisso se status = PENDING_RECONCILE_FAILED con bottone "Retry
  reconcile"
- Action buttons: Approva (con dialog conferma + disabling logic per checklist
  OTA) + Rifiuta + Nota text area

### 12.3 Integrazione dashboard `/admin`

Card KPI "Richieste override":
- Contatore PENDING (badge rosso se > 0)
- Contatore PENDING_RECONCILE_FAILED (badge arancione + highlight)
- Contatore approvati questo mese
- Soft warning visibile: "3 override questo mese — soglia raggiunta"

**NUOVA card KPI "Cancellation Rate portali (30gg rolling)"**:
- Per ogni canale OTA attivo (Viator/Bokun, Boataround, SamBoat, Click&Boat,
  Nautal): pill colorato con % cancellation rate ultimi 30gg
- Formula: `(override admin-confirmed su quel canale) / (booking totali su
  quel canale ultimi 30gg)`
- Soglie visive:
  - `< 3%`: verde OK
  - `>= 3% AND < 5%`: rosso "soft warning — avvicinandosi limite Viator/GYG"
  - `>= 5%`: rosso "HARD BLOCK — non puoi approvare nuovi override su
    questo canale finche' non scende"
- Soglie configurabili via `env.ts`:
  `OVERRIDE_CANCELLATION_RATE_SOFT_WARN` (default 0.03),
  `OVERRIDE_CANCELLATION_RATE_HARD_BLOCK` (default 0.05)
- Cache Redis TTL 60s per-channel per evitare query aggregazione ogni render

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

### 13.9 OTA upstream cancellation race

Scenario: admin approva override contro Viator/Bokun alle 14:00. Admin
spunta le 4 checkbox, il webhook Bokun `bookings/cancel` arriva alle 14:02,
admin clicca Approva alle 14:03 → newBooking CONFIRMED, `reconcileCheckDue
= 15:03`. Il cron reconciliation §8.4 parte alle 15:10 e interroga Bokun
API per il bookingId cancellato.

**Caso OK**: Bokun ritorna `status: CANCELLED` → nessuna azione, set
`reconcileCheckedAt = now`.

**Caso failure**: Bokun ritorna `status: CONFIRMED` (Viator non ha cascadato
la cancellazione, bug sistema esterno, admin ha spuntato checkbox senza aver
cancellato davvero, o booking re-confermato nel frattempo):
- `OverrideRequest.status = PENDING_RECONCILE_FAILED`
- Dispatch notification admin email + telegram FATAL
- UI admin detail page mostra banner rosso fisso + bottone "Retry reconcile"
- Admin deve:
  1. Tornare su Viator extranet, verificare stato booking
  2. Ri-cancellare se necessario
  3. Attendere cascade webhook
  4. Cliccare "Retry reconcile" → sistema rilancia check
- Se upstream ora CANCELLED: `status → APPROVED`, alert cleared
- Se ancora attivo: resta FAILED

Questo gap residuo (tra i nostri 2 sistemi + Viator) non puo' essere risolto
con piu' automazione sicura: noi non dovremmo chiamare `Bokun.cancel()` via
API perche' e' supplier-initiated (penalty metriche Viator). Meglio alertare
admin e farglielo gestire.

### 13.10 Cancellation-rate limit raggiunto

Scenario: Viator nel rolling 30gg e' a 5.1% (6 override admin-confirmed su
118 booking Viator totali). Admin cerca di approvare nuovo override che
coinvolge Viator conflict.

- Pre-check in `approveOverride`: `computeCancellationRate("BOKUN", 30)`
  → 0.051 > `OVERRIDE_CANCELLATION_RATE_HARD_BLOCK` (0.05)
- Throw `ValidationError` con messaggio:
  ```
  Impossibile approvare: Viator/Bokun cancellation rate ultimi 30gg e' al
  5.1%, sopra la soglia hard-block 5%. Viator de-ranka i supplier sopra
  questa soglia. Attendi che il rate scenda (tipicamente 30gg dalle ultime
  cancellazioni) prima di approvare nuovi override su questo canale.

  Dettaglio:
    Booking Viator ultimi 30gg: 118
    Override admin-confirmed ultimi 30gg: 6
    Rate corrente: 5.1%
    Soglia hard-block: 5.0%
  ```
- Admin puo': (a) rifiutare l'override, (b) aspettare, (c) approvare
  manualmente forzando il check (feature deferred a Plan 7 — per ora hard
  block e' hard).

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
```

UI admin mostra queste label in `/admin/servizi` pero' non le usa per
override. Documentazione chiara admin: "La priorita' e' solo etichetta visiva.
Decisioni override basate su revenue."

## 15. Notification + email

### 15.1 Nuovi eventi NotificationType

```ts
type NotificationType =
  | ... existing ...
  | "OVERRIDE_REQUESTED"          // ad admin dopo creazione richiesta
  | "OVERRIDE_REMINDER"           // ad admin dopo 24h/48h/72h (cron §8.1)
  | "OVERRIDE_APPROVED"           // a customer winner (nuovo template)
  | "OVERRIDE_REJECTED"           // a customer new-booking rifiutato (nuovo)
  | "OVERRIDE_EXPIRED"            // a customer dopo drop-dead (nuovo)
  | "OVERRIDE_SUPERSEDED"         // a customer auto-rifiutato da revenue superiore
  | "OVERRIDE_RECONCILE_FAILED"   // ad admin FATAL quando cron §8.4 rileva upstream still active
  | "CROSS_CHANNEL_CONFLICT"      // ad admin (ManualAlert) per reverse override §6.5/§6.6
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
12. ✓ Multi-day (Charter 7gg) cancellato per single-day (Gourmet) → alert ⚠ ALTO IMPATTO
13. ✓ Override contro OTA → checklist 4-step + polling webhook + Approve disabled
14. ✓ Reverse override (webhook OTA su data con booking DIRECT attivo) → ManualAlert
15. ✓ Cancellation-rate > 5% Viator → approveOverride rifiuta con ValidationError
16. ✓ Reconcile cron +1h: upstream ancora active → PENDING_RECONCILE_FAILED

## 17. Performance

- **Cancellation-rate cache Redis TTL 60s per-channel** per evitare la query
  aggregazione `groupBy` ad ogni render dashboard admin (query comunque veloce
  ma in alta stagione con 10+ admin concurrent = N dashboard reload simultanei).
  Key: `cancellation-rate:{channel}:{windowDays}`. Invalidata on-demand quando
  un override e' approvato/rifiutato (write-through invalidation).
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
5. **Rollout graduale con 2 feature flag** (post-brainstorm 2026-04-23):
   a. Abilita `FEATURE_OVERRIDE_ENABLED=true` in staging → QA completo
      DIRECT-vs-DIRECT → abilita in prod
   b. Dopo 1-2 settimane di stabilita' produzione (no PENDING_RECONCILE_FAILED,
      no booking orfani, funnel metrics OK) → abilita
      `FEATURE_OVERRIDE_OTA_ENABLED=true` per workflow OTA (checklist admin
      + reconciliation cron + cancellation rate guard)
   c. Rollback granulare: se il workflow OTA ha problemi ma DIRECT va,
      spegnere solo `FEATURE_OVERRIDE_OTA_ENABLED` — i DIRECT override
      continuano a funzionare

### 19.2 Rollback

- Feature flag off → cliente flow torna al behavior attuale (no override, status blocked → "data non disponibile")
- DB schema resta, nessun reset necessario
- Record OverrideRequest eventualmente creati restano come storico

### 19.3 Feature flag

2 env var (post-brainstorm 2026-04-23):
- `FEATURE_OVERRIDE_ENABLED=true|false` — master switch del sistema override
  (DIRECT-vs-DIRECT). Default false in prod fino a test.
- `FEATURE_OVERRIDE_OTA_ENABLED=true|false` — gating del workflow OTA
  (checklist admin + cancel manuale + reconciliation cron + cancellation rate
  hard-block). Default false. Richiede `FEATURE_OVERRIDE_ENABLED=true`.

Se `FEATURE_OVERRIDE_ENABLED=true` e `FEATURE_OVERRIDE_OTA_ENABLED=false`:
gli override con almeno un conflict OTA vengono rifiutati al submit con
reason `"ota_override_disabled"` → cliente vede scenario C blocked.

## 20. Effort stimato

Plan-level breakdown (post-brainstorm 2026-04-23: rimosso Cabin Charter
risparmia ~2gg, aggiunto workflow OTA + cancellation-rate + reconcile cron
aggiunge ~2gg → totale invariato):

- Schema + migration: 0.5 gg
- Pure helper `override-eligibility.ts` + test: 0.5 gg
- Server action `createOverrideRequest` integrato in `create-direct.ts` +
  nuovo Server Action `checkOverrideEligibility` per wizard: 1 gg
- Server actions `approveOverride` / `rejectOverride` (incluso OTA checklist
  validation): 1 gg
- Cron `override-dropdead` + `override-reminders` + `override-reconcile`: 1 gg
- UI admin `/admin/override-requests` (lista + detail + checklist OTA
  workflow + polling webhook sync): 2 gg
- UI admin cancellation-rate KPI card + soglie env + Redis cache: 0.5 gg
- Integrazione sidebar + dashboard KPI: 0.5 gg
- UI cliente wizard timing al Continua (spinner + error banner inline +
  sessionStorage greying): 1 gg
- Template email × 5 (pending / approved / rejected / expired / apology
  enhanced): 1 gg
- Notification events + dispatcher integration (inclusi OVERRIDE_RECONCILE_FAILED
  + CROSS_CHANNEL_CONFLICT): 0.5 gg
- Integration tests: 2 gg
- Manual QA: 0.5 gg

**Totale: ~12 giorni effettivi** (invariato vs brainstorm #1: -2gg Cabin
Charter, +2gg workflow OTA/cancellation-rate/reconcile).

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
