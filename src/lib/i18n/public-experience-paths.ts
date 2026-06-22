import { localizedPath } from "@/lib/i18n/paths";

const PUBLIC_EXPERIENCE_SLUGS = {
  "exclusive-experience": {
    it: "chef-a-bordo-egadi-trimarano-da-trapani",
    en: "chef-on-board-egadi-trimaran-from-trapani",
    es: "chef-a-bordo-egadi-trimaran-desde-trapani",
    fr: "chef-a-bord-egades-trimaran-depuis-trapani",
    de: "chef-an-bord-aegadische-inseln-trimaran-ab-trapani",
  },
  "boat-shared-full-day": {
    it: "escursione-barca-favignana-levanzo-da-trapani",
    en: "favignana-levanzo-boat-tour-from-trapani",
    es: "excursion-compartida-islas-egadi-8-horas",
    fr: "excursion-partagee-iles-egades-8-heures",
    de: "geteilte-bootstour-aegadische-inseln-8-stunden",
  },
  "boat-exclusive-full-day": {
    it: "tour-privato-favignana-levanzo-da-trapani",
    en: "private-favignana-levanzo-boat-tour-from-trapani",
    es: "excursion-privada-islas-egadi-8-horas",
    fr: "excursion-privee-iles-egades-8-heures",
    de: "private-bootstour-aegadische-inseln-8-stunden",
  },
  "boat-exclusive-morning": {
    it: "tour-privato-egadi-4-ore-mattina-da-trapani",
    en: "private-egadi-4-hour-morning-boat-tour-from-trapani",
    es: "tour-privado-egadi-4-horas-manana-desde-trapani",
    fr: "excursion-privee-egades-4-heures-matin-depuis-trapani",
    de: "private-bootstour-aegadische-inseln-4-stunden-vormittag-ab-trapani",
  },
  "boat-exclusive-afternoon": {
    it: "tour-privato-egadi-4-ore-pomeriggio-da-trapani",
    en: "private-egadi-4-hour-afternoon-boat-tour-from-trapani",
    es: "tour-privado-egadi-4-horas-tarde-desde-trapani",
    fr: "excursion-privee-egades-4-heures-apres-midi-depuis-trapani",
    de: "private-bootstour-aegadische-inseln-4-stunden-nachmittag-ab-trapani",
  },
  "cabin-charter": {
    it: "charter-egadi-trimarano-da-trapani",
    en: "egadi-trimaran-charter-from-trapani",
    es: "charter-egadi-trimaran-desde-trapani",
    fr: "charter-egades-trimaran-depuis-trapani",
    de: "trimaran-charter-aegadische-inseln-ab-trapani",
  },
  "fishing-full-day": {
    it: "charter-pesca-egadi-da-trapani",
    en: "egadi-fishing-charter-from-trapani",
    es: "charter-pesca-egadi-desde-trapani",
    fr: "charter-peche-egades-depuis-trapani",
    de: "angelcharter-aegadische-inseln-ab-trapani",
  },
} as const;

export type PublicExperienceServiceId = keyof typeof PUBLIC_EXPERIENCE_SLUGS;

export function localizedExperiencePath(locale: string, serviceId: PublicExperienceServiceId) {
  const slugs = PUBLIC_EXPERIENCE_SLUGS[serviceId];
  const slug = slugs[locale as keyof typeof slugs] ?? slugs.it;

  return localizedPath(locale, `/experiences/${slug}`);
}
