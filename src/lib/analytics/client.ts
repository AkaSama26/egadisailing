"use client";

export type AnalyticsPrimitive = string | number | boolean;
export type AnalyticsParamValue =
  | AnalyticsPrimitive
  | AnalyticsPrimitive[]
  | Record<string, unknown>
  | Array<Record<string, unknown>>
  | null
  | undefined;
export type AnalyticsEventParams = Record<string, AnalyticsParamValue>;

export type ConsentValue = "granted" | "denied";
export type TrackingConsentState = {
  analytics_storage: ConsentValue;
  ad_storage: ConsentValue;
  ad_user_data: ConsentValue;
  ad_personalization: ConsentValue;
};

export type DataLayerEvent = {
  event: string;
  [key: string]: unknown;
};

export type TrackEventOptions = {
  consent?: "analytics" | "marketing" | "none";
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    __egadiTrackingConsentState?: TrackingConsentState;
    __egadiLastPageViewKey?: string;
  }
}

const SESSION_KEY_PREFIX = "egadi:analytics:event:";
export const ANALYTICS_EVENT_BROWSER_EVENT = "egadi:analytics-event" as const;
const REDACTED_VALUE = "[redacted]";
const DATE_VALUE_KEYS = new Set([
  "selected_date",
  "start_date",
  "end_date",
  "booking_date",
]);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SENSITIVE_KEYS = new Set([
  "email",
  "mail",
  "e_mail",
  "phone",
  "tel",
  "telephone",
  "mobile",
  "first_name",
  "firstname",
  "last_name",
  "lastname",
  "full_name",
  "fullname",
  "customer_name",
  "customer_email",
  "customer_phone",
  "message",
  "note",
  "notes",
  "customer_notes",
  "confirmation_code",
  "confirmationcode",
  "ticket_code",
  "ticketcode",
  "client_secret",
  "clientsecret",
  "payment_intent_client_secret",
]);
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const LONG_DIGIT_PATTERN = /\+?\d[\d\s().-]{6,}\d/;

export function deniedTrackingConsentState(): TrackingConsentState {
  return {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  };
}

function normalizeKey(key: string): string {
  return key.replace(/[\s-]/g, "_").toLowerCase();
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(normalizeKey(key));
}

function cleanString(value: string, key?: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (key && DATE_VALUE_KEYS.has(normalizeKey(key)) && ISO_DATE_PATTERN.test(trimmed)) return trimmed;
  if (EMAIL_PATTERN.test(trimmed) || LONG_DIGIT_PATTERN.test(trimmed)) return REDACTED_VALUE;
  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed;
}

function cleanValue(value: unknown, depth = 0, key?: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") return cleanString(value, key);
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const cleaned = value
      .map((entry) => cleanValue(entry, depth + 1, key))
      .filter((entry) => entry !== undefined);
    return cleaned.length ? cleaned : undefined;
  }
  if (typeof value === "object") {
    if (depth > 4) return undefined;
    const cleaned: Record<string, unknown> = {};
    for (const [entryKey, entry] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(entryKey)) continue;
      const cleanedEntry = cleanValue(entry, depth + 1, entryKey);
      if (cleanedEntry !== undefined) cleaned[entryKey] = cleanedEntry;
    }
    return Object.keys(cleaned).length ? cleaned : undefined;
  }
  return undefined;
}

export function cleanAnalyticsParams(
  params: AnalyticsEventParams | Record<string, unknown> = {},
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (isSensitiveKey(key)) continue;
    const cleanedValue = cleanValue(value, 0, key);
    if (cleanedValue !== undefined) cleaned[key] = cleanedValue;
  }
  return cleaned;
}

export function setTrackingConsentState(state: TrackingConsentState): void {
  if (typeof window === "undefined") return;
  window.__egadiTrackingConsentState = { ...state };
}

export function getTrackingConsentState(): TrackingConsentState {
  if (typeof window === "undefined") return deniedTrackingConsentState();
  return window.__egadiTrackingConsentState ?? deniedTrackingConsentState();
}

export function isTrackingConsentGranted(type: "analytics" | "marketing" = "analytics"): boolean {
  const consent = getTrackingConsentState();
  if (type === "analytics") return consent.analytics_storage === "granted";
  return (
    consent.ad_storage === "granted" &&
    consent.ad_user_data === "granted" &&
    consent.ad_personalization === "granted"
  );
}

export function pushDataLayerEvent(event: DataLayerEvent): boolean {
  if (typeof window === "undefined") return false;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(event);
  if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT_BROWSER_EVENT, { detail: event }));
  }
  return true;
}

export function pushDataLayerCommand(command: unknown[]): boolean {
  if (typeof window === "undefined") return false;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(command);
  return true;
}

export function pushConsentUpdate(
  state: TrackingConsentState,
  detail: { analyticsGranted?: boolean; marketingGranted?: boolean; source?: string } = {},
): boolean {
  setTrackingConsentState(state);
  const consentCommandPushed = pushDataLayerCommand(["consent", "update", {
    analytics_storage: state.analytics_storage,
    ad_storage: state.ad_storage,
    ad_user_data: state.ad_user_data,
    ad_personalization: state.ad_personalization,
  }]);
  const pushed = pushDataLayerEvent({
    event: "egadi_consent_update",
    analytics_storage: state.analytics_storage,
    ad_storage: state.ad_storage,
    ad_user_data: state.ad_user_data,
    ad_personalization: state.ad_personalization,
    analytics_granted: detail.analyticsGranted ?? state.analytics_storage === "granted",
    marketing_granted:
      detail.marketingGranted ??
      (state.ad_storage === "granted" &&
        state.ad_user_data === "granted" &&
        state.ad_personalization === "granted"),
    source: detail.source,
  });

  if (pushed) {
    window.dispatchEvent(
      new CustomEvent("egadi:tracking-consent-updated", {
        detail: {
          state,
          analyticsGranted: detail.analyticsGranted ?? state.analytics_storage === "granted",
          marketingGranted:
            detail.marketingGranted ??
            (state.ad_storage === "granted" &&
              state.ad_user_data === "granted" &&
              state.ad_personalization === "granted"),
        },
      }),
    );
  }

  return consentCommandPushed || pushed;
}

export function trackEvent(
  name: string,
  params: AnalyticsEventParams | Record<string, unknown> = {},
  options: TrackEventOptions = {},
): boolean {
  const consent = options.consent ?? "analytics";
  if (consent === "analytics" && !isTrackingConsentGranted("analytics")) return false;
  if (consent === "marketing" && !isTrackingConsentGranted("marketing")) return false;
  return pushDataLayerEvent({ event: name, ...cleanAnalyticsParams(params) });
}

export function trackEventOncePerSession(
  key: string,
  name: string,
  params: AnalyticsEventParams | Record<string, unknown> = {},
  options: TrackEventOptions = {},
): boolean {
  if (typeof window === "undefined") return false;
  const storageKey = SESSION_KEY_PREFIX + key;
  try {
    if (window.sessionStorage.getItem(storageKey)) return false;
  } catch {
    // Session storage can be disabled; tracking may still proceed once.
  }

  const tracked = trackEvent(name, params, options);
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
