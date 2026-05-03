import type { Metadata } from "next";
import { env } from "@/lib/env";

export interface SiteVerificationConfig {
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  metaDomainVerification?: string;
}

function cleanToken(value: string | undefined): string | undefined {
  const token = value?.trim();
  return token ? token : undefined;
}

export function getSiteVerificationConfig(): SiteVerificationConfig {
  return {
    googleSiteVerification: cleanToken(env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION),
    bingSiteVerification: cleanToken(env.NEXT_PUBLIC_BING_SITE_VERIFICATION),
    metaDomainVerification: cleanToken(env.NEXT_PUBLIC_META_DOMAIN_VERIFICATION),
  };
}

export function getEnabledSiteVerificationProviders(
  config: SiteVerificationConfig = getSiteVerificationConfig(),
): string[] {
  const providers: string[] = [];
  if (config.googleSiteVerification) providers.push("Google Search Console");
  if (config.bingSiteVerification) providers.push("Bing Webmaster Tools");
  if (config.metaDomainVerification) providers.push("Meta domain verification");
  return providers;
}

export function getSiteVerificationMetadata(): Metadata["verification"] | undefined {
  const config = getSiteVerificationConfig();
  const other: Record<string, string> = {};

  if (config.bingSiteVerification) {
    other["msvalidate.01"] = config.bingSiteVerification;
  }
  if (config.metaDomainVerification) {
    other["facebook-domain-verification"] = config.metaDomainVerification;
  }

  if (!config.googleSiteVerification && Object.keys(other).length === 0) {
    return undefined;
  }

  return {
    ...(config.googleSiteVerification ? { google: config.googleSiteVerification } : {}),
    ...(Object.keys(other).length > 0 ? { other } : {}),
  };
}

export function maskVerificationToken(value: string | undefined): string {
  if (!value) return "-";
  if (value.length <= 10) return `${value.slice(0, 2)}...${value.slice(-2)}`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
