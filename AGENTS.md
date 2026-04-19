<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Egadisailing Platform V2 — Agent handbook

**Stato**: Plan 1 + Plan 2 + Plan 3 + Plan 4 + Plan 5 + Plan 6 (weather + notifications core) completati + 13 round di audit applicati. Plan 6 E2E Playwright + Sentry deferred a sessione dedicata.

**Test suite**: 106 unit test pure (`npm test`) su pricing/dates/html-escape/metadata/advisory-lock/email-normalize/booking helpers/bokun signer+verifier+adapter/boataround verifier/email-parser extractor/iCal formatter/weather risk-assessment (incluso NaN/null guard + partial data).

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

## Plan 4 — Charter integrations (completato)

Strategia ibrida per 4 canali charter:

| Canale | Modo | Detail |
|---|---|---|
| **Boataround** | API REST bidirezionale | `src/lib/boataround/*` client (retry+jitter+timeout) + webhook endpoint HMAC-SHA256 + worker availability 10/s limiter |
| **SamBoat** | iCal export + email import | `GET /api/ical/[boatId]` feed RFC5545 (cache 15min, rate-limit 30/min IP) + parser email `src/lib/email-parser/samboat.ts` |
| **Click&Boat** | Email parse + manual alert | Parser email + `ManualAlert` table PENDING → admin agisce manualmente sul portale |
| **Nautal** | Email parse + manual alert | Idem Click&Boat |

**Moduli chiave**:
- `src/lib/ical/formatter.ts` — RFC5545 writer (CRLF, line folding <75 octets, escape, DTEND exclusive). 5 test.
- `src/lib/ical/generator.ts` — raggruppa `BoatAvailability.BLOCKED` contigui in VEVENT stabile `egadisailing-booking-{bookingId}`.
- `src/lib/boataround/{client,bookings,availability,schemas,webhook-verifier}.ts` — stesso shape Bokun (Zod response, SSRF-safe id, retry+jitter+AbortSignal.timeout, P2002 race handler).
- `src/lib/boataround/adapters/booking.ts` — `mapBoataroundStatus` esplicito + `buildSafeRawPayload` GDPR whitelist.
- `src/lib/email-parser/imap-client.ts` — `imapflow` (non `node-imap` che ha utf7 vulns high). Fetch UNSEEN max 100/run, timeout 30s, mark SEEN solo post-processing.
- `src/lib/email-parser/{samboat,clickandboat,nautal}.ts` — parser template-based. Regex flessibili (ISO o dd/mm/yyyy, EU/US amount format). Parse fallito → null → email resta UNSEEN per review manuale.
- `src/lib/email-parser/booking-extractor.ts` — `parseAmountToCents` / `parseFlexibleDate` / `stripHtml` condivisi, 11 test.
- `src/lib/email-parser/dedup.ts` — `ProcessedCharterEmail` dedup via sha256(Message-ID), insert-first con P2002 handler.
- `src/lib/email-parser/dispatcher.ts` — domain-based routing (endsWith .samboat.com ecc).
- `src/lib/charter/booking-import.ts` — upsert Customer (normalizeEmail) + Booking + CharterBooking con cross-channel warn su DIRECT overlap.
- `src/lib/charter/manual-alerts.ts` — `ManualAlert` PENDING/RESOLVED/IGNORED, idempotent dedup su slot.
- `src/lib/queue/workers/boataround-availability-worker.ts` — limiter 10/s.
- `src/lib/queue/workers/manual-alert-worker.ts` — traduce fan-out `availability.update` per Click&Boat/Nautal in `ManualAlert` row.

**Endpoints**:
- `GET /api/ical/[boatId]` — feed pubblico iCal (rate-limit 30/min, cache 15min).
- `POST /api/webhooks/boataround` — HMAC-SHA256 + rate-limit 60/min + `ProcessedBoataroundEvent` dedup.
- `GET /api/cron/email-parser` — Bearer CRON_SECRET + Redis lease single-flight + cron ogni 5 min sfasato 2min dal Bokun.

**Migrations**: `20260418210000_plan4_charter` (ProcessedBoataroundEvent), `20260418210500_plan4_email_dedup` (ProcessedCharterEmail), `20260418211000_plan4_manual_alerts` (ManualAlert + enum).

**Retention**: ProcessedBoataroundEvent 30g, ProcessedCharterEmail 90g (aggiunti al cron retention).

**Test nuovi**: 21 (iCal formatter 5, Boataround webhook verifier 5, extractor helpers 11). Total 88 test passanti.

**Deferred Plan 4+/5**:
- Stripe-style reconciliation cron per Boataround (webhook persi)
- Boat resolution da subject email (oggi default first boat)
- Parser email template snapshot-test con email reali dal cliente
- Auto-resolve manual alerts via iCal polling del portale esterno
- `Boat.boataroundBoatId` explicit mapping se upstream usa slug diverso
- Integration test suite (pglite + ioredis-mock) per adapter+webhook+cron

## Round 8 audit — Plan 4 charter (fix applicati)

Quattro audit paralleli sul Plan 4 (security/email injection, cross-channel race, parser robustness, ops+GDPR+testing).

### Critiche fixate
- **`parseAmountToCents("1.234")` interpretato come 1€23 invece di 1234€**: heuristica rotta causava **errore 1000x silent** su amount EU migliaia senza decimali. Fix: branch esplicito "3 cifre dopo ultimo separatore + nessun altro" → thousands.
- **`parseFlexibleDate` accettava mm/dd silent**: `"07/15/2026"` → `Date.UTC(2026, 14, 7)` = 7 marzo 2027 (month overflow). Fix: strict dd/mm EU + reject `m>12` + round-trip validation (`31/02/2026` rigettato).
- **iCal UID duplicato su range non contigui stesso booking**: viola RFC5545 §3.8.4.7, Google Calendar silently-drop il secondo VEVENT. Fix: UID include SEMPRE `startKey-idx` anche quando bookingId presente.
- **iCal line folding contava chars JS invece di ottetti UTF-8**: rotto con accenti (`à` = 2 ottetti UTF-8). Fix: `Buffer.byteLength` + fold safe sui code-point multi-byte + no split di 2-char escape sequence.
- **Autoblock availability senza sanity check range**: email spoofata con regex match "2026-01-01 to 2099-12-31" avrebbe creato 26k `BoatAvailability` + altrettanti fan-out job. Fix: `validateCharterInput` enforce max 30g durata, max 2y future, min 50€ / max 100k€ total.
- **PII in `CharterBooking.rawPayload.subject`**: subject email contiene regolarmente nome cliente. Fix: rimosso da whitelist `buildSafeRawPayload`.
- **Loop fan-out cross-channel BOKUN ↔ BOATAROUND**: `updateAvailability` faceva upsert + enqueue fan-out anche quando stato non cambiava → ping-pong API upstream infinito. Fix: early return `shouldFanOut: false` se `status` + `lockedByBookingId` uguali (aggiornando solo `lastSyncedSource`).
- **Fan-out inutile verso canali iCal**: SAMBOAT non ha worker (e' pull-based); job venivano estratti e scartati da ogni worker. Fix: `fanOutAvailability` skippa canali con `CHANNEL_SYNC_MODE === ICAL`.

### Alte fixate
- **Cancellation charter persa**: parser riconoscevano solo confirm. Fix: `detectCancellationKeywords` (IT/EN/FR/ES coverage) + parser dichiara `status: "CONFIRMED"|"CANCELLED"` + `importCharterBooking` update existing booking a CANCELLED + `releaseDates` post-commit.
- **`ManualAlert` race duplicati**: `findFirst` + `create` fuori tx su worker concurrency=3. Fix: `acquireTxAdvisoryLock` + partial unique index `ManualAlert (channel, boatId, date, action) WHERE status='PENDING'` (migration `20260418220000_plan4_round8_manual_alert_unique`).
- **Boataround worker usava `data.status` stale dal payload**: coalescenza jobId BullMQ puo' passare update fuori ordine. Fix: worker rilegge `BoatAvailability` da DB prima di chiamare upstream (pattern Bokun-compliant).
- **HMAC Boataround su `req.text()` (UTF-8 decode)**: BOM/charset non-UTF-8 divergeva dai bytes firmati upstream. Fix: `req.arrayBuffer()` → `Buffer.from(...)` + `verifyBoataroundWebhook` accetta Buffer.
- **Multi-value `x-boataround-signature` header**: `fetch` concatena con `, ` causando verify fail "silente". Fix: reject esplicito se `signature.includes(",")`.
- **HTML bomb / ReDoS nei parser email**: `simpleParser` senza limiti + body email non capped. Fix: `MAX_MESSAGE_SIZE_BYTES=5MB` skip ingest + `maxHtmlLengthToParse=1MB` su simpleParser + `MAX_PARSER_TEXT_LENGTH=200KB` nei 3 parser.
- **`normalizeEmail` NON invocato nei parser** (violazione invariant #17): Gmail alias/case bypassavano Customer dedup. Fix: tutti e 3 parser usano `normalizeEmail(emailMatch[0])`.
- **Message-ID dedup poisoning**: attaccante pre-marca hash → email legittima droppata. Fix: hash include `from` — attaccante con Message-ID fake da dominio diverso ha hash diverso.
- **`markEmailsSeen` non paginato**: backlog 10k+ UID in singola UID SET saturava limite server IMAP. Fix: chunk da 500 UID.
- **Message-ID fallback collision-prone**: `no-id-${Date.now()}-${uid}` collideva a ms-level. Fix: `crypto.randomUUID()`.
- **Booking ref in iCal `DESCRIPTION`**: espone ID interno su feed pubblico. Fix: `description = "Prenotato"` sempre.

### Deferred (Plan 5+/runbook)
- **CRITICA — SPF/DKIM/DMARC verification**: `imapflow`/`mailparser` non verificano autenticazione mittente. Attaccante spoofa `From: noreply@samboat.com` → import fake booking + DoS su alta stagione. Richiede DMARC config upstream + check `Authentication-Results: dkim=pass` nel dispatcher. Documentare in runbook come OBBLIGATORIO pre-go-live Plan 4.
- **CRITICA — IMAP mailbox erasure GDPR**: email con PII restano sul server dopo `markSeen`. Richiesta art. 17 non implementabile. Fix: cancellare messaggi processati (o move a folder `Processed/`). Plan 5.
- **ALTA — iCal feed secret/token per-boat**: `/api/ical/[boatId]` espone BLOCKED dates chi conosce il boatId. Pattern Airbnb: `/api/ical/[boatId]/[token]`. Plan 5 admin CRUD per token rotation.
- **ALTA — iCal METHOD:CANCEL propagation**: `releaseDates` rimuove VEVENT ma Google Calendar conserva stale. Serve `publishedCancellations` table per emettere `STATUS:CANCELLED`.
- **ALTA — Parser snapshot tests**: chiedere al cliente email campione reali anonimizzate, fixture dir + test regressione template drift.
- **ALTA — SIGTERM IMAP connection cleanup**: cron email-parser apre ImapFlow locale al request-scope, non tracciato dal shutdown handler. Richiede AbortSignal propagato.
- **MEDIA — `ManualAlert.notes` Plan 5 UI**: escape HTML obbligatorio quando la dashboard admin renderizza il campo (mai HTML raw injection).
- **MEDIA — Deep health check IMAP/Boataround probe**: oggi `/api/health?deep=1` testa solo DB/Redis/queue/channels.
- **MEDIA — Breakdown metrics per platform**: `skippedUnparsed` aggregato non discrimina tra parser buggato e burst email non-charter.
- **MEDIA — `BOATAROUND_WEBHOOK_SECRET_NEXT` rotation zero-downtime**: analogo Bokun Round 5 deferred.
- **MEDIA — Reconciliation cron Boataround**: analogo Bokun, legge eventi upstream e replaya webhook persi.
- **MEDIA — Runbook sections**: "SamBoat template change", "Replay failed email", "Rotate IMAP_PASSWORD", "Disable parser temporaneo".
- **BASSA — Dispatcher subdomain malicious test**: aggiungere test esplicito vs regressione.
- **BASSA — IMAP debug log gate**: `emitLogs: false` → debug difficile prod. Flag `env.IMAP_DEBUG`.
- **BASSA — iCal 24-month window hardcoded**: configurabile env.
- **BASSA — `simpleParser` attachment bomb**: oltre HTML cap, limit allegati.

### Test nuovi (Round 8)
- `parseAmountToCents`: 4 cases (EU thousands, US thousands, confermati decimali)
- `parseFlexibleDate`: 3 cases (US mm/dd reject, 31/02 invalid, year range)
- iCal UTF-8 byte folding (multi-byte safe)

Totale: **95 test** (+7 Round 7→8), typecheck clean, build OK.

## Round 9 audit — app security beyond integrations (fix applicati)

Audit manuale sul perimetro app NON coperto dai round 1-8 (Bokun/Boataround/email parser).

### Alte fixate
- **Admin dashboard layout non verificava `role=ADMIN`**: `src/app/admin/(dashboard)/layout.tsx` controllava solo `!session`. Se in futuro verranno introdotti ruoli diversi (VIEWER/EDITOR/USER con `User.role` oggi `String` default "ADMIN"), tutti vedrebbero la dashboard. Fix: `if (!session?.user || session.user.role !== "ADMIN")` (difesa-in-profondità, allinea con `/api/admin/customers/export`).
- **`/api/payment-intent` senza Turnstile**: rate-limit IP+email (10/h + 5/h) NON blocca un bot pool con IP diversi. Attaccante creava Stripe PaymentIntent fittizi + PENDING booking stuck in DB. Fix: aggiunto `verifyTurnstileToken` (stessa logica del recovery OTP — enforced prod, optional dev). Schema Zod accetta `turnstileToken: z.string().optional()`.
- **`recupera-prenotazione/actions.ts` usava `.toLowerCase()` invece di `normalizeEmail`**: violazione invariant #17. Gmail alias `mario+tag@gmail.com` non trovava il Customer salvato come `mario@gmail.com`. Fix: sostituito con `normalizeEmail()` sia in `requestOtp` che in `verifyOtpAndLogin`.
- **CSV formula injection nell'admin customer export**: `escapeCsv` gestiva `,`/`"`/`\n` ma NON il prefisso `=`/`+`/`-`/`@`/`\t`. Admin apre CSV in Excel → formula `=HYPERLINK(...)` eseguita. Fix: prefisso `'` su valori che iniziano con caratteri pericolosi.

### Deferred (Plan 5)
- **CRITICA — Turnstile widget client**: né `booking-wizard.tsx` né `recupera-prenotazione/client.tsx` renderizzano il widget Cloudflare Turnstile. In prod il check server throws `ValidationError` senza token. Plan 5 MUST integrare `<Turnstile data-sitekey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}>` con script loader. Senza questo, il payment-intent e il recovery OTP sono inutilizzabili in prod.
- **ALTA — Admin role enum**: `User.role` e' `String` con default "ADMIN". Convertire a Postgres enum `AdminRole` (ADMIN, EDITOR, VIEWER) + UI admin per CRUD utenti Plan 5.
- **MEDIA — Admin CSV export pagination**: oggi `findMany` senza limit, memoria proporzionale. Già noto Round 3 performance.
- **MEDIA — Admin @ts-nocheck pages**: `admin/_actions/booking-actions.ts` + altre pagine admin hanno `@ts-nocheck` con schema obsoleto. Riscrivere in Plan 5.
- **MEDIA — Session cookie SameSite=lax**: accettabile per link inbound email recovery, ma per la dashboard admin si puo' valutare SameSite=Strict separato.
- **BASSA — NextAuth v5 beta.30 → GA**: bumpare appena disponibile.
- **BASSA — `session.user.role` fallback "USER"**: `auth.ts:51` hypothetical branch mai raggiunto oggi (schema default ADMIN), ma da allineare quando introdotto enum.

### Finding verificati come OK
- **Session cookie**: HttpOnly + Secure (prod) + SameSite=lax + hash SHA-256 con 256-bit random token + timing-safe lookup via unique index — OK.
- **`/b/sessione` IDOR**: filtro `customer.email` derivato dal `session.email` server-side — no bookingId in URL, no IDOR.
- **Stripe webhook metadata**: `bookingId` viene scritto server-side al momento della creazione PI, non accettato da client → no IDOR via metadata spoofing.
- **OTP verify**: rate-limit email+IP + timing-safe hash compare + atomic `verifyOtp` — OK.
- **Middleware i18n**: correttamente esclude `api|admin|_next|_vercel`, admin e' protetto dal `layout.tsx` (post-fix).
- **NextAuth password**: bcryptjs `compare` timing-safe — OK.

## Plan 5 — Dashboard admin (completato)

13 sezioni (rotte italiane) accessibili da sidebar unificata. Layout protetto
con `auth()` + `role=ADMIN` check (Round 9 hardening). Tutte le mutation passano
per `auditLog` + `revalidatePath`.

| Rotta | Scope | Server Actions |
|---|---|---|
| `/admin` | Dashboard KPI (revenue mese/anno, booking count, uscite future, saldi pendenti) + ManualAlert banner + Channel health pills | — |
| `/admin/prenotazioni` | Lista cross-source con filtri (DIRECT/BOKUN/BOATAROUND/SAMBOAT/CLICKANDBOAT/NAUTAL × PENDING/CONFIRMED/CANCELLED/REFUNDED) · limite 200 | — |
| `/admin/prenotazioni/[id]` | Dettaglio + cliente + pagamenti + note · bottone Cancella+refund + form registra pagamento manuale (CASH/BANK_TRANSFER) + note | `cancelBooking`, `addBookingNote`, `registerManualPayment` |
| `/admin/calendario` | Grid mensile per barca · color coding per source · BLOCKED/PARTIALLY_BOOKED/AVAILABLE · navigazione prev/next/oggi | — |
| `/admin/disponibilita` | Block/release manuale range per boat (max 90g) · fan-out verso tutti i canali esterni via `blockDates`/`releaseDates` | `manualBlockRange`, `manualReleaseRange` |
| `/admin/prezzi` | CRUD PricingPeriod (€/pax base stagionale) + HotDayRule (moltiplicatori su range/weekdays) · ogni modifica accoda `scheduleBokunPricingSync` | `upsertPricingPeriod`, `upsertHotDayRule`, `deleteHotDayRule` |
| `/admin/servizi` | Catalog read-only (seed DB) — verifica bokunProductId mapping | — |
| `/admin/clienti` | Lista 200 recenti + ricerca (nome/cognome/email) + link Export CSV | — |
| `/admin/clienti/[id]` | Dettaglio + speso totale netto refund + storico prenotazioni | — |
| `/admin/crew` | Tabella crew + form add/toggle active (SKIPPER/CHEF/HOSTESS) | `upsertCrewMember`, `assignCrewToBooking`, `toggleCrewActive` |
| `/admin/finanza` | KPI revenue mese/anno (lordo + netto refund) + groupBy source + groupBy servizio YTD | — |
| `/admin/canali` | Channel health per CHANNELS · lastSyncAt + lastError + sync mode (API/iCal/Email) | — |
| `/admin/meteo` | Prossimi 7gg uscite CONFIRMED con forecast `WeatherForecastCache` (Plan 6 popolera' il cache) | — |
| `/admin/sync-log` | BullMQ queue counts + ManualAlert pendenti + ultimi 20 event dedup per canale + AuditLog ultimi 50 | — |
| `/admin/impostazioni` | Account info + link utili (health deep, CSV export) | — |

### Hardening applicato
- Layout: `session?.user?.role !== "ADMIN"` → redirect (Round 9)
- Ogni server action: `requireAdmin()` (Unauthorized/Forbidden throw)
- `auditLog` su CREATE/UPDATE/DELETE/CANCEL/ASSIGN/ACTIVATE
- `revalidatePath` post-mutation su URL affected
- Decimal-safe: `Prisma.Decimal` o `.toString()` → `formatEur`, mai `.toNumber()` come boundary
- `cancelBooking` cascata: refund Stripe tutti charge SUCCEEDED + `releaseDates` via `CHANNELS[source]`
- `registerManualPayment` in tx: crea Payment + opzionale `balancePaidAt`
- `manualBlockRange` validazione: range max 90g, endDate > startDate
- `upsertHotDayRule` weekdays filter per fan-out solo su date effettive

### Cleanup eseguito
Rimossi moduli V1 obsoleti che avevano `@ts-nocheck` con schema precedente:
- `src/app/admin/(dashboard)/{bookings,calendar,customers,finance,pricing,settings,trips}/`
- `src/app/admin/_actions/*` (booking/crew/customer/pricing/trip V1)
- `src/app/admin/_components/{booking-form,crew-form,crew-table,customer-table,finance-charts,finance-filters,pricing-form,pricing-table,trip-calendar,trip-form,stats-card}.tsx`

Zero `@ts-nocheck` residuo nell'admin. Sidebar e pagine tutte con schema V2 coerente.

### Deferred Plan 6
- **KPI charts Recharts** — oggi solo numeri singoli. Plan 6: trend mese/anno.
- **Crew auto-assign** su booking create — `assignCrewToBooking` esposto ma UI integrata nella booking detail manca.
- **Admin user CRUD** (User.role enum + UI editor) — ancora deferred Round 9.
- **Impostazioni UI per env non-sensibili** — markup Bokun, soglie rate-limit, config meteo.
- **Filtri avanzati prenotazioni** — range date custom, cliente lookup, esport CSV.
- **Bulk operations** — cancel multiplo, update status batch.
- **Meteo widget integrato in prenotazione detail** + **cron meteo Plan 6**.

## Round 10 audit — Plan 5 admin (fix applicati)

Quattro audit paralleli sul dashboard admin (security, business logic, UX/a11y, integration+metrics).

### Critiche fixate
- **BL-C1 Double-booking via manualReleaseRange**: il release su range con booking attivi scollegava `lockedByBookingId` → Booking resta CONFIRMED ma availability AVAILABLE, altro cliente può prenotare cross-channel. Fix: guard `booking.findMany` overlapping status IN ('PENDING','CONFIRMED') → ValidationError con lista codici prima di procedere.
- **BL-C2 cancelBooking source=BOKUN/BOATAROUND non rilasciava canale origine**: fan-out esclude source → Bokun upstream restava CONFIRMED. Fix: admin-cancel usa `CHANNELS.DIRECT` come source (fan-out a TUTTI gli esterni) + auto-genera `ManualAlert` con notes "cancellare anche upstream sul panel OTA" per source != DIRECT.
- **BL-C3 Race Stripe webhook vs admin-cancel**: booking PENDING con PI in processing, admin cancella, webhook succeeded arriva dopo → Payment SUCCEEDED su Booking CANCELLED (cliente pagato, niente refund). Fix: `cancelPaymentIntent` helper Stripe chiamato PRIMA del cancel + webhook-handler rileva booking CANCELLED/REFUNDED e fa `refundPayment` auto + crea Payment type=REFUND.
- **BL-C4 + Sec-M6 registerManualPayment NaN bypass + no status check**: `parseFloat("")=NaN`, `NaN<=0 === false` → Prisma insert con amount="NaN". E accettava payment su booking CANCELLED. Fix: `Number.isFinite` guard + range max 1M€ + pre-tx booking status check + BALANCE ammesso solo su booking DIRECT.
- **Int-C1 Revenue retroattivo su refund**: `onChargeRefunded` overwrite `Payment.status` → KPI mese precedente cambia a refund successivo (audit fiscale rotto). Fix: `cancelBooking` crea ORA record Payment `type=REFUND` separato + update original a REFUNDED (doppia entry, sum corretto). `webhook-handler` auto-refund su race fa stesso pattern.
- **Int-C2 revalidatePath mancanti**: cancelBooking, registerManualPayment, manualReleaseRange ora revalidano `/admin` + `/admin/finanza` + `/admin/calendario` dove applicabile.
- **Sec-C1 serverActions.allowedOrigins**: non configurato in `next.config.ts` → CSRF/origin reject dietro proxy. Fix: env `SERVER_ACTIONS_ALLOWED_ORIGINS` (comma-separated) + security headers (HSTS prod, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy).
- **Sec-C2 No middleware admin guard**: solo layout check, bypass teorico RSC streaming. Fix: `src/middleware.ts` verifica `token.role === "ADMIN"` su `/admin/*` (eccetto `/admin/login`) PRIMA del rendering.
- **UX-C1 No confirmation azioni destructive**: click accidentale = refund + cancel irreversibile. Fix: `<SubmitButton confirmMessage>` wrapper client con `window.confirm` + `useFormStatus` disabled durante pending. Applicato a cancel+refund, block/release, delete hotDay.
- **UX-C3 No error.tsx/loading.tsx**: errori Server Action = 500 generico. Fix: `error.tsx` con messaggio user-friendly + retry + digest display; `loading.tsx` skeleton KPI+table.

### Alte fixate
- **BL-A1 assignCrewToBooking**: no active/status check. Fix: guard crew.active + booking.status ∈ {PENDING, CONFIRMED}.
- **BL-A2 deleteHotDayRule no re-sync**: Bokun conservava prezzo obsoleto. Fix: `scheduleBokunPricingSync` post-delete sulle date affected (skip past).
- **BL-A3 upsertPricingPeriod overlap silenzioso**: `quotePrice` non-deterministico su overlap. Fix: pre-check `findFirst overlapping` stesso serviceId → ValidationError.
- **BL-A4 HotDayRule date passate**: accoda sync inutile. Fix: reject se `dateRangeEnd < today` + filter past dates in sync enqueue.
- **BL-M4 cancelBooking refund failure no rollback**: il booking finiva CANCELLED senza refund eseguito. Fix: collecting `refundErrors[]` + throw con non-update se errors.length>0 → admin riprova.
- **Int-A1 resolveManualAlert senza UI+audit**: funzione isolata, admin doveva usare psql. Fix: Server Action `resolveAlertAction` con requireAdmin + auditLog + bottone "Risolvi" inline in `/admin/sync-log`.
- **Int-A3/A4 BullMQ silent catch + no failed details**: `0 failed` ingannevole + no failedReason visibile. Fix: `loadQueueStatus` ritorna `{reachable: false}` su error con banner UI + `getFailed(0, 9)` con details espandibili (`<details>`).
- **Sec-A3 Session maxAge default 30gg**: JWT rubato valido un mese. Fix: `maxAge: 8h` (giornata lavoro) + `updateAge: 1h` (session roll).
- **UX-A1 Double-submit tutti i form**: `SubmitButton` usa `useFormStatus` → disabled + label pending.
- **UX-A5 `<html lang="en">`**: screen reader voce inglese su contenuti IT. Fix: `lang="it"`.

### Deferred (Plan 6+)
- **CRITICA — Rate-limit Server Actions destructive** (Sec-A2): admin con JWT compromesso può spammare cancelBooking. Wrapper `requireAdminWithRateLimit` 30/min.
- **ALTA — Step-up auth**: richiesta password per cancelBooking > €X / refund > €X.
- **ALTA — Toast feedback** (UX-C4): Toaster montato ma mai invocato. Server actions dovrebbero ritornare `{ok, message}` + `useActionState` + `toast.success`.
- **MEDIA — Timezone Europe/Rome esplicito** (Int-M1): oggi dashboard `new Date(y,m,1)` (locale server) vs finanza `Date.UTC`. Standardizzare con date-fns-tz.
- **MEDIA — Status color-only** (UX-A2): aggiungere icone lucide per CONFIRMED/CANCELLED/REFUNDED.
- **MEDIA — Table `scope="col"` + caption sr-only** (UX-A3): WCAG 1.3.1.
- **MEDIA — `upsertPricingPeriod` cap range** (Int-M4): max 365g.
- **MEDIA — Skip-to-content link** (UX-M1): sr-only a11y.
- **MEDIA — Confirmation code leak on screen share** (Sec-M2): hover-reveal.
- **MEDIA — Calendario groupBy server** (Sec-M4): O(n*m*k) JS filter → SQL groupBy.
- **BASSA — Emoji 🚨 in dashboard** (UX-B1): sostituire con AlertTriangle icon.
- **BASSA — Copy-to-clipboard confirmationCode** (UX-B2).
- **BASSA — Partial REFUND in registerManualPayment** (BL-M3): enum richiede UI dedicata.
- **BASSA — PENDING > 30min GC cron** (Int-B1): booking orfani inflano KPI.

## Round 11 audit — regression Round 10 + SEO/i18n + tech debt + test gap (fix applicati)

Quattro audit paralleli post-Plan 5 hanno trovato **2 regressioni critiche** nei fix Round 10 + pulizie SEO/i18n bloccanti.

### Critiche fixate
- **Reg-C1 Payment type=REFUND violava unique `stripeChargeId`/`stripeRefundId`**: il fix Round 10 Int-C1 creava un record REFUND riutilizzando gli id del Payment originale gia' updated → **P2002 al 100%** → ogni refund admin fallisce (tx rollback → ValidationError). Fix: record REFUND con `stripeChargeId=null`/`stripeRefundId=null`, identificatori preservati in `note` per correlation audit. Same fix in `stripe/webhook-handler.ts` auto-refund (Reg-C2).
- **SEO-C1 25 locali dichiarati, solo 2 tradotti**: `routing.ts` elencava 25 codici ma solo `it.json`/`en.json` esistono. Sitemap 450 URL (18 pagine × 25 loc) con 92% duplicati IT → Google penalty thin content. Fix: ridotti a `["it", "en"]`; regola: NON aggiungere locale senza file messages/ effettivo.
- **SEO-C3/Reg-A1 `<html lang="it">` hardcoded**: il fix Round 10 rompeva `/en` (screen reader voce IT su contenuti EN, segnale hreflang errato). Fix: `lang={await getLocale()}` nel root layout via `next-intl/server`.

### Alte fixate
- **Reg-A2 Redirect loop admin per role != ADMIN**: user con ruolo diverso da ADMIN faceva signIn→`/admin`→middleware→`/admin/login`→loop. Oggi teorico (schema `User.role` default "ADMIN"), ma difesa preventiva. Fix: in `login/page.tsx` post-signIn `getSession()` + check role, fail-fast con messaggio esplicito senza redirect.
- **Reg-A3 manualReleaseRange count errato**: `take:10` + `overlapping.length` nel messaggio → sottostima. Fix: `count` separato in parallelo con `findMany({take:10})` → messaggio corretto "N booking (mostrati primi 10 di N)".
- **SEO-A1 robots.txt mancante**: `/admin` indicizzabile. Fix: `src/app/robots.ts` dinamico con disallow `/admin`, `/api`, `/b`, `/*/prenota/success`, `/*/recupera-prenotazione`.
- **SEO-M3 `/prenota/[slug]` no noindex**: wizard in SERP con URL contenenti slug servizi. Fix: `export const metadata = { robots: { index: false, follow: false } }`.
- **B3 Middleware NEXTAUTH_SECRET hardcoded**: migration v5 a `AUTH_SECRET` silenziosamente rompe token decode. Fix: `process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET`.
- **M2 Cast fuorviante `booking.source as "CLICKANDBOAT"|"NAUTAL"`**: dopo Round 10 che estende `ManualAlertChannel` a BOKUN/BOATAROUND/SAMBOAT il cast era obsoleto. Fix: `as ManualAlertChannel` con import del tipo.

### Deferred CRITICA (richiedono lavoro dedicato, documentati per Plan 6+)
- **SEO-C2 Zero Open Graph/Twitter Card/canonical/hreflang**: serve `generateMetadata` per-pagina con `openGraph`, `alternates.languages` per-locale, asset `/public/og-*.jpg` 1200×630. Lavoro ~0.5 gg.
- **i18n-C1 Hardcode italiano massiccio** in `about/contacts/boats/experiences/islands/landing-sections` (~40 stringhe): pagine non passano per `useTranslations`. Migration ~1 gg. Senza, `/en` mostra mix IT+EN.
- **i18n-C2 DB dynamic content** (`Boat.name`, `Service.name`, `PricingPeriod.label`): singola stringa non multilingua. Richiede business decision + schema change (JSON per-locale come gia' `Service.description`). Plan 6+.
- **A11y-A2 Contact form NON funzionante**: `contacts/page.tsx` bottone `type="button"` senza action/onSubmit. Utente pensa di inviare, nulla accade. Fix: Server Action con Brevo + Turnstile + rate-limit.
- **ConsentRecord GDPR + /privacy /terms /cookie-policy** (pre-esistente multi-round): footer link → 404 oggi.

### Tech debt ALTA documentato (Round 11 cleanup audit)
- **File media 30MB in repo root**: `video_bg_hero.mp4` + duplicati `trimarano*.webp` non usati. `git rm` + BFG history. Effort S.
- **6 dipendenze dead**: `lenis`, `@base-ui/react`, `recharts`, `react-day-picker`, `@prisma/client`, `@types/node-cron`. `npm uninstall` + drop componenti `ui/chart.tsx`, `ui/calendar.tsx`. Effort M.
- **`lucide-react@1.8.0` linea abbandonata** (AGENTS Round 4 noto): bump a `^0.540.x`. Effort M.
- **`next-auth@5.0.0-beta.30`**: bumpare ultimo beta o attendere GA.
- **Prisma dead models**: `SyncQueue`, `WeatherGuaranteeApplication`, `CrewAvailability`, enum `SyncStatus`, `PaymentMethod.POS/STRIPE_LINK`. Migration drop. Effort M.
- **HotDayOverride** ha solo read path, no admin CRUD — Plan 6 decision: implementare o droppare.
- **AGENTS.md 567 righe**: compaction + estrazione round audit in `docs/audits/round-N.md`. Effort L ma alto ROI context agenti.
- **`.superpowers/` tracciato per errore**: 5 HTML brainstorm pushati. `git rm -r .superpowers/` + gitignore.
- **9 `@ts-nocheck`** residui in 4 pagine `[locale]` legacy (schema obsoleto) — Plan 6 refactor o tipi espliciti.
- **tsconfig `noUnusedLocals`/`noUnusedParameters`** disabilitati — abilitare.
- **ESLint custom rules mancanti** — `no-restricted-imports` bloccare `@prisma/client`, `no-console` (fuori env.ts/instrumentation).

### Test gap coverage — roadmap pre-go-live (~10 gg eng)
Top 8 gap bloccanti dal Round 11 audit E2E:
1. Stripe webhook triple dedup + cancel-vs-succeeded race (Round 10) — 1.5 gg
2. `createPendingDirectBooking` concurrency (advisory lock) — 1 gg
3. `cancelBooking` refund cascade + rollback + Payment REFUND — 1 gg
4. Admin Server Actions `requireAdmin` guard — 0.5 gg
5. Middleware `/admin` JWT role check — 0.5 gg
6. Bokun webhook E2E (HMAC+dedup+P2002+fan-out+SSRF) — 2 gg
7. Email parser reale vs fixture cliente — 1.5 gg + dipendenza cliente
8. Turnstile widget rendering Playwright — 0.5 gg

**Infra mancante**: `@electric-sql/pglite` (test-db), `ioredis-mock`, `@playwright/test`, `msw`/`nock` (fetch mock), GitHub Actions CI (Round 7 deferred).

Primo mese post-launch altri ~8.5 gg (Boataround, charter email, iCal consumer, OTP flow, Stripe reconciliation, availability self-echo, balance reminders, retention GDPR, rate-limit fail-open).

## Plan 6 — Weather + notifications (core completato)

Weather system + notification dispatcher admin integrati nei flussi booking.

### Moduli weather
- `src/lib/weather/open-meteo.ts` — client Open-Meteo (free, no API key) per Trapani 38.02/12.54. Daily forecast + marine wave height. Timeout 10s via `AbortSignal`.
- `src/lib/weather/risk-assessment.ts` — classifica rischio in 4 livelli LOW/MEDIUM/HIGH/EXTREME basato su vento km/h, onde m, pioggia %, temperatura min. Soglie default per Mediterraneo. 8 test vitest.
- `src/lib/weather/service.ts` — `getWeatherForDate(date)` con cache `WeatherForecastCache` 6h + fallback stale-cache se Open-Meteo unreachable (degraded mode).
- `src/lib/weather/reassurance.ts` — messaggi rassicuranti in IT per ogni livello rischio (condizioni ideali / mare mosso / condizioni impegnative / difficilmente praticabile).
- `src/components/booking/weather-info-card.tsx` — UI card con titolo/body/stat temp/vento/onde/pioggia. Color coded per risk level.

### Notification dispatcher
- `src/lib/notifications/events.ts` — tipi eventi (NEW_BOOKING_*, BOOKING_CANCELLED, PAYMENT_FAILED, SYNC_FAILURE, WEATHER_ALERT) × canali (EMAIL/TELEGRAM).
- `src/lib/notifications/dispatcher.ts` — route template → sendEmail Brevo + sendTelegramMessage (fallisce ognuno indipendentemente).
- `src/lib/notifications/telegram.ts` — bot API stub con graceful skip se `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` non configurati. Timeout 10s.
- Templates: `new-booking`, `weather-alert`, `booking-cancelled` — tutti con `escapeHtml` anti-injection.
- ENV nuove: `ADMIN_EMAIL` (default admin@egadisailing.com), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (entrambi optional).

### Cron + integrazioni
- `GET /api/cron/weather-check` — ogni mattina 07:00 Europe/Rome: scan booking CONFIRMED nei prossimi 7gg, dispatch WEATHER_ALERT su risk HIGH/EXTREME. Schedulato in `cron/scheduler.ts`.
- Stripe webhook `onPaymentIntentSucceeded` dispatcha `NEW_BOOKING_DIRECT` post-email customer.
- Admin `cancelBooking` dispatcha `BOOKING_CANCELLED` dopo audit.

### Deferred Plan 6+
- **Stormglass fallback** (Task 2): secondo provider meteo se Open-Meteo giu'. Richiede API key (freemium).
- **Telegram bot**: creare bot + fornire token/chatId. Per ora `TELEGRAM_BOT_TOKEN` opzionale, dispatcher no-op.
- **Playwright E2E** (Task 9-10): `@playwright/test` non installato, `tests/e2e/` vuoto. Serve per booking-flow + OTP + Bokun webhook smoke. Infra test-db + Stripe fixture per integration.
- **Sentry wiring**: `SENTRY_DSN` in `.env.example` commentato. Init in `src/instrumentation.ts` + `withErrorHandler` 500 branch.
- **Alternative dates suggestion** (Task 4 Plan): se date selezionata risk EXTREME, mostra 3 date piu' vicine con risk LOW. UI da integrare nel wizard.
- **Weather Guarantee** business decision: model ricreato se cliente conferma feature.
- **Metrics funnel** (conversion, Stripe latency): fuori scope Plan 6 core.

## Round 12 audit — Plan 6 weather + notifications (fix applicati)

Tre audit paralleli (regression Plan 6, notification abuse + GDPR, deployment readiness final).

### Critiche fixate
- **Weather cron timezone off-by-one** (R12-C1): `new Date()` come lower bound escludeva booking di oggi perche' `Booking.startDate` e' UTC midnight. A 07:15 Europe/Rome (02:15-05:15 UTC a seconda CET/CEST) `new Date() > 2026-04-20T00:00Z` → il booking di oggi veniva saltato. Fix: `toUtcDay(new Date())`. Anche run manuale alle 23:00 `gte: today` includeva booking del giorno corrente.
- **Weather cron no lease multi-replica** (R12-C4): `node-cron` multi-pod fire 2x + run > 1min apriva rotto `Open-Meteo` API con quote burst. Fix: Redis lease `cron:weather-check` TTL 5min + rate-limit `WEATHER_CRON_IP` 10/min pre-Bearer (protegge in caso CRON_SECRET leak).
- **Risk assessment NaN silent LOW** (R12-C2): `wind >= 46` con `wind = NaN` valuta false → booking in condizioni estreme loggato LOW quando Open-Meteo ritorna payload malformed. Fix: `Number.isFinite` guard per ogni asse + collezione `missingAxes[]` + forza MEDIUM con reason "dati parziali: vento, onde". Admin riceve alert anche su dati incompleti invece di silent-pass.
- **Dynamic import dispatcher** (R12-C3): `await import("@/lib/notifications/dispatcher")` in webhook-handler + admin cancelBooking aggiungeva round-trip inutile e nascondeva type errors al typecheck boot. Fix: top-level import.
- **Weather cache stampede** (R12-C6): homepage + /meteo + cron concorrenti su cache scaduta facevano 3 fetch Open-Meteo simultanei. Fix: Redis lease `weather:fetch:trapani` TTL 30s single-flight; i worker losing polano la cache ogni 500ms per 3s poi fallback al fetch (se Open-Meteo lento).
- **Alert fatigue weather** (R12-A1): il cron riesegue ogni giorno → stesso risk notificato 7 mattine di fila per lo stesso booking. Fix: `Booking.weatherLastAlertedRisk` + `weatherLastAlertedAt` (migration `20260420120000_weather_alert_dedup`). Throttle 24h per stesso risk level; cambio risk (HIGH → EXTREME) dispatcha subito senza attendere throttle.

### Alte fixate
- **Brevo `replyTo` mancante** (R12-A3): customer rispondeva a `noreply@egadisailing.com` → mail nel vuoto. Fix: `replyTo` settato a `BREVO_REPLY_TO` env (default sender) in `sendEmail()`.
- **Env vars undocumented**: `SERVER_ACTIONS_ALLOWED_ORIGINS` e `BREVO_REPLY_TO` nello schema ma non in `.env.example`. Ops potrebbero deployare senza sapere che servono. Fix: aggiunti entrambi con commento esplicativo.
- **Cron scheduler collision** (R12-M1): balance-reminders e weather-check entrambi `"0 7 * * *"` → `node-cron` single-thread fire uno dopo l'altro ma `APP_URL` fetch concorrenti saturavano Next. Fix: weather-check spostato a `"15 7 * * *"`.

### Deferred (Plan 7+/go-live checklist)
- **CRITICA — Notification abuse rate-limit**: `dispatchNotification` no rate-limit per admin. Attaccante che hack admin o trigger multiplo del cron sabota SMTP reputation. Valutare BullMQ queue `notification-dispatch` con limiter 30/min + dedup window per-type-per-booking.
- **CRITICA — GDPR notification retention**: email payloads non persistiti ma `audit_log.after` puo' contenere customerName/serviceName. Verificare con cliente retention 24mesi audit vs art. 17 erasure request.
- **ALTA — Weather alert digest batching**: 7 booking + 3 alert per giorno = 21 email admin/settimana. Valutare daily digest `WEATHER_DIGEST` (1 email con tutti i risk HIGH/EXTREME dei prossimi 7gg) vs alert real-time.
- **ALTA — Telegram escalation policy**: solo email oggi. Per EXTREME admin deve essere notificato in 5min anche se non apre Gmail. Telegram + SMS fallback documentato Plan 7.
- **ALTA — Weather guarantee pricing**: flag `weatherGuarantee: Boolean` existe ma mai applicato. Decisione business: addon prezzo + refund policy se risk HIGH/EXTREME al giorno X.
- **ALTA — Stormglass fallback**: Open-Meteo free tier 10k req/day. In alta stagione (giugno-settembre) con 50+ booking/day + homepage rebuilds rischio rate-limit. Secondo provider (Stormglass freemium, `SW_API_KEY` env) con switchover automatico.
- **ALTA — Weather dashboard admin**: `/admin/meteo` lista risk ma no storico alert dispatched ne' controllo manuale "invia ora" / "ignora". Plan 7.
- **MEDIA — Notification dispatcher retry**: `dispatchNotification` fail-fast su Brevo 503 → email persa. BullMQ retry + DLQ con alert admin su failure > 1h.
- **MEDIA — Replica lag weather cron**: multi-replica deploy vede `Booking.weatherLastAlertedAt` su primary ma query replica 2s lag → risk di doppio alert al fire simultaneo. Redis lease mitiga ma non elimina.
- **MEDIA — Sentry wiring**: `SENTRY_DSN` commentato in `.env.example`. Init in `src/instrumentation.ts` + `withErrorHandler` 500 branch capture.
- **MEDIA — E2E Playwright**: `@playwright/test` non installato. Smoke test booking wizard + OTP + Bokun webhook richiesti pre-go-live.
- **BASSA — `BREVO_REPLY_TO` single-address**: Plan 7+ valutare per-type reply (prenotazioni@ vs info@ vs meteo@).
- **BASSA — Weather unit tests `missingAxes`**: 8 test assessRisk non coprono NaN / Infinity / undefined. Aggiungere fixture "forecast con wind NaN" → risk MEDIUM + reason contiene "dati parziali".

### Test: 103 passing (era 95 Round 8→12, +8 da Plan 6). Typecheck clean, build OK.

## Round 13 audit — regression R12 + integration edge cases + pre-go-live (fix applicati)

Tre audit paralleli post-Round 12. Sintesi: 3 CRITICA correctness + 4 ALTA regression + 4 CRITICA integration (2 fixate in codice, 2 deferred blockers). Il pre-go-live verdict e' **NO-GO** con 2.5-3 settimane per chiudere infra/legal/E2E.

### Critiche fixate
- **Alert dedup race weather cron** (R13-C1): `dispatchNotification` aveva signature `void` e swallow-a errori Brevo/Telegram internamente → il marker `weatherLastAlertedAt` veniva updated ANCHE su fail silenzioso → domani il cron skippa → **alert loss perpetuo** durante Brevo outage. Fix: `DispatchResult { emailOk, telegramOk, anyOk, skipped }` + il cron updata il marker solo se `anyOk=true`; altrimenti logga warn + push in `errors[]` per diagnosi admin.
- **Rate-limit scope spoofabile** (R13-C2): `WEATHER_CRON_IP` per-IP permetteva a un attaccante con CRON_SECRET leakato di spooffare `X-Forwarded-For` per ogni request → bucket rate-limit diverso → 1000 req/s → Open-Meteo ban quota. Fix: Bearer **prima** del rate-limit + `identifier: "global"` (bucket unico) → cap hard 10/min totali sul cron.
- **Risk assessment `waveHeightM == null` silent LOW** (R13-C3+A3): quando marine API Open-Meteo e' down (`waveHeights=[]` → null), il fix Round 12 flaggava `missingAxes` solo per NaN, non per null. Giornata con vento 20 km/h + onde reali 3m + marine down → **LOW silenzioso**, admin non riceve alert. Fix: `wave == null || !Number.isFinite(wave)` flagga sempre missing axis. Test updated + 3 nuovi test (NaN wind, Infinity rain, EXTREME + null-wave non downgraded).
- **Stripe `onChargeRefunded` race out-of-order** (R13-ALTA): se `charge.refunded` arriva PRIMA di `payment_intent.succeeded` (network jitter Stripe workers), il Payment non esiste → `return` silenzioso + marker ProcessedStripeEvent → refund perso, Stripe non ritenta. Fix: throw `ValidationError` con messaggio esplicativo → Stripe retry fino a 3gg, al retry il Payment sara' creato.
- **Redis lease ownership bug** (R13-A1): `releaseLease(name)` faceva `redis.del` senza token check → un leader slow oltre TTL cancellava il lease del successore (Redlock anti-pattern). Fix: `tryAcquireLease` ritorna `LeaseHandle { name, token:UUID }`; `releaseLease(handle)` usa Lua script atomico `if GET==ARGV then DEL else 0`. Pattern Redlock-lite.
- **Redis lease hang su Redis down** (R13-I): `redis.set(...)` con `maxRetriesPerRequest: null` (BullMQ req) si queueava in memoria durante outage → webhook hung per minuti. Fix: `Promise.race` con timeout 2s + fail-open con log warn (cron run senza protezione concurrent > webhook hang).

### Alte fixate
- **Weather cache stampede fallback deteriore** (R13-A2): se il leader crasha durante upsert e il TTL lease 30s non e' ancora scaduto, i follower polano 3s e poi "procedevano senza lease" → 6+ fetch Open-Meteo paralleli (regrediva il fix R12-C6). Fix: dopo STAMPEDE_MAX_WAITS esausto, `readStaleCache()` → se presente ritorna degraded, altrimenti throw. No thundering herd.

### Operational fixate
- **PENDING booking GC cron**: `/api/cron/pending-gc` ogni 15min (sfasato 3min da reconciliation/parser). Scan booking PENDING DIRECT > 30min → `cancelPaymentIntent` Stripe (idempotente) + `updateMany` CANCELLED + `releaseDates`. Previene zombie slot LOCKED che bloccano clienti legittimi via pre-check overlapping Round 7 (alta stagione: 50 booking/giorno × 30% abbandono checkout = 15 zombie/giorno senza GC).
- **`anonymizeCustomer` GDPR art. 17 helper** (`src/lib/gdpr/anonymize-customer.ts`): mask email → `anon-{id}@deleted.local` + firstName=`"ANONIMO"` + lastName="" + phone/nationality/language/notes null. Idempotent + guard su active future booking. Audit log `ANONYMIZE`. Callable da admin UI (Plan 5 CRUD + Plan 7 self-service `/b/sessione`).

### Deferred (Plan 7+ / blocker pre-go-live)
**CRITICA BLOCKER** (non scritti in codice questa sessione):
- **Bokun + Boataround cross-OTA double-booking** (R13-Scenario B): due webhook legit stesso boat/date da OTA diversi passano dedup indipendente e creano 2 Booking + 2 `blockDates` sulla stessa cella. `lockedByBookingId` punta solo al primo. Nessun `ManualAlert` emesso. Fix richiede: estendere `importBokunBooking`/`importBoataroundBooking` a rilevare overlap con `source != self` + emettere `createManualAlert`. Refactor ~1gg.
- **iCal cache 15min → portali esterni double-booking** (R13-Scenario D): `cache-control: public, max-age=900` serve stale per 15min dopo `blockDates`. Airbnb/SamBoat consumer vede slot AVAILABLE e conferma altro cliente. Fix: `max-age=60` + ETag basato su `max(updatedAt)` BoatAvailability + 304 support. Breaking change per consumer (potrebbe richiedere comunicazione).
- **Weather alert immediato su webhook Bokun/Boataround** (R13-Scenario E): admin scopre risk EXTREME solo al cron del giorno dell'uscita. Fix: post-`syncBookingAvailability` nei webhook, chiamare `getWeatherForDate` per `startDate ≤ today+7` e dispatch immediato se HIGH/EXTREME + set `weatherLastAlertedRisk` per dedup col cron.
- **Partial Stripe dashboard refund + full admin cancel** (R13-Scenario H): admin rimborsa 100€ via dashboard Stripe → Payment REFUNDED. Poi admin full-cancel → `cancelBooking` filter `status === "SUCCEEDED"` skippa → residuo 400€ MAI rimborsato. Fix: considerare Payment REFUNDED con `amount > sum(REFUND children)` o leggere `amount_refunded` da Stripe API.
- **GDPR anonymize flow wiring** (R13-Scenario G): helper creato ma admin UI non ancora espone il button; Data Subject Rights endpoint self-service `/b/sessione` pending Plan 7.

**ALTA**:
- **Admin cancel mid-checkout UX** (R13-Scenario F): cliente vede "Something went wrong" generico Stripe. Serve `/api/booking/[code]/status` poll client-side + messaggio dedicato.
- **Bokun availability worker 6×POST per job** (R13-Scenario A): limiter `{max:10,duration:1000}` e' per-job ma il worker loop esegue 1 POST per service (3 boat × 6 service = 18 POST per job). Alta stagione burst 429. Fix: limiter a livello client `updateBokunAvailability`.
- **Boataround reconciliation cron**: analogo a Bokun, manca. Webhook persi → drift permanente.
- **Brevo replyTo zero integration coverage** (R13-A5): shape OK vs docs v3, ma zero test contro Brevo sandbox. Rischio regressione futura.

### Pre-go-live verdict (audit 3)
**NO-GO** attualmente. Stima realistica **2.5-3 settimane** per launch commerciale LIVE:
- **W1** — Cliente/Legal: copy privacy/terms/cookie definitivo (placeholder esplicito oggi, ConsentRecord su testo non vincolante). Dev parallelo: `docker-compose.prod.yml` + Caddyfile + Sentry wiring + Stripe reconciliation cron + idempotency-key `/api/payment-intent`.
- **W2** — Dev: 2 Playwright smoke (booking direct + Bokun webhook). UptimeRobot + Telegram alert. Rotazione secrets LIVE. CI GitHub Actions (lint+typecheck+test+build). Disable parser email non-DKIM-verified o feature-flag.
- **W3** — Staging su VPS identico a prod + restore drill DB + Stripe LIVE test 1€ + onboarding KYC Stripe + go-live con rollback pronto.

Blocker #1 e' **consegna legal copy dal cliente**: senza, GDPR art.13-14 rende ogni ConsentRecord non vincolante.

### Deferred correctness + tech debt (non-blocker)
- **Commit message drift**: il commit R12 affermava "8 test nuovi" — era falso (nessun test file modificato). Evitare claim quantitativi senza diff.
- **Weather unit tests R12-A1**: missingAxes test aggiunti ora Round 13 (copertura null/NaN/Infinity).
- **`.env.example` `docker-compose.prod.yml`**: nominato multi-round, non esiste nel repo. Blocker infra ovviamente.
- **Admin cancel Telegram escalation policy**: oggi solo EMAIL per NEW_BOOKING_*/BOOKING_CANCELLED, TELEGRAM solo per WEATHER_ALERT. Plan 7.
- Bokun+Boataround unit test integration con pglite ancora deferred (Round 7 gap).

### Test: 106 passing (era 103 Round 12→13, +3 NaN/null/Infinity). Typecheck clean, build OK.

## Plan roadmap

1. ✅ Plan 1 — DB + Backend foundation (completato)
2. ✅ Plan 2 — Sito + Stripe + OTP (completato + audit fixes)
3. ✅ Plan 3 — Bokun integration (completato + round 5 audit fixes)
4. ✅ Plan 4 — Charter integrations (iCal export + Boataround + SamBoat/Click&Boat/Nautal email parser)
5. ✅ Plan 5 — Dashboard admin (13 sezioni operativa, rotte italiane)
6. ✅ Plan 6 — Weather system + notifications (core: client Open-Meteo, risk assessment, cron alert admin, notification dispatcher email+Telegram, integrazioni booking confirm/cancel + Round 12 audit fixes). Deferred: E2E Playwright, Sentry, Stormglass fallback, weather digest batching.

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
