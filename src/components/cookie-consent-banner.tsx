"use client";

import { useEffect } from "react";
import { Cookie } from "lucide-react";
import type { CookieConsentConfig } from "vanilla-cookieconsent";
import {
  COOKIE_CONSENT_COOKIE_NAME,
  COOKIE_CONSENT_REVISION,
  COOKIE_CONSENT_TRANSLATIONS,
  normalizeCookieConsentLocale,
  type CookieConsentLocale,
  type CookieConsentPublicServices,
} from "@/lib/cookie-consent/policy";

type CookieConsentApi = typeof import("vanilla-cookieconsent");
type ConsentAction = "FIRST_CONSENT" | "UPDATE" | "WITHDRAW";
type ConsentSection = {
  title?: string;
  description?: string;
  linkedCategory?: string;
  cookieTable?: {
    caption?: string;
    headers: Record<string, string>;
    body: Array<Record<string, string>>;
  };
};
type FbqFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
};
type BingUetQueue = {
  push: (...args: unknown[]) => number | void;
};
type BingUetConstructor = new (options: {
  ti: string;
  q?: unknown[];
  enableAutoSpaTracking?: boolean;
}) => BingUetQueue;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
    __egadiGtagLoadedIds?: Record<string, true>;
    __egadiMetaPixelLoadedIds?: Record<string, true>;
    __egadiBingUetLoadedIds?: Record<string, true>;
    uetq?: unknown[] | BingUetQueue;
    UET?: BingUetConstructor;
  }
}

interface CookieConsentBannerProps {
  locale: string;
  services: CookieConsentPublicServices;
}

function ensureGtagBase() {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
}

function updateGoogleConsent(values: Record<string, "granted" | "denied">) {
  ensureGtagBase();
  window.gtag?.("consent", "update", values);
}

function enableGtag(
  consent: CookieConsentApi,
  id: string,
  config: Record<string, unknown>,
  consentUpdate: Record<string, "granted" | "denied">,
) {
  updateGoogleConsent(consentUpdate);
  window.__egadiGtagLoadedIds = window.__egadiGtagLoadedIds ?? {};

  if (!window.__egadiGtagLoadedIds[id]) {
    window.__egadiGtagLoadedIds[id] = true;
    void consent
      .loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`)
      .then(() => {
        window.gtag?.("js", new Date());
        window.gtag?.("config", id, config);
      });
    return;
  }

  window.gtag?.("config", id, config);
}

function disableGoogleAnalytics() {
  updateGoogleConsent({
    analytics_storage: "denied",
  });
}

function disableGoogleMarketing() {
  updateGoogleConsent({
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

function enableMetaPixel(consent: CookieConsentApi, pixelId: string) {
  window.__egadiMetaPixelLoadedIds = window.__egadiMetaPixelLoadedIds ?? {};
  if (!window.fbq) {
    const fbq: FbqFunction = (...args: unknown[]) => {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
        return;
      }
      fbq.queue = fbq.queue ?? [];
      fbq.queue.push(args);
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;
  }

  if (!window.__egadiMetaPixelLoadedIds[pixelId]) {
    window.__egadiMetaPixelLoadedIds[pixelId] = true;
    void consent.loadScript("https://connect.facebook.net/en_US/fbevents.js").then(() => {
      window.fbq?.("init", pixelId);
      window.fbq?.("track", "PageView");
    });
    return;
  }

  window.fbq?.("track", "PageView");
}

function enableBingUet(consent: CookieConsentApi, tagId: string) {
  window.__egadiBingUetLoadedIds = window.__egadiBingUetLoadedIds ?? {};
  window.uetq = window.uetq ?? [];

  if (!window.__egadiBingUetLoadedIds[tagId]) {
    window.__egadiBingUetLoadedIds[tagId] = true;
    const queued = Array.isArray(window.uetq) ? window.uetq : [];
    void consent.loadScript("https://bat.bing.com/bat.js").then(() => {
      if (!window.UET) return;
      window.uetq = new window.UET({
        ti: tagId,
        q: queued,
        enableAutoSpaTracking: true,
      });
      window.uetq.push("pageLoad");
    });
    return;
  }

  if (!Array.isArray(window.uetq)) {
    window.uetq.push("pageLoad");
  }
}

function buildCookieTable(locale: CookieConsentLocale, services: CookieConsentPublicServices) {
  const t = COOKIE_CONSENT_TRANSLATIONS[locale].preferencesModal;
  const rows: Array<Record<string, string>> = [
    {
      name: COOKIE_CONSENT_COOKIE_NAME,
      domain: "Egadisailing",
      description:
        locale === "it"
          ? "Memorizza le preferenze cookie espresse dall'utente."
          : "Stores the user's cookie preferences.",
      expiration: "6 mesi",
    },
    {
      name: "NEXT_LOCALE",
      domain: "Egadisailing",
      description: locale === "it" ? "Memorizza la lingua selezionata." : "Stores the selected language.",
      expiration: "1 anno",
    },
  ];

  if (services.gaMeasurementId) {
    rows.push({
      name: "_ga, _ga_*",
      domain: "Google Analytics",
      description:
        locale === "it"
          ? "Misurazione aggregata delle visite e delle performance del sito."
          : "Aggregated measurement of visits and website performance.",
      expiration: "fino a 2 anni",
    });
  }

  if (services.googleAdsId) {
    rows.push({
      name: "_gcl_*",
      domain: "Google Ads",
      description:
        locale === "it"
          ? "Misurazione delle conversioni pubblicitarie."
          : "Advertising conversion measurement.",
      expiration: "fino a 90 giorni",
    });
  }

  if (services.metaPixelId) {
    rows.push({
      name: "_fbp",
      domain: "Meta",
      description:
        locale === "it"
          ? "Misurazione delle conversioni e campagne Meta."
          : "Meta campaign and conversion measurement.",
      expiration: "fino a 3 mesi",
    });
  }

  if (services.bingUetTagId) {
    rows.push({
      name: "_uetsid, _uetvid, _uetmsclkid",
      domain: "Microsoft Advertising / Bing",
      description:
        locale === "it"
          ? "Misurazione conversioni e campagne Microsoft Advertising."
          : "Microsoft Advertising campaign and conversion measurement.",
      expiration: "fino a 13 mesi",
    });
  }

  return {
    caption: t.cookieTable.caption,
    headers: t.cookieTable.headers,
    body: rows,
  };
}

function buildConfig(
  consent: CookieConsentApi,
  locale: CookieConsentLocale,
  services: CookieConsentPublicServices,
  logConsent: (action: ConsentAction, changedCategories?: string[]) => void,
): CookieConsentConfig {
  const t = COOKIE_CONSENT_TRANSLATIONS[locale];
  const categories: CookieConsentConfig["categories"] = {
    necessary: { enabled: true, readOnly: true },
  };
  const sections: ConsentSection[] = [
    { title: t.preferencesModal.title, description: t.preferencesModal.sections.intro },
    {
      title: locale === "it" ? "Cookie tecnici" : "Strictly necessary cookies",
      description: t.preferencesModal.sections.necessary,
      linkedCategory: "necessary",
      cookieTable: buildCookieTable(locale, services),
    },
  ];

  if (services.gaMeasurementId) {
    const gaMeasurementId = services.gaMeasurementId;
    categories.analytics = {
      autoClear: {
        cookies: [{ name: /^_ga/ }, { name: "_gid" }, { name: "_gat" }],
      },
      services: {
        ga4: {
          label: t.preferencesModal.services.ga4,
          onAccept: () => {
            enableGtag(
              consent,
              gaMeasurementId,
              { anonymize_ip: true },
              { analytics_storage: "granted" },
            );
          },
          onReject: disableGoogleAnalytics,
          cookies: [{ name: /^_ga/ }, { name: "_gid" }, { name: "_gat" }],
        },
      },
    };
    sections.push({
      title: t.preferencesModal.services.ga4,
      description: t.preferencesModal.sections.analytics,
      linkedCategory: "analytics",
    });
  }

  if (services.googleAdsId || services.metaPixelId || services.bingUetTagId) {
    const marketingServices: NonNullable<CookieConsentConfig["categories"][string]["services"]> = {};
    if (services.googleAdsId) {
      const googleAdsId = services.googleAdsId;
      marketingServices.googleAds = {
        label: t.preferencesModal.services.googleAds,
        onAccept: () => {
          enableGtag(
            consent,
            googleAdsId,
            { send_page_view: false },
            {
              ad_storage: "granted",
              ad_user_data: "granted",
              ad_personalization: "granted",
            },
          );
        },
        onReject: disableGoogleMarketing,
        cookies: [{ name: /^_gcl_/ }, { name: "_gcl_au" }],
      };
    }
    if (services.metaPixelId) {
      const metaPixelId = services.metaPixelId;
      marketingServices.metaPixel = {
        label: t.preferencesModal.services.metaPixel,
        onAccept: () => {
          enableMetaPixel(consent, metaPixelId);
        },
        cookies: [{ name: "_fbp" }, { name: "_fbc" }],
      };
    }
    if (services.bingUetTagId) {
      const bingUetTagId = services.bingUetTagId;
      marketingServices.bingUet = {
        label: t.preferencesModal.services.bingUet,
        onAccept: () => {
          enableBingUet(consent, bingUetTagId);
        },
        cookies: [{ name: /^_uet/ }, { name: "_uetmsclkid" }],
      };
    }
    categories.marketing = {
      autoClear: {
        cookies: [
          { name: /^_gcl_/ },
          { name: "_gcl_au" },
          { name: "_fbp" },
          { name: "_fbc" },
          { name: /^_uet/ },
          { name: "_uetmsclkid" },
        ],
      },
      services: marketingServices,
    };
    sections.push({
      title: locale === "it" ? "Marketing e conversioni" : "Marketing and conversions",
      description: t.preferencesModal.sections.marketing,
      linkedCategory: "marketing",
    });
  }

  sections.push({
    title: locale === "it" ? "Maggiori informazioni" : "More information",
    description: t.preferencesModal.sections.more,
  });

  return {
    mode: "opt-in",
    revision: COOKIE_CONSENT_REVISION,
    autoShow: true,
    hideFromBots: true,
    disablePageInteraction: false,
    manageScriptTags: true,
    autoClearCookies: true,
    cookie: {
      name: COOKIE_CONSENT_COOKIE_NAME,
      expiresAfterDays: 182,
      sameSite: "Lax",
    },
    guiOptions: {
      consentModal: {
        layout: "box inline",
        position: "bottom left",
        equalWeightButtons: true,
      },
      preferencesModal: {
        layout: "bar wide",
        position: "right",
        equalWeightButtons: true,
      },
    },
    categories,
    onFirstConsent: () => logConsent("FIRST_CONSENT"),
    onChange: ({ changedCategories }) => {
      const prefs = consent.getUserPreferences();
      const hasOptional = prefs.acceptedCategories.some((category) => category !== "necessary");
      logConsent(hasOptional ? "UPDATE" : "WITHDRAW", changedCategories);
    },
    language: {
      default: locale,
      autoDetect: "document",
      translations: {
        [locale]: {
          consentModal: t.consentModal,
          preferencesModal: {
            title: t.preferencesModal.title,
            acceptAllBtn: t.preferencesModal.acceptAllBtn,
            acceptNecessaryBtn: t.preferencesModal.acceptNecessaryBtn,
            savePreferencesBtn: t.preferencesModal.savePreferencesBtn,
            closeIconLabel: t.preferencesModal.closeIconLabel,
            serviceCounterLabel: t.preferencesModal.serviceCounterLabel,
            sections,
          },
        },
      },
    },
  };
}

export function CookieConsentBanner({ locale, services }: CookieConsentBannerProps) {
  const normalizedLocale = normalizeCookieConsentLocale(locale);
  const { gaMeasurementId, googleAdsId, metaPixelId } = services;
  const floatingLabel =
    normalizedLocale === "it" ? "Preferenze cookie" : "Cookie preferences";

  useEffect(() => {
    let cancelled = false;
    const configuredServices = { gaMeasurementId, googleAdsId, metaPixelId };

    async function init() {
      const consent = await import("vanilla-cookieconsent");
      if (cancelled) return;

      function logConsent(action: ConsentAction, changedCategories: string[] = []) {
        const cookie = consent.getCookie();
        const prefs = consent.getUserPreferences();
        const payload = {
          action,
          consentId: cookie.consentId,
          acceptType: prefs.acceptType,
          acceptedCategories: prefs.acceptedCategories,
          rejectedCategories: prefs.rejectedCategories,
          changedCategories,
          acceptedServices: prefs.acceptedServices,
          rejectedServices: prefs.rejectedServices,
          cookieRevision: cookie.revision ?? COOKIE_CONSENT_REVISION,
          locale: normalizedLocale,
          sourcePath: `${window.location.pathname}${window.location.search}`,
        };

        void fetch("/api/cookie-consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => undefined);
      }

      await consent.run(buildConfig(consent, normalizedLocale, configuredServices, logConsent));
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [normalizedLocale, gaMeasurementId, googleAdsId, metaPixelId]);

  function openPreferences() {
    void import("vanilla-cookieconsent").then((consent) => {
      consent.showPreferences();
    });
  }

  return (
    <button
      type="button"
      aria-label={floatingLabel}
      title={floatingLabel}
      onClick={openPreferences}
      className="fixed bottom-4 left-4 z-[60] inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#071934] text-white shadow-lg shadow-slate-900/20 transition hover:bg-[#0c2d5e] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] focus:ring-offset-2"
    >
      <Cookie aria-hidden="true" className="h-5 w-5" />
    </button>
  );
}
