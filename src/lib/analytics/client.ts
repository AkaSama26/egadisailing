"use client";

type AnalyticsPrimitive = string | number | boolean;
export type AnalyticsEventParams = Record<
  string,
  | AnalyticsPrimitive
  | AnalyticsPrimitive[]
  | Record<string, unknown>
  | Array<Record<string, unknown>>
  | null
  | undefined
>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    __egadiGtagLoadedIds?: Record<string, true>;
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const SESSION_KEY_PREFIX = "egadi:ga4:event:";

function canTrackAnalytics(): boolean {
  if (typeof window === "undefined") return false;
  if (!GA_MEASUREMENT_ID) return false;
  return Boolean(window.gtag && window.__egadiGtagLoadedIds?.[GA_MEASUREMENT_ID]);
}

function cleanParams(params: AnalyticsEventParams = {}): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    cleaned[key] = value;
  }
  return cleaned;
}

export function trackEvent(name: string, params: AnalyticsEventParams = {}): boolean {
  if (!canTrackAnalytics()) return false;
  window.gtag?.("event", name, cleanParams(params));
  return true;
}

export function trackEventOncePerSession(
  key: string,
  name: string,
  params: AnalyticsEventParams = {},
): boolean {
  if (typeof window === "undefined") return false;
  const storageKey = SESSION_KEY_PREFIX + key;
  try {
    if (window.sessionStorage.getItem(storageKey)) return false;
  } catch {
    // Session storage can be disabled; tracking may still proceed once.
  }

  const tracked = trackEvent(name, params);
  if (!tracked) return false;

  try {
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // Best-effort dedupe only.
  }
  return true;
}

export function centsToAnalyticsValue(cents: number | null | undefined): number | undefined {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return undefined;
  return Math.round(cents) / 100;
}
