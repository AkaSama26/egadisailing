# Plan 1 — DB + Backend Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rifondazione completa del backend con nuovo schema Prisma, job queue BullMQ+Redis, source of truth del calendario, client libraries per integrazioni esterne, rate limiting, audit log e strutture di sync.

**Architecture:** Prisma v7 + PostgreSQL come master DB. Refactor totale dello schema (butta il vecchio). Redis per BullMQ (job queue persistente con retry). Client libraries modulari per Stripe/Bokun/Boataround sotto `src/lib/<provider>/`. Ogni mutation critica triggera job su SyncQueue per propagazione asincrona.

**Tech Stack:** Next.js 16, TypeScript strict, Prisma v7, PostgreSQL 16, Redis 7, BullMQ, Docker Compose, Pino (logging), Zod (validation).

**Spec di riferimento:** `docs/superpowers/specs/2026-04-17-platform-v2-design.md`

---

## Pre-requisiti

- Docker e Docker Compose installati
- Progetto esistente con `docker-compose.yml` già configurato per Postgres
- Le credenziali in `.env` già presenti (`DATABASE_URL`, ecc.)

---

## File Structure

```
prisma/
├── schema.prisma                      # REWRITE completo
├── migrations/                        # DROP e ricrea
└── seed.mts                          # REWRITE: solo catalogo + admin

src/
├── lib/
│   ├── db.ts                         # Singleton Prisma (esistente, verificare)
│   ├── auth.ts                       # NextAuth (esistente, adattare)
│   ├── logger.ts                     # NEW: Pino structured logger
│   ├── errors.ts                     # NEW: AppError hierarchy
│   ├── queue/
│   │   ├── index.ts                  # BullMQ connection
│   │   ├── sync-queue.ts             # SyncQueue job processor
│   │   └── types.ts                  # Job payload types
│   ├── availability/
│   │   ├── service.ts                # BoatAvailability management
│   │   ├── fan-out.ts                # Fan-out logic a tutti i canali
│   │   └── idempotency.ts            # Anti-loop checks
│   ├── pricing/
│   │   ├── service.ts                # Price calculation engine
│   │   ├── hot-days.ts               # Hot day rules application
│   │   └── rounding.ts               # Round-up helpers
│   ├── rate-limit/
│   │   ├── service.ts                # Rate limiter generico
│   │   └── otp-limits.ts             # Config specifica OTP
│   ├── audit/
│   │   └── log.ts                    # AuditLog helpers
│   └── validation/
│       └── schemas.ts                # Zod schemas condivisi
docker-compose.yml                     # MODIFY: aggiungi redis service
```

---

## Task 1: Setup Redis in Docker Compose

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`

- [ ] **Step 1: Aggiungi servizio Redis**

Modifica `docker-compose.yml` aggiungendo il servizio Redis:

```yaml
services:
  postgres:
    # ... existing config ...

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

- [ ] **Step 2: Aggiungi variabili env**

Aggiungi in `.env.example`:

```env
REDIS_URL="redis://localhost:6379"
```

Aggiungi in `.env`:

```env
REDIS_URL="redis://localhost:6379"
```

- [ ] **Step 3: Avvia i container**

Run: `docker compose up -d postgres redis`
Expected: Entrambi i container avviati, redis risponde a ping.

Verifica: `docker exec egadisealing-redis-1 redis-cli ping`
Expected: `PONG`

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat(infra): add redis service for bullmq queue"
```

---

## Task 2: Install BullMQ e Pino

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installa dipendenze**

Run:

```bash
npm install bullmq ioredis pino pino-pretty zod
npm install -D @types/ioredis
```

- [ ] **Step 2: Verifica installazione**

Run: `npm ls bullmq ioredis pino zod`
Expected: Tutte le dipendenze listate con versione.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(deps): add bullmq, ioredis, pino, zod"
```

---

## Task 3: Structured logger con Pino

**Files:**
- Create: `src/lib/logger.ts`

- [ ] **Step 1: Crea logger Pino**

Crea `src/lib/logger.ts`:

```typescript
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: {
    app: "egadisailing",
    env: process.env.NODE_ENV ?? "development",
  },
});

export function childLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
```

- [ ] **Step 2: Verifica import**

Crea `src/lib/logger.test.ts`:

```typescript
import { logger, childLogger } from "./logger";

logger.info("logger works");
const child = childLogger({ module: "test" });
child.info({ data: "ciao" }, "child logger works");
```

Run: `npx tsx src/lib/logger.test.ts`
Expected: Due log strutturati stampati.

- [ ] **Step 3: Rimuovi file di test**

Run: `rm src/lib/logger.test.ts`

- [ ] **Step 4: Commit**

```bash
git add src/lib/logger.ts
git commit -m "feat(lib): add structured pino logger"
```

---

## Task 4: Error hierarchy

**Files:**
- Create: `src/lib/errors.ts`

- [ ] **Step 1: Crea AppError hierarchy**

Crea `src/lib/errors.ts`:

```typescript
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode = 500,
    context: Record<string, unknown> = {},
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.name = "AppError";
    Error.captureStackTrace?.(this, AppError);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super("VALIDATION_ERROR", message, 400, context);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super("NOT_FOUND", `${entity} with id ${id} not found`, 404, { entity, id });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super("CONFLICT", message, 409, context);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number, context: Record<string, unknown> = {}) {
    super("RATE_LIMITED", "Rate limit exceeded", 429, {
      retryAfterSeconds,
      ...context,
    });
    this.name = "RateLimitError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context: Record<string, unknown> = {}) {
    super("EXTERNAL_SERVICE_ERROR", `${service}: ${message}`, 502, {
      service,
      ...context,
    });
    this.name = "ExternalServiceError";
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/errors.ts
git commit -m "feat(lib): add AppError hierarchy for structured errors"
```

---

## Task 5: Backup vecchio schema + drop DB

**Files:**
- Create: `prisma/backup/legacy-schema-2026-04-17.prisma`
- Create: `prisma/backup/legacy-dump-2026-04-17.sql`

- [ ] **Step 1: Backup schema attuale**

Run:

```bash
mkdir -p prisma/backup
cp prisma/schema.prisma prisma/backup/legacy-schema-2026-04-17.prisma
```

- [ ] **Step 2: Backup dati attuali**

Run:

```bash
docker exec egadisealing-postgres-1 pg_dump -U egadisailing -d egadisailing --clean --if-exists > prisma/backup/legacy-dump-2026-04-17.sql
ls -lh prisma/backup/legacy-dump-2026-04-17.sql
```

Expected: file `.sql` creato con contenuto.

- [ ] **Step 3: Drop database**

Run:

```bash
docker exec egadisealing-postgres-1 psql -U egadisailing -d postgres -c "DROP DATABASE IF EXISTS egadisailing;"
docker exec egadisealing-postgres-1 psql -U egadisailing -d postgres -c "CREATE DATABASE egadisailing;"
```

Expected: `DROP DATABASE` e `CREATE DATABASE` succeed.

- [ ] **Step 4: Rimuovi vecchie migrations**

Run:

```bash
rm -rf prisma/migrations
```

- [ ] **Step 5: Commit backup**

```bash
git add prisma/backup/
git commit -m "chore(db): backup legacy schema and data before v2 refactor"
```

---

## Task 6: Nuovo schema Prisma — Catalogo + Sistema

**Files:**
- Rewrite: `prisma/schema.prisma`

- [ ] **Step 1: Scrivi il nuovo schema base**

Sostituisci completamente `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════════════════════
// SISTEMA
// ═══════════════════════════════════════════════════════════

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         String   @default("ADMIN")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  auditLogs AuditLog[]
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String   // CREATE, UPDATE, DELETE, CANCEL, REFUND, ...
  entity    String   // Booking, HotDayRule, PricingPeriod, ...
  entityId  String
  before    Json?
  after     Json?
  ip        String?
  userAgent String?
  timestamp DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@index([entity, entityId])
  @@index([userId, timestamp])
}

// ═══════════════════════════════════════════════════════════
// CATALOGO
// ═══════════════════════════════════════════════════════════

model Boat {
  id          String   @id
  name        String
  type        String
  description String
  length      Float?
  year        Int?
  cabins      Int?
  engineHp    Int?
  amenities   Json
  images      Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  services       Service[]
  availability   BoatAvailability[]
  bookings       Booking[]
  crewAvailability CrewAvailability[]
}

enum PaymentSchedule {
  FULL
  DEPOSIT_BALANCE
}

enum DurationType {
  FULL_DAY
  HALF_DAY_MORNING
  HALF_DAY_AFTERNOON
  WEEK
}

model Service {
  id                         String          @id
  name                       String
  type                       String
  boatId                     String
  durationType               DurationType
  durationHours              Int
  capacityMax                Int
  minPaying                  Int?
  defaultPaymentSchedule     PaymentSchedule @default(FULL)
  defaultDepositPercentage   Int?
  priority                   Int             @default(5)
  bokunProductId             String?
  active                     Boolean         @default(true)
  createdAt                  DateTime        @default(now())
  updatedAt                  DateTime        @updatedAt

  boat            Boat             @relation(fields: [boatId], references: [id])
  bookings        Booking[]
  pricingPeriods  PricingPeriod[]
  hotDayOverrides HotDayOverride[]
}
```

- [ ] **Step 2: Applica la prima migration**

Run:

```bash
npx prisma migrate dev --name v2-catalog-and-system
```

Expected: Migration creata, DB aggiornato.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): v2 schema - catalog (Boat, Service) and system (User, AuditLog)"
```

---

## Task 7: Schema Prisma — Prezzi e disponibilità

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Aggiungi modelli prezzi**

Aggiungi in fondo a `prisma/schema.prisma`:

```prisma
// ═══════════════════════════════════════════════════════════
// PREZZI
// ═══════════════════════════════════════════════════════════

model PricingPeriod {
  id             String   @id @default(cuid())
  serviceId      String
  label          String
  startDate      DateTime @db.Date
  endDate        DateTime @db.Date
  pricePerPerson Decimal  @db.Decimal(10, 2)
  year           Int
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  service Service @relation(fields: [serviceId], references: [id])

  @@index([serviceId, startDate, endDate])
}

model HotDayRule {
  id             String    @id @default(cuid())
  name           String
  dateRangeStart DateTime  @db.Date
  dateRangeEnd   DateTime  @db.Date
  weekdays       Int[]     // 0=dom, 1=lun, ... 6=sab. Array vuoto = tutti i giorni
  multiplier     Decimal   @db.Decimal(4, 3)
  roundTo        Int       @default(10)
  priority       Int       @default(0)
  active         Boolean   @default(true)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([dateRangeStart, dateRangeEnd, active])
}

model HotDayOverride {
  id            String   @id @default(cuid())
  date          DateTime @db.Date
  serviceId     String?
  multiplier    Decimal? @db.Decimal(4, 3)
  absolutePrice Decimal? @db.Decimal(10, 2)
  roundTo       Int      @default(10)
  note          String?
  createdBy     String
  createdAt     DateTime @default(now())

  service Service? @relation(fields: [serviceId], references: [id])

  @@unique([date, serviceId])
}

model BokunPriceSync {
  id                     String    @id @default(cuid())
  hotDayRuleId           String?
  bokunExperienceId      String
  bokunPriceOverrideId   String?
  date                   DateTime  @db.Date
  amount                 Decimal   @db.Decimal(10, 2)
  status                 String    // PENDING | SYNCED | FAILED | ROLLED_BACK
  syncedAt               DateTime?
  lastError              String?
  createdAt              DateTime  @default(now())

  @@index([status])
  @@index([bokunExperienceId, date])
}

// ═══════════════════════════════════════════════════════════
// DISPONIBILITA E SYNC
// ═══════════════════════════════════════════════════════════

enum AvailabilityStatus {
  AVAILABLE
  BLOCKED
  PARTIALLY_BOOKED
}

model BoatAvailability {
  id                 String             @id @default(cuid())
  boatId             String
  date               DateTime           @db.Date
  status             AvailabilityStatus @default(AVAILABLE)
  lockedByBookingId  String?
  lastSyncedSource   String?
  lastSyncedAt       DateTime?
  updatedAt          DateTime           @updatedAt
  createdAt          DateTime           @default(now())

  boat Boat @relation(fields: [boatId], references: [id])

  @@unique([boatId, date])
  @@index([status])
}

enum SyncStatus {
  PENDING
  PROCESSING
  SYNCED
  FAILED
}

model SyncQueue {
  id             String     @id @default(cuid())
  targetChannel  String     // BOKUN | BOATAROUND | SAMBOAT_ICAL | CLICKANDBOAT_MANUAL | NAUTAL_MANUAL
  operation      String     // AVAILABILITY_UPDATE | PRICE_UPDATE | BOOKING_SYNC
  payload        Json
  status         SyncStatus @default(PENDING)
  attempts       Int        @default(0)
  nextRetryAt    DateTime?
  lastError      String?
  originBookingId String?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  @@index([status, nextRetryAt])
  @@index([targetChannel, status])
}

model ChannelSyncStatus {
  channel       String   @id
  lastSyncAt    DateTime?
  lastError     String?
  healthStatus  String   @default("GREEN") // GREEN | YELLOW | RED
  updatedAt     DateTime @updatedAt
}
```

- [ ] **Step 2: Applica la migration**

Run:

```bash
npx prisma migrate dev --name v2-pricing-and-availability
```

Expected: Migration applicata.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): v2 schema - pricing (PricingPeriod, HotDayRule, HotDayOverride, BokunPriceSync) and availability (BoatAvailability, SyncQueue, ChannelSyncStatus)"
```

---

## Task 8: Schema Prisma — Prenotazioni e pagamenti

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Aggiungi modelli booking**

Aggiungi in fondo a `prisma/schema.prisma`:

```prisma
// ═══════════════════════════════════════════════════════════
// CLIENTI
// ═══════════════════════════════════════════════════════════

model Customer {
  id          String   @id @default(cuid())
  email       String   @unique
  firstName   String
  lastName    String
  phone       String?
  nationality String?
  language    String?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  bookings Booking[]
}

// ═══════════════════════════════════════════════════════════
// PRENOTAZIONI
// ═══════════════════════════════════════════════════════════

enum BookingSource {
  DIRECT
  BOKUN
  BOATAROUND
  SAMBOAT
  CLICKANDBOAT
  NAUTAL
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  REFUNDED
}

model Booking {
  id               String        @id @default(cuid())
  confirmationCode String        @unique
  source           BookingSource
  externalRef      String?
  customerId       String
  serviceId        String
  boatId           String
  startDate        DateTime      @db.Date
  endDate          DateTime      @db.Date
  numPeople        Int
  totalPrice       Decimal       @db.Decimal(10, 2)
  currency         String        @default("EUR")
  status           BookingStatus @default(PENDING)
  weatherGuarantee Boolean       @default(false)
  notes            String?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  customer       Customer          @relation(fields: [customerId], references: [id])
  service        Service           @relation(fields: [serviceId], references: [id])
  boat           Boat              @relation(fields: [boatId], references: [id])
  directBooking  DirectBooking?
  bokunBooking   BokunBooking?
  charterBooking CharterBooking?
  payments       Payment[]
  bookingNotes   BookingNote[]
  tripCrew       TripCrew[]
  weatherApps    WeatherGuaranteeApplication[]

  @@index([source, status])
  @@index([startDate])
  @@index([customerId])
}

model DirectBooking {
  bookingId                String  @id
  paymentSchedule          PaymentSchedule
  depositAmount            Decimal? @db.Decimal(10, 2)
  balanceAmount            Decimal? @db.Decimal(10, 2)
  stripePaymentIntentId    String?
  cancellationPolicyApplied String?
  balanceReminderSentAt    DateTime?
  balancePaidAt            DateTime?

  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
}

model BokunBooking {
  bookingId        String  @id
  bokunBookingId   String  @unique
  channelName      String
  commissionAmount Decimal? @db.Decimal(10, 2)
  netAmount        Decimal? @db.Decimal(10, 2)
  rawPayload       Json

  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
}

model CharterBooking {
  bookingId           String @id
  platformName        String // BOATAROUND | SAMBOAT | CLICKANDBOAT | NAUTAL
  platformBookingRef  String
  rawPayload          Json
  commissionAmount    Decimal? @db.Decimal(10, 2)

  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  @@unique([platformName, platformBookingRef])
}

// ═══════════════════════════════════════════════════════════
// PAGAMENTI
// ═══════════════════════════════════════════════════════════

enum PaymentType {
  DEPOSIT
  BALANCE
  FULL
  REFUND
}

enum PaymentMethod {
  STRIPE
  STRIPE_LINK
  CASH
  BANK_TRANSFER
  POS
  EXTERNAL
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

model Payment {
  id              String        @id @default(cuid())
  bookingId       String
  amount          Decimal       @db.Decimal(10, 2)
  currency        String        @default("EUR")
  type            PaymentType
  method          PaymentMethod
  status          PaymentStatus @default(PENDING)
  stripeChargeId  String?
  stripeRefundId  String?
  note            String?
  createdAt       DateTime      @default(now())
  processedAt     DateTime?

  booking Booking @relation(fields: [bookingId], references: [id])

  @@index([bookingId, type])
  @@index([status])
}

// ═══════════════════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════════════════

model BookingNote {
  id        String   @id @default(cuid())
  bookingId String
  note      String
  authorId  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Applica migration**

Run:

```bash
npx prisma migrate dev --name v2-bookings-customers-payments
```

Expected: Migration applicata.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): v2 schema - bookings (Booking + source subtypes), customers, payments"
```

---

## Task 9: Schema Prisma — Crew, meteo, OTP, rate limit

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Aggiungi modelli rimanenti**

Aggiungi in fondo a `prisma/schema.prisma`:

```prisma
// ═══════════════════════════════════════════════════════════
// CREW
// ═══════════════════════════════════════════════════════════

enum CrewRole {
  SKIPPER
  CHEF
  HOSTESS
}

model CrewMember {
  id             String   @id @default(cuid())
  name           String
  role           CrewRole
  phone          String?
  email          String?  @unique
  dailyRate      Decimal? @db.Decimal(10, 2)
  certifications Json?
  active         Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  availability CrewAvailability[]
  tripCrew     TripCrew[]
}

enum CrewAvailabilityStatus {
  AVAILABLE
  UNAVAILABLE
  VACATION
}

model CrewAvailability {
  id           String                 @id @default(cuid())
  crewMemberId String
  boatId       String?
  date         DateTime               @db.Date
  status       CrewAvailabilityStatus @default(AVAILABLE)
  note         String?

  crewMember CrewMember @relation(fields: [crewMemberId], references: [id], onDelete: Cascade)
  boat       Boat?      @relation(fields: [boatId], references: [id])

  @@unique([crewMemberId, date])
}

model TripCrew {
  id           String   @id @default(cuid())
  bookingId    String
  crewMemberId String
  role         CrewRole
  hoursWorked  Float?
  cost         Decimal? @db.Decimal(10, 2)
  createdAt    DateTime @default(now())

  booking    Booking    @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  crewMember CrewMember @relation(fields: [crewMemberId], references: [id])

  @@unique([bookingId, crewMemberId])
}

// ═══════════════════════════════════════════════════════════
// METEO
// ═══════════════════════════════════════════════════════════

model WeatherForecastCache {
  id          String   @id @default(cuid())
  date        DateTime @db.Date
  locationKey String
  forecast    Json
  source      String   // OPEN_METEO | STORMGLASS
  fetchedAt   DateTime @default(now())

  @@unique([date, locationKey, source])
  @@index([fetchedAt])
}

enum WeatherGuaranteeType {
  FULL_REFUND
  RESCHEDULE
  CREDIT
}

model WeatherGuaranteeApplication {
  id        String               @id @default(cuid())
  bookingId String
  type      WeatherGuaranteeType
  reason    String
  appliedAt DateTime             @default(now())

  booking Booking @relation(fields: [bookingId], references: [id])
}

// ═══════════════════════════════════════════════════════════
// OTP E RATE LIMIT
// ═══════════════════════════════════════════════════════════

model BookingRecoveryOtp {
  id         String   @id @default(cuid())
  email      String
  codeHash   String
  attempts   Int      @default(0)
  ipAddress  String
  createdAt  DateTime @default(now())
  expiresAt  DateTime
  usedAt     DateTime?

  @@index([email, expiresAt])
}

model BookingRecoverySession {
  id         String   @id @default(cuid())
  email      String
  tokenHash  String   @unique
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())
  expiresAt  DateTime
  revokedAt  DateTime?

  @@index([email])
}

model RateLimitEntry {
  id            String   @id @default(cuid())
  identifier    String   // email | ip | email+ip combo
  scope         String   // OTP_REQUEST | OTP_VERIFY | SENSITIVE_ACTION
  count         Int      @default(0)
  windowStart   DateTime
  windowEnd     DateTime
  blockedUntil  DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([identifier, scope, windowEnd])
  @@index([blockedUntil])
}
```

- [ ] **Step 2: Applica migration**

Run:

```bash
npx prisma migrate dev --name v2-crew-weather-otp-ratelimit
```

Expected: Migration applicata.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): v2 schema - crew, weather, otp, rate limiting"
```

---

## Task 10: Seed nuovo — catalogo + admin

**Files:**
- Rewrite: `prisma/seed.mts`

- [ ] **Step 1: Riscrivi seed.mts**

Sostituisci completamente `prisma/seed.mts`:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@egadisailing.com" },
    update: {},
    create: {
      email: "admin@egadisailing.com",
      passwordHash: adminPassword,
      name: "Admin",
      role: "ADMIN",
    },
  });
  console.log("✓ Admin user");

  // Boats
  const trimarano = await prisma.boat.upsert({
    where: { id: "trimarano" },
    update: {},
    create: {
      id: "trimarano",
      name: "Trimarano Egadisailing",
      type: "TRIMARAN",
      description: "Trimarano luxury 60ft con 3 cabine, cucina, bagno. Perfetto per escursioni e cabin charter settimanali nelle Egadi.",
      length: 18.3,
      year: 2020,
      cabins: 3,
      amenities: {
        beds: 10,
        kitchen: true,
        bathroom: true,
        shower: true,
        wifi: true,
        audio: true,
        snorkeling: true,
        bimini: true,
      },
      images: ["/images/trimarano.webp"],
    },
  });

  const motorboat = await prisma.boat.upsert({
    where: { id: "motoscafo" },
    update: {},
    create: {
      id: "motoscafo",
      name: "Motoscafo Egadisailing",
      type: "MOTORBOAT",
      description: "Motoscafo 10 posti, 200 HP, perfetto per giornate veloci alle Egadi.",
      engineHp: 200,
      amenities: {
        seats: 10,
        shade: true,
        swimLadder: true,
        snorkeling: true,
      },
      images: [],
    },
  });
  console.log("✓ Boats");

  // Services
  const services = [
    {
      id: "social-boating",
      name: "Social Boating",
      type: "SOCIAL_BOATING",
      boatId: trimarano.id,
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 20,
      minPaying: 11,
      defaultPaymentSchedule: "FULL" as const,
      priority: 6,
    },
    {
      id: "exclusive-experience",
      name: "Exclusive Experience",
      type: "EXCLUSIVE_EXPERIENCE",
      boatId: trimarano.id,
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 20,
      defaultPaymentSchedule: "DEPOSIT_BALANCE" as const,
      defaultDepositPercentage: 30,
      priority: 8,
    },
    {
      id: "cabin-charter",
      name: "Cabin Charter",
      type: "CABIN_CHARTER",
      boatId: trimarano.id,
      durationType: "WEEK" as const,
      durationHours: 168,
      capacityMax: 8,
      defaultPaymentSchedule: "DEPOSIT_BALANCE" as const,
      defaultDepositPercentage: 30,
      priority: 10,
    },
    {
      id: "boat-tour",
      name: "Boat Tour",
      type: "BOAT_SHARED",
      boatId: motorboat.id,
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 12,
      defaultPaymentSchedule: "FULL" as const,
      priority: 4,
    },
    {
      id: "boat-exclusive",
      name: "Barca Esclusiva",
      type: "BOAT_EXCLUSIVE",
      boatId: motorboat.id,
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 12,
      defaultPaymentSchedule: "DEPOSIT_BALANCE" as const,
      defaultDepositPercentage: 30,
      priority: 5,
    },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: { id: svc.id },
      update: svc,
      create: svc,
    });
  }
  console.log(`✓ ${services.length} services`);

  // Crew members (placeholder per testing)
  const crew = [
    { name: "Marco Skipper", role: "SKIPPER" as const, phone: "+39 333 1111111", dailyRate: 200 },
    { name: "Chef Giuseppe", role: "CHEF" as const, phone: "+39 333 2222222", dailyRate: 250 },
    { name: "Laura Hostess", role: "HOSTESS" as const, phone: "+39 333 3333333", dailyRate: 150 },
  ];

  for (const c of crew) {
    const existing = await prisma.crewMember.findFirst({ where: { name: c.name } });
    if (!existing) {
      await prisma.crewMember.create({ data: c });
    }
  }
  console.log(`✓ ${crew.length} crew members`);

  // Channel sync status (initial entries)
  const channels = ["DIRECT", "BOKUN", "BOATAROUND", "SAMBOAT", "CLICKANDBOAT", "NAUTAL"];
  for (const ch of channels) {
    await prisma.channelSyncStatus.upsert({
      where: { channel: ch },
      update: {},
      create: { channel: ch, healthStatus: "GREEN" },
    });
  }
  console.log(`✓ ${channels.length} channel sync statuses`);

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Verifica seed**

Run:

```bash
npx prisma db seed
```

Expected: Output con tutti i ✓ e `✅ Seed complete`.

- [ ] **Step 3: Verifica dati**

Run:

```bash
docker exec egadisealing-postgres-1 psql -U egadisailing -d egadisailing -c "SELECT email, name FROM \"User\"; SELECT id, name FROM \"Boat\"; SELECT id, name FROM \"Service\";"
```

Expected: Admin user + 2 boats + 5 services listati.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.mts
git commit -m "feat(db): v2 seed - admin user, boats, services, crew, channel statuses"
```

---

## Task 11: BullMQ connection setup

**Files:**
- Create: `src/lib/queue/index.ts`
- Create: `src/lib/queue/types.ts`

- [ ] **Step 1: Definisci types dei job**

Crea `src/lib/queue/types.ts`:

```typescript
export type SyncJobType =
  | "availability.update"
  | "pricing.bokun.sync"
  | "booking.webhook.process"
  | "otp.cleanup";

export interface AvailabilityUpdateJob {
  boatId: string;
  date: string; // ISO date
  status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
  originBookingId?: string;
  sourceChannel: string;
}

export interface BokunPricingSyncJob {
  pricingPeriodId?: string;
  hotDayRuleId?: string;
  serviceId: string;
  date: string;
  amount: string; // decimal as string
}

export interface BookingWebhookJob {
  channel: "BOKUN" | "BOATAROUND";
  externalBookingId: string;
  rawPayload: Record<string, unknown>;
}

export type JobPayload =
  | AvailabilityUpdateJob
  | BokunPricingSyncJob
  | BookingWebhookJob
  | Record<string, never>;
```

- [ ] **Step 2: Crea connection singleton**

Crea `src/lib/queue/index.ts`:

```typescript
import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { logger } from "@/lib/logger";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
    });
    connection.on("error", (err) => logger.error({ err }, "Redis error"));
    connection.on("connect", () => logger.info("Redis connected"));
  }
  return connection;
}

export function createQueue<T = unknown>(name: string): Queue<T> {
  return new Queue<T>(name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 60_000 }, // 1min, 2min, 4min, 8min, 16min
      removeOnComplete: { count: 1000, age: 7 * 24 * 60 * 60 },
      removeOnFail: { count: 5000 },
    },
  });
}

export function createWorker<T = unknown>(
  name: string,
  processor: Parameters<typeof Worker<T>>[1],
  concurrency = 5,
): Worker<T> {
  const worker = new Worker<T>(name, processor, {
    connection: getRedisConnection(),
    concurrency,
  });
  worker.on("failed", (job, err) =>
    logger.error({ jobId: job?.id, jobName: name, err }, "Job failed"),
  );
  worker.on("completed", (job) =>
    logger.debug({ jobId: job.id, jobName: name }, "Job completed"),
  );
  return worker;
}

export function createQueueEvents(name: string): QueueEvents {
  return new QueueEvents(name, { connection: getRedisConnection() });
}

// Queue instances (lazy getters so test environments don't always spin them up)
let _syncQueue: Queue | null = null;
export function syncQueue(): Queue {
  if (!_syncQueue) _syncQueue = createQueue("sync");
  return _syncQueue;
}
```

- [ ] **Step 3: Verifica connection**

Crea file temporaneo `src/lib/queue/test-connection.ts`:

```typescript
import { getRedisConnection } from "./index";

async function main() {
  const conn = getRedisConnection();
  const pong = await conn.ping();
  console.log("Redis ping:", pong);
  await conn.quit();
}

main().catch(console.error);
```

Run: `npx tsx src/lib/queue/test-connection.ts`
Expected: `Redis ping: PONG`

- [ ] **Step 4: Rimuovi file di test**

Run: `rm src/lib/queue/test-connection.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/queue/
git commit -m "feat(queue): bullmq connection, queue/worker factories, job types"
```

---

## Task 12: Audit log helper

**Files:**
- Create: `src/lib/audit/log.ts`

- [ ] **Step 1: Crea helper audit**

Crea `src/lib/audit/log.ts`:

```typescript
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface AuditEntry {
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        before: entry.before as never,
        after: entry.after as never,
        ip: entry.ip,
        userAgent: entry.userAgent,
      },
    });
  } catch (err) {
    // Non blocchiamo mai il flusso principale se il log fallisce
    logger.error({ err, entry }, "Failed to write audit log");
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/audit/
git commit -m "feat(audit): add AuditLog helper with non-blocking failure"
```

---

## Task 13: Rate limiter (DB-backed)

**Files:**
- Create: `src/lib/rate-limit/service.ts`
- Create: `src/lib/rate-limit/otp-limits.ts`

- [ ] **Step 1: Crea service generico**

Crea `src/lib/rate-limit/service.ts`:

```typescript
import { db } from "@/lib/db";
import { RateLimitError } from "@/lib/errors";

export interface RateLimitConfig {
  identifier: string;
  scope: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitCheck {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitCheck> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + config.windowSeconds * 1000);

  // Trova eventuale finestra attiva per questo identifier+scope
  const existing = await db.rateLimitEntry.findFirst({
    where: {
      identifier: config.identifier,
      scope: config.scope,
      windowEnd: { gt: now },
    },
    orderBy: { windowStart: "desc" },
  });

  // Blocco permanente attivo
  if (existing?.blockedUntil && existing.blockedUntil > now) {
    const retryAfter = Math.ceil((existing.blockedUntil.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.blockedUntil,
      retryAfterSeconds: retryAfter,
    };
  }

  if (existing && existing.count >= config.limit) {
    const retryAfter = Math.ceil((existing.windowEnd.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.windowEnd,
      retryAfterSeconds: retryAfter,
    };
  }

  if (existing) {
    await db.rateLimitEntry.update({
      where: { id: existing.id },
      data: { count: { increment: 1 } },
    });
    return {
      allowed: true,
      remaining: config.limit - existing.count - 1,
      resetAt: existing.windowEnd,
    };
  }

  await db.rateLimitEntry.create({
    data: {
      identifier: config.identifier,
      scope: config.scope,
      count: 1,
      windowStart: now,
      windowEnd,
    },
  });

  return {
    allowed: true,
    remaining: config.limit - 1,
    resetAt: windowEnd,
  };
}

export async function enforceRateLimit(config: RateLimitConfig): Promise<void> {
  const result = await checkRateLimit(config);
  if (!result.allowed) {
    throw new RateLimitError(result.retryAfterSeconds ?? 60, {
      identifier: config.identifier,
      scope: config.scope,
    });
  }
}

export async function blockIdentifier(
  identifier: string,
  scope: string,
  durationSeconds: number,
): Promise<void> {
  const now = new Date();
  const blockedUntil = new Date(now.getTime() + durationSeconds * 1000);

  const existing = await db.rateLimitEntry.findFirst({
    where: { identifier, scope, windowEnd: { gt: now } },
    orderBy: { windowStart: "desc" },
  });

  if (existing) {
    await db.rateLimitEntry.update({
      where: { id: existing.id },
      data: { blockedUntil },
    });
  } else {
    await db.rateLimitEntry.create({
      data: {
        identifier,
        scope,
        count: 1,
        windowStart: now,
        windowEnd: blockedUntil,
        blockedUntil,
      },
    });
  }
}
```

- [ ] **Step 2: Crea config OTP**

Crea `src/lib/rate-limit/otp-limits.ts`:

```typescript
import { enforceRateLimit, blockIdentifier } from "./service";

export const OTP_LIMITS = {
  requestPerEmailHour: 3,
  requestPerEmailDay: 5,
  requestPerIpHour: 10,
  requestPerIpDay: 30,
  requestPerEmailIpHour: 2,
  requestBurstSeconds: 30,
  verifyAttemptsPerCode: 3,
  verifyPerEmailHour: 10,
  verifyPerIpHour: 20,
} as const;

export async function enforceOtpRequestLimit(email: string, ip: string): Promise<void> {
  await enforceRateLimit({
    identifier: email,
    scope: "OTP_REQUEST_EMAIL_HOUR",
    limit: OTP_LIMITS.requestPerEmailHour,
    windowSeconds: 60 * 60,
  });
  await enforceRateLimit({
    identifier: email,
    scope: "OTP_REQUEST_EMAIL_DAY",
    limit: OTP_LIMITS.requestPerEmailDay,
    windowSeconds: 24 * 60 * 60,
  });
  await enforceRateLimit({
    identifier: ip,
    scope: "OTP_REQUEST_IP_HOUR",
    limit: OTP_LIMITS.requestPerIpHour,
    windowSeconds: 60 * 60,
  });
  await enforceRateLimit({
    identifier: ip,
    scope: "OTP_REQUEST_IP_DAY",
    limit: OTP_LIMITS.requestPerIpDay,
    windowSeconds: 24 * 60 * 60,
  });
  await enforceRateLimit({
    identifier: `${email}|${ip}`,
    scope: "OTP_REQUEST_EMAILIP_HOUR",
    limit: OTP_LIMITS.requestPerEmailIpHour,
    windowSeconds: 60 * 60,
  });
  await enforceRateLimit({
    identifier: `${email}|${ip}`,
    scope: "OTP_REQUEST_BURST",
    limit: 1,
    windowSeconds: OTP_LIMITS.requestBurstSeconds,
  });
}

export async function enforceOtpVerifyLimit(email: string, ip: string): Promise<void> {
  await enforceRateLimit({
    identifier: email,
    scope: "OTP_VERIFY_EMAIL_HOUR",
    limit: OTP_LIMITS.verifyPerEmailHour,
    windowSeconds: 60 * 60,
  });
  await enforceRateLimit({
    identifier: ip,
    scope: "OTP_VERIFY_IP_HOUR",
    limit: OTP_LIMITS.verifyPerIpHour,
    windowSeconds: 60 * 60,
  });
}

export async function blockEmail(email: string, durationSeconds: number): Promise<void> {
  await blockIdentifier(email, "OTP_BLOCK_EMAIL", durationSeconds);
}

export async function blockIp(ip: string, durationSeconds: number): Promise<void> {
  await blockIdentifier(ip, "OTP_BLOCK_IP", durationSeconds);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/rate-limit/
git commit -m "feat(rate-limit): DB-backed rate limiter with OTP-specific config"
```

---

## Task 14: Availability service con fan-out

**Files:**
- Create: `src/lib/availability/service.ts`
- Create: `src/lib/availability/fan-out.ts`
- Create: `src/lib/availability/idempotency.ts`

- [ ] **Step 1: Crea idempotency checker**

Crea `src/lib/availability/idempotency.ts`:

```typescript
import { db } from "@/lib/db";

/**
 * Verifica se un aggiornamento di availability è un "eco" di uno che abbiamo appena
 * inviato noi stessi (per prevenire loop infiniti).
 *
 * Se lastSyncedSource matcha la source in arrivo e lastSyncedAt è recente (< windowSeconds),
 * consideriamo l'update come self-echo e restituiamo true (= da ignorare).
 */
export async function isSelfEcho(
  boatId: string,
  date: Date,
  incomingSource: string,
  windowSeconds = 120,
): Promise<boolean> {
  const availability = await db.boatAvailability.findUnique({
    where: { boatId_date: { boatId, date } },
  });

  if (!availability) return false;
  if (availability.lastSyncedSource !== incomingSource) return false;
  if (!availability.lastSyncedAt) return false;

  const ageSeconds = (Date.now() - availability.lastSyncedAt.getTime()) / 1000;
  return ageSeconds < windowSeconds;
}
```

- [ ] **Step 2: Crea fan-out logic**

Crea `src/lib/availability/fan-out.ts`:

```typescript
import { syncQueue } from "@/lib/queue";
import { logger } from "@/lib/logger";

export type TargetChannel =
  | "BOKUN"
  | "BOATAROUND"
  | "SAMBOAT_ICAL"
  | "CLICKANDBOAT_MANUAL"
  | "NAUTAL_MANUAL";

const ALL_CHANNELS: TargetChannel[] = [
  "BOKUN",
  "BOATAROUND",
  "SAMBOAT_ICAL",
  "CLICKANDBOAT_MANUAL",
  "NAUTAL_MANUAL",
];

export interface FanOutOptions {
  boatId: string;
  date: string; // ISO
  status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
  sourceChannel: string; // canale che ha originato l'update (viene escluso dal fan-out)
  originBookingId?: string;
}

/**
 * Distribuisce un cambio di availability a tutti i canali esterni,
 * escludendo la source che l'ha originato.
 */
export async function fanOutAvailability(opts: FanOutOptions): Promise<void> {
  const targets = ALL_CHANNELS.filter((ch) => ch !== opts.sourceChannel);

  for (const target of targets) {
    await syncQueue().add(
      "availability.update",
      {
        targetChannel: target,
        operation: "AVAILABILITY_UPDATE",
        payload: {
          boatId: opts.boatId,
          date: opts.date,
          status: opts.status,
          originBookingId: opts.originBookingId,
        },
      },
      {
        jobId: `availability-${opts.boatId}-${opts.date}-${target}`,
        priority: 1,
      },
    );
  }

  logger.info(
    {
      boatId: opts.boatId,
      date: opts.date,
      targets,
      source: opts.sourceChannel,
    },
    "Availability fan-out queued",
  );
}
```

- [ ] **Step 3: Crea service principale**

Crea `src/lib/availability/service.ts`:

```typescript
import { db } from "@/lib/db";
import type { AvailabilityStatus } from "@prisma/client";
import { fanOutAvailability } from "./fan-out";
import { isSelfEcho } from "./idempotency";
import { logger } from "@/lib/logger";

export interface UpdateAvailabilityInput {
  boatId: string;
  date: Date;
  status: AvailabilityStatus;
  sourceChannel: string;
  lockedByBookingId?: string;
  skipFanOut?: boolean;
}

/**
 * Aggiorna BoatAvailability e (a meno di skipFanOut) triggera fan-out ai canali.
 * Usa isSelfEcho per evitare loop.
 */
export async function updateAvailability(input: UpdateAvailabilityInput): Promise<void> {
  const dateOnly = new Date(
    Date.UTC(input.date.getUTCFullYear(), input.date.getUTCMonth(), input.date.getUTCDate()),
  );

  if (await isSelfEcho(input.boatId, dateOnly, input.sourceChannel)) {
    logger.debug(
      { boatId: input.boatId, date: dateOnly, source: input.sourceChannel },
      "Self-echo detected, skipping availability update",
    );
    return;
  }

  await db.boatAvailability.upsert({
    where: { boatId_date: { boatId: input.boatId, date: dateOnly } },
    update: {
      status: input.status,
      lockedByBookingId: input.lockedByBookingId ?? null,
      lastSyncedSource: input.sourceChannel,
      lastSyncedAt: new Date(),
    },
    create: {
      boatId: input.boatId,
      date: dateOnly,
      status: input.status,
      lockedByBookingId: input.lockedByBookingId ?? null,
      lastSyncedSource: input.sourceChannel,
      lastSyncedAt: new Date(),
    },
  });

  if (!input.skipFanOut) {
    await fanOutAvailability({
      boatId: input.boatId,
      date: dateOnly.toISOString().slice(0, 10),
      status: input.status,
      sourceChannel: input.sourceChannel,
      originBookingId: input.lockedByBookingId,
    });
  }
}

export async function blockDates(
  boatId: string,
  startDate: Date,
  endDate: Date,
  sourceChannel: string,
  lockedByBookingId?: string,
): Promise<void> {
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    await updateAvailability({
      boatId,
      date: new Date(cursor),
      status: "BLOCKED",
      sourceChannel,
      lockedByBookingId,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

export async function releaseDates(
  boatId: string,
  startDate: Date,
  endDate: Date,
  sourceChannel: string,
): Promise<void> {
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    await updateAvailability({
      boatId,
      date: new Date(cursor),
      status: "AVAILABLE",
      sourceChannel,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/availability/
git commit -m "feat(availability): service, fan-out, idempotency (self-echo detection)"
```

---

## Task 15: Pricing engine con hot days

**Files:**
- Create: `src/lib/pricing/rounding.ts`
- Create: `src/lib/pricing/hot-days.ts`
- Create: `src/lib/pricing/service.ts`

- [ ] **Step 1: Rounding helper**

Crea `src/lib/pricing/rounding.ts`:

```typescript
/**
 * Arrotonda un numero per eccesso al multiplo più vicino.
 * roundUpTo(187.5, 10) === 190
 * roundUpTo(2990, 50) === 3000
 */
export function roundUpTo(value: number, multiple: number): number {
  if (multiple <= 0) return value;
  return Math.ceil(value / multiple) * multiple;
}
```

- [ ] **Step 2: Hot day engine**

Crea `src/lib/pricing/hot-days.ts`:

```typescript
import { db } from "@/lib/db";
import Decimal from "decimal.js";
import { roundUpTo } from "./rounding";

export interface HotDayResult {
  applied: boolean;
  multiplier: number;
  absolutePrice?: number;
  roundTo: number;
  ruleName?: string;
  source: "NONE" | "RULE" | "OVERRIDE";
}

/**
 * Valuta quale hot day (se esiste) si applica a questa data/servizio.
 * - Override manuale (stessa data + serviceId) ha priorità assoluta
 * - Altrimenti rule attiva con priority più alta
 */
export async function resolveHotDay(
  date: Date,
  serviceId: string,
): Promise<HotDayResult> {
  const dateOnly = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  // 1. Override per il servizio specifico
  const specificOverride = await db.hotDayOverride.findUnique({
    where: { date_serviceId: { date: dateOnly, serviceId } },
  });
  if (specificOverride) {
    return {
      applied: true,
      multiplier: specificOverride.multiplier?.toNumber() ?? 1,
      absolutePrice: specificOverride.absolutePrice?.toNumber(),
      roundTo: specificOverride.roundTo,
      source: "OVERRIDE",
    };
  }

  // 2. Override globale (serviceId null)
  const globalOverride = await db.hotDayOverride.findFirst({
    where: { date: dateOnly, serviceId: null },
  });
  if (globalOverride) {
    return {
      applied: true,
      multiplier: globalOverride.multiplier?.toNumber() ?? 1,
      absolutePrice: globalOverride.absolutePrice?.toNumber(),
      roundTo: globalOverride.roundTo,
      source: "OVERRIDE",
    };
  }

  // 3. Rule attive che coprono questa data
  const weekday = dateOnly.getUTCDay();
  const rules = await db.hotDayRule.findMany({
    where: {
      active: true,
      dateRangeStart: { lte: dateOnly },
      dateRangeEnd: { gte: dateOnly },
    },
    orderBy: { priority: "desc" },
  });

  for (const rule of rules) {
    if (rule.weekdays.length === 0 || rule.weekdays.includes(weekday)) {
      return {
        applied: true,
        multiplier: rule.multiplier.toNumber(),
        roundTo: rule.roundTo,
        ruleName: rule.name,
        source: "RULE",
      };
    }
  }

  return { applied: false, multiplier: 1, roundTo: 1, source: "NONE" };
}

/**
 * Applica un hot day result a un prezzo base e arrotonda.
 */
export function applyHotDay(basePrice: number | Decimal, hotDay: HotDayResult): number {
  const base = new Decimal(basePrice);
  if (!hotDay.applied) return base.toNumber();

  if (hotDay.absolutePrice !== undefined) {
    return roundUpTo(hotDay.absolutePrice, hotDay.roundTo);
  }

  const raw = base.mul(hotDay.multiplier).toNumber();
  return roundUpTo(raw, hotDay.roundTo);
}
```

- [ ] **Step 3: Pricing service**

Crea `src/lib/pricing/service.ts`:

```typescript
import { db } from "@/lib/db";
import { resolveHotDay, applyHotDay } from "./hot-days";
import { NotFoundError } from "@/lib/errors";

export interface PriceQuote {
  basePricePerPerson: number;
  finalPricePerPerson: number;
  hotDayApplied: boolean;
  hotDayMultiplier: number;
  hotDaySource: string;
  totalPrice: number;
}

/**
 * Calcola il prezzo finale per una combinazione servizio+data+persone
 * considerando prezzo stagionale base + hot day.
 */
export async function quotePrice(
  serviceId: string,
  date: Date,
  numPeople: number,
): Promise<PriceQuote> {
  const dateOnly = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  const period = await db.pricingPeriod.findFirst({
    where: {
      serviceId,
      startDate: { lte: dateOnly },
      endDate: { gte: dateOnly },
    },
    orderBy: { startDate: "desc" },
  });

  if (!period) {
    throw new NotFoundError("PricingPeriod", `${serviceId} @ ${dateOnly.toISOString()}`);
  }

  const basePrice = period.pricePerPerson.toNumber();
  const hotDay = await resolveHotDay(dateOnly, serviceId);
  const finalPrice = applyHotDay(basePrice, hotDay);

  return {
    basePricePerPerson: basePrice,
    finalPricePerPerson: finalPrice,
    hotDayApplied: hotDay.applied,
    hotDayMultiplier: hotDay.multiplier,
    hotDaySource: hotDay.source,
    totalPrice: finalPrice * numPeople,
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/pricing/
git commit -m "feat(pricing): engine with base pricing periods + hot day rules + overrides"
```

---

## Task 16: Verifica finale build

**Files:**
- Nessuno (solo controllo)

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: Nessun errore.

- [ ] **Step 2: Verifica Prisma studio**

Run: `npx prisma studio --port 5556 &` (in background)
Controlla nel browser `http://localhost:5556` che tutte le tabelle siano presenti e popolate con seed data.
Poi kill: `kill %1`

- [ ] **Step 3: Smoke test delle librerie**

Crea file temporaneo `scripts/smoke-test-lib.ts`:

```typescript
import { db } from "@/lib/db";
import { quotePrice } from "@/lib/pricing/service";
import { updateAvailability } from "@/lib/availability/service";
import { checkRateLimit } from "@/lib/rate-limit/service";
import { auditLog } from "@/lib/audit/log";

async function main() {
  console.log("→ Count services:", await db.service.count());
  console.log("→ Count boats:", await db.boat.count());

  // Rate limit test
  const rl = await checkRateLimit({
    identifier: "test@example.com",
    scope: "SMOKE_TEST",
    limit: 5,
    windowSeconds: 60,
  });
  console.log("→ Rate limit check:", rl);

  // Audit log test
  await auditLog({
    action: "SMOKE_TEST",
    entity: "System",
    entityId: "smoke-test-1",
    after: { ok: true },
  });
  console.log("→ Audit log written");

  // Availability (senza fan-out per smoke)
  await updateAvailability({
    boatId: "trimarano",
    date: new Date("2026-07-15"),
    status: "AVAILABLE",
    sourceChannel: "SMOKE_TEST",
    skipFanOut: true,
  });
  console.log("→ Availability updated");

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Assicurati che `package.json` abbia uno script `"scripts": { "smoke": "tsx scripts/smoke-test-lib.ts" }` o usa direttamente:

Run: `npx tsx scripts/smoke-test-lib.ts`
Expected: Tutti i `→` stampati senza errori.

- [ ] **Step 4: Rimuovi smoke script**

Run: `rm scripts/smoke-test-lib.ts`

- [ ] **Step 5: Commit finale**

```bash
git status
```
Expected: working tree clean.

---

## Riferimenti

- Spec: `docs/superpowers/specs/2026-04-17-platform-v2-design.md`
- Plan 2 (prossimo): Sito proprietario + Stripe checkout + OTP
- Plan 3: Bokun integration
- Plan 4: Charter integrations
- Plan 5: Dashboard admin completa
- Plan 6: Weather system + notifiche + testing E2E

---

## Self-review

- [x] **Spec coverage**: tutti i modelli dello spec sono in schema (catalogo, prezzi, disponibilità, prenotazioni, pagamenti, crew, meteo, OTP, rate limit, audit, sync queue). Infrastruttura base (Redis, BullMQ, Pino, error hierarchy) presente.
- [x] **Placeholder scan**: nessun TBD/TODO, tutti i blocchi codice completi.
- [x] **Type consistency**: enum `BookingSource`, `PaymentMethod`, `AvailabilityStatus` usati coerentemente. `sourceChannel` (string) vs `targetChannel` (TargetChannel) distinti volutamente per supportare sia webhook di terze parti che destinazioni nostre.
- [x] **Side notes**: fan-out usa job id deterministico (`availability-${boatId}-${date}-${target}`) per deduplicazione automatica BullMQ se arrivano burst di update sulla stessa cella.
