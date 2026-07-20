export const COOKIE_CONSENT_COOKIE_NAME = "egadi_cookie_consent" as const;
export const COOKIE_CONSENT_POLICY_VERSION = "1.8" as const;
export const COOKIE_CONSENT_REVISION = 9 as const;
export const COOKIE_CONSENT_EFFECTIVE_DATE = "20 luglio 2026" as const;

export const COOKIE_CONSENT_CATEGORIES = {
  necessary: {
    label: {
      it: "Cookie tecnici",
      en: "Strictly necessary cookies",
      es: "Cookies técnicas",
      fr: "Cookies strictement nécessaires",
      de: "Unbedingt erforderliche Cookies",
    },
    required: true,
  },
  analytics: {
    label: {
      it: "Cookie analitici",
      en: "Analytics cookies",
      es: "Cookies analíticos",
      fr: "Cookies analytiques",
      de: "Analyse-Cookies",
    },
    required: false,
  },
  marketing: {
    label: {
      it: "Cookie marketing",
      en: "Marketing cookies",
      es: "Cookies de marketing",
      fr: "Cookies marketing",
      de: "Marketing-Cookies",
    },
    required: false,
  },
} as const;

export type CookieConsentCategory = keyof typeof COOKIE_CONSENT_CATEGORIES;
export type CookieConsentLocale = "it" | "en" | "es" | "fr" | "de";

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
  bingUetTagId?: string;
}

export function normalizeCookieConsentLocale(locale: string): CookieConsentLocale {
  if (locale === "en" || locale === "es" || locale === "fr" || locale === "de") return locale;
  return "it";
}

export function hasOptionalCookieConsentServices(services: CookieConsentPublicServices): boolean {
  return Boolean(
    services.gaMeasurementId ||
      services.googleAdsId ||
      services.metaPixelId ||
      services.bingUetTagId,
  );
}

export function getEnabledCookieConsentCategories(
  services: CookieConsentPublicServices,
): CookieConsentCategory[] {
  const categories: CookieConsentCategory[] = ["necessary"];
  if (services.gaMeasurementId) categories.push("analytics");
  if (services.googleAdsId || services.metaPixelId || services.bingUetTagId) {
    categories.push("marketing");
  }
  return categories;
}

export const COOKIE_CONSENT_TRANSLATIONS = {
  it: {
    consentModal: {
      title: "Preferenze privacy",
      description:
        "Usiamo cookie tecnici necessari. Google Tag Manager può essere caricato in modalità Consent Mode con storage negato; con il tuo consenso attiviamo cookie e tag analitici o marketing gestiti dal container. Puoi modificare la scelta in ogni momento.",
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
          "Puoi scegliere per finalità. I cookie tecnici restano attivi per sicurezza, sessione, pagamenti e protezione anti-bot.",
        necessary:
          "Essenziali per navigazione, sessione admin/cliente, sicurezza, Stripe e Cloudflare Turnstile. Non possono essere disattivati.",
        analytics:
          "Ci aiutano a capire come viene usato il sito. Google Tag Manager può essere presente con storage negato; cookie e misurazione completa di GA4 partono solo dopo consenso.",
        marketing:
          "Servono a misurare campagne e conversioni pubblicitarie. Cookie, storage pubblicitario e personalizzazione partono solo dopo consenso.",
        more:
          'Per dettagli su cookie, fornitori, durata e diritti consulta la <a href="/it/cookie-policy">Cookie Policy</a>.',
      },
      cookieTable: {
        caption: "Elenco cookie",
        headers: {
          name: "Nome",
          domain: "Fornitore",
          description: "Finalità",
          expiration: "Durata",
        },
      },
      services: {
        ga4: "Google Analytics 4",
        googleAds: "Google Ads",
        metaPixel: "Meta Pixel",
        bingUet: "Microsoft Advertising / Bing",
      },
    },
  },
  en: {
    consentModal: {
      title: "Privacy preferences",
      description:
        "We use necessary technical cookies. Google Tag Manager may load in Consent Mode with storage denied; with your consent we enable analytics or marketing cookies and tags managed by the container. You can change your choice at any time.",
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
          "You can choose by purpose. Necessary cookies remain active for security, sessions, payments and bot protection.",
        necessary:
          "Essential for navigation, admin/customer sessions, security, Stripe and Cloudflare Turnstile. They cannot be disabled.",
        analytics:
          "They help us understand how the website is used. Google Tag Manager may be present with storage denied; GA4 cookies and full measurement start only after consent.",
        marketing:
          "They are used to measure advertising campaigns and conversions. Advertising cookies, storage and personalization start only after consent.",
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
        bingUet: "Microsoft Advertising / Bing",
      },
    },
  },
  es: {
    consentModal: {
      title: "Preferencias de privacidad",
      description:
        "Usamos cookies técnicas necesarias. Google Tag Manager puede cargarse con Consent Mode y almacenamiento denegado; con tu consentimiento activamos cookies y etiquetas analíticas o de marketing gestionadas por el contenedor. Puedes cambiar tu elección en cualquier momento.",
      acceptAllBtn: "Aceptar todo",
      acceptNecessaryBtn: "Solo necesarias",
      showPreferencesBtn: "Personalizar",
      closeIconLabel: "Solo necesarias",
      footer:
        '<a href="/es/politica-de-cookies">Política de cookies</a><a href="/es/privacidad">Política de privacidad</a>',
    },
    preferencesModal: {
      title: "Gestionar preferencias de cookies",
      acceptAllBtn: "Aceptar todo",
      acceptNecessaryBtn: "Solo necesarias",
      savePreferencesBtn: "Guardar preferencias",
      closeIconLabel: "Cerrar",
      serviceCounterLabel: "servicio|servicios",
      sections: {
        intro:
          "Puedes elegir por finalidad. Las cookies necesarias permanecen activas para seguridad, sesiones, pagos y protección antibot.",
        necessary:
          "Esenciales para navegación, sesiones de administrador/cliente, seguridad, Stripe y Cloudflare Turnstile. No se pueden desactivar.",
        analytics:
          "Nos ayudan a entender cómo se usa el sitio. Google Tag Manager puede estar presente con almacenamiento denegado; las cookies y la medición completa de GA4 empiezan solo tras tu consentimiento.",
        marketing:
          "Sirven para medir campañas publicitarias y conversiones. Cookies, almacenamiento publicitario y personalización empiezan solo tras tu consentimiento.",
        more:
          'Para más detalles sobre cookies, proveedores, duración y derechos, consulta la <a href="/es/politica-de-cookies">Política de cookies</a>.',
      },
      cookieTable: {
        caption: "Lista de cookies",
        headers: {
          name: "Nombre",
          domain: "Proveedor",
          description: "Finalidad",
          expiration: "Duración",
        },
      },
      services: {
        ga4: "Google Analytics 4",
        googleAds: "Google Ads",
        metaPixel: "Meta Pixel",
        bingUet: "Microsoft Advertising / Bing",
      },
    },
  },
  fr: {
    consentModal: {
      title: "Préférences de confidentialité",
      description:
        "Nous utilisons des cookies techniques nécessaires. Google Tag Manager peut se charger avec Consent Mode et stockage refusé ; avec votre consentement nous activons les cookies et tags analytiques ou marketing gérés par le conteneur. Vous pouvez modifier votre choix à tout moment.",
      acceptAllBtn: "Tout accepter",
      acceptNecessaryBtn: "Nécessaires uniquement",
      showPreferencesBtn: "Personnaliser",
      closeIconLabel: "Nécessaires uniquement",
      footer:
        '<a href="/fr/politique-de-cookies">Politique de cookies</a><a href="/fr/confidentialite">Politique de confidentialité</a>',
    },
    preferencesModal: {
      title: "Gérer les préférences de cookies",
      acceptAllBtn: "Tout accepter",
      acceptNecessaryBtn: "Nécessaires uniquement",
      savePreferencesBtn: "Enregistrer les préférences",
      closeIconLabel: "Fermer",
      serviceCounterLabel: "service|services",
      sections: {
        intro:
          "Vous pouvez choisir par finalité. Les cookies nécessaires restent actifs pour la sécurité, les sessions, les paiements et la protection anti-bot.",
        necessary:
          "Essentiels pour la navigation, les sessions administrateur/client, la sécurité, Stripe et Cloudflare Turnstile. Ils ne peuvent pas être désactivés.",
        analytics:
          "Ils nous aident à comprendre l'utilisation du site. Google Tag Manager peut être présent avec stockage refusé ; cookies et mesure complète GA4 commencent uniquement après consentement.",
        marketing:
          "Ils servent à mesurer les campagnes publicitaires et les conversions. Cookies, stockage publicitaire et personnalisation commencent uniquement après consentement.",
        more:
          'Pour les détails sur les cookies, les fournisseurs, la durée et vos droits, consultez la <a href="/fr/politique-de-cookies">Politique de cookies</a>.',
      },
      cookieTable: {
        caption: "Liste des cookies",
        headers: {
          name: "Nom",
          domain: "Fournisseur",
          description: "Finalité",
          expiration: "Durée",
        },
      },
      services: {
        ga4: "Google Analytics 4",
        googleAds: "Google Ads",
        metaPixel: "Meta Pixel",
        bingUet: "Microsoft Advertising / Bing",
      },
    },
  },
  de: {
    consentModal: {
      title: "Datenschutz-Einstellungen",
      description:
        "Wir verwenden notwendige technische Cookies. Google Tag Manager kann mit Consent Mode und verweigertem Speicher geladen werden; mit Ihrer Einwilligung aktivieren wir Analyse- oder Marketing-Cookies und Tags aus dem Container. Sie können Ihre Auswahl jederzeit ändern.",
      acceptAllBtn: "Alle akzeptieren",
      acceptNecessaryBtn: "Nur notwendige",
      showPreferencesBtn: "Anpassen",
      closeIconLabel: "Nur notwendige",
      footer:
        '<a href="/de/cookie-richtlinie">Cookie-Richtlinie</a><a href="/de/datenschutz">Datenschutz</a>',
    },
    preferencesModal: {
      title: "Cookie-Einstellungen verwalten",
      acceptAllBtn: "Alle akzeptieren",
      acceptNecessaryBtn: "Nur notwendige",
      savePreferencesBtn: "Einstellungen speichern",
      closeIconLabel: "Schließen",
      serviceCounterLabel: "Dienst|Dienste",
      sections: {
        intro:
          "Sie können nach Zweck wählen. Notwendige Cookies bleiben für Sicherheit, Sessions, Zahlungen und Bot-Schutz aktiv.",
        necessary:
          "Erforderlich für Navigation, Admin-/Kundensessions, Sicherheit, Stripe und Cloudflare Turnstile. Sie können nicht deaktiviert werden.",
        analytics:
          "Sie helfen uns zu verstehen, wie die Website genutzt wird. Google Tag Manager kann mit verweigertem Speicher vorhanden sein; GA4-Cookies und vollständige Messung starten nur nach Einwilligung.",
        marketing:
          "Sie dienen der Messung von Werbekampagnen und Conversions. Werbe-Cookies, Speicher und Personalisierung starten nur nach Einwilligung.",
        more:
          'Details zu Cookies, Anbietern, Dauer und Rechten finden Sie in der <a href="/de/cookie-richtlinie">Cookie-Richtlinie</a>.',
      },
      cookieTable: {
        caption: "Cookie-Liste",
        headers: {
          name: "Name",
          domain: "Anbieter",
          description: "Zweck",
          expiration: "Dauer",
        },
      },
      services: {
        ga4: "Google Analytics 4",
        googleAds: "Google Ads",
        metaPixel: "Meta Pixel",
        bingUet: "Microsoft Advertising / Bing",
      },
    },
  },
} as const;
