<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Egadisailing Platform V2 — Agent handbook

**Stato**: Plan 1 + Plan 2 completati + 4 round di audit applicati (code quality, security, concurrency, refactoring, production readiness, UX, integration, meta-review, performance, GDPR, edge cases, testing gap, supply chain, business logic, API contract, documentation). Plan 3-6 da implementare.

**Test suite**: 47 unit test pure (`npm test`) su pricing/dates/html-escape/metadata/advisory-lock/email-normalize/booking helpers.

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
| `src/lib/db/advisory-lock.ts` | `computeAdvisoryLockKey`, `acquireTxAdvisoryLock` | OGNI sezione critica serializzabile — usa namespace consistenti |
| `src/types/next-auth.d.ts` | Module augmentation Session.user.role + JWT.role | Implicito — elimina `as any` |
| `src/lib/dates.ts` | `addDays`, `addHours`, `parseDateLikelyLocalDay` | OGNI manipolazione date — `parseDateLikelyLocalDay` per input utente client (timezone-safe) |
| `src/lib/email-normalize.ts` | `normalizeEmail` — Gmail alias handling | Rate limit per email + Customer upsert |
| `src/lib/booking/helpers.ts` | `generateConfirmationCode`, `normalizeConfirmationCode`, `deriveEndDate` | Pure, testabili — extracted per Plan 3+ |
| `src/lib/http/client-ip.ts` | `getClientIp`, `getUserAgent` | OGNI Server Action/route con rate-limit |
| `src/lib/http/with-error-handler.ts` | `withErrorHandler`, `requireBearerSecret` (timing-safe) | OGNI API route |
| `src/lib/pricing/cents.ts` | `toCents`, `fromCents`, `formatEur` | OGNI boundary Stripe o UI price |
| `src/lib/html-escape.ts` | `escapeHtml`, `safeUrl` | OGNI template HTML email con user data |
| `src/lib/stripe/server.ts` | `stripe()` SDK singleton | Stripe API calls |
| `src/lib/stripe/payment-intents.ts` | `createPaymentIntent`, `refundPayment` | Checkout diretto |
| `src/lib/stripe/metadata.ts` | `buildBookingMetadata`, `parseBookingMetadata` | Webhook → booking mapping (no silent fallback) |
| `src/lib/email/brevo.ts` | `sendEmail` REST client | Email transazionali |
| `src/lib/email/templates/_layout.ts` | `emailLayout`, `escapeHtml`, `safeUrl` | Wrapper HTML per nuovi template |
| `src/lib/otp/` | `createOtp`, `verifyOtp` (atomic, TOCTOU-safe) | Recovery flow |
| `src/lib/session/` | Cookie-based sessions, SHA-256 token hash | Customer booking area |
| `src/lib/booking/` | `createPendingDirectBooking`, `confirmDirectBookingAfterPayment`, `createBalancePaymentLink` | Lifecycle prenotazioni dirette |
| `src/lib/turnstile/verify.ts` | `verifyTurnstileToken` | CAPTCHA pubblico |
| `src/lib/cron/scheduler.ts` | `startCronScheduler` | In-process node-cron (valutare BullMQ in Plan 3) |

## Regole invarianti

1. **Non duplicare date normalization** — usa `toUtcDay` / `isoDay` / `addDays` / `addHours`.
2. **Non hardcodare channel names** — usa `CHANNELS.*`.
3. **Prezzi in `Decimal`** fino al JSON boundary — mai arithmetic su `number` intermedi. Stripe usa cents integer via `toCents()`.
4. **Webhook HMAC** sempre verificato prima di fidarsi del payload (Stripe `constructEvent` con STRIPE_WEBHOOK_SECRET, Bokun SHA-256, Boataround TBD).
5. **`updateAvailability` e' l'unico modo di cambiare `BoatAvailability`** — non scrivere diretto via Prisma.
6. **Non fare `db.X.findFirst` + `update`/`create` senza transazione** se l'identità non è unique.
7. **Non loggare `entry.before`/`after` in full** — solo metadata (rischio PII).
8. **Non usare `as never`** — per JSON Prisma c'e `toJsonSafe` in `audit/log.ts`.
9. **Legacy pages** (`src/app/**` marcate `@ts-nocheck`): verranno rifatte nei Plan 3-5 — non estendere.
10. **Stripe metadata** va validata con `parseBookingMetadata()` — no silent fallback a FULL.
11. **User-supplied HTML in email** sempre via `escapeHtml()` — no interpolazione diretta.
12. **Client NON decide `endDate` ne' `totalPrice`** — derivati/calcolati server-side da `service.durationType/Hours` e `quotePrice()`.
13. **Idempotency stripe**: insert su `ProcessedStripeEvent.eventId` all'inizio dell'handler — skippa se gia' processato.
14. **Rate limit** ogni endpoint pubblico via `enforceRateLimit({ identifier: ip | email, scope, limit, windowSeconds })`.
15. **API routes** wrappate in `withErrorHandler` per AppError/ZodError mapping coerente.
16. **Date input utente** passa per `parseDateLikelyLocalDay` — `toUtcDay` su ISO datetime client causa off-by-one (cliente italiano CEST digita "7 aprile" → "2026-04-06T22:00Z" → toUtcDay = 6 aprile).
17. **Email utente** normalizzata con `normalizeEmail()` — gmail alias + `.` → stesso Customer + no rate-limit bypass.
18. **Confirmation code lookup** case-insensitive via `normalizeConfirmationCode()` — users copy-paste from email con case diverso.
19. **Customer upsert** NON sovrascrive firstName/lastName alla 2a prenotazione stessa email — tenere stabile per email transazionali gia' inviate.
20. **Pure helpers testabili** in `src/lib/booking/helpers.ts` — export esplicitamente funzioni critiche per unit test.

## Findings residui dall'audit (da attaccare nei piani successivi)

### Da Plan 1 (ancora aperti)
- **Plan 3**: `jobId` BullMQ coalesce update (worker rilegge DB prima di fare la chiamata esterna, quindi ultimo stato vince).
- **Plan 4**: dedup email via messageId + parser fallback manuale.
- **Plan 5**: repository pattern per hot-day query (priority specific > global > rule) invece che inline.
- **Overall**: exclusion constraint Postgres su `Booking (boatId, daterange, status)` per prevenire double booking a livello DB. Richiede migration raw SQL.
- **Overall**: Husky + lint-staged + vitest (rimandato per non rallentare).
- **Overall**: `enforceOtpRequestLimit` batch in singola Redis MULTI (oggi 6 round-trip sequenziali).
- **Overall**: `eachUtcDayInclusive` single-day sequential. Per cabin charter (7gg) valutare batch `createMany`.

### Da Plan 2 (originali)
- **Plan 3**: sostituire `node-cron` in-process con BullMQ repeatable jobs (sicuro multi-replica).
- **Plan 3**: outbox pattern reale per `blockDates` post-commit (oggi best-effort se processo crasha tra commit e blockDates).
- **Plan 5**: audit log da chiamare nelle mutation Plan 2 (BOOKING_CONFIRMED, OTP_ISSUED, SESSION_CREATED). Oggi nessuna mutation Plan 2 scrive audit.
- **Plan 6** (i18n): Server Actions restituiscono `message` raw → i18n error codes con next-intl. `locale` riletto dal referrer.
- **Plan 6** (weather): `weatherGuarantee` flag rimosso dal client payload (era server-ignored); reintrodurre con pricing addon server-side.
- **Admin PR**: PENDING booking GC cron (cancellare PENDING older than 30min + stripe.paymentIntents.cancel) per prevenire PaymentIntent resurrection.
- **Schema**: valutare unique partial index su `HotDayOverride (date) WHERE serviceId IS NULL` (Postgres NULL-distinct).

### Da round 2 audit (production readiness)
- **Deploy**: `docker-compose.prod.yml` con container app + healthcheck HTTP + reverse proxy Caddy/Nginx con auto-TLS + webhook Stripe HTTPS. Senza questo non si va live.
- **Shutdown**: `process.on('SIGTERM')` per chiudere BullMQ worker, Redis conn, pg Pool.
- **Backup**: sidecar `pg_dump` schedulato + offsite (S3/B2) + retention + test restore.
- **Observability**: Sentry o simile + uptime monitor esterno su `/api/health`.
- **Migrations CI/CD**: deploy flow esplicito con `prisma migrate deploy` prima di start app (init container / entrypoint).
- **Secrets**: `.env` fuori dall'immagine Docker; iniezione via Docker Secrets / SOPS.
- **Redis persistence**: configurare `--appendonly yes` + `--maxmemory-policy noeviction` (BullMQ).
- **Stripe recovery**: cron giornaliero che rilegge `/v1/events` degli ultimi N giorni e replaya quelli non in `ProcessedStripeEvent`.
- **CORS / security headers**: `headers()` in next.config.ts (HSTS, X-Frame-Options, CSP).

### Da round 3 audit (Performance)
- **CRITICA**: `blockDates` N+1 — 7 transazioni seriali per WEEK booking. Batch con raw SQL `INSERT ... ON CONFLICT` + singolo fan-out range.
- **CRITICA**: Admin customers + CSV export no pagination + no `groupBy` DB (aggregate in JS). Sostituire con `groupBy({ by: 'customerId', _sum: ... })` + cursor pagination.
- **ALTA**: Service/Boat ri-letti da DB su ogni request pubblico. `unstable_cache` con tag + revalidateTag da server actions admin.
- **ALTA**: `quotePrice` fuori dalla transazione `createPendingDirectBooking`. Cache in-memory LRU per (serviceId, dateOnly) → quote.
- **MEDIA**: Rate limit block path 2 round-trip (GET + PTTL separati). Unire in MULTI o Lua script atomico.
- **MEDIA**: BullMQ worker senza `limiter` — canale esterno rate-limit puo' martellare.
- **MEDIA**: Advisory lock tenuto per l'intera tx `createPendingDirectBooking`. `customer.upsert` puo' uscire dalla tx (email unique).
- **MEDIA**: `recharts` in bundle admin — `dynamic(() => import(...))` per charts.
- **MEDIA**: `next/image` non usato per trimarano.webp — LCP mobile scadente.

### Da round 3 audit (GDPR — blockers go-live)
- **CRITICA**: Checkbox Privacy/T&C + visualizzazione cancellation policy PRIMA del pagamento. Modello `ConsentRecord(customerId, bookingId, policyVersion, acceptedAt, ip, userAgent)`.
- **CRITICA**: Pagine `/privacy`, `/terms`, `/cookie-policy` — ora 404, linkate nel footer. Legal copy da fornire al cliente.
- **CRITICA**: Endpoint Data Subject Rights (export JSON + richiesta cancellazione) in `/b/sessione`.
- **ALTA**: `onDelete: Restrict` Booking→Customer rende cancellazione impossibile. Implementare `anonymizeCustomer()` (mask email+nome) vs delete hard.
- **ALTA**: Data retention cron (implementato in Plan 3 round 3: `/api/cron/retention` per OTP 30g, sessions 90g, rate-limit 7g, stripe events 60g, weather 14g, audit 24mesi). Booking/Customer retention 10y (art. 2220 c.c.) poi anonymize.
- **ALTA**: IP retention policy documentata (90gg per antifraud, poi anon).
- **ALTA**: Cookie Policy deve dichiarare cookie Cloudflare Turnstile (third-party).
- **MEDIA**: Trasferimenti extra-UE (Stripe US, Cloudflare US) — SCC / EU-US DPF in Privacy Policy.
- **MEDIA**: Footer legale + Privacy link in tutti i template email.

### Da round 3 audit (Edge cases ancora aperti)
- **ALTA**: Cron Stripe reconciliation — rileggere `/v1/events` ultimi N giorni e replayare su webhook handler se mai consegnati.
- **MEDIA**: Nessun TTL/GC su booking PENDING — cleanup cron + `stripe.paymentIntents.cancel`.
- **MEDIA**: Booking startDate senza buffer minimo (es. "almeno 2h di preavviso"). Business rule da aggiungere.
- **MEDIA**: `quotePrice` throws se date oltre PricingPeriod configurato. UI deve impedire selezione o API 400 user-friendly.
- **BASSA**: Confirmation code collision retry (P2002 handler).

### Da round 3 audit (Testing — roadmap)
- 47 test unit OK per pure functions (pricing, dates, html-escape, metadata, advisory-lock, email-normalize, booking helpers)
- **Plan 3+ richiede**: `ioredis-mock` per rate-limit tests, prisma test-db per integration (availability, booking flow, webhook-handler end-to-end)
- **Extract refactors pending**: `computeQuote(period, hotDay, numPeople)` pure in pricing/service, `verifyExpectedAmount(booking, paymentType)` pure in webhook-handler

### Da round 4 audit (supply chain)
- **CRITICA**: `lucide-react@1.8.0` e' linea abbandonata (current 0.x). 37 file lo importano. Verificare manualmente e migrare a `lucide-react@^0.500.0` come Plan 3+ task.
- **ALTA**: `next-auth@5.0.0-beta.30` — bumpare a ultima beta, migrare a GA appena disponibile.
- Gia' rimossi: `shadcn` (era prod dep non usata), `@types/ioredis` + `@types/bcryptjs` (obsoleti, types inclusi nei pacchetti runtime).
- Gia' aggiunto: `.npmrc` con `audit-level=moderate`, `engine-strict=true`.

### Da round 4 audit (business logic)
- **CRITICA**: `capacityMax` non somma booking esistenti. SOCIAL_BOATING (20 posti, 11 min pagamenti) e BOAT_SHARED (12 posti) sono tour CONDIVISI ma `blockDates` blocca l'intera giornata al primo ordine. Serve semantica `PARTIALLY_BOOKED` con contatore cumulativo. Plan 3-4 (Bokun integration e charter) o admin decision.
- **ALTA**: admin cancellation/refund rotti: `admin/_actions/booking-actions.ts` ha `@ts-nocheck` + schema obsoleto. `refundPayment` helper esiste ma nessuno lo chiama. Plan 5.
- **ALTA**: `Cabin Charter` pricing unit — attualmente `pricePerPerson × numPeople`. Per boat-intero (8 posti), tipicamente si vende a pacchetto. Decisione business: aggiungere `Service.pricingUnit: PER_PERSON|PER_BOAT`.
- **MEDIA**: `PricingPeriod` overlap non previsto. Admin puo' creare due periodi sovrapposti → `findFirst orderBy startDate` non deterministico. Aggiungere validation o SQL EXCLUDE constraint.
- **BASSA**: `DirectBooking.bookingId` no vincolo `Booking.source=DIRECT`. Fragile.
- Gia' applicato: enforce server-side `paymentSchedule` = `service.defaultPaymentSchedule`; validazione `minPaying` per ordine singolo; sabato-pivot per `WEEK`.

### Da round 4 audit (API contract)
- **ALTA**: Idempotency-Key su POST /api/payment-intent non supportato. Double-click submit crea 2 booking + 2 PaymentIntent. Plan 3+ con Redis memoization.
- **MEDIA**: API versioning non deciso. Prima di esporre a partner (Bokun integration), decidere `/api/v1/...` vs `Api-Version` header.
- **MEDIA**: `POST /api/payment-intent` ora ritorna 201 + Location + envelope `{data:...}`. Se esporremo ad altri consumatori, documentare lo shape coerente.
- **BASSA**: 207 Multi-Status su cron con partial failures (oggi sempre 200).
- **BASSA**: `/api/health` aggiungere `version` + `uptimeSec`.
- Gia' applicato: `Retry-After` header su 429, `X-Request-Id` end-to-end, `statusCode` rimosso dal body, envelope `{data:...}` sul payment-intent.

### Da round 4 audit (documentation) — gap restanti
- **MEDIA**: JSDoc `@param/@returns/@throws` sui 15-20 export pubblici di `src/lib/` (booking, availability, pricing, stripe). IntelliSense migliora drasticamente.
- **MEDIA**: Sezione "Booking lifecycle" in AGENTS.md con diagramma sequenza ASCII.
- **MEDIA**: `CHANGELOG.md` per tracciare plan completati.
- **BASSA**: architettura diagram duplicato da spec a README.
- Gia' creati: `docs/runbook/operations.md`, `docs/runbook/deployment.md`, `CONTRIBUTING.md`, `.env.example` esteso con Plan 3-6 commentato, README con warning Prisma import + comandi test + troubleshooting 8+ casi.

### Da round 2 audit (UX)
- **Wizard state persistence**: salvare state in sessionStorage + sync step ad URL search param (refresh/back safety).
- **Payment retry**: se Stripe fallisce con `requires_payment_method` terminale, offrire "torna indietro" che ricrea PaymentIntent.
- **Form labels**: `<label>` veri (WCAG 3.3.2) invece di placeholder-as-label su wizard e OTP.
- **Wizard form wrap**: ogni step in `<form onSubmit>` per abilitare Enter-to-submit + native validation.
- **OTP cooldown**: countdown 60s "Reinvia tra Xs" dopo invio.
- **Stripe events**: `checkout.session.expired/async_payment_failed` per notificare cancel.
- **Nationality/language selector** invece di default IT/it silente.
- **Progress indicator** nel wizard ("Passo 2 di 4", aria-current).
- **@ts-nocheck su admin pages**: rimuovere uno a uno — i modelli Prisma esistono, compilerebbero.
- **Duplicate tab**: broadcast channel o idempotency key per prevenire doppi PaymentIntent.
- **Confirmation code case-insensitive**: normalize to uppercase at input.

## Plan roadmap

1. ✅ Plan 1 — DB + Backend foundation (completato)
2. ✅ Plan 2 — Sito + Stripe + OTP (completato + audit fixes)
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
