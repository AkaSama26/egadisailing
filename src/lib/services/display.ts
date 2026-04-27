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

const EXPERIENCE_VISUALS: Record<string, ExperienceVisual> = {
  EXCLUSIVE_EXPERIENCE: {
    title: "Exclusive Experience",
    subtitle:
      "Il trimarano tutto per te. Chef rinomato, menù raffinato, rotta personalizzata. Un'esperienza senza compromessi per chi cerca il meglio.",
    media: [
      { caption: "Tavola luxury", color: "#FFB6C1" },
      { caption: "Tuffo privato", color: "#FFDAB9" },
      { caption: "Tramonto a bordo", color: "#DDA0DD" },
      { caption: "Solo per voi", color: "#E1BEE7" },
    ],
  },
  CABIN_CHARTER: {
    title: "Esperienza Charter",
    subtitle:
      "La tua casa e' il mare. Scegli il pacchetto da 3 a 7 giorni e naviga tra Favignana, Levanzo e Marettimo con il trimarano tutto per te.",
    media: [
      { caption: "La tua cabina", color: "#ADD8E6" },
      { caption: "Alba su Marettimo", color: "#B2DFDB" },
      { caption: "Colazione in coperta", color: "#C5CAE9" },
      { caption: "Una settimana", color: "#BBDEFB" },
    ],
  },
  BOAT_SHARED: {
    title: "Barca condivisa",
    subtitle:
      "Biglietti singoli sulla barca da 12 posti, con scelta tra giornata intera, mattina o pomeriggio.",
    media: [
      { caption: "Full day", color: "#A7F3D0" },
      { caption: "Mattina", color: "#BFDBFE" },
      { caption: "Pomeriggio", color: "#FDE68A" },
      { caption: "12 posti", color: "#DDD6FE" },
    ],
  },
  BOAT_EXCLUSIVE: {
    title: "Barca in esclusiva",
    subtitle:
      "La barca riservata al tuo gruppo, venduta a pacchetto e disponibile per giornata intera, mattina o pomeriggio.",
    media: [
      { caption: "Uso esclusivo", color: "#FECACA" },
      { caption: "Rotta privata", color: "#BAE6FD" },
      { caption: "Mezza giornata", color: "#FED7AA" },
      { caption: "Fino a 12", color: "#C7D2FE" },
    ],
  },
};

export function getExperienceDisplay(service: ServiceDisplayInput): ExperienceVisual {
  return (
    EXPERIENCE_VISUALS[service.type] ?? {
      title: service.name,
      subtitle: "",
      media: EXPERIENCE_VISUALS.EXCLUSIVE_EXPERIENCE.media,
    }
  );
}

export function getExperienceTitle(service: ServiceDisplayInput): string {
  return getExperienceDisplay(service).title;
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
  if (serviceType === "CABIN_CHARTER") return "per giornata";
  return pricingUnit === "PER_PACKAGE" ? "per pacchetto" : "a persona";
}
