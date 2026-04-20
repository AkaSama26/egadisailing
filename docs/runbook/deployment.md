# Deployment runbook

**Stato**: deployment 100% container-based post-R23 launch-prep. Tutti i
pezzi (app + postgres + pgbouncer + redis + caddy + backup sidecar) sono
orchestrati da `docker-compose.prod.yml` al root repo. Il deploy e'
`docker compose -f docker-compose.prod.yml up -d --build` + fill di `.env`.

## Architettura target

```
Internet → Cloudflare (DNS + optional proxy + Turnstile)
          ↓
     Caddy container (auto-TLS Let's Encrypt, security headers, health probe)
          ↓
     app container (Next.js 16 standalone, Node 22, entrypoint migrate deploy)
          ↓
     ├─ pgbouncer container (transaction-pool 30 conn → postgres direct)
     ├─ postgres container (no-port-expose, pgdata volume)
     └─ redis container (no-port-expose, AOF everysec, requirepass)

     + backup sidecar (pg_dump cron 02:30 UTC → S3-compatible bucket)
```

**Note capacity**: app runtime usa `DATABASE_URL_POOLED` (via pgbouncer
transaction-mode, `?pgbouncer=true` flag obbligatorio per disabilitare
prepared statements server-side). Migrations + advisory locks usano
`DATABASE_URL` direct (session pool required).

## Pre-requisiti

- VPS con Docker + Docker Compose v2 (4GB RAM min, 8GB raccomandato)
- Dominio DNS → IP VPS (A/AAAA). Cloudflare DNS-only inizialmente
  (challenge HTTP-01 Let's Encrypt funziona anche con proxy off)
- Account Stripe live mode + webhook endpoint
- Account Brevo sender verificato (SPF + DKIM DNS records)
- Account Cloudflare Turnstile (sitekey + secret)
- Opzionale: Sentry DSN, Bokun/Boataround credentials, Telegram bot
- Bucket S3-compatible per backup (AWS S3, Backblaze B2, Wasabi)

## Fase 1 — VPS setup

```bash
# Installa Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# Clona repo
git clone git@github.com:AkaSama26/egadisailing.git
cd egadisailing
git checkout main
```

## Fase 2 — Configurare `.env`

```bash
cp .env.example .env

# Genera secret robusti (richiesti da env.ts validation):
cat >> .env <<EOF
POSTGRES_USER=egadisailing
POSTGRES_DB=egadisailing
POSTGRES_PASSWORD=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -base64 48)
CRON_SECRET=$(openssl rand -hex 32)
SEED_ADMIN_PASSWORD=$(openssl rand -base64 24)

# Domain-specific
APP_URL=https://egadisailing.com
NEXTAUTH_URL=https://egadisailing.com
APP_DOMAIN=egadisailing.com
SERVER_ACTIONS_ALLOWED_ORIGINS=egadisailing.com,www.egadisailing.com
ACME_EMAIL=ops@egadisailing.com

# External services — fill manually
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...   # da Fase 5
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=noreply@egadisailing.com
BREVO_REPLY_TO=info@egadisailing.com
TURNSTILE_SITE_KEY=0x4...
TURNSTILE_SECRET_KEY=0x4...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4...
ADMIN_EMAIL=admin@egadisailing.com

# Opzionali — commentare se non usati
# SENTRY_DSN=https://...ingest.sentry.io/...
# TELEGRAM_BOT_TOKEN=...
# TELEGRAM_CHAT_ID=...
# BOKUN_VENDOR_ID=...
# BOKUN_ACCESS_KEY=...
# BOKUN_SECRET_KEY=...
# BOKUN_WEBHOOK_SECRET=...
# BOATAROUND_API_TOKEN=...
# BOATAROUND_WEBHOOK_SECRET=...
# IMAP_HOST=...
# IMAP_USER=...
# IMAP_PASSWORD=...

# Backup S3 (obbligatorio per backup sidecar)
BACKUP_S3_BUCKET=egadisailing-prod-backups
BACKUP_S3_ENDPOINT=https://s3.eu-central-1.amazonaws.com
BACKUP_S3_KEY=AKIA...
BACKUP_S3_SECRET=...
BACKUP_RETENTION_DAYS=30
EOF

# Rivedi file .env prima di startup:
cat .env | grep -v PASSWORD  # verifica che non contenga placeholder
```

## Fase 3 — DNS + primo startup

```bash
# Punta DNS A record a IP VPS (TTL basso inizialmente 300s).
# Attendi propagazione (dig +short egadisailing.com).

# Primo avvio: build image + start tutto.
docker compose -f docker-compose.prod.yml up -d --build

# Verifica:
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs app | tail -50

# Caddy emette cert Let's Encrypt al primo HTTPS request — pre-caricalo:
curl -v https://egadisailing.com/api/health
# Prima volta puo' richiedere 30-60s per ACME challenge. Logs:
docker compose -f docker-compose.prod.yml logs caddy | grep -i "cert\|acme"
```

**Migrations**: entrypoint (`docker/entrypoint.sh`) esegue `prisma migrate
deploy` automaticamente prima di avviare Next. Se fallisce il container
app resta down con exit code 1.

**Seed admin**: `SEED_ADMIN_PASSWORD` viene raccolto al primo migrate +
stampa admin login a console. Verifica con:
```bash
docker compose -f docker-compose.prod.yml logs app | grep -i "admin\|seed"
```
Una volta ricevuto login, rimuovi `SEED_ADMIN_PASSWORD` da `.env` +
restart app per chiuderlo. Rotation successiva via admin UI
(`/admin/impostazioni`).

## Fase 4 — Stripe webhook

1. Stripe dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://egadisailing.com/api/webhooks/stripe`
3. Events (minimum set handleStripeEvent supporta):
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled` (R24-S-ALTA-1)
   - `charge.refunded`
4. Copia signing secret → `STRIPE_WEBHOOK_SECRET` in `.env`
5. Restart app: `docker compose -f docker-compose.prod.yml restart app`
6. Test: `stripe trigger payment_intent.succeeded` → verifica log +
   ProcessedStripeEvent row. Oppure dashboard → Resend test event.

Fallback per webhook persi: cron `stripe-reconciliation` ogni 15min replaya
eventi `/v1/events` ultimi 3gg (R24-P2 cursor cross-run via Redis).

## Fase 5 — Uptime + monitoring esterno

- UptimeRobot / BetterStack / Pingdom su `GET https://egadisailing.com/api/health` (shallow, 200/503)
- Interval 5min, alert email + Telegram se 2+ fail consecutivi
- Deep health con Bearer: `GET /api/health?deep=1` (richiede CRON_SECRET)
- Opzionale: Sentry DSN in `.env` → `SENTRY_DSN` attiva auto-capture di
  500 error via `withErrorHandler` (R24-P2 wiring pre-esistente)

## Fase 6 — Backup sidecar

Il container `backup` in `docker-compose.prod.yml` esegue `docker/backup.sh`
automaticamente ogni giorno 02:30 UTC. Richiede env:
- `BACKUP_S3_BUCKET`, `BACKUP_S3_ENDPOINT`, `BACKUP_S3_KEY`, `BACKUP_S3_SECRET`
- `BACKUP_RETENTION_DAYS` (default 30)

Verifica:
```bash
docker compose -f docker-compose.prod.yml logs backup | tail -20
# Dopo un run atteso (o forza manuale):
docker compose -f docker-compose.prod.yml exec backup /backup.sh
# Lista oggetti in bucket:
aws s3 ls s3://egadisailing-prod-backups/pgdump/egadisailing/
```

**Test restore drill consigliato mensilmente**:
```bash
# Scarica dump + restore in DB staging separato per verifica integrita'.
aws s3 cp s3://.../pgdump/egadisailing/TIMESTAMP.sql.gz ./restore.sql.gz
gunzip -c restore.sql.gz | docker compose exec -T postgres psql -U egadisailing -d egadisailing_test
```

## Rolling update (zero-downtime)

```bash
cd /home/ubuntu/egadisailing
git pull origin main

# Rebuild + restart app (migrations applicate automaticamente
# dall'entrypoint pre-start). Postgres/Redis/Caddy non toccati.
docker compose -f docker-compose.prod.yml up -d --build app

# Verifica health post-deploy:
curl -s https://egadisailing.com/api/health | jq
docker compose -f docker-compose.prod.yml logs app | tail -30
```

**Per breaking schema changes**: expand/contract su due release (mai
rimuovere colonne nella stessa release che le rende obsolete).

## Checklist go-live

- [ ] DNS punta alla VPS (egadisailing.com + www.)
- [ ] Caddy ha emesso TLS valido (`curl -vI https://egadisailing.com 2>&1 | grep -i cert`)
- [ ] `/api/health` ritorna 200 con db+redis ok
- [ ] `/api/health?deep=1` con Bearer CRON_SECRET: queue + channels GREEN
- [ ] Stripe webhook configurato + test trigger funziona (log
      "Stripe event received" + ProcessedStripeEvent row)
- [ ] Brevo sender verificato (SPF + DKIM DNS) + test email reached
- [ ] Turnstile widget visibile sul wizard + recupera-prenotazione
- [ ] Admin login funziona (+ rimosso SEED_ADMIN_PASSWORD da .env)
- [ ] Test booking end-to-end con Stripe test mode
- [ ] Cron scheduler attivo (log "Cron scheduler started")
- [ ] Backup sidecar invia primo dump a S3 (check log backup container)
- [ ] Uptime monitor esterno configurato
- [ ] Sentry DSN configurato (o documentato come deferred)
- [ ] Caddyfile security headers visibili in response (`curl -I`)
- [ ] `.env` NON in Docker image (check `.dockerignore` + image layer size)
- [ ] `SERVER_ACTIONS_ALLOWED_ORIGINS` set + non include `localhost`
      (R15-SEC-A1 env.ts refuse startup altrimenti)

## Migration timing e write-lock

**Deploy durante low-traffic window** (mattina IT, evita 07:00-09:00 per i cron,
evita sera venerdi/sabato alta stagione). `prisma migrate deploy` esegue ogni
`CREATE INDEX` in transazione senza `CONCURRENTLY` → SHARE lock sulla tabella
blocca tutti gli INSERT/UPDATE per la durata del build. Per `Booking` con
10k+ righe un compound index puo' richiedere 10-30s, durante i quali:

- `createPendingDirectBooking` aspetta → HTTP timeout 30s lato client → conversion loss
- Stripe webhook retry (ok con exponential backoff)
- Bokun/Boataround webhook retry

**Se la migration aggiunge index su tabella >5k righe**, split manuale:

1. Applica solo le migration schema (no new index) via `prisma migrate deploy`
2. Esegui `CREATE INDEX CONCURRENTLY` manualmente via psql separato (non bloccante)
3. Registra la migration "come applicata" con `prisma migrate resolve --applied <name>`

Esempio:
```bash
psql "$DATABASE_URL" -c 'CREATE INDEX CONCURRENTLY IF NOT EXISTS "Booking_boatId_status_startDate_idx" ON "Booking"("boatId","status","startDate");'
```

Documenta ogni migration "heavy" nel corpo del commit.

## Rollback

Se il deploy rompe la prod:
1. `git checkout <previous-sha>`
2. Se migrazione applicata e deve essere rollback manuale: `prisma migrate resolve --rolled-back <name>` + SQL manuale di down (Prisma non genera down migration auto)
3. `npm ci && npm run build && systemctl restart egadisailing`
4. Verifica health
