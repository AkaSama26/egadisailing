# Plan 3 — Bokun Integration (Hub OTA)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrare Bokun come hub per i canali OTA (Viator, GetYourGuide, Airbnb Experiences, Tiqets, Headout, Klook, Musement). Bokun riceve push di availability dal nostro DB quando vendiamo altrove, notifica via webhook le prenotazioni OTA, e riceve propagazione di hot day pricing in automatico.

**Architecture:** Client REST custom con HMAC-SHA1 per API, HMAC-SHA256 per webhook verification. BullMQ worker dedicato per sync availability e pricing. Webhook endpoint idempotente. Reconciliation cron per recuperare eventi webhook persi. Anti-loop via idempotency service del Plan 1.

**Tech Stack:** Next.js 16, crypto (Node), BullMQ, Zod, fetch.

**Spec di riferimento:** `docs/superpowers/specs/2026-04-17-platform-v2-design.md`
**Prerequisiti:** Plan 1 (DB+Backend) e Plan 2 (Sito) completati.

---

## File Structure

```
src/lib/bokun/
├── client.ts                    # HTTP client con HMAC-SHA1 auth
├── signer.ts                    # HMAC-SHA1 signer per REST API
├── webhook-verifier.ts          # HMAC-SHA256 per webhooks
├── errors.ts                    # BokunApiError
├── types.ts                     # Tipi custom (booking, availability, ecc.)
├── availability.ts              # updateAvailability wrapper
├── bookings.ts                  # getBooking, searchBookings
├── pricing.ts                   # updatePricingOverride
├── adapters/
│   └── booking.ts               # Bokun booking → our Booking
└── index.ts                     # Singleton client

src/app/api/
├── webhooks/bokun/route.ts      # Webhook endpoint
└── cron/
    └── bokun-reconciliation/
        └── route.ts             # Fallback polling per webhook persi

src/lib/queue/workers/
├── bokun-availability-worker.ts
└── bokun-pricing-worker.ts
```

---

## Task 1: ENV Bokun

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Aggiungi variabili**

Aggiungi in `.env.example`:

```env
# Bokun
BOKUN_API_URL="https://api.bokuntest.com"
BOKUN_VENDOR_ID=""
BOKUN_ACCESS_KEY=""
BOKUN_SECRET_KEY=""
BOKUN_WEBHOOK_SECRET=""
```

Aggiungi placeholders in `.env` per dev.

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "feat(env): add bokun credentials"
```

---

## Task 2: HMAC-SHA1 signer (REST API auth)

**Files:**
- Create: `src/lib/bokun/signer.ts`
- Create: `src/lib/bokun/signer.test.ts`

- [ ] **Step 1: Signer**

Crea `src/lib/bokun/signer.ts`:

```typescript
import crypto from "crypto";

export interface BokunCredentials {
  accessKey: string;
  secretKey: string;
}

export interface SignedHeaders {
  "X-Bokun-Date": string;
  "X-Bokun-AccessKey": string;
  "X-Bokun-Signature": string;
}

/**
 * Costruisce la data in formato 'yyyy-MM-dd HH:mm:ss' UTC.
 */
export function bokunDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/**
 * Firma la request: date + accessKey + METHOD + pathAndQuery, HMAC-SHA1, base64.
 */
export function signBokunRequest(
  method: string,
  pathAndQuery: string,
  credentials: BokunCredentials,
  date: Date = new Date(),
): SignedHeaders {
  const dateStr = bokunDate(date);
  const stringToSign = `${dateStr}${credentials.accessKey}${method.toUpperCase()}${pathAndQuery}`;
  const signature = crypto
    .createHmac("sha1", credentials.secretKey)
    .update(stringToSign, "utf8")
    .digest("base64");

  return {
    "X-Bokun-Date": dateStr,
    "X-Bokun-AccessKey": credentials.accessKey,
    "X-Bokun-Signature": signature,
  };
}
```

- [ ] **Step 2: Test signer**

Crea `src/lib/bokun/signer.test.ts`:

```typescript
import { signBokunRequest, bokunDate } from "./signer";

// Valori dall'esempio ufficiale Bokun docs (sostituire con i tuoi test vectors reali)
const CREDS = {
  accessKey: "de235a6a15c340b6b1e1cb5f3687d04a",
  secretKey: "test-secret",
};

// 1: date format
const fixed = new Date(Date.UTC(2013, 10, 9, 14, 33, 46)); // 2013-11-09 14:33:46
if (bokunDate(fixed) !== "2013-11-09 14:33:46") {
  throw new Error("bokunDate format wrong");
}
console.log("✓ date format");

// 2: signature deterministica
const sig1 = signBokunRequest(
  "POST",
  "/activity.json/search?lang=EN&currency=ISK",
  CREDS,
  fixed,
);
const sig2 = signBokunRequest(
  "POST",
  "/activity.json/search?lang=EN&currency=ISK",
  CREDS,
  fixed,
);
if (sig1["X-Bokun-Signature"] !== sig2["X-Bokun-Signature"]) {
  throw new Error("Signature not deterministic");
}
console.log("✓ deterministic signature:", sig1["X-Bokun-Signature"]);

// 3: metodi diversi = firme diverse
const sigGet = signBokunRequest(
  "GET",
  "/activity.json/search?lang=EN&currency=ISK",
  CREDS,
  fixed,
);
if (sigGet["X-Bokun-Signature"] === sig1["X-Bokun-Signature"]) {
  throw new Error("Different methods should produce different signatures");
}
console.log("✓ method affects signature");
```

Run: `npx tsx src/lib/bokun/signer.test.ts`
Expected: `✓ date format`, `✓ deterministic signature: ...`, `✓ method affects signature`.

- [ ] **Step 3: Rimuovi test temporaneo**

Run: `rm src/lib/bokun/signer.test.ts`

- [ ] **Step 4: Commit**

```bash
git add src/lib/bokun/signer.ts
git commit -m "feat(bokun): HMAC-SHA1 signer for REST API auth"
```

---

## Task 3: Bokun HTTP client

**Files:**
- Create: `src/lib/bokun/errors.ts`
- Create: `src/lib/bokun/client.ts`
- Create: `src/lib/bokun/index.ts`

- [ ] **Step 1: Errors**

Crea `src/lib/bokun/errors.ts`:

```typescript
import { ExternalServiceError } from "@/lib/errors";

export class BokunApiError extends ExternalServiceError {
  constructor(message: string, statusCode: number, responseBody: string) {
    super("Bokun", message, { statusCode, responseBody });
    this.name = "BokunApiError";
  }
}
```

- [ ] **Step 2: Client**

Crea `src/lib/bokun/client.ts`:

```typescript
import { signBokunRequest, type BokunCredentials } from "./signer";
import { BokunApiError } from "./errors";
import { logger } from "@/lib/logger";

export interface BokunClientConfig {
  apiUrl: string;
  credentials: BokunCredentials;
}

export class BokunClient {
  constructor(private config: BokunClientConfig) {}

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    pathAndQuery: string,
    body?: unknown,
  ): Promise<T> {
    const headers = signBokunRequest(method, pathAndQuery, this.config.credentials);
    const init: RequestInit = { method, headers: { ...headers } };
    if (body !== undefined) {
      (init.headers as Record<string, string>)["Content-Type"] = "application/json;charset=UTF-8";
      init.body = JSON.stringify(body);
    }

    const url = `${this.config.apiUrl}${pathAndQuery}`;
    const start = Date.now();
    const res = await fetch(url, init);
    const durMs = Date.now() - start;

    if (!res.ok) {
      const text = await res.text();
      logger.error(
        { method, url, status: res.status, durMs, body: text },
        "Bokun API error",
      );
      throw new BokunApiError(`${method} ${pathAndQuery} failed`, res.status, text);
    }

    logger.debug({ method, url, status: res.status, durMs }, "Bokun API request");
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }
}
```

- [ ] **Step 3: Singleton**

Crea `src/lib/bokun/index.ts`:

```typescript
import { BokunClient } from "./client";

let _client: BokunClient | null = null;

export function bokunClient(): BokunClient {
  if (!_client) {
    const apiUrl = process.env.BOKUN_API_URL;
    const accessKey = process.env.BOKUN_ACCESS_KEY;
    const secretKey = process.env.BOKUN_SECRET_KEY;
    if (!apiUrl || !accessKey || !secretKey) {
      throw new Error("Bokun credentials not configured");
    }
    _client = new BokunClient({
      apiUrl,
      credentials: { accessKey, secretKey },
    });
  }
  return _client;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/bokun/
git commit -m "feat(bokun): HTTP client + errors + singleton"
```

---

## Task 4: Availability helper

**Files:**
- Create: `src/lib/bokun/availability.ts`

- [ ] **Step 1: Update availability wrapper**

Crea `src/lib/bokun/availability.ts`:

```typescript
import { bokunClient } from "./index";
import { logger } from "@/lib/logger";

/**
 * Aggiorna il numero di posti disponibili di un prodotto Bokun per una data.
 *
 * Usiamo il pattern "availability override" per gestire soft-blocking.
 * availableSpots = 0 blocca il prodotto per quella data su tutti i canali OTA.
 */
export async function updateBokunAvailability(params: {
  productId: string;
  date: string; // yyyy-MM-dd
  availableSpots: number;
}): Promise<void> {
  const pathAndQuery = `/activity.json/${params.productId}/availability-override`;
  await bokunClient().request("POST", pathAndQuery, {
    date: params.date,
    availabilityCount: params.availableSpots,
    reason: params.availableSpots === 0 ? "BOOKED_ELSEWHERE" : "AVAILABILITY_UPDATE",
  });
  logger.info(
    { productId: params.productId, date: params.date, spots: params.availableSpots },
    "Bokun availability updated",
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/bokun/availability.ts
git commit -m "feat(bokun): updateAvailability wrapper using availability-override"
```

---

## Task 5: Bookings helpers

**Files:**
- Create: `src/lib/bokun/types.ts`
- Create: `src/lib/bokun/bookings.ts`

- [ ] **Step 1: Types**

Crea `src/lib/bokun/types.ts`:

```typescript
export interface BokunBookingSummary {
  id: number;
  confirmationCode: string;
  status: string;
  productId: string;
  productConfirmationCode: string;
  startDate: string;
  endDate?: string;
  totalPrice: number;
  currency: string;
  channelName: string;
  mainContactDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    country?: string;
    language?: string;
  };
  passengers?: Array<{ firstName?: string; lastName?: string; numPeople?: number }>;
  numPeople?: number;
  paymentStatus?: string;
  commissionAmount?: number;
  netAmount?: number;
}
```

- [ ] **Step 2: Bookings helpers**

Crea `src/lib/bokun/bookings.ts`:

```typescript
import { bokunClient } from "./index";
import type { BokunBookingSummary } from "./types";

export async function getBokunBooking(confirmationCode: string): Promise<BokunBookingSummary> {
  return bokunClient().request("GET", `/booking.json/booking/${confirmationCode}`);
}

export async function searchBokunBookings(params: {
  startDate?: string;
  endDate?: string;
  updatedSince?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ bookings: BokunBookingSummary[]; totalHits: number }> {
  return bokunClient().request("POST", "/booking.json/booking-search", params);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/bokun/types.ts src/lib/bokun/bookings.ts
git commit -m "feat(bokun): getBooking + searchBookings helpers"
```

---

## Task 6: Pricing helper (hot day sync)

**Files:**
- Create: `src/lib/bokun/pricing.ts`

- [ ] **Step 1: Pricing override**

Crea `src/lib/bokun/pricing.ts`:

```typescript
import { bokunClient } from "./index";
import { logger } from "@/lib/logger";

export interface BokunPriceOverrideResponse {
  id: string;
  productId: string;
  date: string;
  amount: number;
}

/**
 * Crea/aggiorna un price override su Bokun per un prodotto e una data.
 */
export async function upsertBokunPriceOverride(params: {
  productId: string;
  date: string; // yyyy-MM-dd
  amount: number; // euro, verrà convertito in centesimi da Bokun
  categoryId?: string;
}): Promise<BokunPriceOverrideResponse> {
  const res = await bokunClient().request<BokunPriceOverrideResponse>(
    "POST",
    `/activity.json/${params.productId}/price-override`,
    {
      date: params.date,
      price: params.amount,
      pricingCategoryId: params.categoryId,
    },
  );
  logger.info(
    { productId: params.productId, date: params.date, amount: params.amount, overrideId: res.id },
    "Bokun price override upserted",
  );
  return res;
}

export async function removeBokunPriceOverride(overrideId: string): Promise<void> {
  await bokunClient().request("DELETE", `/activity.json/price-override/${overrideId}`);
  logger.info({ overrideId }, "Bokun price override removed");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/bokun/pricing.ts
git commit -m "feat(bokun): upsert/remove price override"
```

---

## Task 7: Webhook verifier (HMAC-SHA256)

**Files:**
- Create: `src/lib/bokun/webhook-verifier.ts`

- [ ] **Step 1: Verifier**

Crea `src/lib/bokun/webhook-verifier.ts`:

```typescript
import crypto from "crypto";

/**
 * Verifica la firma HMAC-SHA256 di un webhook Bokun.
 *
 * 1. Raccogli tutti gli header che iniziano con "x-bokun-" ESCLUSO x-bokun-hmac
 * 2. Lowercase + sort alphabetical per name
 * 3. Concatena come "name1=value1&name2=value2&..."
 * 4. HMAC-SHA256 con secret dell'app
 * 5. Confronta con x-bokun-hmac (timing-safe)
 */
export function verifyBokunWebhook(
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): boolean {
  const received = headerValue(headers, "x-bokun-hmac");
  if (!received) return false;

  const bokunHeaders: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (!lower.startsWith("x-bokun-")) continue;
    if (lower === "x-bokun-hmac") continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (v === undefined) continue;
    bokunHeaders.push([lower, v]);
  }

  bokunHeaders.sort(([a], [b]) => a.localeCompare(b));
  const stringToSign = bokunHeaders.map(([k, v]) => `${k}=${v}`).join("&");
  const computed = crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(computed, "hex"));
  } catch {
    return false;
  }
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) {
      return Array.isArray(v) ? v[0] ?? null : v ?? null;
    }
  }
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/bokun/webhook-verifier.ts
git commit -m "feat(bokun): HMAC-SHA256 webhook signature verifier"
```

---

## Task 8: Adapter — Bokun booking → our Booking

**Files:**
- Create: `src/lib/bokun/adapters/booking.ts`

- [ ] **Step 1: Adapter**

Crea `src/lib/bokun/adapters/booking.ts`:

```typescript
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { BokunBookingSummary } from "../types";
import { logger } from "@/lib/logger";

/**
 * Importa una prenotazione Bokun nel nostro DB creando Booking + BokunBooking + Customer.
 * Idempotente su bokunBookingId (unique in BokunBooking).
 */
export async function importBokunBooking(booking: BokunBookingSummary): Promise<string> {
  // 1. Upsert customer
  const customer = await db.customer.upsert({
    where: { email: booking.mainContactDetails.email.toLowerCase() },
    update: {
      firstName: booking.mainContactDetails.firstName,
      lastName: booking.mainContactDetails.lastName,
      phone: booking.mainContactDetails.phoneNumber,
      nationality: booking.mainContactDetails.country,
      language: booking.mainContactDetails.language,
    },
    create: {
      email: booking.mainContactDetails.email.toLowerCase(),
      firstName: booking.mainContactDetails.firstName,
      lastName: booking.mainContactDetails.lastName,
      phone: booking.mainContactDetails.phoneNumber,
      nationality: booking.mainContactDetails.country,
      language: booking.mainContactDetails.language,
    },
  });

  // 2. Trova il nostro Service corrispondente (matched via bokunProductId)
  const service = await db.service.findFirst({
    where: { bokunProductId: booking.productId },
  });
  if (!service) {
    throw new Error(`No Service mapped to Bokun productId ${booking.productId}`);
  }

  // 3. Upsert Booking + BokunBooking in transaction
  const existing = await db.bokunBooking.findUnique({
    where: { bokunBookingId: String(booking.id) },
    include: { booking: true },
  });

  if (existing) {
    await db.$transaction([
      db.booking.update({
        where: { id: existing.bookingId },
        data: {
          status: mapStatus(booking.status),
          numPeople: booking.numPeople ?? existing.booking.numPeople,
          totalPrice: new Prisma.Decimal(booking.totalPrice),
        },
      }),
      db.bokunBooking.update({
        where: { bookingId: existing.bookingId },
        data: {
          rawPayload: booking as never,
          commissionAmount: booking.commissionAmount
            ? new Prisma.Decimal(booking.commissionAmount)
            : null,
          netAmount: booking.netAmount ? new Prisma.Decimal(booking.netAmount) : null,
        },
      }),
    ]);
    logger.info({ bookingId: existing.bookingId }, "Bokun booking updated");
    return existing.bookingId;
  }

  const created = await db.booking.create({
    data: {
      confirmationCode: booking.confirmationCode,
      source: "BOKUN",
      externalRef: booking.productConfirmationCode,
      customerId: customer.id,
      serviceId: service.id,
      boatId: service.boatId,
      startDate: new Date(booking.startDate),
      endDate: booking.endDate ? new Date(booking.endDate) : new Date(booking.startDate),
      numPeople: booking.numPeople ?? 1,
      totalPrice: new Prisma.Decimal(booking.totalPrice),
      currency: booking.currency,
      status: mapStatus(booking.status),
      bokunBooking: {
        create: {
          bokunBookingId: String(booking.id),
          channelName: booking.channelName,
          commissionAmount: booking.commissionAmount
            ? new Prisma.Decimal(booking.commissionAmount)
            : null,
          netAmount: booking.netAmount ? new Prisma.Decimal(booking.netAmount) : null,
          rawPayload: booking as never,
        },
      },
    },
  });
  logger.info({ bookingId: created.id, confirmationCode: created.confirmationCode }, "Bokun booking imported");
  return created.id;
}

function mapStatus(bokunStatus: string): "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED" {
  const s = bokunStatus.toUpperCase();
  if (s.includes("CANCEL")) return "CANCELLED";
  if (s.includes("REFUND")) return "REFUNDED";
  if (s.includes("PENDING") || s.includes("REQUEST")) return "PENDING";
  return "CONFIRMED";
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/bokun/adapters/
git commit -m "feat(bokun): adapter - import Bokun booking into our DB (idempotent)"
```

---

## Task 9: Webhook endpoint

**Files:**
- Create: `src/app/api/webhooks/bokun/route.ts`

- [ ] **Step 1: Route**

Crea `src/app/api/webhooks/bokun/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { verifyBokunWebhook } from "@/lib/bokun/webhook-verifier";
import { getBokunBooking } from "@/lib/bokun/bookings";
import { importBokunBooking } from "@/lib/bokun/adapters/booking";
import { updateAvailability } from "@/lib/availability/service";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.BOKUN_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("BOKUN_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  if (!verifyBokunWebhook(headers, secret)) {
    logger.warn({ topic: headers["x-bokun-topic"] }, "Bokun webhook HMAC invalid");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topic = headers["x-bokun-topic"];
  const body = (await req.json()) as { timestamp?: string; bookingId?: number | string };

  try {
    if (topic?.startsWith("bookings/")) {
      if (!body.bookingId) {
        return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
      }
      const booking = await getBokunBooking(String(body.bookingId));
      const ourBookingId = await importBokunBooking(booking);

      // Se cancellazione, rilascia availability; se confermato, blocca
      if (topic === "bookings/cancel") {
        await releaseBookingAvailability(ourBookingId, "BOKUN");
      } else if (topic === "bookings/create" || topic === "bookings/update") {
        await blockBookingAvailability(ourBookingId, "BOKUN");
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error({ err, topic }, "Bokun webhook handler error");
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}

async function blockBookingAvailability(bookingId: string, source: string): Promise<void> {
  const b = await db.booking.findUnique({ where: { id: bookingId } });
  if (!b) return;
  const cursor = new Date(b.startDate);
  while (cursor <= b.endDate) {
    await updateAvailability({
      boatId: b.boatId,
      date: new Date(cursor),
      status: "BLOCKED",
      sourceChannel: source,
      lockedByBookingId: b.id,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

async function releaseBookingAvailability(bookingId: string, source: string): Promise<void> {
  const b = await db.booking.findUnique({ where: { id: bookingId } });
  if (!b) return;
  const cursor = new Date(b.startDate);
  while (cursor <= b.endDate) {
    await updateAvailability({
      boatId: b.boatId,
      date: new Date(cursor),
      status: "AVAILABLE",
      sourceChannel: source,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/bokun/
git commit -m "feat(bokun): webhook endpoint - verify HMAC, fetch booking, import + update availability"
```

---

## Task 10: Worker BullMQ — sync availability a Bokun

**Files:**
- Create: `src/lib/queue/workers/bokun-availability-worker.ts`

- [ ] **Step 1: Worker**

Crea `src/lib/queue/workers/bokun-availability-worker.ts`:

```typescript
import { createWorker } from "@/lib/queue";
import { updateBokunAvailability } from "@/lib/bokun/availability";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export function startBokunAvailabilityWorker() {
  return createWorker(
    "sync",
    async (job) => {
      if (job.name !== "availability.update") return;
      const payload = job.data as {
        targetChannel: string;
        operation: string;
        payload: { boatId: string; date: string; status: string };
      };
      if (payload.targetChannel !== "BOKUN") return;

      // Recupera i servizi mappati al boatId con bokunProductId non null
      const services = await db.service.findMany({
        where: { boatId: payload.payload.boatId, bokunProductId: { not: null } },
      });

      for (const service of services) {
        const status = payload.payload.status;
        const spots = status === "AVAILABLE" ? service.capacityMax : 0;
        try {
          await updateBokunAvailability({
            productId: service.bokunProductId!,
            date: payload.payload.date,
            availableSpots: spots,
          });
        } catch (err) {
          logger.error(
            { err, service: service.id, date: payload.payload.date },
            "Bokun availability sync failed",
          );
          throw err; // BullMQ gestisce retry
        }
      }
    },
    3,
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queue/workers/bokun-availability-worker.ts
git commit -m "feat(queue): bokun availability worker - pushes availability for all boat services"
```

---

## Task 11: Worker BullMQ — pricing sync

**Files:**
- Create: `src/lib/queue/workers/bokun-pricing-worker.ts`

- [ ] **Step 1: Worker**

Crea `src/lib/queue/workers/bokun-pricing-worker.ts`:

```typescript
import { createWorker } from "@/lib/queue";
import { upsertBokunPriceOverride } from "@/lib/bokun/pricing";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export function startBokunPricingWorker() {
  return createWorker(
    "sync",
    async (job) => {
      if (job.name !== "pricing.bokun.sync") return;
      const payload = job.data as {
        serviceId: string;
        date: string;
        amount: string;
      };

      const service = await db.service.findUnique({ where: { id: payload.serviceId } });
      if (!service || !service.bokunProductId) {
        logger.warn({ serviceId: payload.serviceId }, "Service has no Bokun mapping, skipping");
        return;
      }

      const amount = parseFloat(payload.amount);
      // Aggiungiamo markup Bokun configurabile per ambiente
      const markup = parseFloat(process.env.BOKUN_PRICE_MARKUP ?? "1.15"); // +15% default
      const bokunAmount = Math.ceil(amount * markup);

      const res = await upsertBokunPriceOverride({
        productId: service.bokunProductId,
        date: payload.date,
        amount: bokunAmount,
      });

      await db.bokunPriceSync.create({
        data: {
          bokunExperienceId: service.bokunProductId,
          bokunPriceOverrideId: res.id,
          date: new Date(payload.date),
          amount: bokunAmount,
          status: "SYNCED",
          syncedAt: new Date(),
        },
      });
    },
    2,
  );
}
```

- [ ] **Step 2: Aggiungi markup var env**

`.env.example`:
```env
BOKUN_PRICE_MARKUP="1.15"
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/queue/workers/bokun-pricing-worker.ts .env.example
git commit -m "feat(queue): bokun pricing worker - sync hot day prices with markup"
```

---

## Task 12: Reconciliation cron

**Files:**
- Create: `src/app/api/cron/bokun-reconciliation/route.ts`

- [ ] **Step 1: Route reconciliation**

Crea `src/app/api/cron/bokun-reconciliation/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { searchBokunBookings } from "@/lib/bokun/bookings";
import { importBokunBooking } from "@/lib/bokun/adapters/booking";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Cron di backup che ogni 5 minuti controlla se Bokun ha prenotazioni
 * che non abbiamo ricevuto via webhook.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET ?? "dev-cron"}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const syncStatus = await db.channelSyncStatus.findUnique({ where: { channel: "BOKUN" } });
  const since = syncStatus?.lastSyncAt ?? new Date(Date.now() - 60 * 60 * 1000); // 1h fallback

  try {
    const result = await searchBokunBookings({
      updatedSince: since.toISOString(),
      pageSize: 100,
    });

    let imported = 0;
    for (const b of result.bookings) {
      await importBokunBooking(b);
      imported++;
    }

    await db.channelSyncStatus.update({
      where: { channel: "BOKUN" },
      data: { lastSyncAt: new Date(), healthStatus: "GREEN", lastError: null },
    });

    return NextResponse.json({ imported, totalHits: result.totalHits });
  } catch (err) {
    logger.error({ err }, "Bokun reconciliation failed");
    await db.channelSyncStatus.update({
      where: { channel: "BOKUN" },
      data: { healthStatus: "YELLOW", lastError: String(err) },
    });
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Schedula cron**

Modifica `src/lib/cron/scheduler.ts` aggiungendo dopo lo schedule di `balance-reminders`:

```typescript
// Bokun reconciliation: ogni 5 minuti
cron.schedule(
  "*/5 * * * *",
  async () => {
    const url = `${process.env.APP_URL}/api/cron/bokun-reconciliation`;
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? "dev-cron"}` },
    });
    logger.info({ status: res.status }, "bokun-reconciliation cron response");
  },
);
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/bokun-reconciliation/ src/lib/cron/scheduler.ts
git commit -m "feat(bokun): reconciliation cron - search updated bookings every 5min as webhook fallback"
```

---

## Task 13: Hook hot days a pricing worker

**Files:**
- Modify: `src/lib/pricing/hot-days.ts`
- Create: `src/lib/pricing/bokun-sync.ts`

- [ ] **Step 1: Helper per triggare sync dopo CRUD hot day**

Crea `src/lib/pricing/bokun-sync.ts`:

```typescript
import { syncQueue } from "@/lib/queue";
import { db } from "@/lib/db";
import { quotePrice } from "./service";

/**
 * Dopo creazione/modifica di un HotDayRule o HotDayOverride, triggera il sync
 * dei prezzi Bokun per tutte le date coperte e tutti i servizi impattati.
 */
export async function scheduleBokunPricingSync(options: {
  dates: Date[];
  serviceIds?: string[]; // se undefined, tutti i servizi attivi
}): Promise<void> {
  const services = options.serviceIds
    ? await db.service.findMany({ where: { id: { in: options.serviceIds } } })
    : await db.service.findMany({ where: { active: true, bokunProductId: { not: null } } });

  for (const service of services) {
    for (const date of options.dates) {
      const quote = await quotePrice(service.id, date, 1);
      await syncQueue().add("pricing.bokun.sync", {
        serviceId: service.id,
        date: date.toISOString().slice(0, 10),
        amount: quote.finalPricePerPerson.toString(),
      });
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pricing/bokun-sync.ts
git commit -m "feat(pricing): scheduleBokunPricingSync - queues price sync for affected dates/services"
```

---

## Task 14: Worker registration

**Files:**
- Create: `src/lib/queue/register-workers.ts`
- Modify: `src/instrumentation.ts`

- [ ] **Step 1: Register tutti i worker**

Crea `src/lib/queue/register-workers.ts`:

```typescript
import { startBokunAvailabilityWorker } from "./workers/bokun-availability-worker";
import { startBokunPricingWorker } from "./workers/bokun-pricing-worker";
import { logger } from "@/lib/logger";

let registered = false;

export function registerQueueWorkers(): void {
  if (registered) return;
  registered = true;
  startBokunAvailabilityWorker();
  startBokunPricingWorker();
  logger.info("BullMQ workers registered (bokun availability, bokun pricing)");
}
```

- [ ] **Step 2: Avvia all'init**

Modifica `src/instrumentation.ts`:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [{ startCronScheduler }, { registerQueueWorkers }] = await Promise.all([
      import("@/lib/cron/scheduler"),
      import("@/lib/queue/register-workers"),
    ]);
    startCronScheduler();
    registerQueueWorkers();
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/queue/register-workers.ts src/instrumentation.ts
git commit -m "feat(queue): register workers on startup (bokun availability + pricing)"
```

---

## Task 15: Smoke test + build

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit`

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Test signer**

Crea file temporaneo `scripts/smoke-bokun.ts`:

```typescript
import { signBokunRequest } from "@/lib/bokun/signer";
import { verifyBokunWebhook } from "@/lib/bokun/webhook-verifier";
import crypto from "crypto";

const sig = signBokunRequest("POST", "/booking.json/booking-search", {
  accessKey: "test-ak",
  secretKey: "test-sk",
});
console.log("→ signer OK:", Object.keys(sig).sort().join(", "));

// Webhook roundtrip
const secret = "webhook-secret";
const hdrs = {
  "x-bokun-apikey": "abc",
  "x-bokun-vendor-id": "123",
  "x-bokun-topic": "bookings/create",
};
const concatenated = Object.entries(hdrs)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `${k}=${v}`)
  .join("&");
const hmac = crypto.createHmac("sha256", secret).update(concatenated).digest("hex");
const ok = verifyBokunWebhook({ ...hdrs, "x-bokun-hmac": hmac }, secret);
console.log("→ webhook verify:", ok ? "OK" : "FAIL");
```

Run: `npx tsx scripts/smoke-bokun.ts`
Expected: `→ signer OK: ...`, `→ webhook verify: OK`.

- [ ] **Step 4: Cleanup**

Run: `rm scripts/smoke-bokun.ts`

- [ ] **Step 5: Commit finale**

```bash
git status
```

---

## Self-review

- [x] **Spec coverage**: client HMAC-SHA1 ✓, webhook HMAC-SHA256 ✓, availability push ✓, booking import ✓, reconciliation cron ✓, hot day pricing sync ✓, markup Bokun configurabile ✓, worker BullMQ ✓.
- [x] **Placeholder scan**: nessun TBD.
- [x] **Type consistency**: `BokunBookingSummary` usato come tipo canonico. `channelName` è stringa (nome OTA da Bokun). `bokunProductId` è string e deve essere configurato su `Service` dal cliente sul pannello Bokun.
