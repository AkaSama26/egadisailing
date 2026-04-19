# Deployment runbook

## Architettura target

```
Internet → Cloudflare (DNS + TLS + Turnstile)
          ↓
     Nginx/Caddy (reverse proxy, TLS termination)
          ↓
     next-app container (Node 20+, Next.js 16)
          ↓
     ├─ Postgres container (bind 127.0.0.1:5432)
     └─ Redis container (bind 127.0.0.1:6379, requirepass, AOF)
```

## Pre-requisiti go-live

- VPS con Docker + Docker Compose v2 (2GB RAM min, 4GB raccomandato)
- Dominio con Cloudflare DNS (TLS + Turnstile)
- Account Stripe live mode con webhook configurato
- Account Brevo con sender verificato (SPF/DKIM)
- Account Bokun (se Plan 3 attivo)

## Fase 1 — Setup VPS

```bash
# Installa Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# Clona repo
git clone git@github.com:AkaSama26/egadisailing.git
cd egadisailing

# Setup env
cp .env.example .env
# Genera secret:
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> .env
echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)" >> .env
echo "REDIS_PASSWORD=$(openssl rand -hex 32)" >> .env
echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env
# Compilare a mano le restanti: STRIPE_*, BREVO_*, TURNSTILE_*, SEED_ADMIN_PASSWORD
```

## Fase 2 — Database

```bash
docker compose up -d postgres redis
sleep 5
npx prisma migrate deploy
npx prisma db seed  # prima volta soltanto
```

**Stampa admin password alla fine** — salvala. Dopo il primo seed rimuovi `SEED_ADMIN_PASSWORD` dall'.env per rotation manuale via admin UI.

## Fase 3 — Build app

```bash
npm ci
npx prisma generate
npm run build
```

## Fase 4 — Reverse proxy + TLS

**Con Caddy** (raccomandato per semplicita' — auto-TLS):

`/etc/caddy/Caddyfile`:
```
egadisailing.com, www.egadisailing.com {
    reverse_proxy 127.0.0.1:3000
    encode gzip
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

```bash
systemctl enable --now caddy
```

## Fase 5 — App as systemd service

`/etc/systemd/system/egadisailing.service`:
```
[Unit]
Description=Egadisailing Next.js app
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/egadisailing
EnvironmentFile=/home/ubuntu/egadisailing/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now egadisailing
```

## Fase 6 — Stripe webhook

1. Vai su Stripe dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://egadisailing.com/api/webhooks/stripe`
3. Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `checkout.session.completed`
4. Copia il signing secret → `STRIPE_WEBHOOK_SECRET` in .env
5. Riavvia app
6. Test: `stripe trigger payment_intent.succeeded` dal CLI

## Fase 7 — Uptime monitor

Configurare un monitor esterno (UptimeRobot, BetterStack, Pingdom) su:
- `GET https://egadisailing.com/api/health` → 200
- Interval: 5 min
- Alert: email + Telegram se >= 2 check consecutivi falliscono

## Fase 8 — Backup automatico

Cron job sulla VPS (`/etc/cron.daily/pg-backup`):
```bash
#!/bin/bash
set -e
DUMP="/backups/egadisailing-$(date +\%F).sql.gz"
docker compose -f /home/ubuntu/egadisailing/docker-compose.yml exec -T postgres \
  pg_dump -U egadisailing egadisailing | gzip > "$DUMP"
# Upload offsite (rclone to B2/S3)
rclone copy "$DUMP" b2:egadisailing-backups/
# Keep last 30 local
find /backups -name "egadisailing-*.sql.gz" -mtime +30 -delete
```

## Rolling update (zero-downtime)

1. `git pull origin main` sulla VPS
2. `npm ci && npx prisma generate`
3. **Se ci sono migrazioni nuove**: `npx prisma migrate deploy` (expand-only — no drop columns in stessa release)
4. `npm run build`
5. `systemctl restart egadisailing`
6. Verifica: `curl -s https://egadisailing.com/api/health | jq`

**Per breaking schema changes**: usa pattern expand/contract su due release.

## Checklist go-live

- [ ] DNS punta alla VPS (egadisailing.com + www.)
- [ ] TLS attivo (`curl -I https://egadisailing.com`)
- [ ] `/api/health` ritorna 200 con db+redis ok
- [ ] Stripe webhook configurato e test trigger funziona
- [ ] Brevo sender verificato (inviare email di conferma test)
- [ ] Turnstile site key prod non e' dummy
- [ ] Admin login funziona
- [ ] Test booking end-to-end (modalita' test Stripe)
- [ ] Cron scheduler attivo (log "Cron scheduler started")
- [ ] Backup giornaliero configurato
- [ ] Uptime monitor configurato
- [ ] Security headers attivi (Caddyfile)
- [ ] `.env` non finisce in Docker image (check `.dockerignore`)

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
