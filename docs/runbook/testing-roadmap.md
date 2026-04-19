# Testing Roadmap Pre-Go-Live

Generato dall'audit Round 17. Stato test: **106 unit pure functions** + **4 integration A1 (stripe-webhook-handler)**, zero E2E.

**Update 2026-04-19**: infra integration test setup completato (pglite non compatibile con @prisma/adapter-pg → pivot a Postgres reale via Docker su DB separato `egadisailing_test`). Primo test A1 (webhook-handler) implementato con 4 scenari critici.

## Setup integration test (una tantum)

```bash
# 1. Postgres docker running
npm run docker:up

# 2. Crea test DB
docker compose exec -T postgres psql -U egadisailing -d postgres \
  -c "CREATE DATABASE egadisailing_test;"

# 3. Apply migrations al test DB
DATABASE_URL="postgresql://egadisailing:$POSTGRES_PASSWORD@127.0.0.1:5432/egadisailing_test" \
  npx prisma migrate deploy

# 4. Run all tests
npm test

# Split:
npm run test:unit         # solo src/**/*.test.ts
npm run test:integration  # solo tests/integration/**
```

Helpers test condivisi in `tests/helpers/`:
- `test-db.ts` — PrismaClient pointed a `egadisailing_test` + reset TRUNCATE
- `redis-mock.ts` — ioredis-mock singleton per BullMQ + rate-limit + lease
- `msw-server.ts` — intercept HTTP outbound (Brevo/Turnstile/Open-Meteo)
- `setup.ts` — vitest setupFile caricato auto (dotenv .env)

**Caveat**: Stripe SDK usa http/https nativo, msw non lo intercetta — mockare `@/lib/stripe/payment-intents` direttamente con `vi.mock()`.

## Inventario test esistenti

| # | File | Test | Tipologia |
|---|---|---|---|
| 1 | `src/lib/stripe/metadata.test.ts` | 5 | unit pure |
| 2 | `src/lib/email-parser/booking-extractor.test.ts` | 17 | unit pure |
| 3 | `src/lib/pricing/cents.test.ts` | 7 | unit pure |
| 4 | `src/lib/pricing/rounding.test.ts` | 4 | unit pure |
| 5 | `src/lib/ical/formatter.test.ts` | 6 | unit pure |
| 6 | `src/lib/bokun/adapters/booking.test.ts` | 6 | unit pure |
| 7 | `src/lib/bokun/webhook-verifier.test.ts` | 7 | unit pure |
| 8 | `src/lib/bokun/signer.test.ts` | 7 | unit pure |
| 9 | `src/lib/dates.test.ts` | 9 | unit pure |
| 10 | `src/lib/weather/risk-assessment.test.ts` | 11 | unit pure |
| 11 | `src/lib/booking/helpers.test.ts` | 6 | unit pure |
| 12 | `src/lib/db/advisory-lock.test.ts` | 4 | unit pure |
| 13 | `src/lib/html-escape.test.ts` | 6 | unit pure |
| 14 | `src/lib/boataround/webhook-verifier.test.ts` | 5 | unit pure |
| 15 | `src/lib/email-normalize.test.ts` | 6 | unit pure |

**Totale: 106**. 100% pure functions. Zero copertura integration/E2E/route/middleware/Server Action.

## Gap analysis core moduli

| Area | Status | Fix da R-round NON validati da test |
|---|---|---|
| `booking/create-direct.ts` | ❌ | R7 pre-check overlap, R15-REG-UX-1 retry-window, R16 customer upsert ordering |
| `stripe/webhook-handler.ts` | ❌ | R13 out-of-order refund throw, R10 BL-C3 auto-refund cancelled, R11 Reg-C2 Payment unique |
| `availability/service.ts` | ❌ | R14 preserve first-winner, R8 skip ICAL fan-out |
| `notifications/dispatcher.ts` | ❌ | R14-REG-C1 DispatchResult boolean |
| `lease/redis-lease.ts` | ❌ | R13 token ownership, R13-I fail-open timeout |
| `gdpr/anonymize-customer.ts` | ❌ | R14-REG-A3 ConsentRecord mask |
| Route handler (webhook/cron/payment) | ❌ | tutti |
| Server Actions admin | ❌ | tutti |
| `middleware.ts` | ❌ | R10 admin role, R17-SEC-#2 DB check |
| `auth.ts` | ❌ | R15-SEC-A3 bcrypt timing, R17 DB lookup, R17 login rate-limit |

## Tier A — MUST pre-go-live (14 test, ~66h ≈ 10gg)

| # | File | Tipologia | Effort |
|---|---|---|---|
| A1 | `stripe/webhook-handler.test.ts` | integration pglite+msw | L 6h |
| A2 | `booking/create-direct.test.ts` | integration pglite | L 6h |
| A3 | `availability/service.test.ts` | integration pglite+ioredis-mock | L 8h |
| A4 | `notifications/dispatcher.test.ts` | unit mocked | M 2h |
| A5 | `api/webhooks/stripe/route.test.ts` | integration pglite+msw | M 3h |
| A6 | `api/webhooks/bokun/route.test.ts` | integration pglite+msw | L 6h |
| A7 | `admin/prenotazioni/actions.test.ts` | integration pglite+msw | L 8h |
| A8 | `gdpr/anonymize-customer.test.ts` | integration pglite | M 3h |
| A9 | `lease/redis-lease.test.ts` | integration ioredis-mock | M 3h |
| A10 | `charter/booking-import.test.ts` | integration pglite | M 3h |
| A11 | `middleware.test.ts` | mocked getToken | S 1h |
| A12 | `auth.test.ts` | integration pglite | M 3h |
| A13 | `tests/e2e/booking-wizard.spec.ts` | Playwright | L 8h |
| A14 | `tests/e2e/recovery-otp.spec.ts` | Playwright | M 4h |

**Se tempo insufficiente per 14**, ordine minimo (32h ≈ 4gg): A1, A2, A7, A11, A13.

## Tier B — SHOULD primi 30gg (13 test, ~50h ≈ 7gg)

Vedi dettaglio report completo audit R17. Copre: weather service, bokun adapter extend, cron route, email parser fixture cliente, iCal generator, payment-intent route, recupera-prenotazione actions, admin cancel E2E, bokun webhook E2E, fan-out, email dedup.

## Infra testing setup (~16h ≈ 2gg)

1. **DB test**: `@electric-sql/pglite` in-memory (50ms startup, 5ms reset). Caveat: `pg_advisory_xact_lock` ricerca via LOCK TABLE shim. Effort: 4h.
2. **Redis mock**: `ioredis-mock`. `vi.mock("@/lib/queue")` override. Effort: 1h.
3. **Stripe mock**: `msw` per `api.stripe.com`. Fixture `Stripe.Event` helper. Effort: 2h.
4. **Brevo/Bokun/Boataround/Open-Meteo**: `msw` setupServer global. Effort: 2h + fixture dir.
5. **E2E Playwright**: `@playwright/test` + `playwright.config.ts` + global-setup auth reuse via storageState. Effort: 4h.
6. **CI GitHub Actions**: `.github/workflows/test.yml` (lint+typecheck+unit) + `integration.yml` separato con Postgres service. Effort: 3h.

## Timeline realistica per confidence go-live

- **1 dev full-time**: 15 giornate lavorative (infra 2gg + Tier A 10gg + buffer 3gg).
- **2 dev paralleli** (infra+backend / Playwright+e2e): ~8 gg reali.
- **Minimum viable pre-launch** (solo 5 test critici): 4 gg + infra 2gg = 6 gg.

## Esempio test Tier-A completo

Vedi report completo audit R17 — include template `webhook-handler.test.ts` copy-paste ready con 3 scenari: R13 charge.refunded out-of-order throw, R10+R11 auto-refund senza unique collision, idempotency marker su success.

## Dipendenze bloccanti

- **B6 Email parser fixture cliente**: SamBoat/Click&Boat/Nautal email samples anonymized. **Richiedere al cliente PRIMA di iniziare** altrimenti B6 scivola di settimane.
