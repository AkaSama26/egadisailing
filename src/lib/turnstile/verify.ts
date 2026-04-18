import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifica un token Turnstile.
 *
 * In dev (NODE_ENV !== 'production'), se TURNSTILE_SECRET_KEY non e' configurato
 * o usa i dummy key `1x00...`, la verifica passa sempre (comportamento Cloudflare).
 *
 * In production, TURNSTILE_SECRET_KEY deve essere settato con una chiave reale.
 */
export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    if (env.NODE_ENV === "production") {
      logger.error("TURNSTILE_SECRET_KEY missing in production");
      return false;
    }
    logger.warn("TURNSTILE_SECRET_KEY not set in dev — bypassing Turnstile");
    return true;
  }

  try {
    const body = new URLSearchParams();
    body.append("secret", env.TURNSTILE_SECRET_KEY);
    body.append("response", token);
    if (ip) body.append("remoteip", ip);

    const res = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };

    if (!data.success) {
      logger.warn({ errors: data["error-codes"] }, "Turnstile verification failed");
    }
    return data.success;
  } catch (err) {
    logger.error({ err }, "Turnstile verify error");
    return false;
  }
}
