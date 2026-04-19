# Operational Playbook — Egadisailing Prod

Runbook per admin single-user post-go-live. Generato da audit Round 16.

**Presupposti ambiente**: VPS Hetzner/DO, Docker Compose (`postgres:16-alpine` + `redis:7-alpine` con AOF + app standalone Next), reverse proxy Caddy, backup offsite S3/B2 via rclone.

**Convenzioni**: tutti i comandi assumono `cd /home/ubuntu/egadisailing` dove non specificato.
- `$PG` = `docker compose exec -T postgres psql -U egadisailing -d egadisailing`
- `$RE` = `docker compose exec -T redis redis-cli -a $REDIS_PASSWORD`

---

## Sezione 1 — Disaster Recovery

### DR-1 — VPS distrutto / perso (total loss)

**RPO** realistico: 24h (ultimo `pg_dump` giornaliero). **RTO** realistico: 2-4h se S3 + DNS Cloudflare ok, 6-8h primo restore.

**Prerequisites**:
- [ ] Backup giornaliero `pg_dump` su B2/S3 via rclone — verificato settimanalmente con test restore
- [ ] `.env.production` salvato in password manager (1Password/Bitwarden), NON nel repo
- [ ] SSH key pubblica del nuovo VPS già in GitHub (per `git clone`)
- [ ] DNS su Cloudflare (TTL 300s per ripuntare in 5 min)
- [ ] Credenziali S3/B2 memorizzate separate (NON nel backup stesso)

**Detection**: ping VPS fallisce, UptimeRobot/BetterStack invia email + Telegram "Down > 5min". Provider cloud segnala incident.

**Response**:
```bash
# 1. Provisiona nuova VPS (Hetzner CX22 ~5€/mese, 4GB RAM consigliati)
#    Stessa region (Helsinki/Nurnberg) per TTFB simile.

# 2. Setup base (5 min)
ssh root@NEW_IP
curl -fsSL https://get.docker.com | sh
adduser ubuntu && usermod -aG docker ubuntu
apt install -y rclone caddy

# 3. Clone repo + env (5 min)
su - ubuntu
git clone git@github.com:AkaSama26/egadisailing.git
cd egadisailing
# Copia .env dal password manager (NON rigenerare secrets — devono matchare il backup)
nano .env

# 4. Restore DB (15-30 min per 500MB dump)
mkdir -p /backups
rclone copy b2:egadisailing-backups/egadisailing-$(date -d yesterday +%F).sql.gz /backups/
docker compose up -d postgres redis
sleep 10
gunzip -c /backups/egadisailing-*.sql.gz | docker compose exec -T postgres psql -U egadisailing -d egadisailing

# 5. Build + start app (5 min)
docker compose up -d app   # entrypoint.sh fa migrate deploy automatico

# 6. Caddy + DNS (2 min)
cp docs/runbook/Caddyfile.example /etc/caddy/Caddyfile
# Edit egadisailing.com → NEW_IP su Cloudflare DNS (TTL 300)
systemctl reload caddy
```

**Redis state (queue jobs)**: **perso**. BullMQ job `sync.availability.bokun` per fan-out sono **recuperabili** via reconciliation cron. Email in coda **perse** — Stripe webhook handler re-invia conferma al prossimo webhook replay.

**Validation**:
```bash
curl -s https://egadisailing.com/api/health | jq
curl -s -H "Authorization: Bearer $CRON_SECRET" https://egadisailing.com/api/health?deep=1 | jq
$PG -c "SELECT COUNT(*) FROM \"Booking\" WHERE \"createdAt\" > NOW() - INTERVAL '24 hours';"
```

**Comunicazione cliente** (se downtime > 1h):
> Gentile cliente, il nostro sistema di prenotazione è temporaneamente non disponibile per manutenzione tecnica. Stiamo lavorando per ripristinarlo entro le [ora]. Per urgenze: +39 XXX. Grazie per la pazienza.

---

### DR-2 — Postgres corrotto / disk full

**Detection**: `/api/health` ritorna 503 `database.ok=false`. Container `postgres` in restart loop.

**Response (disk full)**:
```bash
df -h /var/lib/docker
docker compose exec postgres du -sh /var/lib/postgresql/data

# Fix immediato: pulisci AuditLog vecchi
$PG -c "DELETE FROM \"AuditLog\" WHERE timestamp < NOW() - INTERVAL '24 months';"
$PG -c "VACUUM FULL \"AuditLog\";"
# Se ancora full: estendi disco VPS (Hetzner: upgrade plan senza restart)
```

**Response (corruzione)**:
```bash
# 1. Stop app (nessuna nuova scrittura)
docker compose stop app

# 2. Identifica ultima operazione valida (Stripe dashboard, Bokun portale)
#    Sceglie dump precedente al timestamp corruzione.

# 3. Restore
docker compose down postgres
docker volume rm egadisailing_pgdata
docker compose up -d postgres
sleep 10
gunzip -c /backups/egadisailing-$(date -d '1 day ago' +%F).sql.gz | \
  docker compose exec -T postgres psql -U egadisailing -d egadisailing

# 4. Replay eventi Stripe mancanti (Stripe dashboard → Developers → Events → Resend)
#    Handler idempotente via ProcessedStripeEvent.eventId UNIQUE.

# 5. Bokun catch-up (loop fino MAX_PAGES=20):
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/bokun-reconciliation

# 6. Start app
docker compose up -d app
```

**Validation**: `$PG -c "SELECT MAX(\"createdAt\") FROM \"Booking\";"` vs Stripe dashboard.

---

### DR-3 — Redis OOM / data loss

Redis con `maxmemory-policy noeviction` fallira' le scritture quando pieno invece di evincere job BullMQ — l'app va in `MemoryError` e queue si ferma ma DB non corrompe.

**Detection**: `$RE INFO memory` → `used_memory_human` vicino a `maxmemory`. App logs "OOM command not allowed". Queue `waiting` cresce su `/api/health?deep=1`.

**Response**:
```bash
# 1. Diagnosi
$RE INFO memory | grep used_memory_human
$RE --bigkeys   # trova key enormi

# 2. Se AOF integro, restart libera fragmentazione
docker compose restart redis

# 3. Se Redis data loss (volume rimosso, AOF corrotto): accettare perdita
#    Cosa si perde:
#    - BullMQ jobs: recuperabili via reconciliation cron (DB-master)
#    - Rate-limit counter: reset → burst legittimo 429 per 1-2 min (fail-open R7)
#    - Session customer /b/sessione: tutti i login via OTP invalidati
#    - Session admin JWT: JWT stateless NextAuth, NO loss
#    - Lease cron: TTL auto-expire, cron riparte al prossimo fire

# 4. Estendi memoria o alza maxmemory
docker compose down redis
docker compose up -d redis

# 5. Trigger reconciliation per recover fan-out
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/bokun-reconciliation
```

---

### DR-4 — Stripe secret rotation urgente

**Scenario A — STRIPE_WEBHOOK_SECRET leaked**:
Stripe mantiene il vecchio secret per 24h dopo "Roll endpoint secret" (no-downtime rotation).

```bash
# 1. Stripe dashboard → Developers → Webhooks → endpoint → "Roll signing secret"
# 2. Copia nuovo whsec_... in password manager
# 3. Update .env sulla VPS:
sed -i 's/^STRIPE_WEBHOOK_SECRET=.*/STRIPE_WEBHOOK_SECRET=whsec_NEW/' .env
# 4. Restart app
docker compose restart app
# 5. Test con CLI Stripe
stripe listen --forward-to https://egadisailing.com/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

**Scenario B — Account Stripe sospeso** (raro ma catastrofico):
```bash
# 1. GC manuale PENDING + contatta cliente via telefono
$PG <<EOF
SELECT id, "confirmationCode", "customerId", "totalPrice"
FROM "Booking"
WHERE status='PENDING' AND "createdAt" < NOW() - INTERVAL '15 minutes';
EOF

# 2. Offri bonifico bancario → registra via admin /admin/prenotazioni/[id]
#    → "Registra pagamento BANK_TRANSFER"
```

---

### DR-5 — Bokun / Boataround API down > 1 giorno

**DIRECT booking NON impattato**: DB master, fan-out fallito = job retry BullMQ.

**Detection**:
```bash
curl -sH "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/health?deep=1 | \
  jq '.checks.channels.channels[] | select(.healthStatus=="RED")'
```

**Response**:
```bash
# 1. Verifica upstream (Bokun status page)
curl -I https://api.bokun.io/status.json

# 2. Durante outage: fan-out retry BullMQ. Rischio: double-booking cross-channel
#    Mitigation: pre-check overlap Booking R7 guard.

# 3. Al ripristino: catch-up manuale
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/bokun-reconciliation
```

---

### DR-6 — Errore migrazione Prisma

`docker/entrypoint.sh` esegue `npx prisma migrate deploy` PRIMA di `node server.js` → fail-fast.

**Detection**:
```bash
docker compose logs app --tail 50 | grep -i "prisma\|migration"
```

**Response (forward-fix, preferito)**:
```bash
docker compose stop app
$PG -c "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;"
$PG -c "UPDATE _prisma_migrations SET rolled_back_at=NOW() WHERE migration_name='20260XYZ_broken';"
git pull
docker compose up -d app
```

---

## Sezione 2 — Monitoring + Alerting

### 2.1 Uptime monitor esterno

| URL | Freq | Expected | Alert |
|---|---|---|---|
| `https://egadisailing.com/api/health` | 2 min | 200 + `status=ok` | 2 fail consecutivi → email + Telegram |
| `https://egadisailing.com/` | 5 min | 200 + keyword "Egadi" | 3 fail → email |
| `https://egadisailing.com/prenota/social-boating` | 15 min | 200 | 2 fail → email |
| `https://egadisailing.com/admin/login` | 30 min | 200 | 2 fail → email |

### 2.2 Alert thresholds

| Segnale | Soglia | Severità | Canale |
|---|---|---|---|
| `/api/health` 503 | 2 consecutivi | HIGH | Email + Telegram |
| Payment failures | > 3 in 5min | HIGH | Telegram |
| Queue `waiting` > 100 | sustained 10min | MEDIUM | Email |
| Queue `failed` > 50 | istantaneo | HIGH | Telegram |
| DB conn > 15 | sustained 5min | MEDIUM | Email |
| Redis > 80% max | istantaneo | MEDIUM | Email |
| Disk > 80% | istantaneo | HIGH | Telegram |
| `ChannelSyncStatus=RED` > 1h | daily digest | LOW | Email |

**Script consigliato** `/home/ubuntu/bin/monitor.sh` cron ogni 5 min:
```bash
#!/bin/bash
source /home/ubuntu/egadisailing/.env
set -u

HEALTH=$(curl -sH "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/health?deep=1)
STATUS=$(echo "$HEALTH" | jq -r '.status')
WAITING=$(echo "$HEALTH" | jq -r '.checks.queue.waiting')
FAILED=$(echo "$HEALTH" | jq -r '.checks.queue.failed')
DISK=$(df / --output=pcent | tail -1 | tr -dc '0-9')

ALERT=""
[ "$STATUS" != "ok" ] && ALERT="$ALERT\nHealth: $STATUS"
[ "$WAITING" -gt 100 ] && ALERT="$ALERT\nQueue waiting: $WAITING"
[ "$FAILED" -gt 50 ] && ALERT="$ALERT\nQueue failed: $FAILED"
[ "$DISK" -gt 80 ] && ALERT="$ALERT\nDisk: ${DISK}%"

if [ -n "$ALERT" ]; then
  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d chat_id="$TELEGRAM_CHAT_ID" -d text="ALERT Egadisailing:$ALERT"
fi
```

Crontab: `*/5 * * * * /home/ubuntu/bin/monitor.sh`.

---

## Sezione 3 — First-week post-launch

### Day 0 — Launch day

**T-24h Pre-cutover**:
- [ ] DNS preparato TTL 300s
- [ ] Stripe LIVE webhook endpoint configurato con eventi `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- [ ] Stripe test trigger LIVE: `stripe trigger payment_intent.succeeded --api-key sk_live_...`
- [ ] Bokun webhook switch staging → prod URL
- [ ] Brevo sender `noreply@egadisailing.com` verificato SPF+DKIM
- [ ] Turnstile site key LIVE (non dummy)
- [ ] `/api/health?deep=1` tutti green
- [ ] Backup test restore completato ieri
- [ ] Password admin cambiata post-seed + `SEED_ADMIN_PASSWORD` rimossa dal `.env`

**T-0 Cutover** (finestra 06:00-08:00 Europe/Rome):
- [ ] `docker compose up -d app`
- [ ] Switch DNS Cloudflare
- [ ] Attendi propagazione 5 min, verifica da 3 location

**T+0 to T+1h — Smoke test**:
- [ ] Crea prenotazione SOCIAL_BOATING con carta propria 1€
- [ ] Verifica email conferma
- [ ] Verifica `/admin/prenotazioni` CONFIRMED
- [ ] Refund immediato → release availability verifica
- [ ] Verifica Bokun portal: booking appare + scompare

### Day 1-3

```bash
# Quick check ogni 2-4h (30s)
curl -sH "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/health?deep=1 | \
  jq '{status, db: .checks.database.latencyMs, queue: .checks.queue}'

# Booking count today
$PG -c "SELECT source, status, COUNT(*) FROM \"Booking\" WHERE \"createdAt\"::date = CURRENT_DATE GROUP BY 1,2;"

# PENDING stuck (deve essere 0)
$PG -c "SELECT id, \"confirmationCode\" FROM \"Booking\" WHERE status='PENDING' AND \"createdAt\" < NOW() - INTERVAL '30 minutes';"
```

### Day 4-7

- [ ] Test restore reale (Day 2)
- [ ] Prima esecuzione retention cron (notturno) verificato
- [ ] Stripe reconciliation settimanale: `stripe events list --created[gte]=$(date -d '7 days ago' +%s)` vs DB count
- [ ] Weekend weekend: monitoring continuo durante picco

---

## Appendice — Quick reference

```bash
# Tail app log con filtering error
docker compose logs -f app 2>&1 | jq 'select(.level >= 40)'

# Force cron
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/weather-check
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/bokun-reconciliation
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/retention

# Redis queue inspection
$RE LLEN bull:sync:waiting
$RE LLEN bull:sync:failed

# Admin override rate-limit
$RE DEL rlb:OTP_BLOCK_EMAIL:user@example.com
```

---

## Gap noti operational

| ID | Scope | Impatto |
|---|---|---|
| Stripe events reconciliation cron (R2 deferred) | DR-2 recovery manuale | Webhook perso = booking non confermato |
| Outbox pattern reale fan-out (R6 deferred) | DR-3 Redis loss | Recovery via reconciliation ma drift |
| PITR Postgres (pgBackRest) | DR-2 RPO 24h | Perdi fino 24h in corruzione |
| MAINTENANCE_MODE flag | DR-4 Stripe down | Workaround manuale via telefono |
| Sentry wiring (R6 deferred) | Day 1-7 log analysis | Grep log sub-ottimale |
