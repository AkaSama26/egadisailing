"use client";

import { useEffect } from "react";
import { Cookie } from "lucide-react";
import type { CookieConsentConfig } from "vanilla-cookieconsent";
import { pushConsentUpdate, type TrackingConsentState } from "@/lib/analytics/client";
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

type CookieConsentPreferences = {
  acceptedCategories: string[];
  acceptedServices?: Record<string, string[] | undefined>;
};

interface CookieConsentBannerProps {
  locale: string;
  services: CookieConsentPublicServices;
}

function isConsentServiceAccepted(
  prefs: CookieConsentPreferences,
  category: string,
  service: string,
): boolean {
  if (!prefs.acceptedCategories.includes(category)) return false;
  const acceptedServices = prefs.acceptedServices?.[category];
  return Array.isArray(acceptedServices) ? acceptedServices.includes(service) : true;
}

function trackingConsentFromPreferences(
  prefs: CookieConsentPreferences,
  services: CookieConsentPublicServices,
): {
  state: TrackingConsentState;
  analyticsGranted: boolean;
  marketingGranted: boolean;
} {
  const analyticsGranted = Boolean(
    services.gaMeasurementId && isConsentServiceAccepted(prefs, "analytics", "ga4"),
  );
  const marketingGranted = Boolean(
    (services.googleAdsId && isConsentServiceAccepted(prefs, "marketing", "googleAds")) ||
      (services.metaPixelId && isConsentServiceAccepted(prefs, "marketing", "metaPixel")) ||
      (services.bingUetTagId && isConsentServiceAccepted(prefs, "marketing", "bingUet")),
  );

  return {
    analyticsGranted,
    marketingGranted,
    state: {
      analytics_storage: analyticsGranted ? "granted" : "denied",
      ad_storage: marketingGranted ? "granted" : "denied",
      ad_user_data: marketingGranted ? "granted" : "denied",
      ad_personalization: marketingGranted ? "granted" : "denied",
    },
  };
}

function syncTrackingConsentFromPreferences(
  consent: CookieConsentApi,
  services: CookieConsentPublicServices,
  source: string,
) {
  const prefs = consent.getUserPreferences() as CookieConsentPreferences;
  const { state, analyticsGranted, marketingGranted } = trackingConsentFromPreferences(prefs, services);
  pushConsentUpdate(state, { analyticsGranted, marketingGranted, source });
}

function buildCookieTable(locale: CookieConsentLocale, services: CookieConsentPublicServices) {
  const t = COOKIE_CONSENT_TRANSLATIONS[locale].preferencesModal;
  const rows: Array<Record<string, string>> = [
    {
      name: COOKIE_CONSENT_COOKIE_NAME,
      domain: "Egadisailing",
      description:
        locale === "fr"
          ? "Enregistre les préférences de cookies choisies par l'utilisateur."
          : locale === "es"
            ? "Guarda las preferencias de cookies elegidas por el usuario."
            : locale === "de"
              ? "Speichert die vom Benutzer gewählten Cookie-Einstellungen."
              : locale === "en"
                ? "Stores the user's cookie preferences."
                : "Memorizza le preferenze cookie espresse dall'utente.",
      expiration: locale === "fr" ? "6 mois" : locale === "es" ? "6 meses" : locale === "de" ? "6 Monate" : locale === "en" ? "6 months" : "6 mesi",
    },
    {
      name: "NEXT_LOCALE",
      domain: "Egadisailing",
      description:
        locale === "fr"
          ? "Enregistre la langue sélectionnée."
          : locale === "es"
            ? "Guarda el idioma seleccionado."
            : locale === "de"
              ? "Speichert die ausgewählte Sprache."
              : locale === "en"
                ? "Stores the selected language."
                : "Memorizza la lingua selezionata.",
      expiration: locale === "fr" ? "1 an" : locale === "es" ? "1 año" : locale === "de" ? "1 Jahr" : locale === "en" ? "1 year" : "1 anno",
    },
  ];

  if (services.gaMeasurementId) {
    rows.push({
      name: "_ga, _ga_*",
      domain: "Google Analytics 4 via Google Tag Manager",
      description:
        locale === "fr"
          ? "Mesure agrégée des visites, interactions, conversions et performances du site."
          : locale === "es"
            ? "Medición agregada de visitas, interacciones, conversiones y rendimiento del sitio."
            : locale === "de"
              ? "Aggregierte Messung von Besuchen, Interaktionen, Conversions und Website-Leistung."
              : locale === "en"
                ? "Aggregated measurement of visits, interactions, conversions and website performance."
                : "Misurazione aggregata di visite, interazioni, conversioni e performance del sito.",
      expiration:
        locale === "fr" ? "jusqu'à 2 ans" : locale === "es" ? "hasta 2 años" : locale === "de" ? "bis zu 2 Jahre" : locale === "en" ? "up to 2 years" : "fino a 2 anni",
    });
  }

  if (services.googleAdsId) {
    rows.push({
      name: "_gcl_*",
      domain: "Google Ads via Google Tag Manager",
      description:
        locale === "fr"
          ? "Mesure des conversions publicitaires."
          : locale === "es"
            ? "Medición de conversiones publicitarias."
            : locale === "de"
              ? "Messung von Werbe-Conversions."
              : locale === "en"
                ? "Advertising conversion measurement."
                : "Misurazione delle conversioni pubblicitarie.",
      expiration:
        locale === "fr" ? "jusqu'à 90 jours" : locale === "es" ? "hasta 90 días" : locale === "de" ? "bis zu 90 Tage" : locale === "en" ? "up to 90 days" : "fino a 90 giorni",
    });
  }

  if (services.metaPixelId) {
    rows.push({
      name: "_fbp",
      domain: "Meta via Google Tag Manager",
      description:
        locale === "fr"
          ? "Mesure des conversions et des campagnes Meta."
          : locale === "es"
            ? "Medición de conversiones y campañas Meta."
            : locale === "de"
              ? "Messung von Meta-Kampagnen und Conversions."
              : locale === "en"
                ? "Meta campaign and conversion measurement."
                : "Misurazione delle conversioni e campagne Meta.",
      expiration:
        locale === "fr" ? "jusqu'à 3 mois" : locale === "es" ? "hasta 3 meses" : locale === "de" ? "bis zu 3 Monate" : locale === "en" ? "up to 3 months" : "fino a 3 mesi",
    });
  }

  if (services.bingUetTagId) {
    rows.push({
      name: "_uetsid, _uetvid, _uetmsclkid",
      domain: "Microsoft Advertising / Bing via Google Tag Manager",
      description:
        locale === "fr"
          ? "Mesure des conversions et des campagnes Microsoft Advertising."
          : locale === "es"
            ? "Medición de conversiones y campañas Microsoft Advertising."
            : locale === "de"
              ? "Messung von Microsoft Advertising Kampagnen und Conversions."
              : locale === "en"
                ? "Microsoft Advertising campaign and conversion measurement."
                : "Misurazione conversioni e campagne Microsoft Advertising.",
      expiration:
        locale === "fr" ? "jusqu'à 13 mois" : locale === "es" ? "hasta 13 meses" : locale === "de" ? "bis zu 13 Monate" : locale === "en" ? "up to 13 months" : "fino a 13 mesi",
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
      title:
        locale === "fr"
          ? "Cookies strictement nécessaires"
          : locale === "es"
            ? "Cookies técnicas"
            : locale === "de"
              ? "Unbedingt erforderliche Cookies"
              : locale === "en"
                ? "Strictly necessary cookies"
                : "Cookie tecnici",
      description: t.preferencesModal.sections.necessary,
      linkedCategory: "necessary",
      cookieTable: buildCookieTable(locale, services),
    },
  ];

  if (services.gaMeasurementId) {
    categories.analytics = {
      autoClear: {
        cookies: [{ name: /^_ga/ }, { name: "_gid" }, { name: "_gat" }],
      },
      services: {
        ga4: {
          label: t.preferencesModal.services.ga4,
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
      marketingServices.googleAds = {
        label: t.preferencesModal.services.googleAds,
        cookies: [{ name: /^_gcl_/ }, { name: "_gcl_au" }],
      };
    }
    if (services.metaPixelId) {
      marketingServices.metaPixel = {
        label: t.preferencesModal.services.metaPixel,
        cookies: [{ name: "_fbp" }, { name: "_fbc" }],
      };
    }
    if (services.bingUetTagId) {
      marketingServices.bingUet = {
        label: t.preferencesModal.services.bingUet,
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
      title:
        locale === "fr"
          ? "Marketing et conversions"
          : locale === "es"
            ? "Marketing y conversiones"
            : locale === "de"
              ? "Marketing und Conversions"
              : locale === "en"
                ? "Marketing and conversions"
                : "Marketing e conversioni",
      description: t.preferencesModal.sections.marketing,
      linkedCategory: "marketing",
    });
  }

  sections.push({
    title: locale === "fr" ? "Plus d'informations" : locale === "es" ? "Más información" : locale === "de" ? "Weitere Informationen" : locale === "en" ? "More information" : "Maggiori informazioni",
    description: t.preferencesModal.sections.more,
  });

  return {
    mode: "opt-in",
    revision: COOKIE_CONSENT_REVISION,
    autoShow: true,
    hideFromBots: true,
    disablePageInteraction: false,
    manageScriptTags: false,
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
    onFirstConsent: () => {
      syncTrackingConsentFromPreferences(consent, services, "first_consent");
      logConsent("FIRST_CONSENT");
    },
    onConsent: () => {
      syncTrackingConsentFromPreferences(consent, services, "saved_consent");
    },
    onChange: ({ changedCategories }) => {
      syncTrackingConsentFromPreferences(consent, services, "consent_change");
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
  const { bingUetTagId, gaMeasurementId, googleAdsId, metaPixelId } = services;
  const floatingLabel =
    normalizedLocale === "fr"
      ? "Préférences cookies"
      : normalizedLocale === "es"
        ? "Preferencias de cookies"
        : normalizedLocale === "de"
          ? "Cookie-Einstellungen"
          : normalizedLocale === "en"
            ? "Cookie preferences"
            : "Preferenze cookie";

  useEffect(() => {
    let cancelled = false;
    const configuredServices = { bingUetTagId, gaMeasurementId, googleAdsId, metaPixelId };

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
  }, [normalizedLocale, bingUetTagId, gaMeasurementId, googleAdsId, metaPixelId]);

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
      data-analytics-ignore="true"
      onClick={openPreferences}
      className="egadi-floating-cookie fixed bottom-4 left-4 z-[60] inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#071934] text-white shadow-lg shadow-slate-900/20 transition hover:bg-[#0c2d5e] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] focus:ring-offset-2"
    >
      <Cookie aria-hidden="true" className="h-5 w-5" />
    </button>
  );
}
