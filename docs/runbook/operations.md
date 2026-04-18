# Operations runbook

Procedure per incidenti comuni in produzione.

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
- Cliente ha pagato davvero → trigger manuale di `confirmDirectBookingAfterPayment` (via Prisma Studio o script admin — Plan 5)
- Cliente non ha pagato → cancellare via `DELETE /api/admin/bookings/{id}` (futuro) oppure Prisma Studio set status=CANCELLED

## Refund manuale

**Sintomo**: cliente chiede rimborso via email / l'admin decide cancellazione.

**Azione attuale** (Plan 5 automatizzera'):
1. Trova `stripeChargeId` del Payment SUCCEEDED per il booking
2. Esegui dalla console Node:
   ```ts
   import { refundPayment } from "@/lib/stripe/payment-intents";
   await refundPayment("ch_xxx"); // full refund
   await refundPayment("ch_xxx", 5000); // partial 50€ (in cents)
   ```
   Oppure via Stripe dashboard manuale
3. Il webhook `charge.refunded` aggiornera' `Payment.status=REFUNDED` automaticamente
4. Aggiornare `Booking.status=REFUNDED` (Prisma Studio)
5. Rilasciare availability via `releaseDates(boatId, startDate, endDate, "DIRECT")` (script admin)

## Stripe webhook replay

**Sintomo**: un evento Stripe e' stato perso (webhook endpoint giu', firma scaduta post-rotation secret).

**Diagnosi**:
```bash
# Lista eventi non processati (mancano in DB locale)
stripe events list --type payment_intent.succeeded --created[gte]=$(date -d '7 days ago' +%s)
```

**Azione**:
- Opzione A: dalla Stripe dashboard → webhook logs → "Resend". Il nostro handler e' idempotente (ProcessedStripeEvent + Payment.stripeChargeId UNIQUE).
- Opzione B (automatica, Plan 3+): cron reconciliation cron che rilegge `/v1/events` degli ultimi N giorni.

## BullMQ worker down / queue stuck

**Sintomo**: SyncQueue row con `status=PENDING` in crescita, `ChannelSyncStatus.healthStatus=RED`.

**Diagnosi**:
```bash
docker compose logs -f app | grep "bullmq\|queue"
redis-cli -a $REDIS_PASSWORD LLEN bull:sync:waiting
redis-cli -a $REDIS_PASSWORD LLEN bull:sync:active
redis-cli -a $REDIS_PASSWORD LLEN bull:sync:failed
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
