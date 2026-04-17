# Egadisailing Platform V2 — Design Spec

**Data:** 2026-04-17
**Status:** Approvato dal cliente
**Obiettivo:** Prodotto completo e funzionante per charter e tour booking con tre source (sito diretto, Bokun OTA, charter platforms) unificati dal DB locale.

---

## 1. Visione generale

Egadisailing Platform V2 è un sistema di gestione prenotazioni charter/tour che unifica tre fonti di booking indipendenti usando il database locale come source of truth assoluto. Ogni prenotazione — sia generata sul sito proprietario, sia ricevuta da Bokun (canali OTA), sia da charter platforms (Boataround, SamBoat, Click&Boat, Nautal) — viene salvata nel DB locale e il suo impatto sul calendario propagato automaticamente a tutti gli altri canali.

Il sito proprietario usa Stripe direttamente per il checkout (con supporto acconto/saldo), senza passare da Bokun. Bokun gestisce esclusivamente i canali OTA. I charter platforms sono integrati con strategie miste (API, iCal, email parsing) in base a cosa ogni piattaforma supporta.

### Principi guida
- **DB locale = master**: nessun altro sistema ha autorità sulla disponibilità
- **Layer indipendenti**: se un canale è giù, gli altri continuano
- **Qualità production-grade dal lancio**: niente MVP, niente shortcut
- **Profittabilità sopra la complessità**: soluzioni semplici che massimizzano il revenue

---

## 2. Architettura generale

```
┌──────────────────────────────────────────────────────┐
│            DB LOCALE (PostgreSQL) — MASTER           │
│  Calendario disponibilità unificato per barca        │
│  Prenotazioni, prezzi, clienti, crew, hot days       │
└───────┬──────────────────┬──────────────────┬────────┘
        │                  │                  │
    ┌───▼────┐       ┌─────▼──────┐     ┌────▼─────────┐
    │  SITO  │       │   BOKUN    │     │   CHARTER    │
    │ Stripe │       │  hub OTA   │     │  platforms   │
    │ diretto│       │            │     │  (4 sistemi) │
    └────────┘       └────────────┘     └──────────────┘
        │                  │                  │
  Checkout custom     Viator / GYG /      Boataround
  con acconti        Airbnb / Tiqets      SamBoat
                     Headout / Klook      Click&Boat
                     Musement              Nautal
```

### Regola invariante
**Ogni cambio di `BoatAvailability`**, da qualunque source, **triggera fan-out verso tutti gli altri canali** via `SyncQueue`.

### Anti-loop (idempotenza)
Ogni record ha `lastSyncedSource` e `lastSyncedAt`. Se un webhook in entrata corrisponde a un sync appena effettuato, viene ignorato.

### Graceful degradation (A+)
- Le prenotazioni sul sito vengono **sempre accettate**, anche se i sync esterni falliscono
- Retry esponenziale (1min → 5min → 15min → 1h → 6h)
- Coda persistente nel DB (`sync_queue`)
- Dashboard mostra health status in tempo reale
- Alert escalation (Telegram/email) se sync fallisce > 1h

---

## 3. Layer 1 — Sito proprietario con Stripe diretto

### Pagine
- Homepage, Esperienze, Barche, Isole, Chi Siamo, Contatti, FAQ (esistenti)
- `/prenota/[slug]` — checkout wizard
- `/recupera-prenotazione` — OTP flow
- `/b/sessione` — area cliente dopo autenticazione OTP
- `/booking/confirmed` — pagina successo post-pagamento

### Booking wizard

**Step 1 — Data**
- Calendario con disponibilità live per il servizio selezionato
- Meteo live per ogni data (forecast Open-Meteo, cache 6h)
- Date a rischio mostrano messaggio rassicurante + Weather Guarantee badge

**Step 2 — Persone/cabine**
- Calcolo prezzo con hot day applicato
- Preview totale live
- Breakdown (base + hot day supplement se applicabile)

**Step 3 — Dati cliente**
- Nome, email, telefono, nazionalità, note opzionali
- Accetta T&C, privacy policy

**Step 4 — Pagamento**
- Toggle "Acconto X%" / "Paga tutto" per servizi che supportano deposit
- Stripe Elements embedded (3D Secure automatico)
- Weather Guarantee riepilogata
- Policy cancellazione visibile

**Step 5 — Conferma**
- Schermata successo con confirmation code
- Email automatica con dettagli + link "Recupera prenotazione"

### Post-pagamento (server actions + queue)
1. `DirectBooking` + `Payment` salvati nel DB
2. `BoatAvailability` aggiornata (date bloccate)
3. `SyncQueue` attiva fan-out parallelo:
   - Bokun API: `updateAvailability(productId, date, 0)`
   - Boataround API: `POST /partner/availability`
   - iCal endpoint aggiornato (SamBoat lo legge ogni ora)
   - Alert dashboard: "⚠️ Blocca manualmente Click&Boat/Nautal" (con link diretto al pannello)
4. Email conferma al cliente (Brevo)
5. Se acconto: job schedulato per invio payment link saldo (7 giorni prima dell'esperienza)

### Stripe integration
- `src/lib/stripe/` — client custom
- Payment Intent creato server-side prima della conferma
- Webhook Stripe → `/api/webhooks/stripe` per conferma/failure
- Refund via Stripe API (gestito da dashboard admin)
- Saldo via payment link generato dal nostro sistema (non Bokun)

### Recupera prenotazione — OTP flow
1. Cliente inserisce email in `/recupera-prenotazione`
2. Sistema invia codice 6 cifre (valido 15 min)
3. Cliente inserisce codice → accesso per 7 giorni (cookie httpOnly)
4. Lista prenotazioni + azioni: cancella, paga saldo, scarica voucher

### Rate limiting OTP
| Scope | Limite | Azione al superamento |
|---|---|---|
| Per email | 3/ora, 5/giorno | "Riprova tra X ore" |
| Per IP | 10/ora, 30/giorno | CAPTCHA Turnstile obbligatorio |
| Per email+IP | 2/ora | Più restrittivo |
| Burst | 1 ogni 30 secondi | Anti-spam |
| Tentativi codice | 3 errori | Codice invalidato |
| Tentativi per email | 10/ora | Blocco email 1h |
| Tentativi per IP | 20/ora | Blocco IP 2h |

**Trigger alert admin**:
- 20+ richieste OTP stessa email in 1h → email admin
- 50+ richieste stesso IP in 1h → blocco IP 24h + email
- 100+ email diverse stesso IP in 1h → blocco IP + Telegram

---

## 4. Layer 2 — Bokun come hub OTA

### Ruolo
Bokun gestisce **solo i canali OTA** (Viator, GetYourGuide, Airbnb Experiences, Tiqets, Headout, Klook, Musement). Le prenotazioni dirette del sito NON passano da Bokun.

### Cosa fa Bokun
- Riceve prenotazioni dagli OTA tramite channel manager
- Notifica via webhook (HMAC-SHA256)
- Mantiene catalogo prodotti con prezzi più alti (markup 10-20% vs sito)

### Cosa non fa Bokun
- Non processa pagamenti del sito proprietario
- Non riceve copia delle prenotazioni dirette
- Non è checkout per il sito

### Sync disponibilità (sito → Bokun)
Quando una prenotazione non-OTA aggiorna `BoatAvailability`, chiamiamo Bokun **solo** per bloccare le date nei prodotti, senza creare prenotazioni su Bokun.

### Webhook Bokun (OTA → nostro DB)
```
Cliente prenota su Viator
    ↓
Viator → Bokun
    ↓
Webhook bookings/create → /api/webhooks/bokun
    ↓
Verifica HMAC-SHA256
    ↓
GET /booking.json/booking/{id} per dettagli
    ↓
Crea BokunBooking nel DB (mirror)
    ↓
BoatAvailability aggiornata
    ↓
SyncQueue fan-out agli altri canali
    ↓
Notifica admin
```

### Bokun client (`src/lib/bokun/`)
- `client.ts` — HTTP client con HMAC-SHA1 auth
- `webhook-verifier.ts` — HMAC-SHA256 per webhooks
- `types.gen.ts` — tipi generati da OpenAPI YAML
- `adapters/` — Bokun types → UI types
- Metodi usati: `updateAvailability`, `getBooking`, `searchBookings` (reconciliation)

### Hot day propagation
Quando admin modifica prezzi/hot days:
1. Calcolo prezzo sito: `base × hot_multiplier → arrotondato`
2. Calcolo prezzo Bokun: `prezzo_sito × bokun_markup → arrotondato`
3. Job asincrono `bokun-pricing-sync` chiama Bokun API
4. Salva `BokunPriceSync` per tracking rollback
5. Reconciliation cron notturno verifica allineamento

### Canali OTA
**Tier 1 (al lancio)**: Viator (0% fee Bokun), GetYourGuide, Airbnb Experiences
**Tier 2 (post-lancio)**: Tiqets, Headout, Klook, Musement
Attivazione via pannello Bokun, ogni canale ha approvazione OTA 1-4 settimane.

---

## 5. Layer 3 — Charter platforms

### 5.1 Boataround (API bidirezionale)
- **Automazione**: 90%
- Push availability: `POST /partner/availability`
- Push pricing: `POST /partner/pricing`
- Pull booking: webhook → `/api/webhooks/boataround`
- Prerequisito: token API via email a `info@boataround.com`
- Client: `src/lib/boataround/`

### 5.2 SamBoat (iCal + email parsing)
- **Automazione**: 70%
- Push availability: endpoint `GET /api/ical/boat-{id}.ics`, SamBoat legge ogni ora
- Pull booking: email parser (cron 5min o IMAP IDLE)
- Template email standardizzato, parser specifico
- Parser: `src/lib/email-parser/samboat.ts`

### 5.3 Click&Boat (tentativo API + fallback manuale)
- **Automazione**: 55% (sale a 90% se API diretta approvata)
- Tentativo contatto commerciale al kickoff (email + form pro owners)
- Ingestion: email parser (`src/lib/email-parser/clickandboat.ts`)
- Push availability: alert manuale nella dashboard con link diretto al pannello
- Se API approvata: sostituzione alert con chiamata API automatica

### 5.4 Nautal (email parsing)
- **Automazione**: 50%
- Stesso stack di Click&Boat (stesso gruppo)
- Parser: `src/lib/email-parser/nautal.ts` (variante template)
- Push availability: alert manuale

### 5.5 Email parser architecture
`src/lib/email-parser/`
- `imap-client.ts` — connessione IMAP a `bookings@egadisailing.com`
- `dispatcher.ts` — identifica mittente, seleziona parser
- Parser specifici: `samboat.ts`, `clickandboat.ts`, `nautal.ts`, `airbnb.ts`, `bokun.ts` (fallback)
- `booking-extractor.ts` — interfaccia comune
- Schedule: cron 5min + IMAP IDLE se supportato
- Dedup: `messageId` salvato, mai processare due volte
- Fallback manuale se parser fallisce: alert admin con screenshot email

### 5.6 Dashboard charter tab
Sezione "Charter" con:
- Lista prenotazioni unificata (tutte le 4 piattaforme)
- Filtri per source
- Health status di ogni canale
- Alert rosso "Blocca manualmente" per Click&Boat/Nautal quando necessario
- Bottone "Segna come bloccato" che dismissa l'alert dopo conferma manuale dell'admin

---

## 6. Modello dati

### Catalogo (seed-populated, semi-statico)

**Boat**
- id, name, type, description, specs (length, year, cabins, engine), amenities, images

**Service** (5 servizi fissi in codice + costanti)
- id, name, type, boatId, durationType, durationHours, capacityMax, minPaying
- defaultPaymentSchedule (FULL | DEPOSIT_BALANCE)
- defaultDepositPercentage (nullable)
- priority (per future logiche)
- bokunProductId (link al prodotto Bokun)

### Prezzi

**PricingPeriod** — prezzi stagionali base (master per il sito)
- id, serviceId, label, startDate, endDate, pricePerPerson, year

**HotDayRule** — regole automatiche
- id, name, dateRangeStart, dateRangeEnd, weekdays[], multiplier, roundTo, priority, active

**HotDayOverride** — override manuale
- id, date, serviceId (nullable), multiplier OR absolutePrice, note, createdBy

**BokunPriceSync** — tracking prezzi propagati a Bokun
- id, hotDayRuleId, bokunExperienceId, bokunPriceOverrideId, syncedAt, status, lastError

### Disponibilità

**BoatAvailability** — calendario unificato (master)
- id, boatId, date, status (AVAILABLE | BLOCKED | PARTIALLY_BOOKED), lockedByBookingId (nullable)

**SyncQueue**
- id, targetChannel, operation, payload, status (PENDING | PROCESSING | SYNCED | FAILED), attempts, nextRetryAt, lastError

**ChannelSyncStatus**
- channel, lastSyncAt, lastError, healthStatus (GREEN | YELLOW | RED)

### Prenotazioni

**Booking** (entità base)
- id, source (DIRECT | BOKUN | BOATAROUND | SAMBOAT | CLICKANDBOAT | NAUTAL)
- confirmationCode, customerId, serviceId, boatId
- startDate, endDate, numPeople, totalPrice
- status (CONFIRMED | PENDING | CANCELLED | REFUNDED)
- createdAt, updatedAt, externalRef (ID sulla piattaforma di origine)

**DirectBooking** (dettagli specifici sito)
- bookingId, paymentSchedule, depositAmount, balanceAmount, stripePaymentIntentId
- weatherGuaranteeApplicable (bool)
- cancellationPolicyApplied

**BokunBooking** (dettagli OTA)
- bookingId, bokunBookingId, channelName (Viator, GYG, Airbnb, ...)
- commissionAmount, netAmount

**CharterBooking** (dettagli charter)
- bookingId, platformName, platformBookingRef, originalPayload (JSON)

**Payment**
- id, bookingId, amount, currency, type (DEPOSIT | BALANCE | FULL | REFUND)
- method (STRIPE | STRIPE_LINK | CASH | BANK_TRANSFER | POS | EXTERNAL)
- status (PENDING | SUCCEEDED | FAILED | REFUNDED)
- stripeChargeId, createdAt, processedAt

### Clienti

**Customer** (deduplicato per email)
- id, email (unique), firstName, lastName, phone, nationality, language, notes

**BookingRecoveryOtp**
- id, email, codeHash, createdAt, expiresAt, attempts, usedAt, ipAddress

**BookingRecoverySession**
- id, email, tokenHash, createdAt, expiresAt, ipAddress, userAgent

**RateLimitEntry**
- id, identifier (email | ip | combo), scope, count, windowStart, windowEnd, blockedUntil

### Crew

**CrewMember**
- id, name, role (SKIPPER | CHEF | HOSTESS), phone, email, dailyRate, certifications (JSON), active

**CrewAvailability**
- id, crewMemberId, date, status (AVAILABLE | UNAVAILABLE | VACATION)

**TripCrew**
- id, bookingId, crewMemberId, role, hoursWorked, cost

### Meteo

**WeatherForecastCache**
- date, locationKey, forecast (JSON), fetchedAt, source (OPEN_METEO | STORMGLASS)

**WeatherGuaranteeApplication**
- id, bookingId, type (FULL_REFUND | RESCHEDULE | CREDIT), appliedAt, reason

### Sistema

**User** (admin singolo)
- id, email, passwordHash, name, role

**BookingNote**
- id, bookingId, note, authorId, createdAt

**AuditLog**
- id, userId, action, entity, entityId, before (JSON), after (JSON), timestamp

---

## 7. Dashboard admin

### Sidebar
Dashboard · Prenotazioni · Calendario · Disponibilità · Prezzi · Servizi · Clienti · Crew · Finanza · Canali · Meteo · Sync & Log · Impostazioni

### Dashboard home (KPI + alert)
- Revenue mese corrente
- Prenotazioni totali
- Uscite programmate
- Saldi pendenti
- Alert critici (manual channel blocks, crew non assegnata, meteo rischio alto)
- Mini calendar 7 giorni
- Channel health status

### Prenotazioni
Tabella unificata con filtri per source/data/stato. Tab per source. Export CSV.

### Calendario
Vista mensile per barca, badge colorato per source. Hot day indicator. Drag-to-reschedule.

### Prezzi + Hot Days
- Tabella prezzi base per servizio + stagionalità
- Editor regole hot day (automatiche e override)
- Calendario annuale con codifica colori (normale/hot/very hot/peak)
- Sync status Bokun per ogni pricing period

### Crew
- Anagrafica con ruoli
- Calendario disponibilità
- Auto-assign con suggestions (criteri: ruolo, disponibilità, rotazione equa)
- Controlli automatici (conflitti, warning su 6 giorni consecutivi, alert crew non assegnata a 48h)
- Notifiche crew (Telegram/email) quando assegnato

### Canali
Per ogni canale (Bokun, Boataround, SamBoat, Click&Boat, Nautal):
- Status ultimo sync
- Credenziali (masked)
- Log sync ultime 50 operazioni
- Test connection
- Setup instructions con link diretto al pannello

### Meteo
- Forecast settimanale per ogni uscita
- Soglie configurabili (vento, onde, precipitazioni, temperatura)
- Template messaggi rassicuranti per date a rischio
- Weather Guarantee on/off per servizio

### Sync & Log
- SyncQueue attuale (pending/retrying/failed)
- Webhook log (HMAC verification status)
- Audit log azioni sensibili
- Export CSV per debugging

---

## 8. Weather system

### API
- **Open-Meteo** (gratis, no API key) — primary
- **Stormglass.io** (freemium) — fallback per giornate ad alto rischio

### Soglie default (configurabili)
| Condizione | Rischio |
|---|---|
| Vento > 25 nodi | Alto |
| Vento 15-25 nodi | Medio |
| Precipitazione > 70% | Medio |
| Onde > 1.5m | Alto |
| Onde 1-1.5m | Medio |
| Temperatura < 18°C | Medio |

### Per il cliente sul sito
Card meteo in checkout con:
- Condizioni previste
- Temperatura, vento, onde
- **Date a rischio**: messaggio rassicurante + Weather Guarantee badge
- Alternative date proposte se rischio alto

### Weather Guarantee (feature prodotto)
- Se cancelliamo per maltempo: rimborso 100% o riprogrammazione gratuita
- Decidiamo 24-48h prima
- Template email pre-configurato per comunicare cancellazione
- Applicabile o meno per servizio (configurabile)

### Per admin
- Cron giornaliero 7:00 controlla forecast prossimi 7 giorni per ogni uscita
- Email alert se rischio alto
- Notifica dashboard se rischio medio
- Bottone "Notifica clienti" per cancellazione batch
- Report storico cancellazioni per meteo

---

## 9. Notifiche admin

| Evento | Canale |
|---|---|
| Nuova prenotazione diretta sito | Email |
| Nuova prenotazione Bokun OTA | Email |
| Nuova prenotazione charter | Email |
| Cancellazione cliente | Email |
| Payment failed | Email |
| Sync failure > 1h | Email |
| Crew non assegnata entro 48h | Email |
| Rischio meteo alto | Email + Telegram |
| Soglia fatturato | Dashboard |
| Saldo pendente 3 giorni | Dashboard |
| Rate limiting trigger | Dashboard + Telegram se grave |

---

## 10. Stack tecnico

### Frontend
- Next.js 16 (App Router, RSC, Server Actions)
- TypeScript strict
- Tailwind CSS v4 + shadcn/ui
- Framer Motion
- next-intl (25 lingue, contenuti statici)
- React Hook Form + Zod

### Backend
- Next.js API Routes per webhooks
- Server Actions per mutazioni admin
- Prisma v7 + PostgreSQL
- NextAuth v5 (JWT) per admin
- BullMQ + Redis per job queue

### Payments & Integrations
- Stripe SDK (checkout + webhooks)
- Bokun REST API client custom (HMAC-SHA1 + SHA256)
- Boataround Partner API client custom
- iCal generator RFC 5545 compliant
- IMAP client (`node-imap`) + `mailparser`
- Open-Meteo / Stormglass.io
- Brevo per email transazionali
- Telegram Bot API per push admin
- Cloudflare Turnstile per CAPTCHA

### Infrastructure
- Docker Compose: postgres + redis + next-app
- Nginx centrale sulla VPS (gestito separatamente)
- Cloudflare per SSL, DNS, DDoS, Turnstile
- Cron jobs via node-cron interno
- Sentry per error tracking
- Log strutturati con pino

### Development
- OpenAPI Generator per types Bokun
- Prisma Studio per DB inspection
- Playwright per E2E testing flussi critici

---

## 11. Definition of Done V1

### Core booking flow
- [x] Cliente prenota sul sito con Stripe (intero o acconto)
- [x] Acconto/saldo configurabile per servizio dall'admin
- [x] Email conferma automatica
- [x] Saldo tramite payment link 7 giorni prima
- [x] Recupero prenotazione via OTP
- [x] Cancellazione + refund secondo policy
- [x] Weather Guarantee applicabile

### Channels
- [x] Bokun push availability per canali OTA
- [x] Bokun webhook ingestion (Viator/GYG/Airbnb)
- [x] Boataround API bidirezionale
- [x] SamBoat iCal export + email parser
- [x] Click&Boat + Nautal email parser + alert manuale

### Calendar & availability
- [x] BoatAvailability master con fan-out automatico
- [x] Idempotenza anti-loop
- [x] Retry automatico
- [x] Dashboard health status

### Pricing
- [x] Prezzi base + stagionalità
- [x] Hot day rules + override
- [x] Arrotondamento per eccesso
- [x] Propagazione automatica a Bokun
- [x] Prezzi Bokun con markup indipendente

### Weather
- [x] Weather card checkout
- [x] Messaggi rassicuranti
- [x] Weather Guarantee
- [x] Alert admin automatici
- [x] Soglie configurabili

### Admin dashboard
- [x] Overview + KPI + alert
- [x] Prenotazioni unificate
- [x] Calendario master
- [x] Prezzi / hot days
- [x] CRM clienti
- [x] Crew + auto-assign
- [x] Finanza
- [x] Canali health
- [x] Sync & Log

### Notifiche
- [x] Email eventi 1-7
- [x] Telegram per meteo + sync critici
- [x] Dashboard in-app per il resto

### Security
- [x] HMAC verification webhook
- [x] Rate limiting rafforzato OTP
- [x] Turnstile CAPTCHA
- [x] Audit log
- [x] Sentry
- [x] Backup DB automatico

### Out of scope V1
- Multi-utente admin
- Area cliente con login/registrazione
- App mobile
- 100 pagine SEO (V2)
- Programma fedeltà
- Fatturazione automatica
- Review interno
- Cancellazione automatica priorità

---

## 12. Action items per il cliente

### Immediate (kickoff)
1. Account Bokun (trial 14gg, poi START $49/mese)
2. Account Stripe aziendale + Stripe Connect (opzionale per Bokun Pay)
3. Email `info@boataround.com` per token API
4. Form professional owners Click&Boat + email a `jeremy.bismuth@clickandboat.com`
5. Casella `bookings@egadisailing.com` con IMAP
6. Decidere percentuali acconto per servizio (default: Cabin Charter 30%)

### Configurazione Bokun
- 5 prodotti (Social Boating, Exclusive, Cabin Charter, Boat Tour, Boat Exclusive)
- Prezzi con markup +10-20% vs sito
- Cancellation policies
- Webhook URL: `https://egadisailing.com/api/webhooks/bokun`

---

## 13. Timeline stimata

Sviluppo sequenziale (deciso dal cliente):

| Blocco | Durata | Settimane |
|---|---|---|
| 1. DB + Backend (modello, queue, calendario) | 3-4 sett | 1-4 |
| 2. Sito + Stripe + OTP + area cliente | 3-4 sett | 5-8 |
| 3. Bokun integration (client + webhook + hot day sync) | 2-3 sett | 9-11 |
| 4. Charter integrations (Boataround → SamBoat → C&B → Nautal) | 3-4 sett | 12-15 |
| 5. Dashboard admin completa | 2-3 sett | 16-18 |
| 6. Weather + notifiche + testing E2E | 1-2 sett | 19-20 |

**Timeline totale: 18-20 settimane** per prodotto completo production-grade.

---

## 14. Riferimenti

- Bokun API research: `docs/superpowers/research/2026-04-16-booking-integrations-assessment.md`
- Bokun integration plan precedente: `docs/superpowers/plans/2026-04-16-bokun-integration-plan.md`
- Piano pubblico per cliente: `docs/client/2026-04-16-integrazioni-portali.md`

---

**Fine spec V2. Approvato dal cliente il 2026-04-17.**
