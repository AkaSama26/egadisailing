# HTTP Guards Package

Higher-order functions (HOFs) per uniformare HTTP route boilerplate.
Ogni guard wrappa una concern cross-cutting (auth, rate-limit, lease,
error mapping) e compone con `withErrorHandler` per AppError → HTTP status.

## Existing guards

| Guard | File | Purpose | Adoption |
|---|---|---|---|
| `withErrorHandler` | `../with-error-handler.ts` | Error mapping AppError → HTTP + Sentry capture | All API routes |
| `requireBearerSecret` | `../with-error-handler.ts` | Verify Bearer = env.CRON_SECRET (timing-safe) | All cron routes |
| `withCronGuard` | `../with-cron-guard.ts` | Bearer + rate-limit + Redis lease + runBudget | 11/11 cron routes |
| `withWebhookGuard` | `../with-webhook-guard.ts` | Rate-limit + body-cap + IPv6 normalize + arrayBuffer | Bokun + Boataround webhooks (Stripe excluded — SDK constructEvent) |
| `withAdminAction` | `../../admin/with-admin-action.ts` | requireAdmin + rate-limit + Zod parse + revalidate + result-tuple | 7/13 admin actions (Phase 6: migrated 6 simple CRUD) |
| `fetchWithRetry` | `../with-retry.ts` | Retry + backoff + jitter + timeout + Retry-After parse | Bokun + Boataround clients |

## Domain-aligned helpers (Phase 6 extractions)

| Helper | File | Purpose | Adoption |
|---|---|---|---|
| `withDedupedEvent` | `../../dedup/processed-event.ts` | findUnique → handler → P2002-tolerant create | Stripe + Bokun + Boataround webhooks |
| `pruneProcessedEvents` | `../../dedup/processed-event.ts` | Retention deleteMany on ProcessedXEvent tables | Retention cron (4 tables) |
| `defineWorker` | `../../queue/define-worker.ts` | BullMQ factory: jobName + data + configCheck guard | bokun-availability, boataround-availability, manual-alert, bokun-pricing |
| `processBatchPaginated` | `../../cron/process-batch-paginated.ts` | Cursor-paginated batch loop + maxBatches + shouldStop | pending-gc, retention bokun-payload + charter-payload, bokun-reconciliation |
| `parseCharterEmail` | `../../email-parser/parse-charter-email.ts` | Config-driven regex extraction for charter emails | samboat, clickandboat, nautal parsers |

## Convention

1. **Bearer-FIRST**: in cron routes, Bearer auth precede il rate-limit (R13-C2 hardening).
2. **Rate-limit identifier**: cron usa `"global"`, webhook usa IP normalizzato (IPv6 brackets stripped), admin usa userId.
3. **Lease TTL**: vedi `src/lib/timing.ts` constant `TTL.CRON_LEASE_X`.
4. **runBudgetMs**: handler cron rispetta `ctx.shouldStop()` per soft-timeout (4-6min).
5. **Sentry capture**: AppError 500-tier auto-captured da withErrorHandler. Server Actions chiamano `captureError(err)` nel catch block (withAdminAction lo fa automaticamente).

## Adding a new guard

1. Create file in `src/lib/http/` (o `src/lib/<domain>/` se domain-specific).
2. Export HOF che ritorna `withErrorHandler(async (req, ctx) => {...})`.
3. Documenta in questo README.
4. Aggiungi a `RATE_LIMIT_SCOPES` (channels.ts) se introduce nuovo scope.
5. Aggiungi lease key a `LEASE_KEYS` (lease/keys.ts) se usa single-flight.

## When NOT to extract a guard

- One-off pattern (1-2 sites): stays inline.
- Provider-specific logic (Stripe SDK, Open-Meteo trivial fetch): doesn't fit generic shape.
- Strict-vs-tolerant business semantics differ across sites: don't force unify.
- Multi-branch state machine post-loop (es. stripe-reconciliation con cursor cross-run + persistence): cursor management e' parte essenziale del business logic, non boilerplate.

## Phase 6 deferred

- **stripe-reconciliation cron**: `processBatchPaginated` non fits — uses
  Stripe `starting_after` cursor + Redis cross-run persistence + multi-branch
  post-loop logic (`reachedLimit && lastEventIdThisRun` vs `failed && !reachedLimit`).
  La cursor-management e' tightly coupled con il business logic di drain.
- **email-parser dedup**: `wasMessageProcessed` + `markMessageProcessed` API
  preservata invece di migrare a `withDedupedEvent` perche' il cron caller
  deve eseguire dispatch+parse+import tra check e mark con flussi early-return
  distinti (skippedUnmatched, skippedUnparsed) non gestibili nel scope helper.
