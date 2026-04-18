# Egadisailing Platform V2

Piattaforma charter/tour booking per le Isole Egadi.
Next.js 16 + Prisma 7 + PostgreSQL + Redis + BullMQ + Stripe + Bokun.

## Stack

- **Frontend**: Next.js 16 (App Router, RSC, Server Actions), React 19, Tailwind CSS v4, shadcn/ui
- **Backend**: Prisma v7, PostgreSQL 16, Redis 7, BullMQ, NextAuth v5
- **Integrations**: Stripe, Bokun, Boataround, iCal export, IMAP email parsing, Open-Meteo weather

## Prerequisiti

- Node.js 20+
- Docker + Docker Compose
- `openssl` per generare secret

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill required values
cp .env.example .env
# Generate secrets:
openssl rand -base64 32    # → NEXTAUTH_SECRET
openssl rand -hex 16       # → POSTGRES_PASSWORD, REDIS_PASSWORD

# 3. Start Postgres + Redis in Docker
npm run docker:up

# 4. Apply DB migrations
npm run db:deploy

# 5. Seed catalog + admin user
npm run db:seed
# → admin@egadisailing.com / <SEED_ADMIN_PASSWORD from .env>

# 6. Generate Prisma client (only needed after schema changes)
npm run db:generate

# 7. Start dev server
npm run dev
```

Open http://localhost:3000

## Script principali

| Script | Cosa fa |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run lint` | ESLint |
| `npm run docker:up` | Start Postgres + Redis containers |
| `npm run docker:down` | Stop containers |
| `npm run docker:logs` | Follow container logs |
| `npm run db:migrate` | Create + apply new migration (dev) |
| `npm run db:deploy` | Apply pending migrations (prod) |
| `npm run db:reset` | Drop DB + re-run migrations + seed |
| `npm run db:seed` | Run seed only |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run db:generate` | Regenerate Prisma client |

## Healthcheck

`GET /api/health` verifica DB e Redis. 200 se ok, 503 se degraded.

## Struttura principale

```
src/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # Sito pubblico (i18n)
│   ├── admin/                    # Dashboard admin
│   └── api/                      # API routes + webhooks
├── lib/
│   ├── env.ts                    # Env validation (Zod)
│   ├── logger.ts                 # Pino structured logger
│   ├── errors.ts                 # AppError hierarchy
│   ├── dates.ts                  # UTC date utilities
│   ├── channels.ts               # Channel enum (source of truth)
│   ├── db.ts                     # Prisma singleton
│   ├── queue/                    # BullMQ + Redis
│   ├── availability/             # Calendar + fan-out
│   ├── pricing/                  # Price engine + hot days
│   ├── rate-limit/               # Redis-atomic rate limiter
│   └── audit/                    # AuditLog helper
├── components/                   # UI components
└── generated/prisma/             # Prisma client (gitignored eventualmente)

prisma/
├── schema.prisma                 # V2 schema
├── seed.mts                      # Seed catalog + admin
├── migrations/                   # SQL migrations
└── backup/                       # Legacy schema/dump

docs/
├── superpowers/specs/            # Design specs
├── superpowers/plans/            # Implementation plans
└── client/                       # Client-facing docs
```

## Architettura di sincronizzazione

**DB locale = master.** Ogni cambio di `BoatAvailability` (da sito, Bokun, charter platforms) triggera fan-out verso tutti gli altri canali via `SyncQueue` (BullMQ).

Dettagli in `docs/superpowers/specs/2026-04-17-platform-v2-design.md`.

## Sicurezza

- Postgres e Redis bindati solo su `127.0.0.1`
- Redis `requirepass` obbligatorio
- Password admin seed da `SEED_ADMIN_PASSWORD` env (no hardcode)
- Rate limiter atomico Redis (no TOCTOU)
- Availability con advisory lock Postgres (no double booking)
- Logger con redaction automatica di secret/PII
- `AppError.toClientJSON()` sanitizza risposte HTTP

## Troubleshooting

**Build fallisce per `PrismaClient` non trovato** → `npm run db:generate`

**Seed password dimenticata** → `npm run db:reset` (ricrea DB + stampa nuova password)

**Container non si avvia** → verifica `.env` (POSTGRES_PASSWORD, REDIS_PASSWORD, NEXTAUTH_SECRET con rand32)

## Status

✅ Plan 1 (DB + Backend foundation) completato
⏳ Plan 2-6 in roadmap
