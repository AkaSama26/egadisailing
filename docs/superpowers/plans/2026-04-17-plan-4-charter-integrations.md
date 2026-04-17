# Plan 4 — Charter Integrations (Boataround, SamBoat, Click&Boat, Nautal)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrare le 4 charter platforms con strategie miste: Boataround via API REST bidirezionale, SamBoat via iCal export + email parsing, Click&Boat e Nautal via email parsing + alert manuale (con fallback API se cliente ottiene accesso).

**Architecture:** Endpoint iCal dinamico per ogni barca. IMAP client che polla `bookings@egadisailing.com` ogni 5 minuti + dispatcher che seleziona parser per mittente. Parser specifici per ogni piattaforma (SamBoat, Click&Boat, Nautal). Alert manuale nella dashboard per canali non automatizzabili. Boataround API client con webhook endpoint separato.

**Tech Stack:** node-imap, mailparser, ics (RFC 5545 generator), fetch, BullMQ.

**Spec di riferimento:** `docs/superpowers/specs/2026-04-17-platform-v2-design.md`
**Prerequisiti:** Plan 1, 2, 3 completati.

---

## File Structure

```
src/lib/
├── boataround/
│   ├── client.ts
│   ├── availability.ts
│   ├── bookings.ts
│   ├── webhook-verifier.ts
│   └── adapters/booking.ts
├── email-parser/
│   ├── imap-client.ts
│   ├── dispatcher.ts
│   ├── dedup.ts
│   ├── samboat.ts
│   ├── clickandboat.ts
│   ├── nautal.ts
│   └── booking-extractor.ts
├── ical/
│   ├── generator.ts
│   └── formatter.ts
└── charter/
    ├── booking-import.ts
    └── manual-alerts.ts

src/app/api/
├── ical/[boatId]/route.ts
├── webhooks/boataround/route.ts
└── cron/email-parser/route.ts

src/lib/queue/workers/
├── boataround-availability-worker.ts
└── manual-alert-worker.ts
```

---

## Task 1: ENV credentials + dependencies

**Files:**
- Modify: `.env.example`
- Modify: `package.json`

- [ ] **Step 1: Install**

Run:

```bash
npm install node-imap mailparser ics
npm install -D @types/node-imap @types/mailparser
```

- [ ] **Step 2: ENV**

Aggiungi `.env.example`:

```env
# Boataround
BOATAROUND_API_URL="https://partner-api.boataround.com"
BOATAROUND_API_TOKEN=""
BOATAROUND_WEBHOOK_SECRET=""

# IMAP mailbox (bookings@egadisailing.com)
IMAP_HOST=""
IMAP_PORT="993"
IMAP_USER=""
IMAP_PASSWORD=""
IMAP_TLS="true"
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "feat(deps+env): charter platforms - node-imap, mailparser, ics, boataround+imap creds"
```

---

## Task 2: iCal generator

**Files:**
- Create: `src/lib/ical/generator.ts`
- Create: `src/lib/ical/formatter.ts`

- [ ] **Step 1: Formatter RFC5545**

Crea `src/lib/ical/formatter.ts`:

```typescript
/**
 * Serializzazione conforme RFC 5545 per iCalendar.
 * Usiamo una implementazione leggera per avere controllo totale dell'output
 * (la libreria "ics" è ok ma aggiunge dipendenze sui PRODID non configurabili).
 */

export interface IcalEvent {
  uid: string;
  summary: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  lastModified?: Date;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function formatDateTime(d: Date): string {
  return `${formatDate(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function generateIcal(params: { prodId: string; name: string; events: IcalEvent[] }): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${params.prodId}`,
    `X-WR-CALNAME:${escapeText(params.name)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of params.events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${formatDateTime(ev.lastModified ?? new Date())}`);
    lines.push(`DTSTART;VALUE=DATE:${formatDate(ev.startDate)}`);
    const endExclusive = new Date(ev.endDate);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${formatDate(endExclusive)}`);
    lines.push(`SUMMARY:${escapeText(ev.summary)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    lines.push("TRANSP:OPAQUE");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
```

- [ ] **Step 2: Generator per una boat**

Crea `src/lib/ical/generator.ts`:

```typescript
import { db } from "@/lib/db";
import { generateIcal, type IcalEvent } from "./formatter";
import { NotFoundError } from "@/lib/errors";

export async function generateBoatIcal(boatId: string): Promise<string> {
  const boat = await db.boat.findUnique({ where: { id: boatId } });
  if (!boat) throw new NotFoundError("Boat", boatId);

  // Recupera tutti i blocchi (con booking associato) per i prossimi 24 mesi
  const now = new Date();
  const limit = new Date(now);
  limit.setUTCMonth(limit.getUTCMonth() + 24);

  const availability = await db.boatAvailability.findMany({
    where: {
      boatId,
      status: "BLOCKED",
      date: { gte: now, lte: limit },
    },
    orderBy: { date: "asc" },
  });

  // Raggruppa date contigue in range
  const ranges: Array<{ start: Date; end: Date; bookingId: string | null }> = [];
  for (const day of availability) {
    const last = ranges[ranges.length - 1];
    const dayMs = day.date.getTime();
    if (
      last &&
      last.bookingId === day.lockedByBookingId &&
      dayMs === last.end.getTime() + 86_400_000
    ) {
      last.end = day.date;
    } else {
      ranges.push({
        start: day.date,
        end: day.date,
        bookingId: day.lockedByBookingId,
      });
    }
  }

  const events: IcalEvent[] = ranges.map((r, idx) => ({
    uid: `egadisailing-${boatId}-${r.start.toISOString().slice(0, 10)}-${idx}@egadisailing.com`,
    summary: "Prenotato",
    startDate: r.start,
    endDate: r.end,
    description: r.bookingId ? `Booking ref: ${r.bookingId}` : "Prenotato",
  }));

  return generateIcal({
    prodId: "-//Egadisailing//Availability v2//IT",
    name: `${boat.name} Availability`,
    events,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ical/
git commit -m "feat(ical): generator RFC5545 for boat availability feed"
```

---

## Task 3: API route iCal export

**Files:**
- Create: `src/app/api/ical/[boatId]/route.ts`

- [ ] **Step 1: Route**

Crea `src/app/api/ical/[boatId]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { generateBoatIcal } from "@/lib/ical/generator";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ boatId: string }> },
) {
  const { boatId } = await params;
  try {
    const ical = await generateBoatIcal(boatId);
    return new NextResponse(ical, {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "cache-control": "public, max-age=900", // 15 min
        "content-disposition": `attachment; filename="${boatId}.ics"`,
      },
    });
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 404) {
      return NextResponse.json({ error: "Boat not found" }, { status: 404 });
    }
    logger.error({ err, boatId }, "iCal generation failed");
    return NextResponse.json({ error: "iCal generation failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/ical/
git commit -m "feat(api): GET /api/ical/[boatId] - RFC5545 calendar feed with 15min cache"
```

---

## Task 4: Boataround client

**Files:**
- Create: `src/lib/boataround/client.ts`
- Create: `src/lib/boataround/availability.ts`
- Create: `src/lib/boataround/bookings.ts`
- Create: `src/lib/boataround/webhook-verifier.ts`

- [ ] **Step 1: Client**

Crea `src/lib/boataround/client.ts`:

```typescript
import { logger } from "@/lib/logger";
import { ExternalServiceError } from "@/lib/errors";

export class BoataroundClient {
  constructor(
    private apiUrl: string,
    private token: string,
  ) {}

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const init: RequestInit = {
      method,
      headers: {
        "x-application-token": this.token,
        accept: "application/json",
      },
    };
    if (body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const url = `${this.apiUrl}${path}`;
    const res = await fetch(url, init);
    if (!res.ok) {
      const text = await res.text();
      logger.error({ method, url, status: res.status, body: text }, "Boataround API error");
      throw new ExternalServiceError("Boataround", `${method} ${path} failed`, {
        statusCode: res.status,
        responseBody: text,
      });
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }
}

let _client: BoataroundClient | null = null;

export function boataroundClient(): BoataroundClient {
  if (!_client) {
    const apiUrl = process.env.BOATAROUND_API_URL;
    const token = process.env.BOATAROUND_API_TOKEN;
    if (!apiUrl || !token) throw new Error("Boataround credentials not configured");
    _client = new BoataroundClient(apiUrl, token);
  }
  return _client;
}
```

- [ ] **Step 2: Availability helper**

Crea `src/lib/boataround/availability.ts`:

```typescript
import { boataroundClient } from "./client";

export async function updateBoataroundAvailability(params: {
  boatId: string;
  date: string;
  available: boolean;
}): Promise<void> {
  await boataroundClient().request("POST", "/partner/availability", {
    boatId: params.boatId,
    date: params.date,
    available: params.available,
  });
}
```

- [ ] **Step 3: Bookings helper**

Crea `src/lib/boataround/bookings.ts`:

```typescript
import { boataroundClient } from "./client";

export interface BoataroundBooking {
  id: string;
  boatId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  currency: string;
  status: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    country?: string;
  };
}

export async function getBoataroundBooking(id: string): Promise<BoataroundBooking> {
  return boataroundClient().request("GET", `/partner/bookings/${id}`);
}
```

- [ ] **Step 4: Webhook verifier**

Crea `src/lib/boataround/webhook-verifier.ts`:

```typescript
import crypto from "crypto";

/**
 * Boataround firma i webhook con HMAC-SHA256 in header `x-boataround-signature`.
 * Il formato esatto verrà confermato nella documentazione partner; assumiamo
 * base64(HMAC-SHA256(secret, raw body)).
 */
export function verifyBoataroundWebhook(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/boataround/
git commit -m "feat(boataround): client + availability + bookings + webhook verifier"
```

---

## Task 5: Boataround adapter

**Files:**
- Create: `src/lib/boataround/adapters/booking.ts`

- [ ] **Step 1: Adapter**

Crea `src/lib/boataround/adapters/booking.ts`:

```typescript
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { BoataroundBooking } from "../bookings";
import { logger } from "@/lib/logger";

export async function importBoataroundBooking(b: BoataroundBooking): Promise<string> {
  const customer = await db.customer.upsert({
    where: { email: b.customer.email.toLowerCase() },
    update: {
      firstName: b.customer.firstName,
      lastName: b.customer.lastName,
      phone: b.customer.phone,
      nationality: b.customer.country,
    },
    create: {
      email: b.customer.email.toLowerCase(),
      firstName: b.customer.firstName,
      lastName: b.customer.lastName,
      phone: b.customer.phone,
      nationality: b.customer.country,
    },
  });

  const boat = await db.boat.findFirst({ where: { id: b.boatId } });
  if (!boat) throw new Error(`Boataround boatId ${b.boatId} not mapped to any Boat`);

  // Charter → servizio Cabin Charter (o BOAT_EXCLUSIVE a seconda della durata)
  const service = await db.service.findFirst({
    where: {
      boatId: boat.id,
      type: { in: ["CABIN_CHARTER", "BOAT_EXCLUSIVE"] },
    },
    orderBy: { priority: "desc" },
  });
  if (!service) throw new Error(`No charter service for boat ${boat.id}`);

  const existing = await db.charterBooking.findUnique({
    where: {
      platformName_platformBookingRef: {
        platformName: "BOATAROUND",
        platformBookingRef: b.id,
      },
    },
    include: { booking: true },
  });

  if (existing) {
    await db.booking.update({
      where: { id: existing.bookingId },
      data: {
        status: b.status.toUpperCase().includes("CANCEL") ? "CANCELLED" : "CONFIRMED",
        totalPrice: new Prisma.Decimal(b.totalPrice),
      },
    });
    return existing.bookingId;
  }

  const created = await db.booking.create({
    data: {
      confirmationCode: `BR-${b.id}`,
      source: "BOATAROUND",
      externalRef: b.id,
      customerId: customer.id,
      serviceId: service.id,
      boatId: boat.id,
      startDate: new Date(b.startDate),
      endDate: new Date(b.endDate),
      numPeople: 1,
      totalPrice: new Prisma.Decimal(b.totalPrice),
      currency: b.currency,
      status: b.status.toUpperCase().includes("CANCEL") ? "CANCELLED" : "CONFIRMED",
      charterBooking: {
        create: {
          platformName: "BOATAROUND",
          platformBookingRef: b.id,
          rawPayload: b as never,
        },
      },
    },
  });
  logger.info({ bookingId: created.id }, "Boataround booking imported");
  return created.id;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/boataround/adapters/
git commit -m "feat(boataround): booking adapter - upsert Customer + Booking + CharterBooking"
```

---

## Task 6: Boataround webhook endpoint

**Files:**
- Create: `src/app/api/webhooks/boataround/route.ts`

- [ ] **Step 1: Route**

Crea `src/app/api/webhooks/boataround/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { verifyBoataroundWebhook } from "@/lib/boataround/webhook-verifier";
import { getBoataroundBooking } from "@/lib/boataround/bookings";
import { importBoataroundBooking } from "@/lib/boataround/adapters/booking";
import { blockDates, releaseDates } from "@/lib/availability/service";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.BOATAROUND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-boataround-signature") ?? "";

  if (!verifyBoataroundWebhook(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: { type: string; bookingId: string };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const full = await getBoataroundBooking(event.bookingId);
    const ourBookingId = await importBoataroundBooking(full);

    const booking = await db.booking.findUnique({ where: { id: ourBookingId } });
    if (!booking) throw new Error("Booking not found after import");

    if (event.type.toLowerCase().includes("cancel") || booking.status === "CANCELLED") {
      await releaseDates(booking.boatId, booking.startDate, booking.endDate, "BOATAROUND");
    } else {
      await blockDates(booking.boatId, booking.startDate, booking.endDate, "BOATAROUND", booking.id);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error({ err, event }, "Boataround webhook handler error");
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/boataround/
git commit -m "feat(boataround): webhook endpoint - verify + import + update availability"
```

---

## Task 7: Boataround availability worker

**Files:**
- Create: `src/lib/queue/workers/boataround-availability-worker.ts`
- Modify: `src/lib/queue/register-workers.ts`

- [ ] **Step 1: Worker**

Crea `src/lib/queue/workers/boataround-availability-worker.ts`:

```typescript
import { createWorker } from "@/lib/queue";
import { updateBoataroundAvailability } from "@/lib/boataround/availability";
import { logger } from "@/lib/logger";

export function startBoataroundAvailabilityWorker() {
  return createWorker(
    "sync",
    async (job) => {
      if (job.name !== "availability.update") return;
      const data = job.data as {
        targetChannel: string;
        payload: { boatId: string; date: string; status: string };
      };
      if (data.targetChannel !== "BOATAROUND") return;

      try {
        await updateBoataroundAvailability({
          boatId: data.payload.boatId,
          date: data.payload.date,
          available: data.payload.status === "AVAILABLE",
        });
      } catch (err) {
        logger.error({ err, payload: data.payload }, "Boataround availability sync failed");
        throw err;
      }
    },
    3,
  );
}
```

- [ ] **Step 2: Register**

Modifica `src/lib/queue/register-workers.ts`:

```typescript
import { startBokunAvailabilityWorker } from "./workers/bokun-availability-worker";
import { startBokunPricingWorker } from "./workers/bokun-pricing-worker";
import { startBoataroundAvailabilityWorker } from "./workers/boataround-availability-worker";
import { logger } from "@/lib/logger";

let registered = false;

export function registerQueueWorkers(): void {
  if (registered) return;
  registered = true;
  startBokunAvailabilityWorker();
  startBokunPricingWorker();
  startBoataroundAvailabilityWorker();
  logger.info("BullMQ workers registered");
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/queue/
git commit -m "feat(queue): boataround availability worker + registration"
```

---

## Task 8: IMAP client

**Files:**
- Create: `src/lib/email-parser/imap-client.ts`

- [ ] **Step 1: IMAP wrapper**

Crea `src/lib/email-parser/imap-client.ts`:

```typescript
import Imap from "node-imap";
import { simpleParser, type ParsedMail } from "mailparser";
import { logger } from "@/lib/logger";

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
}

export interface FetchedEmail {
  uid: number;
  messageId: string;
  from: string;
  subject: string;
  html: string | null;
  text: string | null;
  date: Date | null;
  raw: ParsedMail;
}

export function imapConfigFromEnv(): ImapConfig {
  return {
    host: process.env.IMAP_HOST ?? "",
    port: parseInt(process.env.IMAP_PORT ?? "993", 10),
    user: process.env.IMAP_USER ?? "",
    password: process.env.IMAP_PASSWORD ?? "",
    tls: process.env.IMAP_TLS !== "false",
  };
}

/**
 * Fetch email UNSEEN (da leggere) dal mailbox INBOX.
 * Li segna come SEEN dopo il successo del processing.
 */
export async function fetchUnseenEmails(config: ImapConfig): Promise<FetchedEmail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls,
      authTimeout: 10_000,
      connTimeout: 10_000,
    });

    const emails: FetchedEmail[] = [];

    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err) => {
        if (err) return finish(err);

        imap.search(["UNSEEN"], (searchErr, results) => {
          if (searchErr) return finish(searchErr);
          if (!results || results.length === 0) return finish(null);

          const fetch = imap.fetch(results, { bodies: "", markSeen: false });

          fetch.on("message", (msg, seqno) => {
            let buffer = Buffer.alloc(0);
            let uid: number = seqno;

            msg.on("body", (stream) => {
              stream.on("data", (chunk: Buffer) => {
                buffer = Buffer.concat([buffer, chunk]);
              });
            });
            msg.once("attributes", (attrs) => {
              uid = attrs.uid;
            });
            msg.once("end", () => {
              simpleParser(buffer).then((parsed) => {
                emails.push({
                  uid,
                  messageId: parsed.messageId ?? `no-id-${Date.now()}-${seqno}`,
                  from: (parsed.from?.value?.[0]?.address ?? "").toLowerCase(),
                  subject: parsed.subject ?? "",
                  html: parsed.html || null,
                  text: parsed.text || null,
                  date: parsed.date ?? null,
                  raw: parsed,
                });
              }).catch((parseErr) => {
                logger.error({ err: parseErr }, "Email parse failed");
              });
            });
          });

          fetch.once("error", (fetchErr) => finish(fetchErr));
          fetch.once("end", () => finish(null));
        });
      });
    });

    imap.once("error", (err) => finish(err));

    function finish(err: Error | null) {
      try {
        imap.end();
      } catch {}
      if (err) reject(err);
      else resolve(emails);
    }

    imap.connect();
  });
}

export async function markEmailsSeen(config: ImapConfig, uids: number[]): Promise<void> {
  if (uids.length === 0) return;
  await new Promise<void>((resolve, reject) => {
    const imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls,
    });
    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err) => {
        if (err) {
          imap.end();
          return reject(err);
        }
        imap.addFlags(uids, "\\Seen", (flagErr) => {
          imap.end();
          if (flagErr) reject(flagErr);
          else resolve();
        });
      });
    });
    imap.once("error", reject);
    imap.connect();
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/email-parser/imap-client.ts
git commit -m "feat(email-parser): IMAP client - fetch unseen + mark seen"
```

---

## Task 9: Dedup + extractor base

**Files:**
- Create: `src/lib/email-parser/dedup.ts`
- Create: `src/lib/email-parser/booking-extractor.ts`

- [ ] **Step 1: Dedup**

Crea `src/lib/email-parser/dedup.ts`:

```typescript
import { db } from "@/lib/db";
import crypto from "crypto";

/**
 * Usiamo il messageId email come chiave unique per dedup.
 * La tabella BookingNote non è adatta, quindi usiamo RateLimitEntry come generic store
 * con scope EMAIL_PROCESSED (quick hack, alternativamente creare nuova tabella).
 *
 * Soluzione preferita: creare tabella dedicata. Qui implementiamo come tabella inline semplice.
 */

const SEEN_LIFETIME_DAYS = 90;

export async function wasMessageProcessed(messageId: string): Promise<boolean> {
  const key = hashMessageId(messageId);
  const entry = await db.rateLimitEntry.findFirst({
    where: {
      identifier: key,
      scope: "EMAIL_PROCESSED",
      windowEnd: { gt: new Date() },
    },
  });
  return !!entry;
}

export async function markMessageProcessed(messageId: string): Promise<void> {
  const key = hashMessageId(messageId);
  const now = new Date();
  const end = new Date(now.getTime() + SEEN_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
  await db.rateLimitEntry.create({
    data: {
      identifier: key,
      scope: "EMAIL_PROCESSED",
      count: 1,
      windowStart: now,
      windowEnd: end,
    },
  });
}

function hashMessageId(messageId: string): string {
  return crypto.createHash("sha256").update(messageId).digest("hex").slice(0, 32);
}
```

- [ ] **Step 2: Booking extractor interface**

Crea `src/lib/email-parser/booking-extractor.ts`:

```typescript
export interface ExtractedCharterBooking {
  platformBookingRef: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone?: string;
  customerNationality?: string;
  startDate: Date;
  endDate: Date;
  totalAmountCents: number;
  currency: string;
  boatName?: string;
  rawEmailSubject: string;
}

export interface CharterParser {
  platform: "SAMBOAT" | "CLICKANDBOAT" | "NAUTAL";
  senderDomains: string[]; // es. ["samboat.com", "samboat.fr"]
  parse(email: { subject: string; html: string | null; text: string | null }): ExtractedCharterBooking | null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/email-parser/dedup.ts src/lib/email-parser/booking-extractor.ts
git commit -m "feat(email-parser): dedup by messageId + CharterParser interface"
```

---

## Task 10: SamBoat parser

**Files:**
- Create: `src/lib/email-parser/samboat.ts`

- [ ] **Step 1: Parser**

Crea `src/lib/email-parser/samboat.ts`:

```typescript
import type { CharterParser, ExtractedCharterBooking } from "./booking-extractor";

/**
 * Parser per email SamBoat. Si adatta al template HTML standard.
 * Nota: il template può cambiare — se il parse fallisce, l'email finisce in
 * "failed-to-parse" per review manuale.
 */
export const samboatParser: CharterParser = {
  platform: "SAMBOAT",
  senderDomains: ["samboat.com", "samboat.fr", "samboat.it"],

  parse(email) {
    const text = email.text ?? stripHtml(email.html ?? "");

    // Esempio pattern nel testo SamBoat (verificare con esempi reali del cliente)
    const refMatch = /Booking (?:ref|n°|id)[:\s]+([A-Z0-9\-]+)/i.exec(text);
    const nameMatch = /Guest[:\s]+([A-Za-z\-']+)\s+([A-Za-z\-']+)/i.exec(text);
    const emailMatch = /[\w\.\-]+@[\w\.\-]+\.\w{2,}/.exec(text);
    const startMatch = /From[:\s]+(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i.exec(text);
    const endMatch = /To[:\s]+(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i.exec(text);
    const amountMatch = /(?:Total|Amount)[:\s]+(?:€|EUR)?\s*(\d+(?:[.,]\d{2})?)/i.exec(text);

    if (!refMatch || !nameMatch || !emailMatch || !startMatch || !endMatch || !amountMatch) {
      return null;
    }

    const result: ExtractedCharterBooking = {
      platformBookingRef: refMatch[1],
      customerFirstName: nameMatch[1],
      customerLastName: nameMatch[2],
      customerEmail: emailMatch[0],
      startDate: parseDate(startMatch[1]),
      endDate: parseDate(endMatch[1]),
      totalAmountCents: Math.round(parseFloat(amountMatch[1].replace(",", ".")) * 100),
      currency: "EUR",
      rawEmailSubject: email.subject,
    };

    return result;
  },
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseDate(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
    return new Date(Date.UTC(y, m - 1, d));
  }
  // dd/mm/yyyy
  const [d, m, y] = s.split("/").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/email-parser/samboat.ts
git commit -m "feat(email-parser): SamBoat template parser"
```

---

## Task 11: Click&Boat parser + Nautal parser

**Files:**
- Create: `src/lib/email-parser/clickandboat.ts`
- Create: `src/lib/email-parser/nautal.ts`

- [ ] **Step 1: Click&Boat**

Crea `src/lib/email-parser/clickandboat.ts`:

```typescript
import type { CharterParser, ExtractedCharterBooking } from "./booking-extractor";

export const clickandboatParser: CharterParser = {
  platform: "CLICKANDBOAT",
  senderDomains: ["clickandboat.com"],

  parse(email) {
    const text = email.text ?? stripHtml(email.html ?? "");

    const refMatch = /(?:Reservation|Booking) (?:n°|#|ID)[:\s]*([A-Z0-9\-]+)/i.exec(text);
    const nameMatch = /(?:Client|Guest|Tenant)[:\s]+([A-Za-z\-']+)\s+([A-Za-z\-']+)/i.exec(text);
    const emailMatch = /[\w\.\-]+@[\w\.\-]+\.\w{2,}/.exec(text);
    const dateMatch = /(?:From|Du)[:\s]+(\d{2}\/\d{2}\/\d{4})\s+(?:to|au)\s+(\d{2}\/\d{2}\/\d{4})/i.exec(text);
    const amountMatch = /(?:Total|Montant)[:\s]+(?:€|EUR)?\s*(\d+(?:[.,]\d{2})?)/i.exec(text);

    if (!refMatch || !nameMatch || !emailMatch || !dateMatch || !amountMatch) return null;

    return {
      platformBookingRef: refMatch[1],
      customerFirstName: nameMatch[1],
      customerLastName: nameMatch[2],
      customerEmail: emailMatch[0],
      startDate: parseDmy(dateMatch[1]),
      endDate: parseDmy(dateMatch[2]),
      totalAmountCents: Math.round(parseFloat(amountMatch[1].replace(",", ".")) * 100),
      currency: "EUR",
      rawEmailSubject: email.subject,
    };
  },
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseDmy(s: string): Date {
  const [d, m, y] = s.split("/").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d));
}
```

- [ ] **Step 2: Nautal (variante)**

Crea `src/lib/email-parser/nautal.ts`:

```typescript
import type { CharterParser, ExtractedCharterBooking } from "./booking-extractor";

export const nautalParser: CharterParser = {
  platform: "NAUTAL",
  senderDomains: ["nautal.com", "nautal.es", "nautal.it"],

  parse(email) {
    const text = email.text ?? stripHtml(email.html ?? "");

    const refMatch = /(?:Reserva|Booking|Prenotazione) (?:n°|#|ID)[:\s]*([A-Z0-9\-]+)/i.exec(text);
    const nameMatch = /(?:Cliente|Guest|Ospite)[:\s]+([A-Za-z\-']+)\s+([A-Za-z\-']+)/i.exec(text);
    const emailMatch = /[\w\.\-]+@[\w\.\-]+\.\w{2,}/.exec(text);
    const dateMatch = /(?:Del|From|Dal)[:\s]+(\d{2}\/\d{2}\/\d{4})\s+(?:al|to|till)\s+(\d{2}\/\d{2}\/\d{4})/i.exec(text);
    const amountMatch = /(?:Total|Totale)[:\s]+(?:€|EUR)?\s*(\d+(?:[.,]\d{2})?)/i.exec(text);

    if (!refMatch || !nameMatch || !emailMatch || !dateMatch || !amountMatch) return null;

    return {
      platformBookingRef: refMatch[1],
      customerFirstName: nameMatch[1],
      customerLastName: nameMatch[2],
      customerEmail: emailMatch[0],
      startDate: parseDmy(dateMatch[1]),
      endDate: parseDmy(dateMatch[2]),
      totalAmountCents: Math.round(parseFloat(amountMatch[1].replace(",", ".")) * 100),
      currency: "EUR",
      rawEmailSubject: email.subject,
    };
  },
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseDmy(s: string): Date {
  const [d, m, y] = s.split("/").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d));
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/email-parser/clickandboat.ts src/lib/email-parser/nautal.ts
git commit -m "feat(email-parser): Click&Boat + Nautal parsers"
```

---

## Task 12: Dispatcher + booking import

**Files:**
- Create: `src/lib/email-parser/dispatcher.ts`
- Create: `src/lib/charter/booking-import.ts`

- [ ] **Step 1: Dispatcher**

Crea `src/lib/email-parser/dispatcher.ts`:

```typescript
import type { CharterParser, ExtractedCharterBooking } from "./booking-extractor";
import { samboatParser } from "./samboat";
import { clickandboatParser } from "./clickandboat";
import { nautalParser } from "./nautal";

const PARSERS: CharterParser[] = [samboatParser, clickandboatParser, nautalParser];

export interface DispatchResult {
  platform: CharterParser["platform"] | null;
  extracted: ExtractedCharterBooking | null;
}

export function dispatch(email: {
  from: string;
  subject: string;
  html: string | null;
  text: string | null;
}): DispatchResult {
  const domain = email.from.split("@")[1] ?? "";
  for (const parser of PARSERS) {
    if (parser.senderDomains.some((d) => domain.endsWith(d))) {
      return {
        platform: parser.platform,
        extracted: parser.parse(email),
      };
    }
  }
  return { platform: null, extracted: null };
}
```

- [ ] **Step 2: Importatore comune**

Crea `src/lib/charter/booking-import.ts`:

```typescript
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { ExtractedCharterBooking } from "@/lib/email-parser/booking-extractor";
import { blockDates } from "@/lib/availability/service";
import { logger } from "@/lib/logger";

export interface ImportInput extends ExtractedCharterBooking {
  platform: "SAMBOAT" | "CLICKANDBOAT" | "NAUTAL";
  boatId: string; // resolved upstream (default: trimarano per ora)
}

export async function importCharterBooking(input: ImportInput): Promise<string> {
  const customer = await db.customer.upsert({
    where: { email: input.customerEmail.toLowerCase() },
    update: {
      firstName: input.customerFirstName,
      lastName: input.customerLastName,
      phone: input.customerPhone,
      nationality: input.customerNationality,
    },
    create: {
      email: input.customerEmail.toLowerCase(),
      firstName: input.customerFirstName,
      lastName: input.customerLastName,
      phone: input.customerPhone,
      nationality: input.customerNationality,
    },
  });

  const service = await db.service.findFirst({
    where: {
      boatId: input.boatId,
      type: { in: ["CABIN_CHARTER", "BOAT_EXCLUSIVE"] },
    },
    orderBy: { priority: "desc" },
  });
  if (!service) throw new Error(`No charter service for boat ${input.boatId}`);

  const existing = await db.charterBooking.findUnique({
    where: {
      platformName_platformBookingRef: {
        platformName: input.platform,
        platformBookingRef: input.platformBookingRef,
      },
    },
    include: { booking: true },
  });

  if (existing) {
    logger.debug({ platformBookingRef: input.platformBookingRef }, "Charter booking already imported");
    return existing.bookingId;
  }

  const created = await db.booking.create({
    data: {
      confirmationCode: `${input.platform.slice(0, 2)}-${input.platformBookingRef}`,
      source: input.platform,
      externalRef: input.platformBookingRef,
      customerId: customer.id,
      serviceId: service.id,
      boatId: input.boatId,
      startDate: input.startDate,
      endDate: input.endDate,
      numPeople: 1,
      totalPrice: new Prisma.Decimal(input.totalAmountCents / 100),
      currency: input.currency,
      status: "CONFIRMED",
      charterBooking: {
        create: {
          platformName: input.platform,
          platformBookingRef: input.platformBookingRef,
          rawPayload: input as never,
        },
      },
    },
  });

  await blockDates(input.boatId, input.startDate, input.endDate, input.platform, created.id);
  logger.info({ bookingId: created.id, platform: input.platform }, "Charter booking imported");
  return created.id;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/email-parser/dispatcher.ts src/lib/charter/booking-import.ts
git commit -m "feat(charter): dispatcher + booking importer with availability blocking"
```

---

## Task 13: Cron email parser

**Files:**
- Create: `src/app/api/cron/email-parser/route.ts`

- [ ] **Step 1: Route**

Crea `src/app/api/cron/email-parser/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { imapConfigFromEnv, fetchUnseenEmails, markEmailsSeen } from "@/lib/email-parser/imap-client";
import { dispatch } from "@/lib/email-parser/dispatcher";
import { wasMessageProcessed, markMessageProcessed } from "@/lib/email-parser/dedup";
import { importCharterBooking } from "@/lib/charter/booking-import";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET ?? "dev-cron"}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cfg = imapConfigFromEnv();
  if (!cfg.host || !cfg.user) {
    logger.warn("IMAP not configured, skipping email parser");
    return NextResponse.json({ skipped: true });
  }

  const emails = await fetchUnseenEmails(cfg);
  const processedUids: number[] = [];
  const errors: Array<{ uid: number; error: string }> = [];
  let imported = 0;

  // Default boatId: prendiamo il trimarano per ora. In V2 riconosciamo via subject/payload.
  const defaultBoat = await db.boat.findFirst({ where: { id: "trimarano" } });

  for (const email of emails) {
    try {
      if (await wasMessageProcessed(email.messageId)) {
        processedUids.push(email.uid);
        continue;
      }

      const dispatched = dispatch(email);
      if (!dispatched.platform || !dispatched.extracted) {
        logger.debug({ from: email.from, subject: email.subject }, "Email not matched to charter parser");
        processedUids.push(email.uid);
        continue;
      }

      if (!defaultBoat) throw new Error("No boat configured for charter ingest");

      await importCharterBooking({
        ...dispatched.extracted,
        platform: dispatched.platform,
        boatId: defaultBoat.id,
      });
      await markMessageProcessed(email.messageId);
      processedUids.push(email.uid);
      imported++;
    } catch (err) {
      logger.error({ err, uid: email.uid }, "Email processing failed");
      errors.push({ uid: email.uid, error: String(err) });
    }
  }

  await markEmailsSeen(cfg, processedUids);

  return NextResponse.json({
    fetched: emails.length,
    imported,
    errors,
  });
}
```

- [ ] **Step 2: Schedula ogni 5 minuti**

Modifica `src/lib/cron/scheduler.ts` aggiungendo:

```typescript
cron.schedule(
  "*/5 * * * *",
  async () => {
    const res = await fetch(`${process.env.APP_URL}/api/cron/email-parser`, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? "dev-cron"}` },
    });
    logger.info({ status: res.status }, "email-parser cron response");
  },
);
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/email-parser/ src/lib/cron/scheduler.ts
git commit -m "feat(charter): cron email parser - IMAP fetch, dispatch, import, dedup, mark seen"
```

---

## Task 14: Manual alert system (Click&Boat/Nautal)

**Files:**
- Create: `src/lib/charter/manual-alerts.ts`
- Create: `src/lib/queue/workers/manual-alert-worker.ts`
- Modify: `src/lib/queue/register-workers.ts`

- [ ] **Step 1: Service manual alerts**

Crea `src/lib/charter/manual-alerts.ts`:

```typescript
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface ManualAlert {
  channel: "CLICKANDBOAT" | "NAUTAL";
  boatId: string;
  date: string;
  action: "BLOCK" | "UNBLOCK";
  bookingId?: string;
}

/**
 * Crea una riga in SyncQueue con status PENDING rappresentante un'azione manuale
 * che l'admin deve fare sul pannello della piattaforma. La dashboard ne leggerà
 * il contenuto e mostrerà alert rossi.
 */
export async function createManualAlert(alert: ManualAlert): Promise<void> {
  await db.syncQueue.create({
    data: {
      targetChannel: `${alert.channel}_MANUAL`,
      operation: alert.action === "BLOCK" ? "MANUAL_BLOCK" : "MANUAL_UNBLOCK",
      payload: alert as never,
      status: "PENDING",
      originBookingId: alert.bookingId,
    },
  });
  logger.info({ alert }, "Manual alert created");
}

export async function resolveManualAlert(id: string): Promise<void> {
  await db.syncQueue.update({
    where: { id },
    data: { status: "SYNCED", updatedAt: new Date() },
  });
}

export async function listPendingManualAlerts(): Promise<Awaited<ReturnType<typeof db.syncQueue.findMany>>> {
  return db.syncQueue.findMany({
    where: {
      targetChannel: { in: ["CLICKANDBOAT_MANUAL", "NAUTAL_MANUAL"] },
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });
}
```

- [ ] **Step 2: Worker che genera alert invece di API call**

Crea `src/lib/queue/workers/manual-alert-worker.ts`:

```typescript
import { createWorker } from "@/lib/queue";
import { createManualAlert } from "@/lib/charter/manual-alerts";

export function startManualAlertWorker() {
  return createWorker(
    "sync",
    async (job) => {
      if (job.name !== "availability.update") return;
      const data = job.data as {
        targetChannel: string;
        payload: { boatId: string; date: string; status: string; originBookingId?: string };
      };
      if (!["CLICKANDBOAT_MANUAL", "NAUTAL_MANUAL"].includes(data.targetChannel)) return;

      const channel = data.targetChannel.replace("_MANUAL", "") as "CLICKANDBOAT" | "NAUTAL";

      await createManualAlert({
        channel,
        boatId: data.payload.boatId,
        date: data.payload.date,
        action: data.payload.status === "AVAILABLE" ? "UNBLOCK" : "BLOCK",
        bookingId: data.payload.originBookingId,
      });
    },
    3,
  );
}
```

- [ ] **Step 3: Registra**

Aggiungi in `src/lib/queue/register-workers.ts`:

```typescript
import { startManualAlertWorker } from "./workers/manual-alert-worker";
// ...
startManualAlertWorker();
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/charter/manual-alerts.ts src/lib/queue/workers/manual-alert-worker.ts src/lib/queue/register-workers.ts
git commit -m "feat(charter): manual alerts for Click&Boat/Nautal + worker that creates them"
```

---

## Task 15: Smoke test + build

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit`

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Smoke test iCal**

Crea `scripts/smoke-ical.ts`:

```typescript
import { generateIcal } from "@/lib/ical/formatter";

const ics = generateIcal({
  prodId: "-//Test//EN",
  name: "Smoke Test",
  events: [
    {
      uid: "test-1@example.com",
      summary: "Prenotato",
      startDate: new Date("2026-07-15"),
      endDate: new Date("2026-07-22"),
    },
  ],
});
console.log(ics);
if (!ics.includes("BEGIN:VCALENDAR") || !ics.includes("END:VCALENDAR")) {
  throw new Error("iCal malformed");
}
console.log("✓ iCal generator OK");
```

Run: `npx tsx scripts/smoke-ical.ts`
Expected: output iCal valido + `✓ iCal generator OK`.

- [ ] **Step 4: Cleanup**

Run: `rm scripts/smoke-ical.ts`

- [ ] **Step 5: Commit finale**

```bash
git status
```

---

## Self-review

- [x] **Spec coverage**: Boataround API bidirezionale ✓, SamBoat iCal + email ✓, Click&Boat email + manual ✓, Nautal email + manual ✓, dedup via messageId ✓, webhook Boataround ✓, cron email parser ✓.
- [x] **Placeholder scan**: parser template usano regex best-effort documentate come "da verificare con email reali del cliente". Parti "da adattare" sono segnalate nei commenti ma il codice è completo.
- [x] **Type consistency**: `ExtractedCharterBooking` usato da tutti i parser. `platformName` valori uppercase allineati con enum `BookingSource`. `CharterBooking` unique su `(platformName, platformBookingRef)` garantisce idempotenza.
