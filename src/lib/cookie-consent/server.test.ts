import { describe, expect, test } from "vitest";
import { COOKIE_CONSENT_REVISION } from "./policy";
import { getStoredTrackingConsentState } from "./server";

const services = {
  gaMeasurementId: "G-TEST123",
  googleAdsId: "AW-987654321",
  metaPixelId: "123456789",
  bingUetTagId: "5555555",
};

function consentCookie(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
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
  });
}

describe("stored tracking consent", () => {
  test("grants storage from a valid saved cookie", () => {
    expect(getStoredTrackingConsentState(encodeURIComponent(consentCookie()), services)).toEqual({
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
  });

  test("keeps denied when the cookie is missing or stale", () => {
    expect(getStoredTrackingConsentState(undefined, services)).toEqual({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(
      getStoredTrackingConsentState(consentCookie({ revision: COOKIE_CONSENT_REVISION - 1 }), services),
    ).toEqual({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  });

  test("respects service-level preferences across GTM-managed marketing tags", () => {
    expect(
      getStoredTrackingConsentState(
        consentCookie({
          services: {
            analytics: ["ga4"],
            marketing: ["metaPixel"],
          },
        }),
        services,
      ),
    ).toEqual({
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });

    expect(
      getStoredTrackingConsentState(
        consentCookie({
          services: {
            analytics: ["ga4"],
            marketing: [],
          },
        }),
        services,
      ),
    ).toEqual({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  });
});
