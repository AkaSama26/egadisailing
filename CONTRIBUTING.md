# Contributing to egadisailing

## Branch naming
- `feat/<short-slug>` per nuove feature
- `fix/<short-slug>` per bug fix
- `chore/<short-slug>` per housekeeping
- `docs/<short-slug>` per documentazione

## Commit messages (Conventional Commits)
```
<type>(<scope>): <subject>

<body>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `ci`, `build`.

Scope: `booking`, `stripe`, `otp`, `admin`, `api`, `db`, `cron`, `site`, `deps`, `agents`.

Esempi:
```
feat(booking): add cabin charter saturday-pivot validation
fix(stripe): null-safe metadata parsing on webhook
docs(runbook): deployment guide for production VPS
```

## Convenzioni codice
Riferirsi a `AGENTS.md` per regole invarianti:
- Date via `toUtcDay`/`parseDateLikelyLocalDay` (no normalizzazione inline)
- Channels via `CHANNELS.*` (no string literal)
- Prices in `Decimal`, conversione a cents via `toCents()` solo al boundary Stripe
- API routes con `withErrorHandler`
- Email HTML con `escapeHtml()`
- Rate limit su ogni endpoint pubblico
- Prisma client import da `@/generated/prisma/client` (non `@prisma/client`)

## PR checklist

Prima di aprire PR, verifica:
- [ ] `npm run typecheck` passa senza errori
- [ ] `npm test` passa (47 test minimo)
- [ ] `npm run build` passa
- [ ] Se schema Prisma cambiato: `npx prisma migrate dev --name <descriptive>`
- [ ] `.env.example` aggiornato se nuove env vars (con commento)
- [ ] `AGENTS.md` aggiornato se nuove regole invarianti / foundation libs
- [ ] Commit messages conformi
- [ ] No `@ts-nocheck` aggiunto (eccetto legacy refactor Plan 5)
- [ ] No `as any` su user input / auth
- [ ] No credenziali nei commit (check `git diff` per `sk_`, `whsec_`, password)

## Struttura codice

- `src/lib/` — business logic, utilities, client esterni. Testabile.
- `src/app/api/` — API routes. Sempre `withErrorHandler`.
- `src/app/[locale]/` — pagine pubbliche i18n.
- `src/app/admin/` — pannello admin (NextAuth protected).
- `src/components/` — UI components.
- `src/generated/prisma/` — client Prisma generato (gitignored? no — committed per dev onboarding senza regenerate).
- `prisma/` — schema, migrations, seed.
- `docs/runbook/` — procedure operative.
- `docs/superpowers/specs/` — design specs.
- `docs/superpowers/plans/` — implementation plans.

## Testing

```bash
npm test           # run all vitest suites
npm run test:watch # watch mode during development
```

Test co-located: `src/lib/foo/bar.ts` → `src/lib/foo/bar.test.ts`.

Solo pure functions unit-testate oggi (47 test). Integration test (Prisma, Redis, Stripe) arriveranno in Plan 3+.

## Code review

Cosa guardare:
1. **Security**: input validato con Zod? HTML escape? SQL injection? Auth check?
2. **Correttezza business**: price calculation, availability, payment flow
3. **Concorrenza**: transazioni, idempotency, race conditions
4. **Convenzioni**: channels, dates, Decimal, channels, withErrorHandler
5. **Test**: unit test nuovi per pure functions?
6. **Doc**: AGENTS.md aggiornato se cambia un'invariante?

Referenza dettagliata: 4 round di audit gia' applicati, findings in `AGENTS.md`.
