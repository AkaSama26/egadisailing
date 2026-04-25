# Refactor Phase 4 — Deferred items

Lista degli item Phase 4 (backend integration extractions) che richiedono
infra mancante e sono stati scientemente skippati. Da riprendere quando le
relative gate condition saranno soddisfatte.

## refundChargesAndReleaseDates extraction

- **Cosa**: estrarre il core condiviso tra admin `cancelBooking`
  (`src/app/admin/(dashboard)/prenotazioni/[id]/actions.ts`) + override
  `postCommitCancelBooking` (`src/lib/booking/override/post-commit.ts`).
  Entrambi: enumerate Payment SUCCEEDED → `refundPayment` Stripe (errors
  collected, throw if any) → `releaseDates(channel, ...)` post-commit.
- **Saving stimato**: ~70 LoC + consolidamento invariant refund-cascade in
  un unico punto auditabile.
- **Risk**: HIGH. Path finanziario (refund Stripe + release fan-out OTA),
  battlefield di placebo-fix R10-R14:
  - R10-C2 cancelBooking source=BOKUN/BOATAROUND non rilasciava upstream
  - R10-C3 race admin-cancel vs Stripe webhook succeeded
  - R10-A4 cancelBooking refund failure no rollback
  - R13-Scenario H partial Stripe refund + full admin cancel residuo
  - R14-REG-M3 Stripe `onChargeRefunded` retry storm su booking
    hard-deleted
- **Gate**: Tier-A integration test infra (R17 testing-roadmap.md, ~10gg
  1-dev). Senza test integration su pglite + ioredis-mock + Stripe fixture,
  un refactor su questo path rischia regressione finanziaria silenziosa.
- **Trigger per riprendere**: Tier-A test suite in main + 3+ scenari
  cancel/refund verdi (race admin vs webhook, partial refund, refund
  failure rollback).
- **DEFERRED to**: post-launch hardening pass after Tier-A test suite
  lands (Plan 7+).

## WizardStep + WizardField + WizardActions extraction

- **Cosa**: estrarre il frame condiviso degli step del booking wizard
  (`src/components/booking/booking-wizard.tsx`):
  - `WizardStep` — header (titolo + back button + progress) +
    container layout
  - `WizardField` — label visibile (WCAG 3.3.2) + error display +
    aria-describedby cabling
  - `WizardActions` — footer next/back con loading state +
    confirmMessage opzionale
- **Saving stimato**: ~60 LoC + consolidamento WCAG/a11y boundary +
  preparazione per il refactor i18n-EN dei testi step.
- **Risk**: HIGH. Customer-facing checkout, conversion-sensitive. Battlefield
  R15-UX-1 (Stripe retry recovery placebo), R15-UX-12+13 (OTP cooldown
  placebo + email desync), R15-UX-2 (sessionStorage state persistence
  pending), R15-UX-7 (PeopleStep minPaying validation client-side).
- **Gate**: Playwright smoke E2E (`@playwright/test` + `tests/e2e/`)
  copertura:
  - Wizard happy path DIRECT (search → people → date → customer →
    consent → stripe success)
  - Stripe retry post `card_declined` (R15-UX-1 placebo battlefield)
  - OTP recovery flow (R15-UX-12+13)
  - Validazione client-side step-by-step (back/forward, refresh, tab kill)
- **Trigger per riprendere**: Playwright suite verde + telemetry conversion
  baseline misurata.
- **DEFERRED to**: post-Playwright-infra dedicated PR (Plan 7+ con feature
  flag pilot).

---

## Rationale

Questi 2 item rappresentano ~130 LoC di scope rimanente Phase 4. Le rispettive
gate sono pre-requisiti production-readiness flaggati cross-round audit
(R13/R17/R18) e devono atterrare PRIMA di questi refactor — diversamente il
refactor stesso aggiungerebbe rischio in path security/finanziari/
conversion-critical senza la rete di sicurezza.

Phase 4 chiude con i 3 item medium-risk eseguiti:
- `fetchWithRetry` core helper (Bokun + Boataround clients): -84 LoC
- `withWebhookGuard` HOF (Bokun + Boataround webhook routes): -49 LoC
- `upsertCustomerFromExternal` shared helper (3 OTA adapters): -22 LoC

Total Phase 4 saving applicato: ~155 LoC con boundary consolidation pulita
e zero behavior drift sui test (267/267).
