# Plan 1: Setup Progetto + Database + Auth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creare il progetto Next.js con Docker Compose (app + PostgreSQL), Prisma ORM con lo schema completo, autenticazione admin con NextAuth.js, e struttura base i18n con next-intl.

**Architecture:** Monolith Next.js App Router con PostgreSQL via Prisma. Docker Compose orchestra i due servizi (next-app e postgres). Nginx sulla VPS fa reverse proxy verso il container Next.js. Auth via NextAuth.js v5 con credentials provider per accesso admin/staff.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, NextAuth.js v5, next-intl, Docker, Docker Compose

**Spec di riferimento:** `docs/superpowers/specs/2026-04-10-egadisailing-platform-design.md`

---

## File Structure

```
egadisailing/
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── .env
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── lib/
│   │   ├── db.ts
│   │   └── auth.ts
│   ├── i18n/
│   │   ├── request.ts
│   │   ├── routing.ts
│   │   └── messages/
│   │       ├── it.json
│   │       └── en.json
│   ├── components/
│   │   └── ui/           (shadcn/ui components)
│   └── middleware.ts
├── tests/
│   ├── setup.ts
│   ├── lib/
│   │   ├── db.test.ts
│   │   └── auth.test.ts
│   └── api/
│       └── auth.test.ts
```

---

### Task 1: Inizializzazione progetto Next.js

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: Crea il progetto Next.js**

```bash
cd /home/akasama/Scrivania/egadisealing
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Quando chiede le opzioni:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- src/ directory: Yes
- App Router: Yes
- import alias: `@/*`

- [ ] **Step 2: Verifica che il progetto si avvia**

```bash
npm run dev
```

Expected: Server avviato su http://localhost:3000, pagina default Next.js visibile.

- [ ] **Step 3: Commit**

```bash
git init
git add .
git commit -m "chore: init Next.js 15 project with TypeScript, Tailwind, App Router"
```

---

### Task 2: Docker Compose + Dockerfile

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env`, `.env.example`

- [ ] **Step 1: Crea `.env.example`**

```env
# Database
POSTGRES_USER=egadisailing
POSTGRES_PASSWORD=changeme
POSTGRES_DB=egadisailing
DATABASE_URL=postgresql://egadisailing:changeme@postgres:5432/egadisailing

# NextAuth
NEXTAUTH_SECRET=changeme-generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

# Stripe (futuro)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Brevo (futuro)
BREVO_API_KEY=
```

- [ ] **Step 2: Crea `.env` copiando `.env.example`**

```bash
cp .env.example .env
```

Modifica `.env` con valori reali per lo sviluppo locale.

- [ ] **Step 3: Crea `.dockerignore`**

```
node_modules
.next
.git
*.md
.env.local
```

- [ ] **Step 4: Crea `Dockerfile` (multi-stage)**

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 5: Aggiungi `output: "standalone"` a `next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 6: Crea `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  next-app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
```

- [ ] **Step 7: Testa Docker Compose in dev (solo postgres per ora)**

```bash
docker compose up postgres -d
```

Expected: Container postgres avviato e healthy.

```bash
docker compose ps
```

Expected: postgres running, healthy.

- [ ] **Step 8: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore .env.example
git commit -m "chore: add Docker Compose with PostgreSQL and multi-stage Dockerfile"
```

Nota: `.env` NON va committato (aggiungilo a `.gitignore`).

---

### Task 3: Prisma + Schema Database

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`
- Modify: `package.json` (aggiunta dipendenze)

- [ ] **Step 1: Installa Prisma**

```bash
npm install prisma --save-dev
npm install @prisma/client
```

- [ ] **Step 2: Inizializza Prisma**

```bash
npx prisma init
```

Questo crea `prisma/schema.prisma` e aggiorna `.env` con `DATABASE_URL`.

- [ ] **Step 3: Scrivi lo schema completo in `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  STAFF
}

enum ServiceType {
  SOCIAL_BOATING
  EXCLUSIVE_EXPERIENCE
  CABIN_CHARTER
  BOAT_SHARED
  BOAT_EXCLUSIVE
}

enum TripStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
}

enum BookingStatus {
  CONFIRMED
  PENDING
  CANCELLED
  REFUNDED
}

enum BookingChannel {
  WEBSITE
  GET_YOUR_GUIDE
  AIRBNB
  CLICK_AND_BOAT
  MUSEMENT
  VIATOR
  SAMBOAT
  MANUAL
}

enum CrewRole {
  SKIPPER
  CHEF
  HOSTESS
}

enum DurationType {
  FULL_DAY
  HALF_DAY_MORNING
  WEEK
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String
  role         UserRole @default(STAFF)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Service {
  id            String      @id @default(cuid())
  name          String
  type          ServiceType
  description   Json        // Multilingua: { "it": "...", "en": "...", ... }
  durationType  DurationType @map("duration_type")
  durationHours Int         @map("duration_hours")
  capacityMax   Int         @map("capacity_max")
  minPaying     Int?        @map("min_paying")
  boatId        String?     @map("boat_id")
  active        Boolean     @default(true)
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  boat           Boat?          @relation(fields: [boatId], references: [id])
  pricingPeriods PricingPeriod[]
  trips          Trip[]

  @@map("services")
}

model Boat {
  id          String  @id @default(cuid())
  name        String
  type        String  // "trimaran", "motorboat", etc.
  length      Float?
  year        Int?
  description Json?   // Multilingua
  amenities   Json?   // Multilingua: lista dotazioni
  images      Json?   // Array di URL immagini
  cabins      Int?    // Numero cabine (per cabin charter)
  active      Boolean @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  services Service[]

  @@map("boats")
}

model PricingPeriod {
  id              String   @id @default(cuid())
  serviceId       String   @map("service_id")
  label           String   // "bassa", "media", "alta", "ferragosto"
  startDate       DateTime @map("start_date")
  endDate         DateTime @map("end_date")
  pricePerPerson  Decimal  @map("price_per_person") @db.Decimal(10, 2)
  year            Int
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@map("pricing_periods")
}

model Trip {
  id              String     @id @default(cuid())
  serviceId       String     @map("service_id")
  date            DateTime   @db.Date
  departureTime   String     @map("departure_time") // "09:00"
  returnTime      String     @map("return_time")    // "17:00"
  status          TripStatus @default(SCHEDULED)
  availableSpots  Int        @map("available_spots")
  notes           String?
  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt @map("updated_at")

  service  Service    @relation(fields: [serviceId], references: [id])
  bookings Booking[]
  crew     TripCrew[]

  @@map("trips")
}

model Booking {
  id              String        @id @default(cuid())
  tripId          String        @map("trip_id")
  customerId      String        @map("customer_id")
  numPeople       Int           @map("num_people")
  totalPrice      Decimal       @map("total_price") @db.Decimal(10, 2)
  status          BookingStatus @default(PENDING)
  channel         BookingChannel @default(WEBSITE)
  stripePaymentId String?       @map("stripe_payment_id")
  cabinNumber     Int?          @map("cabin_number") // Per cabin charter
  notes           String?
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  trip     Trip     @relation(fields: [tripId], references: [id])
  customer Customer @relation(fields: [customerId], references: [id])

  @@map("bookings")
}

model Customer {
  id          String   @id @default(cuid())
  name        String
  email       String   @unique
  phone       String?
  nationality String?
  language    String?  @default("it")
  notes       String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  bookings Booking[]

  @@map("customers")
}

model CrewMember {
  id        String   @id @default(cuid())
  name      String
  role      CrewRole
  phone     String?
  email     String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  trips TripCrew[]

  @@map("crew_members")
}

model TripCrew {
  id           String @id @default(cuid())
  tripId       String @map("trip_id")
  crewMemberId String @map("crew_member_id")

  trip       Trip       @relation(fields: [tripId], references: [id], onDelete: Cascade)
  crewMember CrewMember @relation(fields: [crewMemberId], references: [id])

  @@unique([tripId, crewMemberId])
  @@map("trip_crew")
}

model PortalSync {
  id        String   @id @default(cuid())
  portal    String   // "getyourguide", "airbnb", "clickandboat", etc.
  lastSync  DateTime? @map("last_sync")
  status    String   @default("idle") // "idle", "syncing", "success", "error"
  errorLog  String?  @map("error_log")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("portal_syncs")
}
```

- [ ] **Step 4: Crea `src/lib/db.ts` — Prisma client singleton**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 5: Esegui la prima migration**

Assicurati che il container PostgreSQL sia avviato:

```bash
docker compose up postgres -d
```

Aggiorna `DATABASE_URL` in `.env` per puntare al container locale:

```
DATABASE_URL=postgresql://egadisailing:changeme@localhost:5432/egadisailing
```

Esegui la migration:

```bash
npx prisma migrate dev --name init
```

Expected: Migration creata in `prisma/migrations/`, schema applicato al database.

- [ ] **Step 6: Verifica con Prisma Studio**

```bash
npx prisma studio
```

Expected: Browser si apre su http://localhost:5555, tutte le tabelle visibili e vuote.

- [ ] **Step 7: Commit**

```bash
git add prisma/ src/lib/db.ts package.json package-lock.json
git commit -m "feat: add Prisma schema with all entities and initial migration"
```

---

### Task 4: Seed Database

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (aggiunta script seed)

- [ ] **Step 1: Installa ts-node e tsconfig-paths**

```bash
npm install tsx --save-dev
```

- [ ] **Step 2: Aggiungi script seed in `package.json`**

Aggiungi nel `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 3: Crea `prisma/seed.ts`**

```typescript
import { PrismaClient, UserRole, ServiceType, CrewRole, DurationType } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const adminPassword = await hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@egadisailing.com" },
    update: {},
    create: {
      email: "admin@egadisailing.com",
      passwordHash: adminPassword,
      name: "Admin",
      role: UserRole.ADMIN,
    },
  });

  // Boats
  const trimaran = await prisma.boat.upsert({
    where: { id: "trimaran-main" },
    update: {},
    create: {
      id: "trimaran-main",
      name: "Trimarano Egadisailing",
      type: "trimaran",
      cabins: 3,
      description: {
        it: "Il nostro trimarano di lusso per esperienze indimenticabili nelle Egadi",
        en: "Our luxury trimaran for unforgettable Egadi experiences",
      },
      amenities: {
        it: ["Doccia", "Frigo", "Casse audio", "Zona ombra", "Attrezzatura snorkeling"],
        en: ["Shower", "Fridge", "Speakers", "Shaded area", "Snorkeling gear"],
      },
    },
  });

  const boat = await prisma.boat.upsert({
    where: { id: "boat-main" },
    update: {},
    create: {
      id: "boat-main",
      name: "Barca Egadisailing",
      type: "motorboat",
      description: {
        it: "La nostra barca per tour giornalieri alle Egadi",
        en: "Our boat for daily Egadi tours",
      },
    },
  });

  // Services
  const socialBoating = await prisma.service.upsert({
    where: { id: "social-boating" },
    update: {},
    create: {
      id: "social-boating",
      name: "Social Boating",
      type: ServiceType.SOCIAL_BOATING,
      description: {
        it: "Sali a bordo, il mare delle Egadi ti aspetta. Navigazione, tuffi in acque cristalline e pranzo di pesce fresco preparato dal nostro chef.",
        en: "Come aboard, the Egadi sea awaits you. Sailing, swimming in crystal clear waters and fresh fish lunch prepared by our chef.",
      },
      durationType: DurationType.FULL_DAY,
      durationHours: 8,
      capacityMax: 20,
      minPaying: 11,
      boatId: trimaran.id,
    },
  });

  const exclusive = await prisma.service.upsert({
    where: { id: "exclusive-experience" },
    update: {},
    create: {
      id: "exclusive-experience",
      name: "Exclusive Experience",
      type: ServiceType.EXCLUSIVE_EXPERIENCE,
      description: {
        it: "Un'esperienza riservata a te e ai tuoi ospiti. Chef rinomato, rotta personalizzata, lusso senza compromessi.",
        en: "An experience reserved for you and your guests. Renowned chef, customized route, uncompromised luxury.",
      },
      durationType: DurationType.FULL_DAY,
      durationHours: 8,
      capacityMax: 20,
      minPaying: null,
      boatId: trimaran.id,
    },
  });

  const cabinCharter = await prisma.service.upsert({
    where: { id: "cabin-charter" },
    update: {},
    create: {
      id: "cabin-charter",
      name: "Cabin Charter",
      type: ServiceType.CABIN_CHARTER,
      description: {
        it: "Una settimana tra Favignana, Levanzo e Marettimo. La tua casa è il mare.",
        en: "A week between Favignana, Levanzo and Marettimo. Your home is the sea.",
      },
      durationType: DurationType.WEEK,
      durationHours: 168,
      capacityMax: 8,
      minPaying: null,
      boatId: trimaran.id,
    },
  });

  const boatSharedFull = await prisma.service.upsert({
    where: { id: "boat-shared-full" },
    update: {},
    create: {
      id: "boat-shared-full",
      name: "Boat Tour Condiviso - Giornata",
      type: ServiceType.BOAT_SHARED,
      description: {
        it: "Tour in barca condivisa per una giornata intera alle Isole Egadi.",
        en: "Shared boat tour for a full day to the Egadi Islands.",
      },
      durationType: DurationType.FULL_DAY,
      durationHours: 8,
      capacityMax: 12,
      minPaying: null,
      boatId: boat.id,
    },
  });

  const boatSharedMorning = await prisma.service.upsert({
    where: { id: "boat-shared-morning" },
    update: {},
    create: {
      id: "boat-shared-morning",
      name: "Boat Tour Condiviso - Mattina",
      type: ServiceType.BOAT_SHARED,
      description: {
        it: "Tour in barca condivisa per la mattina alle Isole Egadi.",
        en: "Shared boat tour for the morning to the Egadi Islands.",
      },
      durationType: DurationType.HALF_DAY_MORNING,
      durationHours: 4,
      capacityMax: 12,
      minPaying: null,
      boatId: boat.id,
    },
  });

  const boatExclusiveFull = await prisma.service.upsert({
    where: { id: "boat-exclusive-full" },
    update: {},
    create: {
      id: "boat-exclusive-full",
      name: "Boat Tour Esclusivo - Giornata",
      type: ServiceType.BOAT_EXCLUSIVE,
      description: {
        it: "Tour in barca esclusiva per una giornata intera alle Isole Egadi.",
        en: "Exclusive boat tour for a full day to the Egadi Islands.",
      },
      durationType: DurationType.FULL_DAY,
      durationHours: 8,
      capacityMax: 12,
      minPaying: null,
      boatId: boat.id,
    },
  });

  const boatExclusiveMorning = await prisma.service.upsert({
    where: { id: "boat-exclusive-morning" },
    update: {},
    create: {
      id: "boat-exclusive-morning",
      name: "Boat Tour Esclusivo - Mattina",
      type: ServiceType.BOAT_EXCLUSIVE,
      description: {
        it: "Tour in barca esclusiva per la mattina alle Isole Egadi.",
        en: "Exclusive boat tour for the morning to the Egadi Islands.",
      },
      durationType: DurationType.HALF_DAY_MORNING,
      durationHours: 4,
      capacityMax: 12,
      minPaying: null,
      boatId: boat.id,
    },
  });

  // Pricing periods 2026 - Social Boating
  const pricingData = [
    { serviceId: socialBoating.id, label: "bassa", start: "2026-05-01", end: "2026-05-31", price: 120 },
    { serviceId: socialBoating.id, label: "media", start: "2026-06-01", end: "2026-07-15", price: 135 },
    { serviceId: socialBoating.id, label: "alta", start: "2026-07-16", end: "2026-08-31", price: 150 },
    { serviceId: socialBoating.id, label: "settembre", start: "2026-09-01", end: "2026-10-31", price: 120 },
    // Boat Shared Full Day
    { serviceId: boatSharedFull.id, label: "bassa", start: "2026-05-01", end: "2026-05-31", price: 75 },
    { serviceId: boatSharedFull.id, label: "media", start: "2026-06-01", end: "2026-07-15", price: 85 },
    { serviceId: boatSharedFull.id, label: "alta", start: "2026-07-16", end: "2026-08-31", price: 100 },
    { serviceId: boatSharedFull.id, label: "settembre", start: "2026-09-01", end: "2026-10-31", price: 75 },
    // Boat Shared Morning
    { serviceId: boatSharedMorning.id, label: "bassa", start: "2026-05-01", end: "2026-05-31", price: 60 },
    { serviceId: boatSharedMorning.id, label: "media", start: "2026-06-01", end: "2026-07-15", price: 75 },
    { serviceId: boatSharedMorning.id, label: "alta", start: "2026-07-16", end: "2026-08-31", price: 90 },
    { serviceId: boatSharedMorning.id, label: "settembre", start: "2026-09-01", end: "2026-10-31", price: 60 },
    // Boat Exclusive Full Day
    { serviceId: boatExclusiveFull.id, label: "bassa", start: "2026-05-01", end: "2026-05-31", price: 75 },
    { serviceId: boatExclusiveFull.id, label: "media", start: "2026-06-01", end: "2026-07-15", price: 85 },
    { serviceId: boatExclusiveFull.id, label: "alta", start: "2026-07-16", end: "2026-08-31", price: 100 },
    { serviceId: boatExclusiveFull.id, label: "settembre", start: "2026-09-01", end: "2026-10-31", price: 75 },
    // Boat Exclusive Morning
    { serviceId: boatExclusiveMorning.id, label: "bassa", start: "2026-05-01", end: "2026-05-31", price: 60 },
    { serviceId: boatExclusiveMorning.id, label: "media", start: "2026-06-01", end: "2026-07-15", price: 75 },
    { serviceId: boatExclusiveMorning.id, label: "alta", start: "2026-07-16", end: "2026-08-31", price: 90 },
    { serviceId: boatExclusiveMorning.id, label: "settembre", start: "2026-09-01", end: "2026-10-31", price: 60 },
    // Cabin Charter
    { serviceId: cabinCharter.id, label: "alta", start: "2026-07-16", end: "2026-08-31", price: 2300 },
  ];

  for (const p of pricingData) {
    await prisma.pricingPeriod.create({
      data: {
        serviceId: p.serviceId,
        label: p.label,
        startDate: new Date(p.start),
        endDate: new Date(p.end),
        pricePerPerson: p.price,
        year: 2026,
      },
    });
  }

  // Crew members
  await prisma.crewMember.upsert({
    where: { id: "skipper-1" },
    update: {},
    create: {
      id: "skipper-1",
      name: "Skipper Demo",
      role: CrewRole.SKIPPER,
    },
  });

  await prisma.crewMember.upsert({
    where: { id: "chef-1" },
    update: {},
    create: {
      id: "chef-1",
      name: "Chef Demo",
      role: CrewRole.CHEF,
    },
  });

  await prisma.crewMember.upsert({
    where: { id: "hostess-1" },
    update: {},
    create: {
      id: "hostess-1",
      name: "Hostess Demo",
      role: CrewRole.HOSTESS,
    },
  });

  console.log("Seed completato!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 4: Installa bcryptjs**

```bash
npm install bcryptjs
npm install @types/bcryptjs --save-dev
```

- [ ] **Step 5: Esegui il seed**

```bash
npx prisma db seed
```

Expected: "Seed completato!" — verifica con Prisma Studio che i dati siano presenti.

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts package.json package-lock.json
git commit -m "feat: add database seed with demo data for all services and pricing"
```

---

### Task 5: shadcn/ui Setup

**Files:**
- Modify: `package.json`, `tailwind.config.ts`, `src/app/globals.css`
- Create: `src/components/ui/` (generato da shadcn)

- [ ] **Step 1: Inizializza shadcn/ui**

```bash
npx shadcn@latest init
```

Quando chiede le opzioni:
- Style: Default
- Base color: Slate
- CSS variables: Yes

- [ ] **Step 2: Installa i componenti base necessari**

```bash
npx shadcn@latest add button card input label table dialog calendar select form toast tabs chart badge dropdown-menu separator sheet avatar
```

- [ ] **Step 3: Verifica che i componenti sono in `src/components/ui/`**

```bash
ls src/components/ui/
```

Expected: Lista di file `.tsx` per ogni componente installato.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: add shadcn/ui with base components"
```

---

### Task 6: NextAuth.js (Auth Admin)

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/admin/login/page.tsx`

- [ ] **Step 1: Installa NextAuth.js v5**

```bash
npm install next-auth@beta
```

- [ ] **Step 2: Crea `src/lib/auth.ts`**

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          return null;
        }

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
});
```

- [ ] **Step 3: Crea `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 4: Crea `src/app/admin/login/page.tsx`**

```typescript
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email o password non validi");
      setLoading(false);
    } else {
      router.push("/admin");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Egadisailing Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Accesso..." : "Accedi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Crea `src/app/admin/layout.tsx` — protezione route admin**

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
```

- [ ] **Step 6: Crea `src/app/admin/page.tsx` — placeholder dashboard**

```typescript
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboard() {
  const session = await auth();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Benvenuto, {session?.user?.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Ruolo: {(session?.user as any)?.role}</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: Testa il login**

```bash
npm run dev
```

1. Vai a http://localhost:3000/admin — redirect a /admin/login
2. Login con: admin@egadisailing.com / admin123
3. Redirect a /admin con messaggio "Benvenuto, Admin"

Expected: Flusso login funzionante.

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth.ts src/app/api/ src/app/admin/ package.json package-lock.json
git commit -m "feat: add NextAuth.js admin authentication with credentials provider"
```

---

### Task 7: next-intl Setup (i18n Base)

**Files:**
- Create: `src/i18n/request.ts`, `src/i18n/routing.ts`, `src/i18n/messages/it.json`, `src/i18n/messages/en.json`, `src/middleware.ts`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`
- Modify: `next.config.ts`

- [ ] **Step 1: Installa next-intl**

```bash
npm install next-intl
```

- [ ] **Step 2: Crea `src/i18n/routing.ts`**

```typescript
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: [
    "it", "en", "de", "fr", "es", "nl", "pl", "sv", "pt", "ru",
    "zh", "ja", "hu", "hr", "tr", "ar", "el", "mt", "cs", "da",
    "no", "fi", "ro", "bg", "sr",
  ],
  defaultLocale: "it",
});

export type Locale = (typeof routing.locales)[number];
```

- [ ] **Step 3: Crea `src/i18n/request.ts`**

```typescript
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 4: Crea `src/i18n/messages/it.json`**

```json
{
  "common": {
    "bookNow": "Prenota Ora",
    "learnMore": "Scopri di più",
    "contactUs": "Contattaci",
    "home": "Home",
    "about": "Chi Siamo",
    "contacts": "Contatti",
    "faq": "FAQ",
    "priceFrom": "A partire da",
    "perPerson": "a persona",
    "fullDay": "Giornata intera",
    "halfDay": "Mezza giornata",
    "week": "Settimana"
  },
  "hero": {
    "title": "Scopri le Isole Egadi dal Mare",
    "subtitle": "Esperienze in barca uniche tra Favignana, Levanzo e Marettimo. Lusso accessibile, avventura e sapori del Mediterraneo.",
    "cta": "Esplora le Esperienze"
  },
  "services": {
    "socialBoating": {
      "title": "Social Boating",
      "short": "Navigazione, tuffi e pranzo di pesce fresco. Il modo più conviviale di scoprire le Egadi."
    },
    "exclusive": {
      "title": "Exclusive Experience",
      "short": "Chef rinomato, rotta personalizzata, lusso senza compromessi."
    },
    "cabinCharter": {
      "title": "Cabin Charter",
      "short": "Una settimana tra le Egadi. La tua casa è il mare."
    },
    "boatShared": {
      "title": "Boat Tour Condiviso",
      "short": "Tour in barca alle Egadi, ideale per piccoli gruppi."
    },
    "boatExclusive": {
      "title": "Boat Tour Esclusivo",
      "short": "La barca tutta per te e il tuo gruppo."
    }
  },
  "nav": {
    "experiences": "Esperienze",
    "boats": "Le Barche",
    "islands": "Le Isole",
    "about": "Chi Siamo",
    "contacts": "Contatti"
  },
  "footer": {
    "rights": "Tutti i diritti riservati",
    "privacy": "Privacy Policy",
    "terms": "Termini e Condizioni"
  }
}
```

- [ ] **Step 5: Crea `src/i18n/messages/en.json`**

```json
{
  "common": {
    "bookNow": "Book Now",
    "learnMore": "Learn More",
    "contactUs": "Contact Us",
    "home": "Home",
    "about": "About Us",
    "contacts": "Contacts",
    "faq": "FAQ",
    "priceFrom": "From",
    "perPerson": "per person",
    "fullDay": "Full day",
    "halfDay": "Half day",
    "week": "Week"
  },
  "hero": {
    "title": "Discover the Egadi Islands by Sea",
    "subtitle": "Unique boat experiences between Favignana, Levanzo and Marettimo. Accessible luxury, adventure and Mediterranean flavours.",
    "cta": "Explore Experiences"
  },
  "services": {
    "socialBoating": {
      "title": "Social Boating",
      "short": "Sailing, swimming and fresh fish lunch. The most convivial way to discover the Egadi."
    },
    "exclusive": {
      "title": "Exclusive Experience",
      "short": "Renowned chef, customized route, uncompromised luxury."
    },
    "cabinCharter": {
      "title": "Cabin Charter",
      "short": "A week among the Egadi Islands. Your home is the sea."
    },
    "boatShared": {
      "title": "Shared Boat Tour",
      "short": "Boat tour to the Egadi, ideal for small groups."
    },
    "boatExclusive": {
      "title": "Exclusive Boat Tour",
      "short": "The boat all for you and your group."
    }
  },
  "nav": {
    "experiences": "Experiences",
    "boats": "Our Boats",
    "islands": "The Islands",
    "about": "About Us",
    "contacts": "Contacts"
  },
  "footer": {
    "rights": "All rights reserved",
    "privacy": "Privacy Policy",
    "terms": "Terms & Conditions"
  }
}
```

- [ ] **Step 6: Crea `src/middleware.ts`**

```typescript
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except /api, /admin, /_next, /static, favicon
    "/((?!api|admin|_next|_vercel|.*\\..*).*)",
  ],
};
```

- [ ] **Step 7: Aggiorna `next.config.ts`**

```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 8: Crea `src/app/[locale]/layout.tsx`**

```typescript
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 9: Crea `src/app/[locale]/page.tsx` — homepage placeholder**

```typescript
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const t = useTranslations();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-5xl font-bold mb-4">{t("hero.title")}</h1>
      <p className="text-xl text-gray-600 mb-8 max-w-2xl text-center">
        {t("hero.subtitle")}
      </p>
      <Button size="lg">{t("hero.cta")}</Button>
    </main>
  );
}
```

- [ ] **Step 10: Testa i18n**

```bash
npm run dev
```

1. Vai a http://localhost:3000 — redirect a /it/ con contenuti italiani
2. Vai a http://localhost:3000/en — contenuti in inglese
3. Vai a http://localhost:3000/de — fallback (file mancante, gestiremo dopo)

Expected: Italiano e inglese funzionanti, routing locale attivo.

- [ ] **Step 11: Commit**

```bash
git add src/i18n/ src/middleware.ts src/app/\[locale\]/ next.config.ts package.json package-lock.json
git commit -m "feat: add next-intl i18n with 25 locales, IT and EN translations"
```

---

### Task 8: Gitignore e pulizia finale

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Verifica e aggiorna `.gitignore`**

Assicurati che contenga:

```
# dependencies
node_modules/

# next.js
.next/
out/

# env
.env
.env.local

# docker
pgdata/

# misc
.DS_Store
*.pem
```

- [ ] **Step 2: Verifica che tutto funziona end-to-end**

```bash
docker compose up postgres -d
npm run dev
```

Checklist:
- [ ] http://localhost:3000 → redirect a /it/ con homepage tradotta
- [ ] http://localhost:3000/en → homepage in inglese
- [ ] http://localhost:3000/admin → redirect a /admin/login
- [ ] Login con admin@egadisailing.com / admin123 → dashboard admin
- [ ] Prisma Studio mostra tutti i dati seed

- [ ] **Step 3: Commit finale**

```bash
git add .gitignore
git commit -m "chore: finalize project setup with gitignore and cleanup"
```

---

## Summary

Al completamento di questo piano, il progetto avrà:

- Progetto Next.js 15 con TypeScript e App Router
- Docker Compose con PostgreSQL
- Schema database completo con tutte le entità (Service, Boat, Trip, Booking, Customer, Crew, PricingPeriod, PortalSync, User)
- Dati seed per sviluppo (admin, servizi, prezzi, crew)
- shadcn/ui configurato con componenti base
- Auth admin funzionante con NextAuth.js v5
- i18n con next-intl (25 lingue, IT e EN tradotti)
- Struttura pronta per Piano 2 (Dashboard Admin)
