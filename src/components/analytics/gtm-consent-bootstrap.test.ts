import vm from "node:vm";
import { describe, expect, test } from "vitest";
import {
  COOKIE_CONSENT_COOKIE_NAME,
  COOKIE_CONSENT_REVISION,
  type CookieConsentPublicServices,
} from "@/lib/cookie-consent/policy";
import { buildGtmConsentBootstrapScript } from "./gtm-consent-bootstrap";

const services: CookieConsentPublicServices = {
  gaMeasurementId: "G-TEST123",
  googleAdsId: "AW-987654321",
  metaPixelId: "123456789",
  bingUetTagId: "5555555",
};

function consentCookie(overrides: Record<string, unknown> = {}) {
  return encodeURIComponent(JSON.stringify({
    categories: ["necessary", "analytics", "marketing"],
    services: {
      analytics: ["ga4"],
      marketing: ["googleAds"],
    },
    revision: COOKIE_CONSENT_REVISION,
    consentId: "12345678-abcd-4000-9000-123456789abc",
    consentTimestamp: "2026-06-20T00:00:00.000Z",
    lastConsentTimestamp: "2026-06-20T00:00:00.000Z",
    ...overrides,
  }));
}

function runBootstrap(cookie = "") {
  const context = {
    window: {} as {
      dataLayer?: unknown[];
      __egadiTrackingConsentState?: unknown;
    },
    document: { cookie },
  };
  vm.createContext(context);
  vm.runInContext(buildGtmConsentBootstrapScript(services), context);
  return context.window;
}

describe("GTM consent bootstrap", () => {
  test("reads a valid saved consent cookie before GTM loads", () => {
    const win = runBootstrap(`${COOKIE_CONSENT_COOKIE_NAME}=${consentCookie()}`);

    expect(win.__egadiTrackingConsentState).toEqual({
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
    expect(win.dataLayer?.[0]).toEqual(["consent", "default", {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      wait_for_update: 500,
    }]);
    expect(win.dataLayer?.[1]).toMatchObject({
      event: "egadi_consent_default",
      analytics_granted: true,
      marketing_granted: true,
      source: "client_cookie",
    });
  });

  test("defaults to denied when the cookie is missing or stale", () => {
    expect(runBootstrap().__egadiTrackingConsentState).toEqual({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });

    const stale = runBootstrap(`${COOKIE_CONSENT_COOKIE_NAME}=${consentCookie({ revision: COOKIE_CONSENT_REVISION - 1 })}`);
    expect(stale.__egadiTrackingConsentState).toEqual({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(stale.dataLayer?.[1]).toMatchObject({ source: "client_default" });
  });

  test("respects service-level preferences", () => {
    const win = runBootstrap(`${COOKIE_CONSENT_COOKIE_NAME}=${consentCookie({
      services: {
        analytics: ["ga4"],
        marketing: [],
      },
    })}`);

    expect(win.__egadiTrackingConsentState).toEqual({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(win.dataLayer?.[1]).toMatchObject({
      analytics_granted: true,
      marketing_granted: false,
      source: "client_cookie",
    });
  });
});
