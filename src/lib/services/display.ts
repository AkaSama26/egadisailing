import { getExperienceContent } from "@/data/catalog/experiences";

export interface ServiceDisplayInput {
  id?: string;
  name: string;
  type: string;
  durationType: string;
  durationHours: number;
  pricingUnit?: string | null;
}

export interface ExperienceVisual {
  title: string;
  subtitle: string;
  media: Array<{ caption: string; alt?: string; color: string; src?: string }>;
}

const FALLBACK_MEDIA = [
  { caption: "Egadisailing", color: "#BAE6FD" },
  { caption: "Isole Egadi", color: "#FDE68A" },
  { caption: "Trapani", color: "#A7F3D0" },
];

export function getExperienceDisplay(
  service: ServiceDisplayInput,
  locale?: string | null,
): ExperienceVisual {
  const content = service.id ? getExperienceContent(service.id, locale) : null;
  return {
    title: content?.title ?? service.name,
    subtitle: content?.subtitle ?? "",
    media: content?.media ?? FALLBACK_MEDIA,
  };
}

export function getExperienceTitle(
  service: ServiceDisplayInput,
  locale?: string | null,
): string {
  return getExperienceDisplay(service, locale).title;
}

export function getServiceDurationLabel(
  service: ServiceDisplayInput,
  locale?: string | null,
): string {
  const isEnglish = locale === "en";
  const hours = service.durationHours;
  const hourUnit = isEnglish ? (hours === 1 ? "hour" : "hours") : "ore";
  if (service.type === "CABIN_CHARTER") return isEnglish ? "3-7 days" : "3-7 giornate";
  if (service.durationType === "MULTI_DAY") {
    const days = Math.max(1, Math.ceil(hours / 24));
    return isEnglish ? `${days} ${days === 1 ? "day" : "days"}` : `${days} giorni`;
  }
  if (service.durationType === "FULL_DAY") return `${hours} ${hourUnit}`;
  if (service.durationType === "HALF_DAY_MORNING") return `${hours} ${hourUnit}`;
  if (service.durationType === "HALF_DAY_AFTERNOON") return `${hours} ${hourUnit}`;
  if (service.durationType === "WEEK") return isEnglish ? "7 days" : "7 giorni";
  return isEnglish ? `${hours} ${hourUnit}` : `${hours}h`;
}

export function getPriceUnitLabel(
  pricingUnit?: string | null,
  serviceType?: string | null,
  locale?: string | null,
): string {
  const isEnglish = locale === "en";
  if (serviceType === "CABIN_CHARTER") return isEnglish ? "per package" : "per pacchetto";
  return pricingUnit === "PER_PACKAGE"
    ? isEnglish
      ? "per package"
      : "per pacchetto"
    : isEnglish
      ? "per person"
      : "a persona";
}
