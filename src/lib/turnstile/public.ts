import { env } from "@/lib/env";

const CLOUDFLARE_TEST_SITE_KEY_RE = /^[123]x0{18,}/;

export function isCloudflareTurnstileTestSiteKey(siteKey?: string | null): boolean {
  return Boolean(siteKey && CLOUDFLARE_TEST_SITE_KEY_RE.test(siteKey.trim()));
}

export function getPublicTurnstileSiteKey(): string {
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  if (!siteKey) return "";

  if (env.NODE_ENV !== "production" && isCloudflareTurnstileTestSiteKey(siteKey)) {
    return "";
  }

  return siteKey;
}
