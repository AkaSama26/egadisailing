import { z } from "zod";

/**
 * Schema di validazione delle variabili d'ambiente.
 * Eseguito una volta al boot: se qualcosa manca/è invalido, il processo fallisce subito.
 *
 * Aggiungere qui qualsiasi nuova env var prima di usarla nel codice.
 */
const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).optional(),

  // Database
  // DATABASE_URL: connessione primary — usata per MIGRATION (prisma migrate
  // deploy) e advisory locks (richiedono session-pool, non transaction-pool
  // PgBouncer). In prod configurare questo puntando a Postgres direct.
  DATABASE_URL: z.string().url(),
  // DATABASE_URL_POOLED: opzionale in prod — connessione via PgBouncer
  // transaction-pool per ridurre pool exhaustion sotto picco (Ferragosto
  // 100+ booking/day). Se settato, Prisma runtime lo usa per query normali
  // via `PRISMA_DATABASE_URL` override. Migrations e advisory locks
  // continuano a passare da DATABASE_URL primary. Setup:
  //   1. Deploy PgBouncer sidecar con pool_mode=transaction, pool_size=30
  //   2. Settare DATABASE_URL_POOLED="postgres://user:pass@pgbouncer:6432/db"
  //   3. DATABASE_URL resta direct connection per migrations
  // R16 capacity planning: obbligatorio pre-Ferragosto 2026.
  DATABASE_URL_POOLED: z.string().url().optional(),
  // R16 capacity planning: pool size del runtime (PgBouncer o direct).
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(200).default(20),

  // Redis
  REDIS_URL: z.string().url(),

  // NextAuth
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters")
    .refine(
      (v) => !v.toLowerCase().includes("changeme"),
      "NEXTAUTH_SECRET looks like a placeholder; generate with `openssl rand -base64 32`",
    ),
  NEXTAUTH_URL: z.string().url(),

  // Seed admin (required in production, optional in dev)
  SEED_ADMIN_PASSWORD: z.string().min(12).optional(),

  // App URL
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_LOCALES_DEFAULT: z.string().default("it"),

  // Server Actions allowed origins (comma-separated). Obbligatorio in prod
  // dietro reverse proxy (Round 10 Sec-C1). Es.:
  //   "egadisailing.com,www.egadisailing.com"
  SERVER_ACTIONS_ALLOWED_ORIGINS: z.string().optional(),

  // R28-CRIT-4: CIDR list trusted proxy (comma-separated). Hop presenti
  // in X-Forwarded-For e matchanti una CIDR di questa lista sono
  // skippati durante il walk → il primo hop non-trusted e' il client
  // reale. Se non configurato, fallback a default (loopback + RFC1918 +
  // ULA IPv6) che copre Docker bridge standard. Senza firewall a livello
  // infra (blocco porta app direct-to-origin), la trust list NON previene
  // spoofing. Documentato in docs/runbook/deployment.md.
  TRUSTED_PROXY_IPS: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Brevo
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().email().default("noreply@egadisailing.com"),
  BREVO_SENDER_NAME: z.string().default("Egadisailing"),
  BREVO_REPLY_TO: z.string().email().optional(),
  // R29-#2: contatto cliente per email overbooking apology (WhatsApp /
  // telefono diretto admin). Opzionale: se unset, email mostra solo
  // contact email (BREVO_REPLY_TO). Format libero (`+39 xxx xxx xxxx`).
  CONTACT_PHONE: z.string().optional(),

  // Cloudflare Turnstile
  TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),

  // Cron
  CRON_SECRET: z.string().default("dev-cron-please-change"),

  // Sentry (observability) — optional in dev, active prod quando DSN settato.
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),

  // Bokun (Plan 3)
  BOKUN_API_URL: z.string().url().default("https://api.bokuntest.com"),
  BOKUN_VENDOR_ID: z.string().optional(),
  BOKUN_ACCESS_KEY: z.string().optional(),
  BOKUN_SECRET_KEY: z.string().optional(),
  BOKUN_WEBHOOK_SECRET: z.string().optional(),
  BOKUN_PRICE_MARKUP: z
    .string()
    .default("1.15")
    .refine((s) => !isNaN(parseFloat(s)) && parseFloat(s) >= 1, "must be a number >= 1.0"),

  // Priority Override (Fase 1) — feature flags + soglie cancellation rate.
  // Rollout graduale: master flag abilita lifecycle DIRECT-vs-DIRECT;
  // OTA sub-flag abilita workflow admin checklist per conflict OTA.
  FEATURE_OVERRIDE_ENABLED: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  FEATURE_OVERRIDE_OTA_ENABLED: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  // Soft warn soglia cancellation rate per-channel (dashboard KPI + admin UI).
  OVERRIDE_CANCELLATION_RATE_SOFT_WARN: z.coerce.number().min(0).max(1).default(0.03),
  // Hard-block (§13.10). Se il rate rolling 30gg di un canale supera questa soglia,
  // approveOverride blocca nuovi approve su quel canale finche' non scende.
  OVERRIDE_CANCELLATION_RATE_HARD_BLOCK: z.coerce.number().min(0).max(1).default(0.05),

  // Admin notifications (Plan 6)
  ADMIN_EMAIL: z.string().email().default("admin@egadisailing.com"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),

  // Boataround (Plan 4)
  BOATAROUND_API_URL: z.string().url().default("https://partner-api.boataround.com"),
  BOATAROUND_API_TOKEN: z.string().optional(),
  BOATAROUND_WEBHOOK_SECRET: z.string().optional(),

  // IMAP for charter email parsing (Plan 4)
  IMAP_HOST: z.string().optional(),
  IMAP_PORT: z
    .string()
    .default("993")
    .refine((s) => !isNaN(parseInt(s, 10)), "IMAP_PORT must be numeric"),
  IMAP_USER: z.string().optional(),
  IMAP_PASSWORD: z.string().optional(),
  IMAP_TLS: z
    .string()
    .default("true")
    .transform((s) => s !== "false"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Environment validation failed");
  }

  // Regole extra per production runtime. Saltate durante `next build`
  // (NEXT_PHASE=phase-production-build) perche' la build gira con
  // NODE_ENV=production ma i secret non sono obbligatori al compile.
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (parsed.data.NODE_ENV === "production" && !isBuildPhase) {
    if (!parsed.data.SEED_ADMIN_PASSWORD) {
      throw new Error("SEED_ADMIN_PASSWORD is required in production");
    }
    if (!parsed.data.STRIPE_SECRET_KEY || !parsed.data.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET required in production");
    }
    if (!parsed.data.BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY required in production");
    }
    if (!parsed.data.TURNSTILE_SECRET_KEY || !parsed.data.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      throw new Error("TURNSTILE_SECRET_KEY + NEXT_PUBLIC_TURNSTILE_SITE_KEY required in production");
    }
    if (
      parsed.data.CRON_SECRET === "dev-cron-please-change" ||
      parsed.data.CRON_SECRET.length < 32
    ) {
      throw new Error("CRON_SECRET must be changed and >= 32 chars in production");
    }
    // R15-SEC-A1 + R15-REG-SEC-A1: SERVER_ACTIONS_ALLOWED_ORIGINS obbligatorio
    // in prod + mai puntare a localhost/127.0.0.1 (dev leak misconfig). Senza,
    // Next accetta l'origine del Host header → CSRF-like se proxy mal
    // configurato. Parse entries + exact hostname match — la regex substring
    // precedente falsava `mylocalhost.com` o `staging.localhost-test.it`.
    const allowedOriginsRaw = parsed.data.SERVER_ACTIONS_ALLOWED_ORIGINS;
    if (!allowedOriginsRaw || allowedOriginsRaw.trim().length === 0) {
      throw new Error("SERVER_ACTIONS_ALLOWED_ORIGINS required in production");
    }
    const origins = allowedOriginsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (origins.length === 0) {
      throw new Error("SERVER_ACTIONS_ALLOWED_ORIGINS contains no valid origins in production");
    }
    const FORBIDDEN_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
    for (const origin of origins) {
      let host = origin;
      try {
        host = new URL(origin.includes("://") ? origin : `https://${origin}`).hostname;
      } catch {
        // non-URL: trattalo come hostname bare
      }
      // R16-REG-M2: Node URL.hostname preserva brackets per IPv6 ("[::1]")
      // → non matcherebbe FORBIDDEN_HOSTS "::1" bare. Normalizza strip brackets.
      const normalizedHost = host.toLowerCase().replace(/^\[|\]$/g, "");
      if (FORBIDDEN_HOSTS.has(normalizedHost)) {
        throw new Error(
          `SERVER_ACTIONS_ALLOWED_ORIGINS must not contain localhost/127.0.0.1 in production (got: ${origin})`,
        );
      }
    }
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
