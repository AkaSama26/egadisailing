# Go-Live Final Assessment — 18 aprile 2026

Audit Round 18 consolidated post-17-round. **VERDICT: Stop audit, shift delivery. Pilot launch target 20 maggio 2026.**

## State-of-the-art dopo 17 round

Qualità pesata **6.2/10**. Core transazionale 8+/10, ma GDPR (2/10), infra (3/10), testing (3/10) tirano media giù.

| Area | Quality | Blocker residui |
|---|---|---|
| Authentication + session | 8.5 | NextAuth beta bump, role enum |
| Booking flow core | 9 | `blockDates` N+1 (deferred), buffer temporale |
| Stripe | 8.5 | Reconciliation cron, idempotency-key |
| Bokun | 8 | body signing, replay timestamp |
| Boataround | 7.5 | Reconciliation cron, secret rotation |
| Email parser | 6 | **DMARC/SPF/DKIM**, IMAP erasure GDPR |
| Admin dashboard | 8 | Rate-limit Server Actions, step-up auth |
| Availability + fan-out | 7.5 | `blockDates` N+1, outbox pattern |
| Weather + notifications | 7 | Stormglass fallback, notification abuse limit |
| **GDPR/Legal** | **2** | ConsentRecord, /privacy /terms /cookie, DSR endpoint |
| Security headers | 8.5 | CSP non configurato |
| Rate-limit | 8 | Fail-open tradeoff (partial fix R17) |
| Observability | 4 | **Sentry non wired**, uptime monitor esterno |
| **Infra/Deploy** | **3** | **docker-compose.prod, Caddyfile, backup, CI/CD, staging** |
| **Testing** | **3** | 106 unit pure. Zero integration/E2E |
| Frontend UX | 7 | **Turnstile widget non renderizzato** client, contact form rotto |
| i18n/SEO | 5 | Hardcode IT massiccio, OG/hreflang |

## 5 hard blocker Tier-1 (nessun bypass)

| ID | Effort | Dependency |
|---|---|---|
| R9-Turnstile-Client widget | 1 gg | env sitekey OK |
| R3-GDPR-ConsentRecord + checkbox wizard | 3 gg | **Copy legale cliente** |
| R3-Legal-Pages (/privacy /terms /cookie-policy) | 1 gg eng | **Copy legale cliente** |
| R7-Deploy-Infra (compose.prod + Caddy + backup + CI) | 4 gg | Hosting + dominio DNS |
| R7-Admin-Actions-Rotto (@ts-nocheck legacy) | 1 gg | nessuna |

**~10 gg eng + 1 gg cliente input.** Legal copy è il vero long-pole.

## Tier-2 blocker forte (skip = rischio reale)

- R14-Cross-OTA Exclusion constraint Postgres (0.5 gg)
- R8-DMARC/SPF/DKIM verify (2 gg + cliente DNS)
- R7-anonymizeCustomer helper (1 gg)
- R11-i18n hardcode IT cleanup (1 gg + EN translations cliente)
- R6-Sentry wiring (0.5 gg)
- R7-CI/CD GitHub Actions (1 gg)
- R11-Tier-A Testing (10 gg)

**~16 gg eng + 0.5 gg cliente.**

## Proiezione futuri audit

- **60%**: placebo fix dei round recenti (fix che non funzionano come pubblicizzati)
- **30%**: regressione nei fix R14-R17
- **0%**: nuovo bug architetturale (quelli sono stati trovati in R1-R7)

**ROI audit R18+: diminished.** Ogni round introduce rischio di nuova regressione nei fix. **10 gg di testing infra ROI 10x rispetto a R18-R22 audit.**

## Raccomandazione: **Scenario C — Pilot Launch controlled**

**Target**: 20 maggio 2026 (5 settimane).

**Strategia**:
- W1 (21-27 apr): Turnstile client + admin actions + GDPR placeholder + kickoff legal cliente
- W2 (28 apr - 4 mag): Infra deploy + Caddy + backup + Sentry wiring + staging
- W3 (5-11 mag): Legal copy (cliente) + ConsentRecord wiring + smoke test
- W4 (12-18 mag): Fix da staging + Stripe LIVE onboarding + dry-run
- W5 (19-25 mag): Go-live **pilot** — feature flag limit 10 booking/day W1, 30/day W2, full W3

**Rischio primario primo mese**: regressione silente fix R10-R12 (refund flow, auto-refund cancelled, Payment REFUND record). Mitigation: Sentry + daily KPI review + pilot flag per rollback <5min.

## Dipendenze critiche cliente (urgent, chiedere oggi)

1. **Legal copy definitivo** (Privacy Policy + T&C + Cancellation Policy) — deadline: -2 sett. da go-live
2. **Domain + DNS** Cloudflare con DMARC/SPF per SamBoat/Click&Boat/Nautal
3. **Decisione pricing unit Cabin Charter** (per-person vs per-boat)
4. **Stripe LIVE account** (KYC + IBAN + webhook endpoint)
5. **Email sender verificato Brevo** (noreply@egadisailing.com + reply-to)

**Senza #1 e #2: NO-GO indefinito.**

## Verdict finale

Codice **production-ready funzionalmente** (core transazionale 8+/10). **Non lo è legalmente (GDPR 2/10) e infrastrutturalmente (3/10).**

Blocker residui concreti, noti, stimati. Non servono altri audit — serve esecuzione disciplinata su ~25 gg eng + cliente input.

**Stop audit. Start delivery. Pilot 20 maggio 2026.**
