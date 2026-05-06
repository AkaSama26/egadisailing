import crypto from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { env } from "@/lib/env";
import {
  COOKIE_CONSENT_CATEGORIES,
  COOKIE_CONSENT_EFFECTIVE_DATE,
  COOKIE_CONSENT_POLICY_VERSION,
  COOKIE_CONSENT_REVISION,
  COOKIE_CONSENT_TRANSLATIONS,
  type CookieConsentPublicServices,
} from "./policy";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`);
  return `{${entries.join(",")}}`;
}

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function getCookieConsentPublicServices(): CookieConsentPublicServices {
  const services: CookieConsentPublicServices = {};
  if (env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    services.gaMeasurementId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  }
  if (env.NEXT_PUBLIC_GOOGLE_ADS_ID) {
    services.googleAdsId = env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  }
  if (env.NEXT_PUBLIC_META_PIXEL_ID) {
    services.metaPixelId = env.NEXT_PUBLIC_META_PIXEL_ID;
  }
  if (env.NEXT_PUBLIC_BING_UET_TAG_ID) {
    services.bingUetTagId = env.NEXT_PUBLIC_BING_UET_TAG_ID;
  }
  return services;
}

export function hashCookieConsentIp(ip: string): string | null {
  if (!ip || ip === "unknown") return null;
  const secret = env.COOKIE_CONSENT_HASH_SECRET ?? env.NEXTAUTH_SECRET;
  return crypto.createHmac("sha256", secret).update(ip).digest("hex").slice(0, 40);
}

export function getCookieConsentPolicySnapshotData() {
  const services = getCookieConsentPublicServices();
  const snapshot = {
    policyVersion: COOKIE_CONSENT_POLICY_VERSION,
    revision: COOKIE_CONSENT_REVISION,
    categories: COOKIE_CONSENT_CATEGORIES,
    services,
    translations: COOKIE_CONSENT_TRANSLATIONS,
    effectiveDate: COOKIE_CONSENT_EFFECTIVE_DATE,
  };

  return {
    ...snapshot,
    configHash: sha256({
      policyVersion: snapshot.policyVersion,
      revision: snapshot.revision,
      categories: snapshot.categories,
      services: snapshot.services,
    }),
    textHash: sha256({
      translations: snapshot.translations,
      effectiveDate: snapshot.effectiveDate,
    }),
  };
}

export async function syncCookieConsentPolicySnapshot(): Promise<void> {
  const { db } = await import("@/lib/db");
  const snapshot = getCookieConsentPolicySnapshotData();
  await db.cookieConsentPolicySnapshot.upsert({
    where: { policyVersion: snapshot.policyVersion },
    create: {
      policyVersion: snapshot.policyVersion,
      revision: snapshot.revision,
      configHash: snapshot.configHash,
      textHash: snapshot.textHash,
      categories: snapshot.categories as unknown as Prisma.InputJsonValue,
      services: snapshot.services as unknown as Prisma.InputJsonValue,
      translations: snapshot.translations as unknown as Prisma.InputJsonValue,
      effectiveDate: snapshot.effectiveDate,
    },
    update: {
      revision: snapshot.revision,
      configHash: snapshot.configHash,
      textHash: snapshot.textHash,
      categories: snapshot.categories as unknown as Prisma.InputJsonValue,
      services: snapshot.services as unknown as Prisma.InputJsonValue,
      translations: snapshot.translations as unknown as Prisma.InputJsonValue,
      effectiveDate: snapshot.effectiveDate,
    },
  });
}
