<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Egadisailing Platform V2 — Agent handbook

**Stato**: Plan 1 (DB + Backend foundation) completato. Plan 2-6 da implementare.

## Stack

Next.js 16 (App Router) · Prisma v7 (`prisma-client` generator, NON `prisma-client-js`) · PostgreSQL 16 · Redis 7 · BullMQ · Tailwind v4 · shadcn/ui · next-intl · NextAuth v5 · Stripe (Plan 2) · Bokun API custom (Plan 3).

Prisma client viene generato in `src/generated/prisma/` — importare da lì, non da `@prisma/client`.

## Architettura chiave — leggere prima di scrivere codice

- **DB locale = master** della disponibilità. Ogni source (sito, Bokun, charter platforms) scrive sul DB e il cambio viene propagato via `SyncQueue` (BullMQ) a tutti gli altri canali.
- **Anti-loop**: `BoatAvailability.lastSyncedSource` + `lastSyncedAt` (window 120s). Self-echo detection e' DENTRO la transazione di upsert (TOCTOU-safe).
- **Advisory lock Postgres** (`pg_advisory_xact_lock`) per serializzare update concorrenti sulla stessa cella (boatId, date) → no double booking.
- **Outbox-lite**: `updateAvailability` committa PRIMA di accodare il fan-out. Se crasha tra commit e enqueue, la consistency DB è salva; reconciliation cron (Plan 3+) recupera.
- **Rate limit** è su Redis (INCR atomico), NON piu' sul DB. `RateLimitEntry` nel DB esiste solo per audit persistente.

Spec completa: `docs/superpowers/specs/2026-04-17-platform-v2-design.md`

## Librerie foundation (Plan 1) — già pronte, riusare

| Path | Cosa fa | Quando usare |
|---|---|---|
| `src/lib/env.ts` | Env validation Zod al boot | Sempre, per qualsiasi env var |
| `src/lib/logger.ts` | Pino con redaction automatica | `import { logger }` |
| `src/lib/errors.ts` | `AppError` hierarchy + `toClientJSON` | Throw in business logic |
| `src/lib/dates.ts` | `toUtcDay`, `isoDay`, `eachUtcDayInclusive` | OGNI manipolazione date — NON duplicare |
| `src/lib/channels.ts` | `CHANNELS`, `FAN_OUT_CHANNELS`, `RATE_LIMIT_SCOPES` | OGNI riferimento a canale / scope |
| `src/lib/queue/` | BullMQ singleton + `syncQueue()` | Accodare job |
| `src/lib/availability/service.ts` | `updateAvailability`, `blockDates`, `releaseDates` | Cambio disponibilità (master op) |
| `src/lib/pricing/service.ts` | `quotePrice(serviceId, date, numPeople)` | Calcolo prezzi — ritorna Decimal |
| `src/lib/rate-limit/service.ts` | `enforceRateLimit`, `blockIdentifier` | Prima di ogni endpoint pubblico |
| `src/lib/audit/log.ts` | `auditLog(entry)` — failure-safe | Dopo ogni mutazione sensibile |

## Regole invarianti

1. **Non duplicare date normalization** — usa `toUtcDay` / `isoDay`.
2. **Non hardcodare channel names** — usa `CHANNELS.*`.
3. **Prezzi in `Decimal`** fino al JSON boundary — mai arithmetic su `number` intermedi.
4. **Webhook HMAC** sempre verificato prima di fidarsi del payload (Bokun SHA-256, Boataround TBD).
5. **`updateAvailability` e' l'unico modo di cambiare `BoatAvailability`** — non scrivere diretto via Prisma.
6. **Non fare `db.X.findFirst` + `update`/`create` senza transazione** se l'identità non è unique.
7. **Non loggare `entry.before`/`after` in full** — solo metadata (rischio PII).
8. **Non usare `as never`** — per JSON Prisma c'e `toJsonSafe` in `audit/log.ts`.
9. **Legacy pages** (`src/app/**` marcate `@ts-nocheck`): verranno rifatte nei Plan 2-5 — non estendere.

## Findings residui dall'audit (da attaccare nei piani successivi)

- **Plan 2**: introdurre `withErrorHandler` wrapper per API routes (mappa `AppError` → HTTP).
- **Plan 3**: `jobId` BullMQ coalesce update (worker rilegge DB prima di fare la chiamata esterna, quindi ultimo stato vince).
- **Plan 4**: dedup email via messageId + parser fallback manuale.
- **Plan 5**: repository pattern per hot-day query (priority specific > global > rule) invece che inline.
- **Overall**: exclusion constraint Postgres su `Booking (boatId, daterange, status)` per prevenire double booking a livello DB. Richiede migration raw SQL.
- **Overall**: Husky + lint-staged + vitest (rimandato per non rallentare Plan 1 chiusura).
- **Overall**: `enforceOtpRequestLimit` potrebbe essere batch-ato in una singola Redis MULTI. Attualmente 6 round-trip sequenziali.
- **Overall**: `eachUtcDayInclusive` e' single-day sequential. Per cabin charter (7gg) valutare batch `createMany`.

## Plan roadmap

1. ✅ Plan 1 — DB + Backend foundation (completato)
2. ⏳ Plan 2 — Sito + Stripe + OTP
3. ⏳ Plan 3 — Bokun integration
4. ⏳ Plan 4 — Charter integrations (Boataround, SamBoat iCal, Click&Boat, Nautal email)
5. ⏳ Plan 5 — Dashboard admin
6. ⏳ Plan 6 — Weather + notifiche + E2E

Piani dettagliati in `docs/superpowers/plans/2026-04-17-plan-*.md`.

## Setup rapido per nuova sessione

```bash
npm install
npm run docker:up    # postgres + redis
npm run db:deploy
npm run db:seed      # admin login stampato a console
npm run dev
```

Healthcheck: `curl http://localhost:3000/api/health`.
