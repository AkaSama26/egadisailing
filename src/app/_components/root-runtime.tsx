import { Suspense } from "react";
import Script from "next/script";
import { GoogleTagManager } from "@next/third-parties/google";
import { Inter, Caveat, Manrope } from "next/font/google";
import { AnalyticsInteractionTracker } from "@/components/analytics/analytics-interaction-tracker";
import { GtmConsentBootstrap } from "@/components/analytics/gtm-consent-bootstrap";
import { GtmPageViewTracker } from "@/components/analytics/gtm-page-view-tracker";
import { MetaPixel } from "@/components/analytics/meta-pixel";
import { ServiceWorkerCleanup } from "@/components/service-worker-cleanup";
import { env } from "@/lib/env";
import type { CookieConsentPublicServices } from "@/lib/cookie-consent/policy";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-handwriting",
  subsets: ["latin"],
  display: "swap",
});

export const rootHtmlClassName = `${manrope.variable} ${inter.variable} ${caveat.variable} h-full antialiased`;
export const rootBodyClassName = "min-h-full flex flex-col font-sans";

const serviceWorkerInlineCleanupScript = `
(function () {
  var flag = "egadisailing:inline-service-worker-cleanup:20260501";

  function mark(value) {
    try {
      window.sessionStorage.setItem(flag, value);
    } catch (_error) {}
  }

  try {
    if (window.sessionStorage.getItem(flag) === "done") {
      return;
    }

    var hadServiceWorker = false;
    var hadCaches = false;

    var unregisters = "serviceWorker" in navigator
      ? navigator.serviceWorker.getRegistrations().then(function (registrations) {
          hadServiceWorker = registrations.length > 0 || Boolean(navigator.serviceWorker.controller);
          return Promise.allSettled(registrations.map(function (registration) {
            return registration.unregister();
          }));
        })
      : Promise.resolve();

    var cacheDeletes = "caches" in window
      ? window.caches.keys().then(function (keys) {
          hadCaches = keys.length > 0;
          return Promise.allSettled(keys.map(function (key) {
            return window.caches.delete(key);
          }));
        })
      : Promise.resolve();

    Promise.allSettled([unregisters, cacheDeletes]).then(function () {
      mark("done");

      if (hadServiceWorker || hadCaches || ("serviceWorker" in navigator && navigator.serviceWorker.controller)) {
        window.location.replace(window.location.href);
      }
    });
  } catch (_error) {
    mark("failed");
  }
})();
`;

type RootRuntimeProps = {
  trackingServices?: CookieConsentPublicServices;
};

export function RootRuntime({ trackingServices }: RootRuntimeProps) {
  const shouldLoadGtm = Boolean(trackingServices && env.NEXT_PUBLIC_GTM_ID);
  const shouldRunTrackingRuntime = Boolean(
    trackingServices &&
      (env.NEXT_PUBLIC_GTM_ID || trackingServices.metaPixelId),
  );

  return (
    <>
      {trackingServices ? <GtmConsentBootstrap services={trackingServices} /> : null}
      {shouldLoadGtm ? <GoogleTagManager gtmId={env.NEXT_PUBLIC_GTM_ID!} /> : null}
      {shouldLoadGtm ? (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(env.NEXT_PUBLIC_GTM_ID!)}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
      ) : null}
      {shouldRunTrackingRuntime ? (
        <Suspense fallback={null}>
          {trackingServices?.metaPixelId ? <MetaPixel pixelId={trackingServices.metaPixelId} /> : null}
          <GtmPageViewTracker />
          <AnalyticsInteractionTracker />
        </Suspense>
      ) : null}
      <Script
        id="egadisailing-service-worker-inline-cleanup"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: serviceWorkerInlineCleanupScript }}
      />
      <ServiceWorkerCleanup />
    </>
  );
}
