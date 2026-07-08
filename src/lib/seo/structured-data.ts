import { env } from "@/lib/env";
import {
  PUBLIC_COMPANY_LEGAL,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_GEO,
  PUBLIC_CONTACT_LOCATION,
  PUBLIC_CONTACT_OPENING_HOURS_SPECIFICATION,
  PUBLIC_CONTACT_POSTAL_ADDRESS,
  PUBLIC_CONTACT_PRIMARY_PHONE_TEXT,
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
  it: "Egadisailing organizza tour in barca alle Isole Egadi da Trapani: Favignana, Levanzo, Marettimo, charter privati, trimarano, pranzo a bordo e pesca sportiva.",
  en: "Egadisailing runs boat tours to the Egadi Islands from Trapani: Favignana, Levanzo, Marettimo, private charters, trimaran trips, lunch on board and fishing charters.",
  es: "Egadisailing organiza excursiones en barco a las Islas Egadi desde Trapani: Favignana, Levanzo, Marettimo, charter privado, trimarán, almuerzo a bordo y pesca.",
  fr: "Egadisailing organise des excursions en bateau aux îles Égades depuis Trapani : Favignana, Levanzo, Marettimo, charter privé, trimaran, déjeuner à bord et pêche.",
  de: "Egadisailing organisiert Bootstouren zu den Ägadischen Inseln ab Trapani: Favignana, Levanzo, Marettimo, private Charter, Trimaran, Mittagessen an Bord und Angeltouren.",
};

const SERVICE_CATALOG: Record<string, Array<{ name: string; serviceType: string }>> = {
  it: [
    { name: "Tour in barca Favignana e Levanzo", serviceType: "Boat tour" },
    { name: "Charter privato alle Isole Egadi", serviceType: "Private boat charter" },
    { name: "Esperienza pranzo a bordo in trimarano", serviceType: "Gourmet sailing experience" },
    { name: "Charter pesca sportiva alle Egadi", serviceType: "Fishing charter" },
  ],
  en: [
    { name: "Favignana and Levanzo boat tour", serviceType: "Boat tour" },
    { name: "Private charter in the Egadi Islands", serviceType: "Private boat charter" },
    { name: "Lunch on board trimaran experience", serviceType: "Gourmet sailing experience" },
    { name: "Egadi sport fishing charter", serviceType: "Fishing charter" },
  ],
  es: [
    { name: "Excursión en barco a Favignana y Levanzo", serviceType: "Boat tour" },
    { name: "Charter privado en las Islas Egadi", serviceType: "Private boat charter" },
    { name: "Experiencia con almuerzo a bordo en trimarán", serviceType: "Gourmet sailing experience" },
    { name: "Charter de pesca deportiva en las Egadi", serviceType: "Fishing charter" },
  ],
  fr: [
    { name: "Excursion en bateau à Favignana et Levanzo", serviceType: "Boat tour" },
    { name: "Charter privé aux îles Égades", serviceType: "Private boat charter" },
    { name: "Expérience déjeuner à bord en trimaran", serviceType: "Gourmet sailing experience" },
    { name: "Charter de pêche sportive aux Égades", serviceType: "Fishing charter" },
  ],
  de: [
    { name: "Bootstour Favignana und Levanzo", serviceType: "Boat tour" },
    { name: "Private Charter auf den Ägadischen Inseln", serviceType: "Private boat charter" },
    { name: "Mittagessen-an-Bord-Erlebnis im Trimaran", serviceType: "Gourmet sailing experience" },
    { name: "Sportangel-Charter auf den Egadi", serviceType: "Fishing charter" },
  ],
};

const KNOWS_ABOUT: Record<string, string[]> = {
  it: [
    "Tour in barca alle Isole Egadi",
    "Escursioni Favignana e Levanzo",
    "Charter in trimarano da Trapani",
    "Pesca sportiva alle Egadi",
  ],
  en: [
    "Egadi Islands boat tours",
    "Favignana and Levanzo excursions",
    "Trimaran charter from Trapani",
    "Sport fishing in the Egadi Islands",
  ],
  es: [
    "Excursiones en barco a las Islas Egadi",
    "Excursiones a Favignana y Levanzo",
    "Charter en trimarán desde Trapani",
    "Pesca deportiva en las Egadi",
  ],
  fr: [
    "Excursions en bateau aux îles Égades",
    "Excursions à Favignana et Levanzo",
    "Charter en trimaran depuis Trapani",
    "Pêche sportive aux Égades",
  ],
  de: [
    "Bootstouren zu den Ägadischen Inseln",
    "Ausflüge nach Favignana und Levanzo",
    "Trimaran-Charter ab Trapani",
    "Sportangeln auf den Egadi",
  ],
};

const OFFER_CATALOG_NAME: Record<string, string> = {
  it: "Esperienze Egadisailing",
  en: "Egadisailing experiences",
  es: "Experiencias Egadisailing",
  fr: "Expériences Egadisailing",
  de: "Egadisailing Erlebnisse",
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
  const serviceCatalog = SERVICE_CATALOG[locale] ?? SERVICE_CATALOG.it;
  const knowsAbout = KNOWS_ABOUT[locale] ?? KNOWS_ABOUT.it;

  const address = PUBLIC_CONTACT_POSTAL_ADDRESS;

  const areaServed = [
    "Trapani",
    "Isole Egadi",
    "Favignana",
    "Levanzo",
    "Marettimo",
    "Sicilia occidentale",
  ].map((name) => ({ "@type": "Place", name }));
  const offerCatalog = {
    "@type": "OfferCatalog",
    name: OFFER_CATALOG_NAME[locale] ?? OFFER_CATALOG_NAME.it,
    itemListElement: serviceCatalog.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service.name,
        serviceType: service.serviceType,
        areaServed,
        provider: { "@id": organizationId },
      },
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "TravelAgency"],
        "@id": organizationId,
        name: "Egadi Sailing",
        legalName: PUBLIC_COMPANY_LEGAL.name,
        url: base,
        logo: absoluteUrl("/images/brand/egadi-sailing-logo.svg"),
        image: absoluteUrl("/og-default.jpg"),
        description,
        email: PUBLIC_CONTACT_EMAIL,
        telephone: PUBLIC_CONTACT_PRIMARY_PHONE_TEXT,
        vatID: PUBLIC_COMPANY_LEGAL.vatNumber,
        alternateName: "Egadisailing",
        address,
        geo: PUBLIC_CONTACT_GEO,
        openingHoursSpecification: PUBLIC_CONTACT_OPENING_HOURS_SPECIFICATION,
        areaServed,
        knowsAbout,
        hasOfferCatalog: offerCatalog,
        sameAs: PUBLIC_REVIEW_LINKS.tripadvisorProfiles,
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: PUBLIC_CONTACT_EMAIL,
            telephone: PUBLIC_CONTACT_PRIMARY_PHONE_TEXT,
            areaServed: "IT",
            availableLanguage: ["it", "en", "es", "fr", "de"],
          },
        ],
      },
      {
        "@type": ["LocalBusiness", "TravelAgency"],
        "@id": localBusinessId,
        name: "Egadi Sailing",
        alternateName: "Egadisailing",
        url: base,
        image: absoluteUrl("/og-default.jpg"),
        description,
        email: PUBLIC_CONTACT_EMAIL,
        telephone: PUBLIC_CONTACT_PRIMARY_PHONE_TEXT,
        address,
        geo: PUBLIC_CONTACT_GEO,
        openingHoursSpecification: PUBLIC_CONTACT_OPENING_HOURS_SPECIFICATION,
        areaServed,
        knowsAbout,
        hasOfferCatalog: offerCatalog,
        sameAs: PUBLIC_REVIEW_LINKS.tripadvisorProfiles,
        priceRange: "€€-€€€",
        parentOrganization: { "@id": organizationId },
        hasMap: PUBLIC_CONTACT_LOCATION.mapEmbedUrl,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: "Egadi Sailing",
        alternateName: "Egadisailing",
        url: base,
        inLanguage: language,
        publisher: { "@id": organizationId },
        about: { "@id": localBusinessId },
      },
    ],
  };
}
