# Operations runbook

Procedure per incidenti comuni in produzione.

## Admin dashboard: password manager extensions compatibility

**Sintomo**: admin segnala che cliccando sulle celle del calendario (o su
elementi interattivi simili) non succede nulla, oppure il modal si apre e
si chiude immediatamente. Login potrebbe mostrare hydration error in
console.

**Causa**: estensioni password manager (ProtonPass, LastPass, 1Password,
Bitwarden) iniettano overlay DOM (`<protonpass-control-*>`, attributi
`data-lpignore`, `style="padding-right:40px"`) che:
1. Rompono React hydration (server HTML != client DOM post-injection)
2. Intercettano eventi click del mouse su form e a volte su tutta la
   pagina authenticated

**Workaround admin**:
- **Test rapido**: apri una finestra in Incognito (Ctrl+Shift+N/P) — le
  estensioni sono disabilitate. Se il problema sparisce → e' un'estensione.
- **Fix permanente**: escludi `localhost` (dev) / il dominio prod dalla
  password manager extension. Il panel admin non ha altri form di tipo
  "password" oltre a login, quindi l'estensione non serve sulle altre
  pagine.

**Fix codice gia' applicato** (R30-UX):
- `<Field suppressHydrationWarning>` + `<Input suppressHydrationWarning>`
  sui 2 input login → React ignora mismatch DOM da extensions
- `autoComplete="email"` / `autoComplete="current-password"` sui field
  login → hint corretto al browser + password manager

**NON fix**:
- Disabilitare password manager nel codice (non e' possibile cross-browser
  in modo affidabile, e andrebbe contro UX utente)
- Usare `data-lpignore` / `data-1p-ignore` / `data-form-type="other"`:
  ogni extension ha un markup diverso e il supporto e' inconsistente

## PENDING booking stuck (>1h)

**Sintomo**: un booking con `status=PENDING` piu' vecchio di 1 ora.

**Cause probabili**:
1. Cliente ha abbandonato il checkout dopo aver creato il Payment Intent
2. Stripe webhook `payment_intent.succeeded` mai arrivato (firewall, Stripe outage)
3. Webhook arrivato ma verifica firma fallita

**Diagnosi**:
```sql
-- Quanti pending vecchi?
SELECT id, "confirmationCode", "createdAt", "totalPrice"
FROM "Booking"
WHERE status = 'PENDING' AND "createdAt" < NOW() - INTERVAL '1 hour';

-- Il payment intent di questo booking esiste in Stripe?
-- Prendi bookingId e cerca con: stripe payment_intents list --metadata bookingId=<id>
```

**Azione**:
- Cliente ha pagato davvero → webhook perso. Usa admin `/admin/prenotazioni/[id]`
  per diagnosi; il cron `/api/cron/stripe-reconciliation` (ogni 15min sfasato
  7min) replaya eventi `/v1/events` ultimi 3gg via `handleStripeEvent`
  idempotent. Force run via `curl -H "Authorization: Bearer $CRON_SECRET"
  http://localhost:3000/api/cron/stripe-reconciliation`.
- Cliente non ha pagato → admin `/admin/prenotazioni/[id]` → bottone "Cancella"
  (chiama `cancelBooking` Server Action con cascade refund + releaseDates +
  audit + notification admin). Lo stesso booking viene auto-pulito dal cron
  pending-gc dopo 45min (status=CANCELLED + release availability).

## Refund manuale

**Sintomo**: cliente chiede rimborso via email / l'admin decide cancellazione.

**Azione (admin UI, automatica R23+)**:
1. Admin apre `/admin/prenotazioni/[id]`
2. Click "Cancella & rimborsa"
3. La Server Action esegue in cascata:
   - Redis lease per-bookingId (R26-P3 fix: previene race 2 admin concurrent)
   - `cancelPaymentIntent` su PI in-flight (race webhook vs cancel)
   - Loop `refundPayment(stripeChargeId)` per ogni Payment SUCCEEDED
   - Dual-write: Payment originale → REFUNDED + sibling Payment(type=REFUND)
     per audit fiscale non-retroattivo
   - Booking → CANCELLED + `releaseDates` → fan-out BullMQ
   - `dispatchNotification(BOOKING_CANCELLED)` admin (email + telegram)
   - AuditLog entry
4. Se source != DIRECT → `ManualAlert` emesso per cancellare anche upstream
   sul panel OTA (Bokun/Boataround UI) — admin riceve alert in `/admin/sync-log`

Se webhook Stripe del refund arriva dopo: handler riconosce via
`stripeRefundId` gia' presente → idempotent skip (no double-counting).

## Stripe webhook replay

**Sintomo**: un evento Stripe e' stato perso (webhook endpoint giu', firma scaduta post-rotation secret).

**Diagnosi**:
```bash
# ChannelSyncStatus per STRIPE_EVENTS_RECONCILIATION indica YELLOW/RED:
psql ... "SELECT * FROM \"ChannelSyncStatus\" WHERE channel='STRIPE_EVENTS_RECONCILIATION';"
# Elenco eventi upstream:
stripe events list --type payment_intent.succeeded --created[gte]=$(date -d '7 days ago' +%s)
```

**Azione**:
- **Automatica (default)**: `/api/cron/stripe-reconciliation` gira ogni 15min,
  rilegge `/v1/events` ultimi 3gg, replaya via `handleStripeEvent` idempotent
  (ProcessedStripeEvent dedup + Payment.stripeChargeId UNIQUE). Cursor
  persistito in Redis per continuazione cross-run su backlog > MAX_PAGES.
  Se `healthStatus=RED` + `lastError=stale cursor`: il cron auto-clear la
  chiave Redis al prossimo run (R25-A1-M1 fix). Force run come sopra.
- **Manuale**: Stripe dashboard → webhook logs → "Resend".

## BullMQ worker down / queue stuck

**Sintomo**: queue waiting/failed in crescita, `ChannelSyncStatus.healthStatus=RED`.

**Diagnosi**:
```bash
# Healthcheck deep (richiede Bearer CRON_SECRET):
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/health?deep=1
# Admin dashboard /admin/sync-log mostra breakdown per-queue (R23 split:
# sync.avail.bokun, sync.avail.boataround, sync.avail.manual, sync.pricing.bokun).
docker compose logs -f app | grep "bullmq\|queue\|Job failed"
redis-cli -a $REDIS_PASSWORD LLEN 'bull:sync.avail.bokun:waiting'
redis-cli -a $REDIS_PASSWORD LLEN 'bull:sync.avail.boataround:failed'
```

**Azione**:
- Worker not running → riavvia il container app
- Worker running ma job fallisce ripetutamente → controlla `lastError` nella SyncQueue row, fix il canale esterno (credenziali Bokun? Boataround API down?), poi retry manuale

## Database restore

**Sintomo**: corruzione dati, mistake operatore, disaster recovery.

**Prerequisito**: backup giornaliero `pg_dump` esistente (Plan 3+ workflow).

**Azione**:
```bash
docker compose down
docker volume rm egadisailing_pgdata
docker compose up -d postgres
# attendi healthy
cat prisma/backup/dump-YYYY-MM-DD.sql | docker compose exec -T postgres psql -U egadisailing -d egadisailing
docker compose up -d app
curl http://localhost:3000/api/health
```

## Secret rotation

### NEXTAUTH_SECRET
- Tutte le sessioni admin invalidate — gli admin devono ri-loggare.
- Update `.env`, restart app.

### STRIPE_WEBHOOK_SECRET
- Rotate in Stripe dashboard → "Roll endpoint secret"
- Stripe mantiene vecchio + nuovo secret per 24h
- Update `.env`, restart app, testare con `stripe trigger payment_intent.succeeded`

### REDIS_PASSWORD
- Stop app worker PRIMA di rotare (job persi sarebbero limbo)
- Rotate docker-compose env + restart redis + app

### CRON_SECRET
- Low risk, restart solo scheduler. Jobs in flight continuano con vecchio secret a scadenza naturale.

## Rate limit: admin override

**Sintomo**: utente legittimo bloccato da rate limit (es. IP condiviso ufficio).

**Azione**:
```ts
import { unblockIdentifier } from "@/lib/rate-limit/service";
await unblockIdentifier("user@email.com", "OTP_BLOCK_EMAIL");
await unblockIdentifier("192.168.1.1", "OTP_BLOCK_IP");
```

Oppure azzera tutti i counter via Redis:
```bash
redis-cli -a $REDIS_PASSWORD DEL rlb:OTP_BLOCK_EMAIL:user@email.com
```

## Brevo email non arrivano

**Diagnosi**:
- Check log `logger.error` per `Brevo sendEmail failed`
- Brevo dashboard → Transactional → Log email
- Verificare `BREVO_SENDER_EMAIL` e' verificato (SPF/DKIM ok)
- Spam folder del cliente

**Azione**:
- Brevo quota superata (300/gg free) → upgrade piano
- Sender non verificato → Brevo → Settings → Senders → verify domain
