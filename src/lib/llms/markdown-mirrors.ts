import {
  getBoatContent,
  getBoatPublicSlug,
  getBoatsPageContent,
  getPublicBoatIds,
  isPublicBoatId,
  resolveBoatIdFromSlug,
} from "@/data/catalog/boats";
import {
  getExperienceContent,
  getExperiencePackageContents,
  getExperiencePackageServiceIds,
  getExperiencePublicSlug,
  getListedExperienceIds,
  isExperienceServiceId,
  resolveExperienceServiceIdFromSlug,
} from "@/data/catalog/experiences";
import { getIslandGuideCopy, islandSlugs, type IslandGuideSlug } from "@/data/island-guides";
import { routing, type Locale } from "@/i18n/routing";
import { localizedPath } from "@/lib/i18n/paths";
import {
  PUBLIC_COMPANY_LEGAL,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_LOCATION,
  PUBLIC_CONTACT_PHONE_TEXT,
  getContactLocationLabel,
} from "@/lib/public-contact";
import deMessages from "@/i18n/messages/de.json";
import enMessages from "@/i18n/messages/en.json";
import esMessages from "@/i18n/messages/es.json";
import frMessages from "@/i18n/messages/fr.json";
import itMessages from "@/i18n/messages/it.json";

const SITE_ORIGIN = "https://egadisailing.com";

const messagesByLocale = {
  it: itMessages,
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  de: deMessages,
} as const;

const languageLabel: Record<Locale, string> = {
  it: "Italian",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
};

const homeCopy: Record<Locale, { title: string; description: string; body: string }> = {
  it: {
    title: "Tour in barca Egadi da Trapani | Egadi Sailing",
    description:
      "Tour in barca alle Egadi da Trapani con barche private o condivise, trimarano con comfort da catamarano, snorkeling, pranzo a bordo, Favignana e Levanzo.",
    body:
      "Egadi Sailing organizza esperienze in barca da Trapani verso Favignana, Levanzo e Marettimo. Le rotte vengono adattate a meteo, vento, sicurezza e ritmo del gruppo.",
  },
  en: {
    title: "Egadi Islands Boat Tours from Trapani | Egadi Sailing",
    description:
      "Egadi Islands boat tours and boat trips from Trapani to Favignana and Levanzo: shared or private tours, snorkelling, lunch on board and trimaran charters.",
    body:
      "Egadi Sailing runs boat experiences from Trapani to Favignana, Levanzo and Marettimo. Routes are adapted to weather, wind, safety and guest pace.",
  },
  es: {
    title: "Paseos en barco desde Trapani a las Islas Egadi | Egadi Sailing",
    description:
      "Paseos y excursiones en barco desde Trapani a las Islas Egadi: Favignana y Levanzo, tour compartido o privado, snorkel, pranzo a bordo y charter en trimaran.",
    body:
      "Egadi Sailing organiza experiencias en barco desde Trapani hacia Favignana, Levanzo y Marettimo. Las rutas se adaptan a clima, viento, seguridad y ritmo del grupo.",
  },
  fr: {
    title: "Excursions bateau aux Egades depuis Trapani | Egadi Sailing",
    description:
      "Excursions bateau depuis Trapani vers les iles Egades: Favignana et Levanzo, sorties privees ou partagees, snorkeling, dejeuner a bord et charter en trimaran.",
    body:
      "Egadi Sailing organise des excursions en bateau depuis Trapani vers Favignana, Levanzo et Marettimo. Les itineraires sont adaptes a la meteo, au vent, a la securite et au rythme du groupe.",
  },
  de: {
    title: "Bootstouren ab Trapani zu den Ägadischen Inseln | Egadi Sailing",
    description:
      "Bootstouren ab Trapani zu den Ägadischen Inseln: Favignana und Levanzo, geteilte oder private Ausfahrten, Schnorcheln, Mittagessen an Bord und Trimaran-Charter.",
    body:
      "Egadi Sailing organisiert Bootserlebnisse ab Trapani nach Favignana, Levanzo und Marettimo. Die Routen werden an Wetter, Wind, Sicherheit und Gruppentempo angepasst.",
  },
};

type MarkdownMirror = {
  markdown?: string;
  redirectPath?: string;
};

type StaticPageKey =
  | "home"
  | "experiences"
  | "boats"
  | "islands"
  | "about"
  | "contacts"
  | "faq"
  | "prenota"
  | "privacy"
  | "terms"
  | "cookie-policy";

type StaticPage = {
  href: string;
  key: StaticPageKey;
  build: (locale: Locale) => string;
};

function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && routing.locales.includes(value as Locale));
}

function cleanMarkdownPath(path: string | null | undefined): string {
  return (path ?? "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\.md$/, "");
}

function localizedKey(locale: Locale, href: string): string {
  const fullPath = localizedPath(locale, href).replace(/\/+$/, "");
  const localePrefix = `/${locale}`;
  if (fullPath === localePrefix) return "";
  return fullPath.slice(localePrefix.length + 1);
}

function absoluteHtml(locale: Locale, href: string): string {
  return `${SITE_ORIGIN}${localizedPath(locale, href)}`;
}

function absoluteMarkdown(locale: Locale, href: string): string {
  return `${absoluteHtml(locale, href)}.md`;
}

function withLocale(locale: Locale, pathWithoutLocale: string): string {
  return `${SITE_ORIGIN}/${locale}${pathWithoutLocale.startsWith("/") ? pathWithoutLocale : `/${pathWithoutLocale}`}`;
}

function headingDocument({
  title,
  description,
  locale,
  href,
  sections,
}: {
  title: string;
  description: string;
  locale: Locale;
  href: string;
  sections: Array<string | false | null | undefined>;
}): string {
  return [
    `# ${title}`,
    `Canonical HTML: ${absoluteHtml(locale, href)}`,
    `Markdown mirror: ${absoluteMarkdown(locale, href)}`,
    `Language: ${languageLabel[locale]}`,
    description,
    ...sections.filter(Boolean),
  ].join("\n\n") + "\n";
}

function bullets(items: Array<string | null | undefined>): string {
  const clean = items.filter((item): item is string => Boolean(item));
  return clean.length > 0 ? clean.map((item) => `- ${item}`).join("\n") : "- Not specified.";
}

function numbered(items: Array<string | null | undefined>): string {
  const clean = items.filter((item): item is string => Boolean(item));
  return clean.length > 0 ? clean.map((item, index) => `${index + 1}. ${item}`).join("\n") : "1. Not specified.";
}

function publicExperienceIds(): Set<string> {
  return new Set([...getListedExperienceIds(), ...getExperiencePackageServiceIds()]);
}

function buildHome(locale: Locale): string {
  const copy = homeCopy[locale];
  const packages = getExperiencePackageContents(locale);
  return headingDocument({
    title: copy.title,
    description: copy.description,
    locale,
    href: "/",
    sections: [
      copy.body,
      "## Main Public Sections\n\n" + bullets([
        `[Experiences](${absoluteHtml(locale, "/experiences")})`,
        `[Boats](${absoluteHtml(locale, "/boats")})`,
        `[Islands](${absoluteHtml(locale, "/islands")})`,
        `[FAQ](${absoluteHtml(locale, "/faq")})`,
        `[Contacts](${absoluteHtml(locale, "/contacts")})`,
      ]),
      "## Main Experience Families\n\n" + bullets(packages.map((item) => `${item.title}: ${item.subtitle}`)),
      `## Contact\n\nMeeting point: ${getContactLocationLabel(locale)}\n\nEmail: ${PUBLIC_CONTACT_EMAIL}\n\nPhone and WhatsApp: ${PUBLIC_CONTACT_PHONE_TEXT}`,
    ],
  });
}

function buildExperiencesHub(locale: Locale): string {
  const packages = getExperiencePackageContents(locale);
  const titleByLocale: Record<Locale, string> = {
    it: "Tour in barca Egadi da Trapani | Egadi Sailing",
    en: "Egadi Boat Tours and Trips from Trapani | Egadi Sailing",
    es: "Paseos en barco desde Trapani a las Islas Egadi | Egadi Sailing",
    fr: "Excursions bateau aux Egades depuis Trapani | Egadi Sailing",
    de: "Bootstouren ab Trapani zu den Ägadischen Inseln | Egadi Sailing",
  };
  const descriptionByLocale: Record<Locale, string> = {
    it: "Confronta tour in barca alle Egadi da Trapani: Favignana e Levanzo, escursioni condivise o private, trimarano, pranzo a bordo e pesca.",
    en: "Compare Egadi boat tours from Trapani: Favignana and Levanzo boat trips, shared or private tours, snorkelling, trimaran charter and fishing.",
    es: "Compara paseos y excursiones en barco desde Trapani a las Islas Egadi: Favignana y Levanzo, tour compartido o privado, snorkel, trimaran y pesca.",
    fr: "Comparez les excursions bateau aux iles Egades depuis Trapani: Favignana, Levanzo, sorties privees ou partagees, trimaran, dejeuner a bord et peche.",
    de: "Vergleichen Sie Bootstouren ab Trapani zu den Ägadischen Inseln: Favignana, Levanzo, private oder geteilte Ausfahrten, Trimaran, Mittagessen an Bord und Angeln.",
  };
  const packageLines = packages.map((item) => {
    const variants = item.variants.length > 0
      ? ` Variants: ${item.variants.map((variant) => `${variant.label} (${withLocale(locale, variant.href)}.md)`).join("; ")}.`
      : "";
    return `${item.title}: ${item.subtitle} Duration: ${item.durationLabel}. Detail: ${item.detailLabel}.${variants}`;
  });
  return headingDocument({
    title: titleByLocale[locale],
    description: descriptionByLocale[locale],
    locale,
    href: "/experiences",
    sections: [
      "## Experience Families\n\n" + bullets(packageLines),
      "## Operational Notes\n\nRoutes depend on weather, wind, safety, sea state and guest pace. Live availability and final prices must be checked on the website or by contacting Egadi Sailing.",
    ],
  });
}

function buildExperienceDetail(locale: Locale, serviceId: string): string | null {
  const content = getExperienceContent(serviceId, locale);
  if (!content) return null;
  const slug = getExperiencePublicSlug(serviceId, locale);
  const itinerary = content.itinerary.map((item) => {
    const title = item.title ? `${item.title}: ` : "";
    const location = item.location ? ` (${item.location})` : "";
    return `${item.time} - ${title}${item.text}${location}`;
  });

  return headingDocument({
    title: content.seoTitle || content.title,
    description: content.seoDescription || content.subtitle,
    locale,
    href: `/experiences/${slug}`,
    sections: [
      content.detailDescription,
      `## Summary\n\n${content.subtitle}`,
      "## Includes\n\n" + bullets(content.includes),
      "## What To Bring\n\n" + bullets(content.bringItems),
      "## Itinerary\n\n" + numbered(itinerary),
      `## Booking Context\n\nPublic booking entry point: ${absoluteHtml(locale, `/prenota?service=${slug}`)}\n\nDo not invent live availability, weather feasibility or final prices.`,
    ],
  });
}

function buildBoatsHub(locale: Locale): string {
  const content = getBoatsPageContent(locale);
  const boats = getPublicBoatIds()
    .map((boatId) => getBoatContent(boatId, locale))
    .filter((boat): boat is NonNullable<typeof boat> => Boolean(boat));
  return headingDocument({
    title: content.seoTitle,
    description: content.seoDescription,
    locale,
    href: "/boats",
    sections: [
      content.subtitle,
      `## ${content.comparisonTitle}\n\n${content.comparisonText}`,
      `## ${content.chooserTitle}\n\n${content.chooserText}`,
      "## Public Boats\n\n" + bullets(boats.map((boat) => `${boat.title}: ${boat.description} Markdown: ${absoluteMarkdown(locale, `/boats/${boat.slug}`)}`)),
    ],
  });
}

function buildBoatDetail(locale: Locale, boatId: string): string | null {
  const boat = getBoatContent(boatId, locale);
  if (!boat) return null;
  const related = boat.serviceIds
    .map((serviceId) => getExperienceContent(serviceId, locale))
    .filter((experience): experience is NonNullable<typeof experience> => Boolean(experience));
  return headingDocument({
    title: boat.seoTitle,
    description: boat.seoDescription,
    locale,
    href: `/boats/${getBoatPublicSlug(boat.id, locale)}`,
    sections: [
      boat.description,
      `## ${boat.detail.title}\n\n${boat.detail.paragraphs.join("\n\n")}`,
      "## Specs\n\n" + bullets(boat.specs.map((spec) => `${spec.label}: ${spec.value}`)),
      "## Ideal For\n\n" + bullets(boat.idealFor),
      "## Routes\n\n" + bullets(boat.routes),
      "## Related Experiences\n\n" + bullets(related.map((experience) => `${experience.title}: ${absoluteMarkdown(locale, `/experiences/${getExperiencePublicSlug(experience.serviceId, locale)}`)}`)),
      "## FAQ\n\n" + boat.faqs.map((item) => `### ${item.question}\n\n${item.answer}`).join("\n\n"),
    ],
  });
}

function buildIslandsHub(locale: Locale): string {
  const guides = islandSlugs.map((slug) => getIslandGuideCopy(slug, locale));
  return headingDocument({
    title: locale === "it" ? "Isole Egadi in barca" : "Egadi Islands by boat",
    description:
      locale === "it"
        ? "Guide pulite a Favignana, Levanzo e Marettimo dal punto di vista di una rotta in barca da Trapani."
        : "Clean guides to Favignana, Levanzo and Marettimo from the perspective of a boat route from Trapani.",
    locale,
    href: "/islands",
    sections: [
      "## Island Guides\n\n" + bullets(islandSlugs.map((slug, index) => `${guides[index].h1}: ${guides[index].intro[0]} Markdown: ${absoluteMarkdown(locale, `/islands/${slug}`)}`)),
    ],
  });
}

function buildIslandDetail(locale: Locale, slug: IslandGuideSlug): string {
  const guide = getIslandGuideCopy(slug, locale);
  return headingDocument({
    title: guide.h1,
    description: guide.intro.join(" "),
    locale,
    href: `/islands/${slug}`,
    sections: [
      guide.intro.join("\n\n"),
      ...guide.sections.map((section) => `## ${section.title}\n\n${section.body.join("\n\n")}`),
      `## ${guide.faqTitle}\n\n${guide.faqs.map((item) => `### ${item.question}\n\n${item.answer}`).join("\n\n")}`,
      `## ${guide.ctaTitle}\n\n${guide.ctaText}`,
    ],
  });
}

function buildAbout(locale: Locale): string {
  return headingDocument({
    title: locale === "it" ? "Chi siamo - Egadi Sailing" : "About Egadi Sailing",
    description:
      "Egadi Sailing is a Trapani-based boat tour and charter company focused on real Egadi Islands experiences, safety-aware routing and direct guest support.",
    locale,
    href: "/about",
    sections: [
      `Legal entity: ${PUBLIC_COMPANY_LEGAL.name}, ${PUBLIC_COMPANY_LEGAL.legalAddress}, VAT ${PUBLIC_COMPANY_LEGAL.vatNumber}.`,
      "## What Matters\n\n" + bullets([
        "Real local departure from Trapani.",
        "Routes adapted by skipper and crew according to weather and sea conditions.",
        "Private and shared formats for different budgets and group styles.",
        "Clear public contact and booking support.",
      ]),
    ],
  });
}

function buildContacts(locale: Locale): string {
  return headingDocument({
    title: locale === "it" ? "Contatti Egadi Sailing" : "Egadi Sailing Contacts",
    description: "Public contact details, meeting point and support context for Egadi Sailing boat tours from Trapani.",
    locale,
    href: "/contacts",
    sections: [
      `Meeting point: ${getContactLocationLabel(locale)}`,
      `Registered office: ${PUBLIC_COMPANY_LEGAL.legalAddress}`,
      `Email: ${PUBLIC_CONTACT_EMAIL}`,
      `Phone and WhatsApp: ${PUBLIC_CONTACT_PHONE_TEXT}`,
      `Map: ${PUBLIC_CONTACT_LOCATION.mapEmbedUrl}`,
    ],
  });
}

function buildFaq(locale: Locale): string {
  const faq = messagesByLocale[locale].faq;
  const items = [1, 2, 3, 4, 5, 6].map((index) => ({
    question: faq[`q${index}` as keyof typeof faq],
    answer: faq[`a${index}` as keyof typeof faq],
  }));
  return headingDocument({
    title: faq.title,
    description: faq.subtitle,
    locale,
    href: "/faq",
    sections: [
      "## Questions\n\n" + items.map((item) => `### ${item.question}\n\n${item.answer}`).join("\n\n"),
    ],
  });
}

function buildPrenota(locale: Locale): string {
  const experiences = Array.from(publicExperienceIds())
    .map((serviceId) => getExperienceContent(serviceId, locale))
    .filter((experience): experience is NonNullable<typeof experience> => Boolean(experience));
  return headingDocument({
    title: locale === "it" ? "Prenota Egadi Sailing" : "Book Egadi Sailing",
    description: "Public booking entry point for Egadi Sailing experiences. Live availability and final prices must be checked in the booking flow or with the team.",
    locale,
    href: "/prenota",
    sections: [
      "## Bookable Experiences\n\n" + bullets(experiences.map((experience) => `${experience.title}: ${absoluteHtml(locale, `/prenota?service=${getExperiencePublicSlug(experience.serviceId, locale)}`)}`)),
    ],
  });
}

function buildLegal(locale: Locale, key: "privacy" | "terms" | "cookie-policy"): string {
  const titles = {
    privacy: locale === "it" ? "Privacy Policy" : "Privacy Policy",
    terms: locale === "it" ? "Termini e condizioni" : "Terms and Conditions",
    "cookie-policy": locale === "it" ? "Cookie Policy" : "Cookie Policy",
  } as const;
  return headingDocument({
    title: `${titles[key]} - Egadi Sailing`,
    description: `Legal and policy page for Egadi Sailing. Read the canonical HTML page for the complete legal text: ${absoluteHtml(locale, `/${key}`)}.`,
    locale,
    href: `/${key}`,
    sections: [
      `Company: ${PUBLIC_COMPANY_LEGAL.name}`,
      `Registered office: ${PUBLIC_COMPANY_LEGAL.legalAddress}`,
      `VAT: ${PUBLIC_COMPANY_LEGAL.vatNumber}`,
      `Email: ${PUBLIC_CONTACT_EMAIL}`,
    ],
  });
}

const staticPages: StaticPage[] = [
  { key: "home", href: "/", build: buildHome },
  { key: "experiences", href: "/experiences", build: buildExperiencesHub },
  { key: "boats", href: "/boats", build: buildBoatsHub },
  { key: "islands", href: "/islands", build: buildIslandsHub },
  { key: "about", href: "/about", build: buildAbout },
  { key: "contacts", href: "/contacts", build: buildContacts },
  { key: "faq", href: "/faq", build: buildFaq },
  { key: "prenota", href: "/prenota", build: buildPrenota },
  { key: "privacy", href: "/privacy", build: (locale) => buildLegal(locale, "privacy") },
  { key: "terms", href: "/terms", build: (locale) => buildLegal(locale, "terms") },
  { key: "cookie-policy", href: "/cookie-policy", build: (locale) => buildLegal(locale, "cookie-policy") },
];

function redirectTo(locale: Locale, pathWithoutLocale: string): MarkdownMirror {
  return { redirectPath: `/${locale}/${pathWithoutLocale}.md`.replace(/\/\.md$/, ".md") };
}

function resolveExperience(locale: Locale, path: string): MarkdownMirror | null {
  const base = localizedKey(locale, "/experiences");
  if (!path.startsWith(`${base}/`)) return null;
  const slug = path.slice(base.length + 1);
  if (!slug || slug.includes("/")) return null;

  const serviceId = resolveExperienceServiceIdFromSlug(slug);
  if (!isExperienceServiceId(serviceId) || !publicExperienceIds().has(serviceId)) return null;

  const canonicalSlug = getExperiencePublicSlug(serviceId, locale);
  if (slug !== canonicalSlug) return redirectTo(locale, `${base}/${canonicalSlug}`);

  const markdown = buildExperienceDetail(locale, serviceId);
  return markdown ? { markdown } : null;
}

function resolveBoat(locale: Locale, path: string): MarkdownMirror | null {
  const base = localizedKey(locale, "/boats");
  if (!path.startsWith(`${base}/`)) return null;
  const slug = path.slice(base.length + 1);
  if (!slug || slug.includes("/")) return null;

  const boatId = resolveBoatIdFromSlug(slug);
  if (!isPublicBoatId(boatId)) return null;

  const canonicalSlug = getBoatPublicSlug(boatId, locale);
  if (slug !== canonicalSlug) return redirectTo(locale, `${base}/${canonicalSlug}`);

  const markdown = buildBoatDetail(locale, boatId);
  return markdown ? { markdown } : null;
}

function resolveIsland(locale: Locale, path: string): MarkdownMirror | null {
  const base = localizedKey(locale, "/islands");
  if (!path.startsWith(`${base}/`)) return null;
  const slug = path.slice(base.length + 1);
  if (!islandSlugs.includes(slug as IslandGuideSlug)) return null;
  return { markdown: buildIslandDetail(locale, slug as IslandGuideSlug) };
}

export function getMarkdownMirror(localeValue: string | null, pathValue: string | null): MarkdownMirror | null {
  if (!isLocale(localeValue)) return null;
  const locale = localeValue;
  const path = cleanMarkdownPath(pathValue);

  for (const page of staticPages) {
    if (path === localizedKey(locale, page.href)) {
      return { markdown: page.build(locale) };
    }
  }

  return resolveExperience(locale, path) ?? resolveBoat(locale, path) ?? resolveIsland(locale, path);
}

export const markdownMirrorHeaders = {
  "Content-Type": "text/markdown; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  "X-Robots-Tag": "noindex, follow",
  "X-Content-Type-Options": "nosniff",
} as const;
