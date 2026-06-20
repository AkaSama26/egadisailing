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

type StoredCookieConsent = {
  categories?: unknown;
  services?: unknown;
  revision?: unknown;
  consentId?: unknown;
  consentTimestamp?: unknown;
  lastConsentTimestamp?: unknown;
};

export type StoredTrackingConsentState = {
  analytics_storage: "granted" | "denied";
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
};

export type StoredGoogleConsentState = StoredTrackingConsentState;

const DENIED_TRACKING_CONSENT_STATE: StoredTrackingConsentState = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

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


function deniedTrackingConsentState(): StoredTrackingConsentState {
  return { ...DENIED_TRACKING_CONSENT_STATE };
}

function parseStoredCookieConsent(cookieValue: string | undefined): StoredCookieConsent | null {
  if (!cookieValue) return null;

  const candidates = [cookieValue];
  try {
    const decoded = decodeURIComponent(cookieValue);
    if (decoded !== cookieValue) candidates.push(decoded);
  } catch {
    // Keep the raw value as the only candidate.
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as StoredCookieConsent;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function serviceAccepted(
  consent: StoredCookieConsent,
  category: "analytics" | "marketing",
  service: "ga4" | "googleAds" | "metaPixel" | "bingUet",
): boolean {
  if (!stringArray(consent.categories).includes(category)) return false;

  const services =
    consent.services && typeof consent.services === "object" && !Array.isArray(consent.services)
      ? (consent.services as Record<string, unknown>)
      : {};
  const acceptedServices = services[category];

  return Array.isArray(acceptedServices)
    ? acceptedServices.some((entry) => entry === service)
    : true;
}

function hasValidStoredCookieConsent(consent: StoredCookieConsent | null): consent is StoredCookieConsent {
  if (!consent) return false;
  return (
    consent.revision === COOKIE_CONSENT_REVISION &&
    typeof consent.consentId === "string" &&
    typeof consent.consentTimestamp === "string" &&
    typeof consent.lastConsentTimestamp === "string" &&
    Array.isArray(consent.categories)
  );
}

export function getStoredTrackingConsentState(
  cookieValue: string | undefined,
  services: CookieConsentPublicServices,
): StoredTrackingConsentState {
  const consent = parseStoredCookieConsent(cookieValue);
  if (!hasValidStoredCookieConsent(consent)) return deniedTrackingConsentState();

  const analyticsGranted = Boolean(
    services.gaMeasurementId && serviceAccepted(consent, "analytics", "ga4"),
  );
  const marketingGranted = Boolean(
    (services.googleAdsId && serviceAccepted(consent, "marketing", "googleAds")) ||
      (services.metaPixelId && serviceAccepted(consent, "marketing", "metaPixel")) ||
      (services.bingUetTagId && serviceAccepted(consent, "marketing", "bingUet")),
  );

  return {
    analytics_storage: analyticsGranted ? "granted" : "denied",
    ad_storage: marketingGranted ? "granted" : "denied",
    ad_user_data: marketingGranted ? "granted" : "denied",
    ad_personalization: marketingGranted ? "granted" : "denied",
  };
}

export function getStoredGoogleConsentState(
  cookieValue: string | undefined,
  services: CookieConsentPublicServices,
): StoredTrackingConsentState {
  return getStoredTrackingConsentState(cookieValue, services);
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
