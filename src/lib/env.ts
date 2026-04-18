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
  DATABASE_URL: z.string().url(),

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

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Brevo
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().email().default("noreply@egadisailing.com"),
  BREVO_SENDER_NAME: z.string().default("Egadisailing"),

  // Cloudflare Turnstile
  TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),

  // Cron
  CRON_SECRET: z.string().default("dev-cron-please-change"),

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
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
