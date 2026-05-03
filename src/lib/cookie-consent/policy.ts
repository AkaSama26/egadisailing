export const COOKIE_CONSENT_COOKIE_NAME = "egadi_cookie_consent" as const;
export const COOKIE_CONSENT_POLICY_VERSION = "1.0" as const;
export const COOKIE_CONSENT_REVISION = 2 as const;
export const COOKIE_CONSENT_EFFECTIVE_DATE = "3 maggio 2026" as const;

export const COOKIE_CONSENT_CATEGORIES = {
  necessary: {
    label: { it: "Cookie tecnici", en: "Strictly necessary cookies" },
    required: true,
  },
  analytics: {
    label: { it: "Cookie analitici", en: "Analytics cookies" },
    required: false,
  },
  marketing: {
    label: { it: "Cookie marketing", en: "Marketing cookies" },
    required: false,
  },
} as const;

export type CookieConsentCategory = keyof typeof COOKIE_CONSENT_CATEGORIES;
export type CookieConsentLocale = "it" | "en";

export const COOKIE_CONSENT_CATEGORY_KEYS = Object.keys(
  COOKIE_CONSENT_CATEGORIES,
) as CookieConsentCategory[];

export const COOKIE_CONSENT_OPTIONAL_CATEGORIES = COOKIE_CONSENT_CATEGORY_KEYS.filter(
  (category) => !COOKIE_CONSENT_CATEGORIES[category].required,
);

export interface CookieConsentPublicServices {
  gaMeasurementId?: string;
  googleAdsId?: string;
  metaPixelId?: string;
}

export function normalizeCookieConsentLocale(locale: string): CookieConsentLocale {
  return locale === "en" ? "en" : "it";
}

export function hasOptionalCookieConsentServices(services: CookieConsentPublicServices): boolean {
  return Boolean(services.gaMeasurementId || services.googleAdsId || services.metaPixelId);
}

export function getEnabledCookieConsentCategories(
  services: CookieConsentPublicServices,
): CookieConsentCategory[] {
  const categories: CookieConsentCategory[] = ["necessary"];
  if (services.gaMeasurementId) categories.push("analytics");
  if (services.googleAdsId || services.metaPixelId) categories.push("marketing");
  return categories;
}

export const COOKIE_CONSENT_TRANSLATIONS = {
  it: {
    consentModal: {
      title: "Preferenze privacy",
      description:
        "Usiamo cookie tecnici necessari. Con il tuo consenso possiamo usare anche strumenti analitici o marketing per migliorare il sito e misurare le campagne. Puoi modificare la scelta in ogni momento.",
      acceptAllBtn: "Accetta tutto",
      acceptNecessaryBtn: "Solo necessari",
      showPreferencesBtn: "Personalizza",
      closeIconLabel: "Solo necessari",
      footer:
        '<a href="/it/cookie-policy">Cookie Policy</a><a href="/it/privacy">Privacy Policy</a>',
    },
    preferencesModal: {
      title: "Gestisci preferenze cookie",
      acceptAllBtn: "Accetta tutto",
      acceptNecessaryBtn: "Solo necessari",
      savePreferencesBtn: "Salva preferenze",
      closeIconLabel: "Chiudi",
      serviceCounterLabel: "servizio|servizi",
      sections: {
        intro:
          "Puoi scegliere per finalita'. I cookie tecnici restano attivi per sicurezza, sessione, lingua, pagamenti e protezione anti-bot.",
        necessary:
          "Essenziali per navigazione, sessione admin/cliente, preferenze lingua, sicurezza, Stripe e Cloudflare Turnstile. Non possono essere disattivati.",
        analytics:
          "Ci aiutano a capire come viene usato il sito e quali pagine funzionano meglio. Li attiviamo solo dopo consenso.",
        marketing:
          "Servono a misurare campagne e conversioni pubblicitarie. Li attiviamo solo dopo consenso.",
        more:
          'Per dettagli su cookie, fornitori, durata e diritti consulta la <a href="/it/cookie-policy">Cookie Policy</a>.',
      },
      cookieTable: {
        caption: "Elenco cookie",
        headers: {
          name: "Nome",
          domain: "Fornitore",
          description: "Finalita'",
          expiration: "Durata",
        },
      },
      services: {
        ga4: "Google Analytics 4",
        googleAds: "Google Ads",
        metaPixel: "Meta Pixel",
      },
    },
  },
  en: {
    consentModal: {
      title: "Privacy preferences",
      description:
        "We use necessary technical cookies. With your consent, we may also use analytics or marketing tools to improve the website and measure campaigns. You can change your choice at any time.",
      acceptAllBtn: "Accept all",
      acceptNecessaryBtn: "Necessary only",
      showPreferencesBtn: "Customize",
      closeIconLabel: "Necessary only",
      footer:
        '<a href="/en/cookie-policy">Cookie Policy</a><a href="/en/privacy">Privacy Policy</a>',
    },
    preferencesModal: {
      title: "Manage cookie preferences",
      acceptAllBtn: "Accept all",
      acceptNecessaryBtn: "Necessary only",
      savePreferencesBtn: "Save preferences",
      closeIconLabel: "Close",
      serviceCounterLabel: "service|services",
      sections: {
        intro:
          "You can choose by purpose. Necessary cookies remain active for security, sessions, language, payments and bot protection.",
        necessary:
          "Essential for navigation, admin/customer sessions, language preferences, security, Stripe and Cloudflare Turnstile. They cannot be disabled.",
        analytics:
          "They help us understand how the website is used and which pages work best. They are enabled only after consent.",
        marketing:
          "They are used to measure advertising campaigns and conversions. They are enabled only after consent.",
        more:
          'For details about cookies, providers, duration and rights, see the <a href="/en/cookie-policy">Cookie Policy</a>.',
      },
      cookieTable: {
        caption: "Cookie list",
        headers: {
          name: "Name",
          domain: "Provider",
          description: "Purpose",
          expiration: "Duration",
        },
      },
      services: {
        ga4: "Google Analytics 4",
        googleAds: "Google Ads",
        metaPixel: "Meta Pixel",
      },
    },
  },
} as const;
