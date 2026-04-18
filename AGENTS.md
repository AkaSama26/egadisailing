<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Egadisailing Platform V2 — Agent handbook

**Stato**: Plan 1 + Plan 2 + Plan 3 completati + 7 round di audit applicati (code quality, security, concurrency, refactoring, production readiness, UX, integration, meta-review, performance, GDPR, edge cases, testing gap, supply chain, business logic, API contract, documentation, Bokun race/dedup/fan-out, Bokun SSRF/retention/failure modes/observability, regression/schema/cross-flow/deployment). Plan 4-6 da implementare.

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

## Round 5 audit — Plan 3 Bokun (fix applicati)

Quattro audit paralleli (security/integration/concurrency/code quality) hanno trovato:

### Critiche fixate
- **Double-insert race webhook+cron**: `findUnique` era fuori dalla tx → due import concorrenti vedevano `null` entrambi e andavano in P2002 sul `confirmationCode` unique. Fix: tutto in una `$transaction`, handler P2002 che degrada a refetch+update. `src/lib/bokun/adapters/booking.ts`.
- **Reconciliation cron non faceva fan-out availability**: solo il webhook route chiamava `blockDates`/`releaseDates`, quindi un webhook perso → DB OK, ma BoatAvailability mai aggiornata. Fix: helper condiviso `src/lib/bokun/sync-availability.ts` chiamato da entrambi i call site.
- **`mapStatus` substring fragile + default CONFIRMED**: `includes("CANCEL")` matchava `NOT_CANCELLED`; stati sconosciuti diventavano CONFIRMED silenziosamente. Fix: mappa esplicita con `BOKUN_STATUS_MAP`, throw su unknown (6 test vitest aggiunti).
- **`hourAgo` rotto**: `addDays(new Date(), 0).setUTCHours(-1)` restituiva 23:00 UTC del giorno precedente invece di 1h fa. Fix: `addHours(runStartedAt, -1)`.
- **Reconciliation `pageSize=100` senza loop**: persi >100 booking/hour. Fix: loop fino a `bookings.length < pageSize` con MAX_PAGES=20 safety cap.
- **Clock skew su `lastSyncAt`**: salvato come `new Date()` post-run → eventi con updatedAt borderline venivano persi. Fix: `nextSince = runStartedAt - 30s` (buffer), capture pre-fetch.
- **Self-echo window 120s insufficiente per OTA**: Bokun come hub Viator/GYG può rimandare webhook minuti dopo. Fix: esteso a 600s + commento che motiva. `src/lib/availability/service.ts`.
- **Webhook dedup mancante**: nessuna tabella analoga a `ProcessedStripeEvent`. Fix: `ProcessedBokunEvent(eventId, topic, processedAt)` con `eventId = sha256(topic|bookingId|timestamp|signature)`, insert-first con catch P2002 → 200 duplicate. Migration `20260418180000_round5_bokun_dedup`.
- **HTTP retry assente su 429/5xx**: fetch singolo, failure network o 503 rimbalzava come fatale. Fix: wrapper con backoff esponenziale (3 attempt, `Retry-After` onorato, cap 10s).
- **Logger leak `upstreamBody`**: full response body Bokun finiva nei log anche con PII. Fix: redact `*.upstreamBody`/`*.responseBody` in pino + troncamento 500 char prima del log.
- **Webhook `NextResponse.json` per errore non configurato**: inconsistente con resto del route. Fix: `throw new AppError("WEBHOOK_NOT_CONFIGURED", ..., 500)` → `withErrorHandler` fa il resto.
- **`importBokunBooking` tornava solo `string`**: caller faceva `findUnique` extra per leggere `boatId/startDate/endDate`. Fix: ritorna `ImportedBokunBooking` con tutti i campi necessari al fan-out.

### Deferred (Plan 4+/5)
- **CRITICA**: Webhook body `bookingId` trusted — signer Bokun firma solo gli header, non il body. Con replay di un set firmato valido + sostituzione body, un attaccante può forzare import di booking arbitrari. Da verificare sui doc API Bokun se esiste `x-bokun-booking-id` firmato; altrimenti aggiungere header custom con body hash.
- **ALTA**: Replay protection timestamp (±5min window) non presente. Dedup via `ProcessedBokunEvent` copre i replay finché il signature cambia; aggiungere finestra temporale sul `x-bokun-date` in Plan 4.
- **ALTA**: PII in `BokunBooking.rawPayload` (firstName, email, phone, country, passengers) non redacted. Retention cron Plan 3 non la anonimizza. Fix GDPR: whitelist fields prima del save o column-level encryption. Plan 5.
- **ALTA**: `numPeople`/`totalPrice` non validati vs `capacityMax` o range minimo. Bokun buggato o attaccante via #1 può scrivere `totalPrice=0` o `numPeople=999`. Serve Zod schema stretto su `getBokunBooking`.
- **ALTA**: `capacityMax` ignora booking attivi per SOCIAL_BOATING/BOAT_SHARED — finding pre-esistente. `bokun-availability-worker` pusha 0 o max senza contare i posti residui. Plan 4.
- **ALTA**: `scheduleBokunPricingSync` esiste ma nessun caller lo invoca: admin HotDayRule CRUD mancante. Dead code fino a Plan 5.
- **MEDIA**: Rate limit + origin check su `/api/webhooks/bokun` e `/api/cron/bokun-reconciliation`. Plan 4.
- **MEDIA**: Test adapter/worker mancanti (`importBokunBooking`, worker job handlers, webhook route integration). Solo `mapStatus` + `signer` + `verifier` testati oggi.
- **MEDIA**: Decimal precision in `bokun-pricing-worker`: `amount.toNumber()` + integer in DB. Passare stringa Decimal a Bokun e salvare `toFixed(2)`.
- **BASSA**: Queue router per canale (`sync.bokun` vs `sync.boataround`) per non far iterare ogni worker su ogni job. Plan 4.
- **BASSA**: Rotazione `BOKUN_WEBHOOK_SECRET_NEXT` per zero-downtime key rotation.

## Round 6 audit — deferred + chaos + observability (fix applicati)

Quattro audit paralleli (deferred deep-dive/failure modes/observability/test gap).

### Critiche fixate
- **SSRF path-traversal via `bookingId`** (nuovo): `String(body.bookingId)` interpolato in `/booking.json/booking/${id}` senza regex o `encodeURIComponent`. Un body firmato + replay con `bookingId="../activity.json/123"` avrebbe pivotato a endpoint arbitrari autenticati. Fix: `bokunBookingIdSchema` Zod (`/^[A-Za-z0-9_-]{1,64}$/`) + `encodeURIComponent` in `getBokunBooking`. `src/lib/bokun/schemas.ts`, `src/lib/bokun/bookings.ts`.
- **Response validation mancante**: `getBokunBooking` tornava any, `numPeople`/`totalPrice` non validati → DB pollution. Fix: `bokunBookingResponseSchema` Zod con range check (numPeople 1..100, totalPrice 0..1M). `searchBokunBookings` drop silenzioso con warn log su booking malformati.
- **Rate limit webhook + cron Bokun**: nessun cap. Fix: `enforceRateLimit` 60/min per IP sul webhook (PRIMA della verifica HMAC, CPU-bound), 10/min sul cron (secret leak → DoS limitato). Scopes: `BOKUN_WEBHOOK_IP`, `BOKUN_CRON_IP`.
- **Reconciliation cron overrun/multi-replica**: node-cron multi-pod fires 2x + run > 5min sovrascrive cursore. Fix: `tryAcquireSessionAdvisoryLock(db, "cron", "bokun_reconciliation")` con `try/finally` release → single-flight cross-replica.
- **ProcessedBokunEvent retention mancante**: crescita infinita (1k/day = 365k/y). Fix: delete > 30g nel cron retention.
- **PII in `rawPayload` (GDPR minimization)**: `buildSafeRawPayload` salva solo id/productId/status/channelName/date/numPeople/price/currency — niente firstName/lastName/email/phone/passengers dettagli (vivono su `Customer` con policy anonymization). Retention cron ri-redige vecchi payload dopo 90g con marker `_redacted:true` idempotent.
- **No SIGTERM handler → job loss su redeploy**: `register-workers.ts` registra `process.on("SIGTERM"|"SIGINT")` che chiude workers/Redis/DB pulito con hard timeout 15s. `registerWorker()` helper accumula Worker instance in globalThis per lo shutdown.
- **BokunClient retry senza jitter + no timeout**: thundering herd a retry 2/3 + hang infinito possibile. Fix: `Math.random() * 500` jitter + `AbortSignal.timeout(15_000)` su ogni request.
- **BullMQ worker senza limiter**: 20 celle changed in burst = 20 POST simultanei → 429. Fix: `{ concurrency, limiter: { max, duration } }` su availability (10/s) e pricing (5/s) workers.
- **Logger leak `err.meta`**: Prisma P2002 ritorna `meta.target: ["email"]` con valori originali. Fix: aggiunto `*.meta` e `err.meta` a `REDACT_PATHS` pino.
- **Webhook HMAC invalid log insufficiente**: impossibile distinguere attacco da rotation misconfig. Fix: log `{ ip, userAgent, signaturePrefix: sig.slice(0,8), topic }` su fail.
- **`instrumentation.ts` no try/catch**: errore boot crashava tutto il processo Next. Fix: try/catch per-componente (scheduler, workers) con `logger.fatal` → degraded mode invece di crash loop.
- **Healthcheck shallow cieco su BullMQ + canali**: `?deep=1` variant include queue job counts + `ChannelSyncStatus` (503 se RED o failed > 100). Shallow resta per liveness probe (deve restare 200 anche con Bokun RED → DIRECT booking continua).
- **Retention cron silently swallows errors**: fallimenti parziali ritornavano 200. Fix: array `errors[]` + response 207 con lista se qualcosa fallisce.

### Deferred (Plan 4+/5)
- **CRITICA**: Webhook body `bookingId` non firmato (signer Bokun copre solo header). Mitigato da SSRF fix + rate-limit, ma teoricamente un attaccante con header firmato leakato puo' forzare import on-demand di qualsiasi booking del vendor. Risolvibile solo se Bokun espone `x-bokun-booking-id` firmato.
- **ALTA**: Replay timestamp window (±5min su `x-bokun-date`) non implementata — dedup `ProcessedBokunEvent` copre replay con stessa signature, ma rifirma Bokun cambia eventId.
- **ALTA**: `blockDates`/`releaseDates` N+1 outside transaction: 7 giorni seriali. Failover Postgres al giorno 4/7 lascia drift permanente. Fix: batch raw SQL `INSERT ... ON CONFLICT` + single-range fan-out. Plan 4+.
- **ALTA**: Outbox pattern reale per fan-out: se Redis cade dopo commit DB, il fan-out e' perso senza recovery. Reconciliation cron non ri-fa fan-out dello stato DB→celle. Plan 4+.
- **ALTA**: Multi-replica leader election (BullMQ repeatable job) per sostituire node-cron — advisory lock copre overrun, non ancora concurrency multi-pod al fire-time.
- **ALTA**: `bokun-availability-worker` non rilegge DB prima di pushare su Bokun — ordine fuori sequenza su concurrency=3 puo' scrivere stato stale. Coalescenza jobId copre il caso "stessa cella", ma servizi diversi sulla stessa boat-date sono separati.
- **ALTA**: `customer.upsert` dentro tx race su email unique normalizzata (P2002 solo su `bokunBookingId` gestito). Plan 4+.
- **MEDIA**: Sentry wiring (`SENTRY_DSN` commentato in `.env.example`). Serve init in `instrumentation.ts` + `withErrorHandler` 500 branch capture.
- **MEDIA**: `ChannelSyncLog` append-only: oggi `lastError` sovrascritto → storico incident perso.
- **MEDIA**: Runbook gaps — "Bokun API giu' > 1h", "webhook HMAC fail burst", "reconciliation RED > 1h", GDPR SAR export, incident post-mortem template.
- **MEDIA**: Funnel conversion metrics (PI created → CONFIRMED → timeout) + Stripe webhook latency tracking.
- **MEDIA**: `requestId` non propagato ai `logger.info/warn/error` business — solo `reqLogger` locale al wrapper. Serve AsyncLocalStorage.
- **MEDIA**: `sendConfirmationEmail` silent failure post-booking: accodare a BullMQ con retry + dead-letter (oggi solo `.catch(log)`).
- **MEDIA**: `balance-reminders` reset `balanceReminderSentAt=null` su errore → doppio invio possibile con Brevo intermittente.
- **BASSA**: Queue router per canale (`sync.bokun` vs `sync.boataround`) — oggi ogni worker itera ogni job.
- **BASSA**: `err.stack` troncato a 2000 char (gia' applicato), ma `err` intero ancora loggato altrove.
- **BASSA**: Rotazione `BOKUN_WEBHOOK_SECRET_NEXT` zero-downtime.
- **BASSA**: No pino `base: { release: GIT_SHA }` per correlare log a release.
- **BASSA**: Cron scheduler self-fetch HTTP a `APP_URL` — preferibile chiamata handler diretta.

### Test coverage gap (infra mancante)
Top 10 gap da colmare pre-go-live (ordine di rischio):
1. `importBokunBooking` path completo (L) — integration con prisma test-db
2. Webhook Bokun route integration (L) — HMAC reject/dedup/topic
3. Reconciliation cron pagination+clock-skew (M)
4. `availability/service.ts` advisory lock + self-echo 600s (L)
5. `booking/create-direct.ts` server-side invariants (M)
6. Stripe webhook triple dedup + amount mismatch (M)
7. `BokunClient` retry/timeout (S, quick win)
8. `booking/confirm.ts` idempotency gate (M)
9. Bokun workers capacityMax/markup (M)
10. `sync-availability`+`fan-out` helper (S)

Infra necessaria: pglite/testcontainers, ioredis-mock, @playwright/test, vitest setup. Rimandata a Plan 6.

## Round 7 audit — regression + schema + cross-flow + deployment (fix applicati)

Quattro audit paralleli: regression su fix Round 6, DB schema deep-dive, cross-integration booking flow, production deployment readiness.

### Critiche fixate
- **Advisory session lock buggato su Prisma pool** (R7-C1): `pg_try_advisory_lock`/`pg_advisory_unlock` finivano su connessioni diverse del pool (max=20) → `unlock` no-op silenzioso, lock de facto permanente. Fix: sostituito con **Redis lease** via SETNX+TTL (`src/lib/lease/redis-lease.ts`). Atomic, multi-replica safe, auto-libera al TTL se il processo crasha. Rimosso helper `tryAcquireSessionAdvisoryLock`/`releaseSessionAdvisoryLock` per evitare misuse.
- **Zod `numPeople.min(1)` bloccava webhook Bokun con gift voucher** (R7-C2): Bokun invia `numPeople: 0` su alcuni booking legacy — strict parse causava webhook 500 + retry loop. Fix: `.min(0)` + fallback `?? 1` a livello DB insert.
- **Double booking cross-channel DIRECT+BOKUN** (Scenario 1): `createPendingDirectBooking` controllava solo `BoatAvailability.BLOCKED`, non `Booking` attivi PENDING/CONFIRMED. Un webhook Bokun arrivato durante checkout DIRECT creava un secondo Booking sulla stessa slot. Fix: aggiunto pre-check 2 su `Booking` overlapping `{ startDate: { lte: endDay }, endDate: { gte: startDay } }` dentro l'advisory lock. Lato Bokun: warn log se rileva overlap DIRECT (Bokun ha gia' committato upstream, serve azione admin).
- **Refund non rilasciava availability** (Scenario 2): `onChargeRefunded` aggiornava solo `Payment.status`. Fix: full refund ora updata `Booking.status=REFUNDED` in tx + `releaseDates(CHANNELS.DIRECT)` post-commit. Partial refund mantiene lo slot (il cliente viene comunque).
- **Stripe webhook `return` su `!booking`** (Scenario 3): su replica lag Postgres, il webhook ritornava 200 senza confermare, Stripe non ritentava, evento perso. Fix: `throw ValidationError` → Stripe ritenta fino a risoluzione replica.
- **Rate-limit hang on Redis down** (R7-A2): `getRedisConnection()` con `maxRetriesPerRequest: null` (necessario per BullMQ) fa queue i comandi → `enforceRateLimit` si blocca minuti durante outage. Fix: `Promise.race` con timeout 3s + fail-open (log warn). Meglio un rate-limit bypass temporaneo che perdere webhook critici.

### Alte fixate
- **Health check `deep=1` esposto senza auth** (R7-M2): rivelava queue counts, error message, channel health. Fix: `deep=1` richiede Bearer CRON_SECRET (timing-safe compare). Fallback a shallow senza 401 (health per liveness probe deve restare 200).
- **Retention redaction `take:500` senza loop** (R7-M3): backlog iniziale silenziosamente distribuito su N giorni. Fix: cursor-based loop con MAX_BATCHES=20 (cap 10k/run), log warn se hit del cap.
- **`Service.bokunProductId` non unique**: due service potevano puntare stesso Bokun product → doppio push. Fix: `@unique` + partial index Postgres (NULL-distinct via WHERE).
- **`Payment.stripeRefundId` non unique**: webhook `charge.refunded` replay poteva match multiple row. Fix: `@unique` + partial index.
- **`AuditLog.timestamp` index standalone mancante**: retention deleteMany usava compound `(userId, timestamp)` che NON supporta full-scan su timestamp. Fix: aggiunto `@@index([timestamp])`.
- **`BoatAvailability.date` index standalone mancante**: query admin calendario cross-boat facevano seq-scan. Fix: `@@index([date])`.
- **Retention whitelist estesa**: ora tiene `paymentStatus` + `passengerCount` (campi non-PII) per audit fiscale 10-anni art. 2220 c.c.
- **`email()` strict droppa booking legacy Bokun**: `searchBokunBookings.safeParse` loggava solo 3 issues senza `bokunBookingId`. Fix: include `bokunBookingId` + `confirmationCode` nel warn log per diagnosi manuale.
- **Dockerfile non copiava Prisma CLI** (deployment CRITICA-4): `npx prisma migrate deploy` a runtime falliva. Fix: COPY `node_modules/prisma`, `@prisma`, `.bin/prisma` + entrypoint `docker/entrypoint.sh` che esegue `prisma migrate deploy` prima di `node server.js`.

### Deferred (bloccanti go-live che richiedono lavoro dedicato)
- **CRITICA — GDPR ConsentRecord**: modello mancante (Round 3 segnalato). Blocca go-live finche' non c'e' checkbox Privacy+T&C nel wizard + pagine /privacy /terms /cookie-policy + endpoint Data Subject Rights. Lavoro ~1 settimana incluso copy legale dal cliente.
- **CRITICA — Exclusion constraint `Booking (boatId, daterange, status)`**: difesa DB-level vs double booking cross-channel. Richiede `CREATE EXTENSION btree_gist` + raw migration. Plan 4.
- **CRITICA — deployment infra completa**: `docker-compose.prod.yml`, `Caddyfile` (reverse proxy+TLS+security headers), backup sidecar S3/B2, CI/CD GitHub Actions, uptime monitor esterno, log aggregation, staging env. ~3-5 giornate ingegnere.
- **CRITICA — `admin/_actions/booking-actions.ts` rotto**: `@ts-nocheck` con schema obsoleto, refund/cancel admin non funziona fuori dal webhook Stripe. Plan 5.
- **ALTA — Customer.email case-insensitive**: oggi `Mario@X.it` ≠ `mario@x.it`. `normalizeEmail` app-level ma bypass in admin actions. Fix sicuro richiede CITEXT extension + data migration (controllare email miste-case esistenti). Defer a Plan 5.
- **ALTA — `Booking.customerId onDelete: Restrict`**: blocca GDPR erasure. Serve `anonymizeCustomer()` helper (mask email + nomi) invece di delete hard. Plan 5.
- **ALTA — `DirectBooking.bookingId` no vincolo `source=DIRECT`**: trigger Postgres o view-based check.
- **ALTA — `BokunPriceSync.hotDayRuleId` non-FK**: orphan rows invisibili se HotDayRule cancellata.
- **ALTA — index `Booking_source_status_startDate`**: compound per reconciliation cron (oggi separati).
- **MEDIA — Confirmation code P2002 retry handler**: spazio collision trascurabile ma non zero. Wrap `tx.booking.create` in loop 3x con regen.
- **MEDIA — `BokunBooking.createdAt` per retention**: oggi filtro usa `booking.createdAt` via join → seq-scan. Aggiungere colonna dedicata.
- **MEDIA — Check constraints**: `numPeople > 0`, `totalPrice >= 0`, `currency = 'EUR'`, VarChar limits su Customer fields.
- **MEDIA — `PricingPeriod` overlap constraint**: EXCLUDE USING gist (gia' noto Round 4).
- **MEDIA — `HotDayOverride` partial unique NULL-aware**: gia' noto Round 3.
- **MEDIA — AbortSignal wall-clock bounded**: retry worst case 48-50s supera webhook budget proxy 30-60s.
- **MEDIA — Stripe events reconciliation cron** (noto Round 2): legge `/v1/events` e replaya mancati.
- **MEDIA — `sendConfirmationEmail` silent failure** (noto Round 6): accodare a BullMQ con retry+DLQ.
- **MEDIA — SIGTERM shutdown con job pending**: worker idempotency jobId deterministico + limiter OK, ma Plan 4+ valutare drain pattern `worker.pause()+await active=0`.
- **BASSA — Dead models**: `SyncQueue`, `WeatherGuaranteeApplication`, `CrewAvailability`, enum `SyncStatus`, `PaymentMethod.POS/STRIPE_LINK` mai usati. Drop in Plan 6 cleanup.

## Plan roadmap

1. ✅ Plan 1 — DB + Backend foundation (completato)
2. ✅ Plan 2 — Sito + Stripe + OTP (completato + audit fixes)
3. ✅ Plan 3 — Bokun integration (completato + round 5 audit fixes)
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
