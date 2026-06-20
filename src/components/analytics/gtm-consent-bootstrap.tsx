import Script from "next/script";

export type ConsentValue = "granted" | "denied";
export type GtmConsentState = {
  analytics_storage: ConsentValue;
  ad_storage: ConsentValue;
  ad_user_data: ConsentValue;
  ad_personalization: ConsentValue;
};

interface GtmConsentBootstrapProps {
  initialConsent: GtmConsentState;
}

export function GtmConsentBootstrap({ initialConsent }: GtmConsentBootstrapProps) {
  const state = {
    analytics_storage: initialConsent.analytics_storage,
    ad_storage: initialConsent.ad_storage,
    ad_user_data: initialConsent.ad_user_data,
    ad_personalization: initialConsent.ad_personalization,
    wait_for_update: 500,
  };
  const analyticsGranted = initialConsent.analytics_storage === "granted";
  const marketingGranted =
    initialConsent.ad_storage === "granted" &&
    initialConsent.ad_user_data === "granted" &&
    initialConsent.ad_personalization === "granted";
  const script = `
(function() {
  window.dataLayer = window.dataLayer || [];
  window.__egadiTrackingConsentState = ${JSON.stringify(initialConsent)};
  window.dataLayer.push(["consent", "default", ${JSON.stringify(state)}]);
  window.dataLayer.push({
    event: "egadi_consent_default",
    analytics_storage: ${JSON.stringify(initialConsent.analytics_storage)},
    ad_storage: ${JSON.stringify(initialConsent.ad_storage)},
    ad_user_data: ${JSON.stringify(initialConsent.ad_user_data)},
    ad_personalization: ${JSON.stringify(initialConsent.ad_personalization)},
    analytics_granted: ${JSON.stringify(analyticsGranted)},
    marketing_granted: ${JSON.stringify(marketingGranted)},
    source: "server_cookie"
  });
})();`;

  return (
    <Script
      id="egadi-gtm-consent-default"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
