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

<!-- BEGIN:OVERRIDE_SYSTEM -->
## Override system — Fase 1 Trimarano

Sistema di priorita' prenotazioni: consente booking DIRECT ad alto revenue di
scavalcare prenotazioni preesistenti a revenue inferiore, con controllo admin
esplicito + workflow OTA manuale.

### Feature flag (2-granular, env vars)

- `FEATURE_OVERRIDE_ENABLED=true/false` — master switch. OFF = zero override, flow legacy.
- `FEATURE_OVERRIDE_OTA_ENABLED=true/false` — OTA workflow gate. OFF = solo DIRECT-vs-DIRECT (no checklist OTA, no reconcile cron attivo).
- `OVERRIDE_CANCELLATION_RATE_SOFT_WARN=0.03` — soft warn soglia per canale OTA.
- `OVERRIDE_CANCELLATION_RATE_HARD_BLOCK=0.05` — hard block; oltre questa soglia approveOverride throw ValidationError.

### Manual QA pre-merge (20 punti)

**Spec §16.4 base (16 punti)**:
1. Data libera → normal booking (CONFIRMED immediato + email standard).
2. Data con Social-equiv → override_request (PENDING + email "In attesa conferma").
3. Data con Charter esistente, revenue nuovo inferiore → blocked (msg pre-pay).
4. Data a 14 giorni → blocked (cutoff), anche con revenue superiore.
5. Data con boat-block → blocked (priorita' assoluta).
6. Approva admin → conflicts cancellati + refund automatico Stripe + email winner confermato + email loser apology.
7. Rifiuta admin → new cancellato + refund + email con date alternative.
8. Drop-dead al 15° giorno → auto-expire + refund + email.
9. 2 submit concorrenti revenue diverso → higher supersede lower.
10. 2 submit concorrenti revenue pari → entrambe PENDING, admin decide.
11. Override contatore dashboard visibile + soft warning > 3/mese.
12. Multi-day Charter cancellato per single-day Gourmet → alert ALTO IMPATTO.
13. Override contro OTA → checklist 4-step + polling webhook + Approve disabled until all checked.
14. Reverse override webhook OTA su slot DIRECT → ManualAlert CROSS_CHANNEL_CONFLICT.
15. Cancellation-rate > 5% Viator → approveOverride rifiuta con ValidationError.
16. Reconcile cron +1h: upstream ancora active → PENDING_RECONCILE_FAILED + dispatch FATAL admin.

**OTA workflow nuovi (4 punti post R19)**:
17. OTA conflict webhook cancel arriva PRIMA dell'approve → `upstreamCancelled=true` nel polling.
18. Admin spunta 4 checkbox ma webhook cancel NON arrivato → bottone Approve disabled con messaggio attesa.
19. Retry reconcile post-FAILED: admin clicca Retry → se upstream nel frattempo CANCELLED → status APPROVED auto.
20. Rate-limit `OVERRIDE_CHECK_IP` 30/min: 31 check consecutivi stesso IP → 429.

### Rollout plan

**Week 1 (staging)**: `FEATURE_OVERRIDE_ENABLED=true`, OTA disabled. QA DIRECT-vs-DIRECT (punti 1-11 + 15 della checklist).

**Week 2 (prod canary)**: stesso setup. 7 giorni monitoring:
- Sentry alert su `OVERRIDE_RECONCILE_FAILED` (non dovrebbe firare con OTA off).
- Daily KPI review: `/admin/override-requests` PENDING count + approve/reject ratio.
- Metric: % booking che diventano override_request vs normal (atteso <10%).

**Week 3 (prod full)**: `FEATURE_OVERRIDE_OTA_ENABLED=true`. Monitoring reconcile:
- Alert su `PENDING_RECONCILE_FAILED > 0` (mai dovrebbe >0 in regime normale).
- Alert su cancellation-rate OTA > 3% (soft warn).
- Alert su cancellation-rate OTA > 5% (hard block attivato — rigetta nuovi approve).

### Rollback procedures

**Rollback parziale (solo OTA)**: set `FEATURE_OVERRIDE_OTA_ENABLED=false`.
- Request PENDING con OTA conflict restano: admin decide via UI (approve richiede OTA workflow ancora disponibile lato backend, OR reject).
- Nuove submit con OTA conflict: vedranno "blocked" (equivalente a feature OTA non esistente).
- DIRECT-vs-DIRECT resta operativo.

**Rollback totale**: set `FEATURE_OVERRIDE_ENABLED=false`.
- Request PENDING esistenti restano nel DB (non auto-cancellate).
- Admin puo' processarle manualmente via `psql` se serve.
- Flow booking torna legacy (no override mai).
- Tabella `OverrideRequest` preserva history per future re-attivazione.

### Monitoring obbligatorio

- **Sentry**: `SENTRY_DSN` configurato. Alert su:
  - `logger.error` con tag `event=OVERRIDE_RECONCILE_FAILED` → Slack + email admin.
  - `logger.fatal` con tag `event=override*` → SMS admin.
- **UptimeRobot**: ping su `/api/health?deep=1` + `/api/cron/override-reconcile` (5min interval, alert se HTTP != 200).
- **Telegram alert**: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` per FATAL admin notifications.
- **Daily KPI review** (5min mattina):
  - `/admin` — KPI "Override approvati questo mese" count.
  - `/admin/override-requests?status=PENDING` — count + eta' oldest request.
  - `/admin/override-requests?status=PENDING_RECONCILE_FAILED` — deve essere 0.
  - Dashboard — CancellationRateKpi card (nessun rosso).

### Incident playbook

**Incident: OVERRIDE_RECONCILE_FAILED triggered**
- Causa tipica: admin ha spuntato checkbox senza cancellare upstream su Viator/Bokun panel, oppure Viator non ha propagato cancel a Bokun entro 1h.
- Action: apri `/admin/override-requests/[id]`, verifica status Bokun via pannello esterno, cancella manualmente se serve, clicca "Retry reconcile" (TODO Plan 7 UI — per ora via psql).
- Workaround psql: `UPDATE "OverrideRequest" SET status='APPROVED', "reconcileCheckedAt"=NOW() WHERE id='req-xxx' AND status='PENDING_RECONCILE_FAILED';`

**Incident: cancellation-rate OTA > 5%**
- Causa: approve frequenti di override contro quel canale (es. Viator) negli ultimi 30gg.
- Action: smettere di approvare override su quel canale per 2 settimane (rate scende naturalmente). Il sistema rifiuta automaticamente nuovi approve finche' scende sotto 5%.
- Monitor: dashboard KPI card colori.

**Incident: OverrideRequest PENDING "stuck" > 72h senza decisione admin**
- Causa: admin dimenticato / ferie.
- Action: il cron override-dropdead gestisce auto-expire al 15° giorno pre-experience. Se non accettabile, admin deve decidere manualmente PRIMA di quella soglia.
- Il cron escalation reminder manda email ogni 24h dopo 24h di inattivita'.

<!-- END:OVERRIDE_SYSTEM -->
