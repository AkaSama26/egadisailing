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
  media: Array<{ caption: string; color: string }>;
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

export function getServiceDurationLabel(service: ServiceDisplayInput): string {
  if (service.type === "CABIN_CHARTER") return "3-7 giornate";
  if (service.durationType === "MULTI_DAY") {
    const days = Math.max(1, Math.ceil(service.durationHours / 24));
    return `${days} giorni`;
  }
  if (service.durationType === "FULL_DAY") return `${service.durationHours} ore`;
  if (service.durationType === "HALF_DAY_MORNING") return `${service.durationHours} ore`;
  if (service.durationType === "HALF_DAY_AFTERNOON") return `${service.durationHours} ore`;
  if (service.durationType === "WEEK") return "7 giorni";
  return `${service.durationHours}h`;
}

export function getPriceUnitLabel(pricingUnit?: string | null, serviceType?: string | null): string {
  if (serviceType === "CABIN_CHARTER") return "per pacchetto";
  return pricingUnit === "PER_PACKAGE" ? "per pacchetto" : "a persona";
}
