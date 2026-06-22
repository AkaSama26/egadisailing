import Script from "next/script";
import {
  COOKIE_CONSENT_COOKIE_NAME,
  COOKIE_CONSENT_REVISION,
  type CookieConsentPublicServices,
} from "@/lib/cookie-consent/policy";

export type ConsentValue = "granted" | "denied";
export type GtmConsentState = {
  analytics_storage: ConsentValue;
  ad_storage: ConsentValue;
  ad_user_data: ConsentValue;
  ad_personalization: ConsentValue;
};

interface GtmConsentBootstrapProps {
  services: CookieConsentPublicServices;
}

export function buildGtmConsentBootstrapScript(services: CookieConsentPublicServices) {
  const config = {
    cookieName: COOKIE_CONSENT_COOKIE_NAME,
    revision: COOKIE_CONSENT_REVISION,
    services,
  };

  return `
(function() {
  window.dataLayer = window.dataLayer || [];
  var config = ${JSON.stringify(config)};
  var denied = {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  };

  function parseCookieValue(value) {
    if (!value) return null;
    var candidates = [value];
    try {
      var decoded = decodeURIComponent(value);
      if (decoded !== value) candidates.push(decoded);
    } catch (_error) {}

    for (var index = 0; index < candidates.length; index += 1) {
      try {
        var parsed = JSON.parse(candidates[index]);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch (_error) {}
    }

    return null;
  }

  function getCookieValue(name) {
    if (typeof document === "undefined" || !document.cookie) return undefined;
    var prefix = name + "=";
    var cookies = document.cookie.split(";");
    for (var index = 0; index < cookies.length; index += 1) {
      var entry = cookies[index].trim();
      if (entry.indexOf(prefix) === 0) return entry.slice(prefix.length);
    }
    return undefined;
  }

  function stringArray(value) {
    return Array.isArray(value) ? value.filter(function(entry) { return typeof entry === "string"; }) : [];
  }

  function hasValidStoredCookieConsent(consent) {
    return Boolean(
      consent &&
      consent.revision === config.revision &&
      typeof consent.consentId === "string" &&
      typeof consent.consentTimestamp === "string" &&
      typeof consent.lastConsentTimestamp === "string" &&
      Array.isArray(consent.categories)
    );
  }

  function serviceAccepted(consent, category, service) {
    if (stringArray(consent.categories).indexOf(category) === -1) return false;
    var services = consent.services && typeof consent.services === "object" && !Array.isArray(consent.services)
      ? consent.services
      : {};
    var acceptedServices = services[category];
    return Array.isArray(acceptedServices)
      ? acceptedServices.indexOf(service) !== -1
      : true;
  }

  var consent = parseCookieValue(getCookieValue(config.cookieName));
  var validConsent = hasValidStoredCookieConsent(consent);
  var analyticsGranted = Boolean(
    validConsent &&
    config.services.gaMeasurementId &&
    serviceAccepted(consent, "analytics", "ga4")
  );
  var marketingGranted = Boolean(
    validConsent &&
    (
      (config.services.googleAdsId && serviceAccepted(consent, "marketing", "googleAds")) ||
      (config.services.metaPixelId && serviceAccepted(consent, "marketing", "metaPixel")) ||
      (config.services.bingUetTagId && serviceAccepted(consent, "marketing", "bingUet"))
    )
  );
  var state = analyticsGranted || marketingGranted
    ? {
        analytics_storage: analyticsGranted ? "granted" : "denied",
        ad_storage: marketingGranted ? "granted" : "denied",
        ad_user_data: marketingGranted ? "granted" : "denied",
        ad_personalization: marketingGranted ? "granted" : "denied"
      }
    : denied;

  window.__egadiTrackingConsentState = {
    analytics_storage: state.analytics_storage,
    ad_storage: state.ad_storage,
    ad_user_data: state.ad_user_data,
    ad_personalization: state.ad_personalization
  };
  window.dataLayer.push(["consent", "default", {
    analytics_storage: state.analytics_storage,
    ad_storage: state.ad_storage,
    ad_user_data: state.ad_user_data,
    ad_personalization: state.ad_personalization,
    wait_for_update: 500
  }]);
  window.dataLayer.push({
    event: "egadi_consent_default",
    analytics_storage: state.analytics_storage,
    ad_storage: state.ad_storage,
    ad_user_data: state.ad_user_data,
    ad_personalization: state.ad_personalization,
    analytics_granted: analyticsGranted,
    marketing_granted: marketingGranted,
    source: validConsent ? "client_cookie" : "client_default"
  });
})();`;
}

export function GtmConsentBootstrap({ services }: GtmConsentBootstrapProps) {
  const script = buildGtmConsentBootstrapScript(services);

  return (
    <Script
      id="egadi-gtm-consent-default"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
