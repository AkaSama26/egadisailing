# Piano di Migrazione a Bokun

**Data:** 2026-04-16
**Obiettivo:** spostare il motore di prenotazioni su Bokun, mantenendo la dashboard admin custom come unico punto di gestione per il cliente.

---

## 1. Executive summary

### Da dove partiamo
- **Dashboard admin custom** in Next.js 16 gia' costruita (bookings, customers, trips, calendar, pricing, finance) — funzionalmente connessa al DB Postgres via Prisma
- **Sito pubblico** con BookingSearch non funzionale
- **Stripe** non ancora integrato
- **Nessun canale OTA** integrato

### Dove vogliamo arrivare
- **Bokun come backend unico** per tutte le prenotazioni (sito + OTA)
- **Dashboard admin custom** mantenuta — legge/scrive via API Bokun invece del DB Prisma locale
- **Sito pubblico** con checkout: widget Bokun embedded in fase 1, valutare custom UI via API in fase 3
- **Stripe Connect** agganciato a Bokun per pagamenti diretti
- **Tutti i canali OTA** (Viator, GetYourGuide, Airbnb Experiences, Musement, Tiqets, Headout, Klook, Google Things to do, ecc.) gestiti automaticamente da Bokun
- **Canali charter** (Boataround, SamBoat, Click&Boat, Nautal) via integrazione separata perche' Bokun non li copre — valutare se escluderli in fase 1 e aggiungerli dopo

### Principio guida
**Bokun e' la source of truth per i dati di prenotazione.** Il nostro DB locale tiene solo:
- Utenti admin e autenticazione
- Override/personalizzazioni locali (note interne, tag custom)
- Cache performance per ridurre chiamate API

---

## 2. Decisioni architetturali chiave

### 2.1 Source of truth
| Entita' | Source of truth | Locale |
|---|---|---|
| Services / Prodotti | **Bokun** | Cache read-only |
| Trips / Departures | **Bokun** | Cache read-only |
| Bookings | **Bokun** | Cache + note locali opzionali |
| Customers | **Bokun** | Cache + note/tag locali |
| Pricing / Periodi | **Bokun** | — |
| Boats | **Locale** (descrittivo per sito) | DB Prisma |
| Crew | **Locale** | DB Prisma |
| Admin users | **Locale** (NextAuth) | DB Prisma |

### 2.2 Comunicazione con Bokun
- **REST API** di Bokun per tutte le operazioni CRUD dalla dashboard
- **Webhooks in ingresso** da Bokun per eventi real-time (nuova prenotazione, modifica, cancellazione)
- **Polling fallback** ogni 5 minuti per catturare eventi persi (backup dei webhook)

### 2.3 Cache strategy
- **React Query / SWR** lato client per cache in-memory durante sessione utente
- **Redis** (opzionale fase 3) per cache server-side condivisa con TTL 60s
- **Stale-while-revalidate** per UX fluida anche con latenza API

### 2.4 Fallback/resilienza
- Se Bokun e' giu' > 1 minuto, dashboard mostra cache con banner "modalita' offline, dati aggiornati a HH:MM"
- Nessun write permesso in modalita' offline
- Logging errori su Sentry / piattaforma simile

---

## 3. Fasi di migrazione

### Fase 0 — Prerequisiti (1 settimana, in parallelo con fase 1)
**Azioni esterne (cliente):**
- [ ] Registrazione account Bokun (14 giorni trial gratuito)
- [ ] Registrazione account Stripe aziendale
- [ ] Connessione Stripe Connect a Bokun
- [ ] Primo import dei prodotti su Bokun (5 servizi: SOCIAL_BOATING, EXCLUSIVE_EXPERIENCE, CABIN_CHARTER, BOAT_SHARED, BOAT_EXCLUSIVE)
- [ ] Configurazione dei pricing period nella dashboard Bokun
- [ ] Richiesta API key Bokun (include `BOKUN_VENDOR_ID`, `BOKUN_ACCESS_KEY`, `BOKUN_SECRET_KEY`)

**Azioni interne (dev):**
- [ ] Richiesta accesso sandbox Bokun per sviluppo
- [ ] Studio OpenAPI spec di Bokun
- [ ] Creazione feature branch `feature/bokun-migration`
- [ ] Aggiunta variabili d'ambiente al `.env.example`

**Deliverable:** credenziali test valide, branch pronto.

---

### Fase 1 — Bokun client e lettura bookings (settimana 1-2)

**Obiettivo:** la dashboard admin legge le prenotazioni da Bokun invece che dal DB locale.

#### 1.1 Creazione client Bokun
- [ ] `src/lib/bokun/client.ts` — client HTTP tipizzato con auth HMAC
- [ ] `src/lib/bokun/types.ts` — tipi TypeScript generati dall'OpenAPI spec
- [ ] `src/lib/bokun/errors.ts` — gestione errori (401, 429 rate limit, 5xx)
- [ ] `src/lib/bokun/cache.ts` — wrapper con React Query / SWR integration

#### 1.2 Sostituzione lettura bookings
- [ ] `src/app/admin/(dashboard)/bookings/page.tsx` — chiamata a `bokunClient.listBookings()` invece di `db.booking.findMany()`
- [ ] `src/app/admin/(dashboard)/bookings/[id]/page.tsx` — `bokunClient.getBooking(id)`
- [ ] `src/app/admin/(dashboard)/calendar/page.tsx` — calendario da Bokun departures
- [ ] Mappa `BokunBooking → adattatore → UI type` (per non cambiare tutti i componenti)

#### 1.3 Feature flag
- [ ] Aggiungi `NEXT_PUBLIC_DATA_SOURCE=bokun|local` per poter switchare durante sviluppo

**Rollback point:** se tutto si rompe, `NEXT_PUBLIC_DATA_SOURCE=local` torna a Prisma.

**Deliverable:** dashboard admin mostra bookings da Bokun in sola lettura.

---

### Fase 2 — Scrittura operazioni base (settimana 2-3)

**Obiettivo:** l'admin puo' creare/modificare/cancellare prenotazioni su Bokun dalla dashboard.

#### 2.1 Create/update booking
- [ ] Sostituisci `createManualBooking` server action → chiamata `bokunClient.createBooking()`
- [ ] `updateBookingStatus` → `bokunClient.updateBookingStatus()`
- [ ] Gestione rimborsi → `bokunClient.refundBooking()` (passa per Stripe Connect automaticamente)

#### 2.2 Customers
- [ ] Lista customers da Bokun (`bokunClient.listCustomers()`)
- [ ] Create/update customer via Bokun
- [ ] Note interne rimangono nel DB locale (tabella `customer_notes` con `bokun_customer_id`)

#### 2.3 Trips (departures in terminologia Bokun)
- [ ] Creazione trip su Bokun (non piu' localmente)
- [ ] Aggiornamento availability via Bokun

**Deliverable:** admin completamente funzionante contro Bokun API.

---

### Fase 3 — Webhooks e real-time (settimana 3-4)

**Obiettivo:** prenotazioni da OTA e dal sito appaiono istantaneamente nella dashboard senza refresh.

#### 3.1 Webhook receiver
- [ ] `POST /api/webhooks/bokun` — endpoint pubblico con validazione firma HMAC
- [ ] Gestione eventi: `booking.created`, `booking.updated`, `booking.cancelled`, `booking.refunded`
- [ ] Registrazione webhook URL nel pannello Bokun
- [ ] Test con ngrok/tunnel in dev

#### 3.2 Invalidazione cache lato client
- [ ] Server-Sent Events o polling ridotto per notificare admin UI di nuovi bookings
- [ ] Toast notification "Nuova prenotazione da Viator" quando arriva

#### 3.3 Polling backup
- [ ] Cron job (o `setInterval` server-side) ogni 5 min per recuperare eventi persi
- [ ] Tabella locale `sync_state` per tracciare ultimo evento processato

**Deliverable:** prenotazioni real-time da tutti i canali Bokun.

---

### Fase 4 — Frontend sito: widget Bokun (settimana 4-5)

**Obiettivo:** il sito pubblico accetta prenotazioni tramite widget Bokun con Stripe.

#### 4.1 Integrazione widget
- [ ] Sostituisci `BookingSearch` con widget Bokun embedded o link a Bokun checkout
- [ ] Customizzazione CSS del widget per matching col tema sito (limitato ma possibile)
- [ ] Testing su desktop + mobile

#### 4.2 Pagine prodotto
- [ ] `/experiences/[slug]` — dettaglio servizio con widget di booking del singolo prodotto
- [ ] Sostituisci testi hardcoded con dati da Bokun API (lato server, cached)

#### 4.3 Conferma prenotazione
- [ ] Redirect post-checkout a pagina brandizzata `/booking/confirmed`
- [ ] Email transazionali gestite da Bokun (configurate nel pannello)

**Deliverable:** sito pubblico accetta prenotazioni, i soldi arrivano via Stripe, la prenotazione appare nella dashboard admin.

---

### Fase 5 — Migrazione dati locali (settimana 5)

**Obiettivo:** se il cliente ha gia' prenotazioni nel DB Prisma attuale (anche seed), spostarle su Bokun.

#### 5.1 Script di import
- [ ] `scripts/migrate-to-bokun.ts` — legge DB Prisma, crea su Bokun:
  - Services → Bokun Products
  - PricingPeriods → Bokun Pricing
  - Customers → Bokun Customers
  - Trips → Bokun Departures
  - Bookings → Bokun Bookings (con riferimento originale nel campo `externalId`)

#### 5.2 Verifica
- [ ] Report pre-migration: quanti record da migrare
- [ ] Dry run in sandbox Bokun
- [ ] Migrazione reale
- [ ] Report post-migration: checksums, record mismatch

#### 5.3 Freeze del DB Prisma
- [ ] Dopo migration, setta flag `NEXT_PUBLIC_DATA_SOURCE=bokun` come default
- [ ] Mantieni schema Prisma solo per: `User`, `Boat` (info descrittive), `CrewMember`, `CustomerNote`

**Deliverable:** Bokun e' unica source of truth, DB Prisma ridotto al minimo.

---

### Fase 6 — Integrazione charter (settimana 6-8, opzionale)

**Obiettivo:** aggiungere canali charter che Bokun non copre (Boataround, SamBoat, Click&Boat, Nautal).

**Da decidere con cliente:** se il cliente vende **solo tour/esperienze**, salta questa fase. Se vende anche charter settimanali, qui lavoriamo.

#### Opzioni
- **A. Charter gestiti come "rental" su Bokun** (se Bokun li supporta bene) — tutto in Bokun
- **B. Mini-adapter separato**: custom code che tiene charter in DB locale e sincronizza con Boataround API + iCal per gli altri; integra con dashboard admin come "tab separato"

**Deliverable:** charter gestiti allo stesso modo dei tour (idealmente tutto in Bokun), oppure tab separato nella dashboard.

---

## 4. Timeline complessiva

| Fase | Settimana | Durata | Blockers |
|---|---|---|---|
| Fase 0 — Setup | 1 | 1 settimana | Cliente deve registrare Bokun + Stripe |
| Fase 1 — Read | 1-2 | 1-2 settimane | Credenziali Bokun sandbox |
| Fase 2 — Write | 2-3 | 1 settimana | Fase 1 completata |
| Fase 3 — Realtime | 3-4 | 1 settimana | Fase 2 completata |
| Fase 4 — Frontend | 4-5 | 1 settimana | Fase 1 completata (parallelizzabile con 2/3) |
| Fase 5 — Dati | 5 | 3-5 giorni | Fasi 1-4 complete |
| Fase 6 — Charter | 6-8 | 2-3 settimane | Opzionale, solo se serve |

**Timeline realistica**: **4-6 settimane** per go-live con tour/esperienze, **6-8 settimane** se includiamo anche charter.

---

## 5. Rischi e mitigazioni

| Rischio | Probabilita' | Impatto | Mitigazione |
|---|---|---|---|
| Bokun API cambia durante dev | Bassa | Medio | Versioning API + changelog monitoring |
| Rate limit Bokun | Media | Medio | Cache aggressiva, batching requests |
| Bokun down in produzione | Bassa | Alto | Fallback cache read-only + notifiche Sentry |
| Widget Bokun troppo limitato per branding | Media | Medio | Piano B: custom checkout con Bokun API (fase 3) |
| Charter non gestibile bene in Bokun | Alta | Alto | Plan separato (fase 6 opzionale) |
| Cliente cambia idea su Bokun | Bassa | Alto | Architettura isolata: tutte chiamate passano per `bokun/client.ts`, sostituibile in giornata |
| Costi Bokun crescono oltre previsioni | Bassa | Medio | Monitoring billing + alert budget mensile |

---

## 6. Checklist di go-live

Prima del cutover in produzione:

- [ ] Stripe in live mode collegato correttamente
- [ ] Bokun in live mode (non sandbox) con prodotti configurati
- [ ] Webhook Bokun → nostro endpoint `POST /api/webhooks/bokun` verificato
- [ ] Test end-to-end: prenotazione dal sito → Stripe → Bokun → dashboard admin (tutti i passaggi)
- [ ] Test end-to-end: prenotazione da Viator sandbox → Bokun → dashboard admin
- [ ] Email transazionali testate (conferma cliente, notifica operatore)
- [ ] Backup DB Prisma prima della migration
- [ ] Rollback plan scritto e testato
- [ ] Monitoring attivo (Sentry, Bokun webhook logs)
- [ ] Formazione cliente sull'uso della dashboard (1-2 ore)

---

## 7. Cosa NON migriamo a Bokun

Queste parti rimangono nel codice custom:

- **Autenticazione admin** (NextAuth + DB locale)
- **Note interne sui clienti** (tabella `customer_notes` locale con FK a `bokun_customer_id`)
- **Gestione crew/equipaggio** (non e' compito di Bokun)
- **Boats** (dati descrittivi della flotta, non sono "prodotti" vendibili)
- **Finance dashboard** (legge da Bokun ma aggrega con logica nostra — reportistica custom)
- **Sito marketing** (homepage, about, isole, ecc. — resta statico/CMS)

---

## 8. Domande aperte al cliente

Prima di iniziare Fase 0:

1. Esiste gia un account Bokun? Altrimenti quando si puo' registrare?
2. Esiste gia un account Stripe aziendale attivo per ricevere pagamenti EUR?
3. Il cliente ha preferenze forti sul checkout: widget Bokun accettabile o serve custom UI al 100%?
4. Includiamo i charter settimanali al lancio o li gestiamo in fase 6 separata?
5. Ci sono prenotazioni gia' attive nel DB locale da migrare, o partiamo da zero?
6. Quanti admin users accederanno alla dashboard?

---

## 9. Definition of Done

Il progetto e' completato quando:

1. ✅ La dashboard admin mostra in real-time tutte le prenotazioni di tutti i canali
2. ✅ Il cliente puo' creare/modificare/cancellare prenotazioni dalla dashboard
3. ✅ Il sito pubblico accetta prenotazioni con pagamento Stripe
4. ✅ Le prenotazioni da Viator/GYG/Airbnb/ecc. arrivano automaticamente nella dashboard
5. ✅ Le email transazionali funzionano
6. ✅ Il cliente ha ricevuto formazione e sa usare la dashboard
7. ✅ Il codice e' documentato (README + docs tecniche)
8. ✅ Monitoring attivo con alert su errori critici

---

## 10. Note finali

- **Vantaggio chiave di questa architettura**: il cliente mantiene la sua dashboard brandizzata, ma noi non costruiamo un channel manager da zero. Si paga Bokun €49/mese per risparmiare mesi di sviluppo.
- **Uscita da Bokun**: possibile in qualsiasi momento. L'architettura isola le chiamate Bokun in un client dedicato. Se il cliente decide di cambiare provider, si sostituisce solo quel file.
- **Valore per il cliente**: dashboard custom con il design del sito + accesso a 10+ canali OTA + pagamenti sicuri con Stripe + nessun vendor lock-in sulle funzionalita' core.
