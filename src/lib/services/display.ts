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
  const isSpanish = locale === "es";
  const isFrench = locale === "fr";
  const hours = service.durationHours;
  const hourUnit = isEnglish
    ? hours === 1
      ? "hour"
      : "hours"
    : isSpanish
      ? hours === 1
        ? "hora"
        : "horas"
      : isFrench
        ? hours === 1
          ? "heure"
          : "heures"
        : "ore";
  if (service.type === "CABIN_CHARTER") {
    if (isSpanish) return "3-7 días";
    if (isFrench) return "3-7 jours";
    return isEnglish ? "3-7 days" : "3-7 giornate";
  }
  if (service.durationType === "MULTI_DAY") {
    const days = Math.max(1, Math.ceil(hours / 24));
    if (isSpanish) return `${days} ${days === 1 ? "día" : "días"}`;
    if (isFrench) return `${days} ${days === 1 ? "jour" : "jours"}`;
    return isEnglish ? `${days} ${days === 1 ? "day" : "days"}` : `${days} giorni`;
  }
  if (service.durationType === "FULL_DAY") return `${hours} ${hourUnit}`;
  if (service.durationType === "HALF_DAY_MORNING") return `${hours} ${hourUnit}`;
  if (service.durationType === "HALF_DAY_AFTERNOON") return `${hours} ${hourUnit}`;
  if (service.durationType === "WEEK") return isSpanish ? "7 días" : isFrench ? "7 jours" : isEnglish ? "7 days" : "7 giorni";
  if (isSpanish) return `${hours} ${hourUnit}`;
  if (isFrench) return `${hours} ${hourUnit}`;
  return isEnglish ? `${hours} ${hourUnit}` : `${hours}h`;
}

export function getPriceUnitLabel(
  pricingUnit?: string | null,
  serviceType?: string | null,
  locale?: string | null,
): string {
  const isEnglish = locale === "en";
  const isSpanish = locale === "es";
  const isFrench = locale === "fr";
  if (serviceType === "CABIN_CHARTER") {
    if (isSpanish) return "por paquete";
    if (isFrench) return "par forfait";
    return isEnglish ? "per package" : "per pacchetto";
  }
  return pricingUnit === "PER_PACKAGE"
    ? isSpanish
      ? "por paquete"
      : isFrench
      ? "par forfait"
      : isEnglish
      ? "per package"
      : "per pacchetto"
    : isSpanish
      ? "por persona"
      : isFrench
        ? "par personne"
      : isEnglish
      ? "per person"
      : "a persona";
}
