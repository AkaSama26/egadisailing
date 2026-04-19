# Capacity planning + cost projection — Egadisailing

Analisi quantitativa. Audit Round 16.

## Throughput analysis — Ferragosto week (100 booking/day × 7gg)

Mix realistico: **60% DAY-type** (FULL/HALF_DAY), **30% WEEK** (cabin charter 7gg), **10% SOCIAL_BOATING** (blocco pieno finché capacityMax cumulative non applicato).

### Side-effect per booking DIRECT

Per durata:

| Durata | Tx `blockDates` | Job BullMQ totali | Upstream API (BOKUN+BOATAROUND) | ManualAlert insert |
|---|---|---|---|---|
| DAY | 1 | 4 | 2 | 2 |
| WEEK | 7 | 28 | 14 | 14 |

**Aggregato 100 booking/day** (60 DAY + 30 WEEK + 10 social):
- Tx `blockDates`: **280/day**
- Job BullMQ: **1120/day**
- Upstream Bokun POST: **560/day** (worker limiter 10/s → drain 56s)
- Upstream Boataround POST: **560/day**
- ManualAlert insert (Click&Boat + Nautal): **560/day**

### HTTP outbound/day peak

| Destinazione | Booking traffic | Cron traffic | **Totale/day** | Peak RPS |
|---|---|---|---|---|
| Stripe API | 100 create + ~5 refund | ~15 cancel PI + ~10 balance | **~230/day** | ~1-2 RPS burst |
| Bokun API | 560 availability | 288 reconciliation + ~5 pricing | **~855/day** | 10/s cap |
| Boataround API | 560 availability | 0 | **560/day** | 10/s cap |
| Brevo API | 100 customer + 100 admin + 5 cancel | 10 balance + 15 weather | **~230/day** | negligibile |
| IMAP polling | 0 | 288 | **288/day** | 1 op/5min |
| Open-Meteo | 0 | 1-4 (cache 6h, lease) | **~4/day** | negligibile |

**DB write/day peak**: ~2500 (booking lifecycle + workers + cron). Burst **100-200/min** in fascia 09:00-22:00.

---

## Bottleneck identification

### Bottleneck #1 — Postgres connection pool exhaustion (CRITICO)

Scenario sabato mattina Ferragosto, 40 booking confermati in 2h. Ogni confirm:
- Webhook entra → tx 1 `confirmDirectBookingAfterPayment` ~300ms
- `blockDates` WEEK = 7 tx seriali × ~80ms = **560ms in tx con advisory-lock**
- Concorrente: `/api/payment-intent` (1 tx ~100ms) + workers BullMQ (2-3 query ciascuno)

Al picco **5 webhook WEEK simultanei + 3 workers × 2 canali + 5 app request** → ~16 conn attive. Soglia **20 pool** raggiunta a **~7 booking WEEK concurrent**. Oltre: timeout Prisma → 500 al client.

**Manifestazione**: "errore interno" sporadico, Stripe webhook timeout → retry. `ChannelSyncStatus` YELLOW.

**Soglia critica**: ~8-10 booking WEEK concurrent / 30-40 booking/h mix.

### Altri bottleneck

| Risorsa | Peak usage | Limit | Headroom |
|---|---|---|---|
| Redis memory | ~1 MB | 256 MB | 250× |
| BullMQ Bokun worker | 10 job/s | limiter 10/s | 0× (saturo) |
| Stripe rate limit | ~3-5 RPS | 100 RPS | 20-30× |
| Open-Meteo quota | ~4/day | 10k/day | 2500× |
| Brevo free tier | ~340/day peak | 300/day | **OVER ferragosto** |

**Brevo**: Ferragosto extreme 150 booking/day → 340+ email/day → **OVER free tier**. Upgrade preventivo a **Lite €25/mese** per giugno-settembre.

---

## Storage projection (12 mesi)

Assumendo **1500 booking/anno**:

| Tabella | Righe/anno | MB/anno |
|---|---|---|
| AuditLog (dominante) | ~15000 | **9 MB** |
| BokunBooking (rawPayload JSONB) | 450 | 0.7 |
| Payment | 2250 | 0.6 |
| BokunPriceSync | 3000 | 0.6 |
| ConsentRecord | 1500 | 0.45 |
| CharterBooking | 300 | 0.4 |
| ProcessedStripeEvent | 7500 | 0.75 |
| Altri | | ~1 MB |

**Totale ~14-15 MB payload + indici ×2 = 30 MB core DB anno 1**. WAL/toast ×3 → ~100 MB. Dump compresso ~30 MB.

Hetzner CX21 80GB SSD: margine **~2500× dopo 12 mesi**. Storage irrilevante pre-anno 3-4.

---

## Cost projection mensile

Assumo **7000 booking/anno**, 85% giugno-settembre, AOV blended €350.

| Voce | **Alta (jul/aug)** | **Shoulder** | **Off (nov-mar)** |
|---|---|---|---|
| Infra (Hetzner CX21+backup) | 14 | 10 | 10 |
| Stripe fees (1.5% EEA + 2.9% global) | 10,450 | 2,100 | 50-200 |
| Bokun 2.5% commissions + flat | 3,990 | 840 | 50 |
| Brevo Lite (giu-set) | 25 | 25 | 0 |
| Uptime monitor | 4 | 4 | 4 |
| **Totale €/mese** | **~14,480** | **~2,980** | **~115** |
| **% revenue lorda** | **2.76%** | **2.84%** | — |

**TCO annuo**: ~€43,500 di cui **~90% Stripe+Bokun fees** (commodity). Infrastruttura vera: **~€180/anno**.

---

## Top 5 ottimizzazioni ROI ≤ 1 giorno

### 1. Batch `blockDates` con `INSERT ... ON CONFLICT` (R3 deferred CRITICA)
- **Problema**: WEEK = 7 tx seriali, latency 700-1500ms, contribuisce a pool exhaustion
- **Fix**: single raw SQL range upsert + single fan-out range
- **Savings**: tx 7×→1×, latency ~200ms, pool peak -40%
- **Effort**: 0.5 gg
- **Rischio**: medio (advisory-lock namespace)

### 2. `DATABASE_POOL_MAX=30` + PgBouncer sidecar (ALTA)
- **Problema**: 20 conn esaurite al primo burst WEEK
- **Fix**: bump env + pgbouncer:latest container transaction pooling, Prisma → pgbouncer:6432
- **Savings**: 3-5x volume headroom, p99 latency -30%
- **Effort**: 0.5 gg
- **Rischio**: alto se mal configurato (advisory-lock richiede session pooling — dual DATABASE_URL)

### 3. BullMQ metric + alert `failed > 20` / `waiting > 500` (MEDIA)
- **Problema**: worker silent se Bokun 5xx
- **Fix**: `/api/metrics/queue` + Better Stack heartbeat
- **Savings**: MTTR incidenti da "cliente lamentela" a <10min
- **Effort**: 0.5 gg

### 4. Brevo digest + auto-fallback (MEDIA)
- **Problema**: Ferragosto 340 email/day → Brevo 429
- **Fix**: weather digest 1/day (R12 deferred) + counter Redis `brevo:sent:${YYYYMMDD}` skip non-critical se >280
- **Savings**: €100/anno fino a 130 booking/day
- **Effort**: 0.5 gg

### 5. Redis cache layer pre-DB weather (BASSA)
- **Problema**: `findMany` WeatherForecastCache ad ogni `getWeatherForDate`
- **Fix**: cache Redis TTL 6h, fallback DB + refresh
- **Savings**: 300 × 3ms DB = 900ms per weather-cron + homepage LCP -80ms
- **Effort**: 0.5 gg

---

## Raccomandazione operativa

**Prima del go-live Ferragosto**:
1. (2) PgBouncer + POOL_MAX=30 — **obbligatorio**
2. (1) Batch blockDates — riduce pressione
3. (3) Alerting BullMQ — visibilità minima

**Durante stagione**:
- Upgrade preventivo Brevo Lite a giugno
- Monitor Hetzner load avg > 2.5 → scale CX31 (+€4/mese × 4 mesi)
- Verifica pgdump backup settimanale + test restore prima di luglio
