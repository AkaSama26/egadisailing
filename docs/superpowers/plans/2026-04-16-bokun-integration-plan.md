# Piano Integrazione Dashboard ↔ Bokun

**Data:** 2026-04-16
**Obiettivo:** Sostituire il backend custom (Prisma DB) con Bokun come source of truth, mantenendo la dashboard admin Next.js custom.
**Aggiornamento da:** `2026-04-16-bokun-migration-plan.md` (con correzioni post-research API)

---

## 1. Decisioni architetturali validate

### Stack Bokun che useremo
| Componente | Scelta | Motivo |
|---|---|---|
| **Auth** | REST API v1 con HMAC-SHA1 | Standard per integrazioni dirette (no app store) |
| **Booking CRUD** | REST API v1 (`/booking.json/...`) | API matura, completa |
| **Product CRUD** | REST API v2 (`/restapi/v2.0/experience/...`) | Solo v2 supporta experience builder moderno |
| **Webhooks** | HMAC-SHA256 su tutti gli eventi `bookings/*` | Real-time updates |
| **Pagamenti** | Stripe Connect (NON Bokun Pay) | Più controllo, meno commissioni, supporta acconti |
| **Widget checkout** | Custom UI via API in fase 2 | Controllo branding totale (widget per MVP fase 1) |

### Piano Bokun consigliato
- **START $49/mese** (≈€45)
- 1.5% commissione su prenotazioni dirette online (passabile al cliente)
- Viator 0% sempre
- Channel manager OTA: 0.5-1.5% in più sulle prenotazioni OTA
- 5 utenti admin inclusi

### Source of truth definitiva

| Entità | Master | Cache locale | Note |
|---|---|---|---|
| Products/Experiences | **Bokun** | Read-only, refresh ogni 5min | |
| Departures/Trips | **Bokun** | Read-only | |
| Bookings | **Bokun** | Read-only + note interne | Le note vivono in tabella `booking_notes` locale |
| Customers | **Bokun** (via booking aggregation) | + tag/segmentazione locale | REST v1 non ha CRUD customer diretto |
| Pricing periods | **Bokun** | — | |
| Boats | **Locale** | Solo nostra | Bokun non ha "boat" entity, usiamo solo per sito |
| Crew | **Locale** | Solo nostra | Bokun non gestisce equipaggio |
| Admin users | **Locale (NextAuth)** | — | |
| Foto/contenuti sito | **Locale + filesystem** | — | |

---

## 2. Stack tecnico dettagliato

### File structure prevista
```
src/lib/bokun/
├── client.ts              # HTTP client con HMAC-SHA1 auth
├── webhook-verifier.ts    # HMAC-SHA256 per webhooks
├── types.gen.ts           # Generato da OpenAPI YAML
├── types.ts               # Tipi custom + adattatori UI
├── errors.ts              # BokunApiError, retry logic
├── cache.ts               # SWR/React Query wrappers
└── adapters/
    ├── booking.ts         # Bokun → UI type
    ├── customer.ts        # Aggregation logic
    ├── product.ts
    └── trip.ts            # Departures → Trip

src/app/api/webhooks/
└── bokun/
    └── route.ts           # POST handler

src/app/admin/(dashboard)/
└── ...                    # Dashboard esistente, solo fonte dati cambia
```

### Dipendenze nuove
```bash
npm install @vercel/edge-config swr
npm install -D openapi-typescript
```

---

## 3. Fasi di implementazione

### Fase 0 — Prerequisiti (1 settimana)

**Cliente deve:**
- [ ] Registrare account Bokun (trial 14 gg)
- [ ] Registrare account Stripe aziendale (P.IVA, conto bancario)
- [ ] Connettere Stripe → Bokun (Settings → Payment providers → Stripe Connect)
- [ ] Configurare i 5 prodotti su Bokun:
  - Social Boating (DATE_AND_TIME, capacity 20, min 11)
  - Exclusive Experience (DATE_AND_TIME, capacity 20)
  - Cabin Charter (multi-day, capacity 3 cabins)
  - Boat Tour Condiviso (DATE_AND_TIME, capacity 12)
  - Boat Tour Esclusivo (DATE_AND_TIME, capacity 12)
- [ ] Configurare price schedules stagionali (bassa/media/alta/Ferragosto)
- [ ] Configurare cancellation policies (es. 100% refund se >48h)
- [ ] Configurare deposit settings (30% acconto per Cabin Charter, 100% per gli altri)
- [ ] Generare API key (Settings → Booking channels → API)
- [ ] Richiedere accesso sandbox via support@bokun.com

**Dev deve:**
- [ ] Branch `feature/bokun-integration`
- [ ] Aggiungere a `.env.example`:
  ```
  BOKUN_VENDOR_ID=
  BOKUN_ACCESS_KEY=
  BOKUN_SECRET_KEY=
  BOKUN_API_URL=https://api.bokuntest.com    # sandbox
  BOKUN_WEBHOOK_SECRET=                       # per HMAC-SHA256 verification
  STRIPE_PUBLISHABLE_KEY=
  STRIPE_SECRET_KEY=
  STRIPE_WEBHOOK_SECRET=
  ```
- [ ] Generare types TypeScript dall'OpenAPI:
  ```bash
  npx openapi-typescript https://api-docs.bokun.dev/rest-v1.yaml -o src/lib/bokun/types.gen.ts
  ```

**Deliverable:** credenziali sandbox valide, 5 prodotti su Bokun, pricing configurato.

---

### Fase 1 — Bokun Client & Read Operations (settimana 1-2)

**Obiettivo:** dashboard admin legge prenotazioni/uscite/clienti da Bokun.

#### 1.1 HTTP Client con HMAC-SHA1

```typescript
// src/lib/bokun/client.ts
import crypto from "crypto";

interface BokunClientConfig {
  apiUrl: string;
  vendorId: string;
  accessKey: string;
  secretKey: string;
}

class BokunClient {
  private config: BokunClientConfig;

  constructor(config: BokunClientConfig) {
    this.config = config;
  }

  private signRequest(method: string, path: string): {
    date: string;
    signature: string;
  } {
    const date = new Date().toISOString()
      .replace("T", " ")
      .replace(/\.\d{3}Z$/, "");
    const stringToSign = `${date}${this.config.accessKey}${method.toUpperCase()}${path}`;
    const signature = crypto
      .createHmac("sha1", this.config.secretKey)
      .update(stringToSign)
      .digest("base64");
    return { date, signature };
  }

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<T> {
    const { date, signature } = this.signRequest(method, path);
    const headers: HeadersInit = {
      "X-Bokun-Date": date,
      "X-Bokun-AccessKey": this.config.accessKey,
      "X-Bokun-Signature": signature,
    };
    if (body) headers["Content-Type"] = "application/json;charset=UTF-8";

    const res = await fetch(`${this.config.apiUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) throw new BokunApiError(res.status, await res.text());
    return res.json();
  }
}
```

**TODO:**
- [ ] `src/lib/bokun/client.ts` — implementazione completa
- [ ] `src/lib/bokun/errors.ts` — BokunApiError, retry su 429/5xx
- [ ] Singleton instance: `src/lib/bokun/index.ts` esporta `bokunClient`

#### 1.2 Adattatori Bokun → UI

I tipi Bokun sono complessi. Creiamo adattatori che li trasformano in tipi UI semplici:

```typescript
// src/lib/bokun/adapters/booking.ts
export interface UIBooking {
  id: string;
  confirmationCode: string;
  customerName: string;
  customerEmail: string;
  numPeople: number;
  totalPrice: number;
  paidAmount: number;
  remainingAmount: number;
  status: "CONFIRMED" | "PENDING" | "CANCELLED" | "REFUNDED";
  channel: string;
  date: Date;
  serviceName: string;
  notes: string | null;  // dal nostro DB locale
}

export function adaptBokunBooking(bokun: BokunBooking, localNotes?: string): UIBooking { ... }
```

#### 1.3 Sostituzione delle pagine admin

| Pagina | Da | A |
|---|---|---|
| `/admin` (dashboard) | `db.booking.findMany()` | `bokunClient.searchBookings({ limit: 10 })` |
| `/admin/bookings` | `db.booking.findMany()` | `bokunClient.searchBookings()` |
| `/admin/bookings/[id]` | `db.booking.findUnique()` | `bokunClient.getBooking(code)` |
| `/admin/calendar` | `db.trip.findMany()` | `bokunClient.getDepartures(month)` |
| `/admin/customers` | `db.customer.findMany()` | aggregation di `searchBookings` |
| `/admin/finance` | `db.booking.aggregate()` | computa da `searchBookings` |
| `/admin/pricing` | `db.pricingPeriod.findMany()` | rimanda al pannello Bokun (read-only display) |

#### 1.4 Feature flag per rollback

```typescript
// src/lib/data-source.ts
export const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE === "bokun" ? "bokun" : "local";
```

**Deliverable Fase 1:** dashboard admin completamente in lettura da Bokun, con possibilità di switch a Prisma per emergenze.

---

### Fase 2 — Write Operations (settimana 2-3)

**Obiettivo:** admin può creare/modificare/cancellare prenotazioni dalla dashboard.

#### 2.1 Manual booking creation

```typescript
// src/app/admin/_actions/booking-actions.ts
"use server";

export async function createManualBooking(formData: FormData) {
  const sessionId = crypto.randomUUID();
  const productId = formData.get("productId") as string;
  const date = formData.get("date") as string;
  const numPeople = parseInt(formData.get("numPeople") as string);

  // 1. Reserve
  const reservation = await bokunClient.request("POST",
    `/booking.json/guest/${sessionId}/reserve`,
    {
      productId,
      startDate: date,
      pax: { ADULT: numPeople },
      mainContactDetails: {
        firstName: formData.get("customerName"),
        lastName: "",
        email: formData.get("customerEmail"),
        phoneNumber: formData.get("customerPhone"),
      },
    }
  );

  // 2. Confirm (skip payment per manual booking — admin override)
  await bokunClient.request("POST",
    `/booking.json/${reservation.confirmationCode}/confirm`
  );

  revalidatePath("/admin/bookings");
}
```

#### 2.2 Status updates

```typescript
export async function cancelBooking(confirmationCode: string) {
  await bokunClient.request("POST",
    `/booking.json/cancel-booking/${confirmationCode}`,
    { reason: "Admin cancellation" }
  );
  // Cancellation policy automaticamente calcola rimborso via Stripe Connect
  revalidatePath("/admin/bookings");
}
```

#### 2.3 Note interne

Le note interne sono uniche (Bokun non ha campo "internal notes"):
```sql
-- Nuova tabella locale
model BookingNote {
  id                String   @id @default(cuid())
  bokunBookingCode  String   @unique
  note              String   @db.Text
  authorId          String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

**Deliverable Fase 2:** CRUD completo dalla dashboard, write su Bokun, note locali separate.

---

### Fase 3 — Webhooks Real-time (settimana 3)

**Obiettivo:** prenotazioni da OTA appaiono istantaneamente nella dashboard.

#### 3.1 Webhook receiver

```typescript
// src/app/api/webhooks/bokun/route.ts
import crypto from "crypto";

export async function POST(req: Request) {
  // 1. Validate HMAC-SHA256 signature
  const headers = Object.fromEntries(req.headers.entries());
  const receivedHmac = headers["x-bokun-hmac"];

  const bokunHeaders = Object.entries(headers)
    .filter(([k]) => k.startsWith("x-bokun-") && k !== "x-bokun-hmac")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const computedHmac = crypto
    .createHmac("sha256", process.env.BOKUN_WEBHOOK_SECRET!)
    .update(bokunHeaders)
    .digest("hex");

  if (!crypto.timingSafeEqual(
    Buffer.from(receivedHmac),
    Buffer.from(computedHmac)
  )) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Process event
  const topic = headers["x-bokun-topic"];
  const body = await req.json();

  switch (topic) {
    case "bookings/create":
    case "bookings/update":
      await handleBookingChange(body.bookingId);
      break;
    case "bookings/cancel":
      await handleBookingCancellation(body.bookingId);
      break;
    case "bookings/refund":
      await handleRefund(body.bookingId);
      break;
    case "bookings/payment":
      await handlePayment(body.bookingId);
      break;
  }

  // 3. Must respond 200 within 5 seconds
  return new Response("OK", { status: 200 });
}

async function handleBookingChange(bookingId: number) {
  // Webhook payload è minimal — fetch full data
  const booking = await bokunClient.request("GET",
    `/booking.json/booking/${bookingId}`
  );
  // Invalidate cache + send SSE notification to admin UI
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  // TODO: SSE/Pusher notification
}
```

#### 3.2 Toast notifications real-time

```typescript
// src/components/admin/notification-listener.tsx
"use client";
// Use SSE or Pusher to push toast "Nuova prenotazione da Viator!"
```

#### 3.3 Polling fallback

Cron job ogni 5 minuti (Vercel Cron o setInterval):
```typescript
// src/app/api/cron/bokun-sync/route.ts
export async function GET() {
  const since = await getLastSyncTimestamp();
  const updatedBookings = await bokunClient.request("POST",
    "/booking.json/booking-search",
    { updatedSince: since }
  );
  // Process any missed events
  await setLastSyncTimestamp(new Date());
}
```

#### 3.4 Setup webhook in Bokun

Manuale dal pannello Bokun: Settings → Notifications → Webhooks → Add:
- URL: `https://egadisailing.com/api/webhooks/bokun`
- Topics: `bookings/*`, `experiences/availability_update`
- Secret: copia in `BOKUN_WEBHOOK_SECRET`

**Deliverable Fase 3:** real-time updates, zero refresh manuale necessario.

---

### Fase 4 — Frontend Sito Pubblico (settimana 4-5)

**Obiettivo:** sito egadisailing.com accetta prenotazioni con pagamento.

#### 4.1 Strategia: Widget Bokun in MVP, custom UI dopo

**MVP (1 giorno):**
```html
<!-- src/app/[locale]/experiences/[slug]/page.tsx -->
<div
  className="bokunWidget"
  data-src={`https://widgets.bokun.io/online-sales/${vendorId}/experience/${productId}`}
  data-lang="it"
/>
<Script src="https://widgets.bokun.io/assets/javascripts/apps/build/BokunWidgetsLoader.js" />
```

Customizzazione tramite Bokun dashboard: colori, font (con hex/RGB matching nostro brand).

**Fase 2 — Custom UI (post-launch, 2-3 settimane):**
- Form custom con Stripe Elements
- Chiamate dirette a Bokun API
- UX brandizzata al 100%

#### 4.2 Hero booking form (sito)

Il form pillola attuale `BookingSearch` diventa funzionale:
```typescript
// On submit:
1. Redirect a /experiences/[slug]?date=X&pax=Y
2. Pagina dettaglio carica widget Bokun pre-popolato
```

#### 4.3 Conferma prenotazione

Bokun gestisce email automatiche. Aggiungiamo solo pagina success:
```typescript
// src/app/[locale]/booking/confirmed/page.tsx
// Read confirmationCode from query param
// Display brandizzata "Grazie! Riceverai email a..."
```

**Deliverable Fase 4:** sito completamente funzionale, prenotazioni reali.

---

### Fase 5 — Acconti & Saldi (settimana 5)

**Obiettivo:** workflow acconto 30% + saldo automatizzato.

#### 5.1 Configurazione acconti su Bokun

Per Cabin Charter:
- Settings → Product → Pricing & Payments → Allow deposit
- Default 30%

Per altri servizi:
- Pagamento completo alla prenotazione

#### 5.2 Cron per saldi

```typescript
// src/app/api/cron/balance-reminders/route.ts
// Esegue ogni notte
export async function GET() {
  // Trova prenotazioni "Partially Paid" con experience date entro 7 giorni
  const bookings = await bokunClient.request("POST",
    "/booking.json/booking-search",
    {
      paymentStatus: "PARTIALLY_PAID",
      startDate: addDays(new Date(), 1).toISOString(),
      endDate: addDays(new Date(), 7).toISOString(),
    }
  );

  for (const booking of bookings) {
    // Genera payment link per il saldo
    const paymentLink = await bokunClient.request("POST",
      `/booking.json/${booking.confirmationCode}/payment-link`,
      { amount: booking.balanceAmount }
    );

    // Email al cliente
    await sendBalanceReminderEmail(booking.customerEmail, paymentLink.url);
  }
}
```

#### 5.3 Dashboard widget "Saldi pendenti"

Card in `/admin` che mostra:
- Quante prenotazioni con saldo pendente
- Quanti €
- Lista clickabile

**Deliverable Fase 5:** workflow acconto/saldo automatizzato.

---

### Fase 6 — Channel Manager (settimana 6, in parallelo)

**Obiettivo:** attivare canali OTA.

Tutto via pannello Bokun (no codice):

#### Tier 1 — Subito al lancio
- [ ] **Viator** (0% Bokun fee, attivazione istantanea)
- [ ] **GetYourGuide** (Bokun bypassa requisito 100k visite — verificare con support)
- [ ] **Airbnb Experiences**

#### Tier 2 — Dopo 1 mese
- [ ] Tiqets
- [ ] Headout
- [ ] Klook
- [ ] Musement (richiede contratto TUI)

#### Tier 3 — Valutabili
- [ ] Google Things to Do
- [ ] Civitatis
- [ ] Trip.com

**Tempi reali**: ogni canale ha approvazione separata 1-4 settimane.

**Charter (Boataround/SamBoat/Click&Boat/Nautal)**: NON gestiti da Bokun. Decisione differita — escludiamo dal MVP.

---

### Fase 7 — Migrazione Dati Esistenti (1 settimana)

**Obiettivo:** spostare prenotazioni del seed/test su Bokun.

```typescript
// scripts/migrate-to-bokun.ts
const bookings = await db.booking.findMany({ include: { customer: true, trip: true } });

for (const b of bookings) {
  await bokunClient.request("POST",
    `/booking.json/activity-booking/reserve-and-confirm`,
    {
      productId: getBokunProductId(b.trip.serviceId),
      startDate: b.trip.date,
      pax: { ADULT: b.numPeople },
      mainContactDetails: { ... },
      externalId: b.id,  // riferimento al nostro ID per tracking
    }
  );
}
```

Dry run prima, poi reale.

**Deliverable:** Bokun ha tutti i dati, DB locale ridotto a User, BookingNote, Boat, Crew.

---

## 4. Timeline complessiva

| Fase | Durata | Settimana | Blockers |
|---|---|---|---|
| 0. Setup | 1 sett | 1 | Cliente registra Bokun + Stripe |
| 1. Read | 1-2 sett | 1-2 | Sandbox attivo |
| 2. Write | 1 sett | 2-3 | Fase 1 OK |
| 3. Webhooks | 1 sett | 3 | Fase 2 OK + dominio HTTPS pubblico |
| 4. Frontend | 1 sett (widget) o 3 sett (custom) | 4-5 | Fase 1 OK |
| 5. Acconti | 1 sett | 5 | Fase 2 + 3 |
| 6. Channel Manager | parallelo | 4-7 | Approvazioni OTA |
| 7. Migrazione | 1 sett | 6 | Tutto il resto |

**Timeline realistica MVP**: **5-6 settimane** con widget Bokun
**Timeline completa con custom UI**: **8-9 settimane**

---

## 5. Costi mensili (post-launch)

| Voce | Costo | Note |
|---|---|---|
| Bokun START | $49 (~€45) | Fisso |
| Bokun booking fee | 1.5% prenotazioni dirette | Passabile al cliente |
| Bokun channel fee | 0.5-1.5% prenotazioni OTA | Sopra commissione OTA |
| Stripe | 1.4% + €0.25 | Per transazione EU |
| OTA commissioni | 20-30% | Solo su prenotazioni OTA, NON su sito diretto |
| Hosting VPS | €10-30 | Già attivo |
| **Totale fisso** | **~€60-80/mese** | |

**Soglia di pareggio Bokun**: ~€3.000/mese di prenotazioni dirette (1.5% di 3000 = €45).

---

## 6. Differenze rispetto al piano precedente

| Vecchio piano | Nuovo (post-research) | Motivo |
|---|---|---|
| HMAC-SHA256 per API | **HMAC-SHA1** per API, SHA256 solo per webhook | API doc esplicita SHA1 |
| Endpoint `customer.json` | **Aggregazione da bookings** | REST v1 non ha customer CRUD |
| `refundBooking()` direct | **Cancel + cancellation policy** | No direct refund endpoint |
| €49/mese Bokun | **$49 USD START plan** + 1.5% booking fee | Pricing aggiornato 2024-2025 |
| Charter via Bokun | **Charter fuori da Bokun** | Bokun non copre Boataround/SamBoat/Click&Boat |
| Sandbox self-serve | **Sandbox via support@bokun.com** | Non self-serve |
| `bookings.created` events | **`bookings/create`** (slash, presente) | Naming convention reale |

---

## 7. Decisioni aperte (da confermare con cliente)

1. **Widget vs Custom UI**: MVP con widget (1 giorno) e poi custom (3 settimane), o direttamente custom?
2. **Acconto su quali servizi**: solo Cabin Charter (€2.300) o anche altri?
3. **Quali OTA per primi**: confermare priorità Tier 1
4. **Bokun fee passata al cliente**: aggiungiamo 1.5% al prezzo o lo assorbiamo?
5. **Migrazione**: partiamo da zero o migriamo dati seed/test?
6. **Charter**: gestiti separatamente nella dashboard o esclusi temporaneamente?

---

## 8. Definition of Done

Il progetto è completo quando:

1. ✅ Dashboard admin mostra in real-time prenotazioni di TUTTI i canali (sito + Viator + GYG + Airbnb)
2. ✅ Admin può creare/modificare/cancellare prenotazioni dalla dashboard
3. ✅ Sito accetta prenotazioni con pagamento Stripe
4. ✅ Acconto 30% per Cabin Charter funziona end-to-end
5. ✅ Saldo automatico via payment link 7 giorni prima
6. ✅ Webhook real-time funzionano
7. ✅ Email transazionali Bokun configurate (conferma + reminder)
8. ✅ Cliente formato sull'uso (1-2h)
9. ✅ Monitoraggio errori attivo
10. ✅ Backup + rollback plan documentato

---

## 9. Note implementative chiave

### Anti-pattern da evitare
- ❌ Non duplicare dati Bokun nel DB locale (eccetto cache di sessione)
- ❌ Non chiamare API Bokun per ogni render — usare SWR cache
- ❌ Non fare write parallele (usa transazioni e revalidatePath)

### Pattern da adottare
- ✅ Tutti i tipi UI passano per adattatori `BokunX → UIX`
- ✅ `BokunClient` è singleton, condiviso lato server
- ✅ Webhook handler returns 200 in <5s sempre, processa async se serve
- ✅ Cache TTL 60s per liste, 5min per dettagli
- ✅ Logging strutturato di ogni chiamata Bokun (per debug)

### Sicurezza
- HMAC-SHA1 keys nei .env, MAI nel client bundle
- Webhook secret separato (HMAC-SHA256)
- Stripe webhook secret separato
- Validazione signature webhook OBBLIGATORIA prima di processare

---

## 10. Out of scope esplicito

NON faremo in questo piano:
- App mobile dedicata (Bokun ha la sua, gratis)
- Sistema di reportistica avanzato (usiamo Bokun reports + dashboard finance custom)
- Multi-tenancy (un solo cliente)
- Integrazione contabile/fatturazione (separata)
- Sistema di review interno (usiamo Tripadvisor reviews)
- Loyalty/sconti complessi (Bokun gestisce gift cards e promo codes)

---

**Prossimo step**: confermare con cliente le 6 decisioni aperte (sezione 7), poi partire con Fase 0.
