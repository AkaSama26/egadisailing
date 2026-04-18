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
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Environment validation failed");
  }

  // Regole extra per production
  if (parsed.data.NODE_ENV === "production") {
    if (!parsed.data.SEED_ADMIN_PASSWORD) {
      throw new Error("SEED_ADMIN_PASSWORD is required in production");
    }
    if (!parsed.data.STRIPE_SECRET_KEY) {
      console.warn("⚠️  STRIPE_SECRET_KEY missing in production");
    }
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
