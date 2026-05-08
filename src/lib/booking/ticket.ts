import { env } from "@/lib/env";
import { localizedPath } from "@/lib/i18n/paths";
import { normalizeConfirmationCode } from "./helpers";

export function buildTicketUrl(
  confirmationCode: string,
  locale = env.APP_LOCALES_DEFAULT,
): string {
  const baseUrl = env.APP_URL.replace(/\/$/, "");
  const code = normalizeConfirmationCode(confirmationCode);
  return `${baseUrl}${localizedPath(locale, `/ticket/${encodeURIComponent(code)}`)}`;
}

export function ticketSlotLabel(durationType: string, locale?: string | null): string {
  switch (durationType) {
    case "FULL_DAY":
      return "10:00-18:00";
    case "HALF_DAY_MORNING":
      return "09:00-13:00";
    case "HALF_DAY_AFTERNOON":
      return "14:00-18:00";
    default:
      return locale === "es"
        ? "Hora confirmada por el equipo"
        : locale === "fr"
          ? "Horaire confirmé par l'équipe"
        : locale === "en"
          ? "Time confirmed by the staff"
          : "Orario comunicato dallo staff";
  }
}
