import { BokunClient } from "./client";
import { env } from "@/lib/env";

/**
 * Bokun client singleton via globalThis per sopravvivere a HMR in dev.
 *
 * Richiede `BOKUN_ACCESS_KEY` e `BOKUN_SECRET_KEY` configurati (fallisce
 * loud al primo uso se mancanti — in dev senza credenziali, NON chiamare
 * `bokunClient()` finche' non sono settati).
 */
const globalForBokun = globalThis as unknown as { __bokun__?: BokunClient };

export function bokunClient(): BokunClient {
  if (!globalForBokun.__bokun__) {
    if (!env.BOKUN_ACCESS_KEY || !env.BOKUN_SECRET_KEY) {
      throw new Error("BOKUN_ACCESS_KEY / BOKUN_SECRET_KEY not configured");
    }
    globalForBokun.__bokun__ = new BokunClient({
      apiUrl: env.BOKUN_API_URL,
      credentials: {
        accessKey: env.BOKUN_ACCESS_KEY,
        secretKey: env.BOKUN_SECRET_KEY,
      },
    });
  }
  return globalForBokun.__bokun__;
}

/**
 * Indica se le credenziali Bokun sono disponibili. Utile per route/workers
 * che devono gracefully skippare se Bokun non e' ancora configurato.
 */
export function isBokunConfigured(): boolean {
  return Boolean(env.BOKUN_ACCESS_KEY && env.BOKUN_SECRET_KEY);
}
