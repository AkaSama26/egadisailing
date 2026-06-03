import { env } from "@/lib/env";
import {
  PUBLIC_COMPANY_LEGAL,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_LOCATION,
  PUBLIC_CONTACT_PHONE_TEXT,
} from "@/lib/public-contact";
import { PUBLIC_REVIEW_LINKS } from "@/lib/public-reviews";

const LOCALE_LANGUAGE: Record<string, string> = {
  it: "it-IT",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
};

const SITE_DESCRIPTION: Record<string, string> = {
  it: "Egadisailing organizza tour in barca alle Isole Egadi da Trapani: Favignana, Levanzo, Marettimo, charter privati, trimarano, chef a bordo e pesca sportiva.",
  en: "Egadisailing runs boat tours to the Egadi Islands from Trapani: Favignana, Levanzo, Marettimo, private charters, trimaran trips, chef on board and fishing charters.",
  es: "Egadisailing organiza excursiones en barco a las Islas Egadi desde Trapani: Favignana, Levanzo, Marettimo, charter privado, trimarán, chef a bordo y pesca.",
  fr: "Egadisailing organise des excursions en bateau aux îles Égades depuis Trapani : Favignana, Levanzo, Marettimo, charter privé, trimaran, chef à bord et pêche.",
  de: "Egadisailing organisiert Bootstouren zu den Ägadischen Inseln ab Trapani: Favignana, Levanzo, Marettimo, private Charter, Trimaran, Chef an Bord und Angeltouren.",
};

function absoluteUrl(path: string): string {
  const base = env.APP_URL.replace(/\/+$/, "");
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function buildGlobalSeoJsonLd(locale: string) {
  const base = env.APP_URL.replace(/\/+$/, "");
  const language = LOCALE_LANGUAGE[locale] ?? LOCALE_LANGUAGE.it;
  const description = SITE_DESCRIPTION[locale] ?? SITE_DESCRIPTION.it;
  const organizationId = `${base}/#organization`;
  const localBusinessId = `${base}/#localbusiness`;
  const websiteId = `${base}/#website`;

  const address = {
    "@type": "PostalAddress",
    streetAddress: "Via dei Gladioli 15",
    postalCode: "91100",
    addressLocality: "Trapani",
    addressRegion: "TP",
    addressCountry: "IT",
  };

  const areaServed = [
    "Trapani",
    "Isole Egadi",
    "Favignana",
    "Levanzo",
    "Marettimo",
    "Sicilia occidentale",
  ].map((name) => ({ "@type": "Place", name }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "TravelAgency"],
        "@id": organizationId,
        name: "Egadisailing",
        legalName: PUBLIC_COMPANY_LEGAL.name,
        url: base,
        logo: absoluteUrl("/images/brand/egadi-sailing-logo.svg"),
        image: absoluteUrl("/og-default.jpg"),
        description,
        email: PUBLIC_CONTACT_EMAIL,
        telephone: PUBLIC_CONTACT_PHONE_TEXT,
        vatID: PUBLIC_COMPANY_LEGAL.vatNumber,
        address,
        areaServed,
        sameAs: PUBLIC_REVIEW_LINKS.tripadvisorProfiles,
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: PUBLIC_CONTACT_EMAIL,
            telephone: PUBLIC_CONTACT_PHONE_TEXT,
            areaServed: "IT",
            availableLanguage: ["it", "en", "es", "fr", "de"],
          },
        ],
      },
      {
        "@type": ["LocalBusiness", "TravelAgency"],
        "@id": localBusinessId,
        name: "Egadisailing",
        url: base,
        image: absoluteUrl("/og-default.jpg"),
        description,
        email: PUBLIC_CONTACT_EMAIL,
        telephone: PUBLIC_CONTACT_PHONE_TEXT,
        address,
        areaServed,
        priceRange: "€€-€€€",
        parentOrganization: { "@id": organizationId },
        hasMap: PUBLIC_CONTACT_LOCATION.mapEmbedUrl,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: "Egadisailing",
        url: base,
        inLanguage: language,
        publisher: { "@id": organizationId },
      },
    ],
  };
}
