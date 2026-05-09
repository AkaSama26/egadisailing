"use client";

import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";
import { liquidGlassButton } from "@/lib/ui/liquid-glass";
import { CountryFlag, type FlagCode } from "@/components/country-flag";

const localeLabels: Record<string, string> = {
  it: "IT",
  en: "EN",
  de: "DE",
  fr: "FR",
  es: "ES",
  nl: "NL",
  pl: "PL",
  sv: "SV",
  pt: "PT",
  ru: "RU",
  zh: "ZH",
  ja: "JA",
  hu: "HU",
  hr: "HR",
  tr: "TR",
  ar: "AR",
  el: "EL",
  mt: "MT",
  cs: "CS",
  da: "DA",
  no: "NO",
  fi: "FI",
  ro: "RO",
  bg: "BG",
  sr: "SR",
};

const localeFlagCodes: Record<string, FlagCode> = {
  it: "IT",
  en: "GB",
  es: "ES",
  fr: "FR",
  de: "DE",
};

const localizedSegments: Record<string, Record<string, string>> = {
  about: { it: "about", en: "about", es: "sobre-nosotros", fr: "a-propos", de: "ueber-uns" },
  boats: { it: "boats", en: "boats", es: "barcos", fr: "bateaux", de: "boote" },
  contacts: { it: "contacts", en: "contacts", es: "contacto", fr: "contact", de: "kontakt" },
  "cookie-policy": {
    it: "cookie-policy",
    en: "cookie-policy",
    es: "politica-de-cookies",
    fr: "politique-de-cookies",
    de: "cookie-richtlinie",
  },
  experiences: { it: "experiences", en: "experiences", es: "experiencias", fr: "experiences", de: "erlebnisse" },
  faq: { it: "faq", en: "faq", es: "preguntas-frecuentes", fr: "questions-frequentes", de: "haeufige-fragen" },
  islands: { it: "islands", en: "islands", es: "islas", fr: "iles", de: "inseln" },
  prenota: { it: "prenota", en: "prenota", es: "reservar", fr: "reserver", de: "buchen" },
  privacy: { it: "privacy", en: "privacy", es: "privacidad", fr: "confidentialite", de: "datenschutz" },
  "recupera-prenotazione": {
    it: "recupera-prenotazione",
    en: "recupera-prenotazione",
    es: "recuperar-reserva",
    fr: "retrouver-reservation",
    de: "buchung-finden",
  },
  terms: { it: "terms", en: "terms", es: "terminos-y-condiciones", fr: "conditions-generales", de: "agb" },
  ticket: { it: "ticket", en: "ticket", es: "billete", fr: "billet", de: "ticket" },
};

const segmentAliases = new Map(
  Object.entries(localizedSegments).flatMap(([internal, byLocale]) =>
    Object.values(byLocale).map((segment) => [segment, internal] as const),
  ),
);

const experienceSlugsByService: Record<string, Record<string, string>> = {
  "exclusive-experience": {
    it: "exclusive-experience",
    en: "exclusive-experience",
    es: "chef-a-bordo-neel-47",
    fr: "chef-a-bord-neel-47",
    de: "chef-an-bord-neel-47",
  },
  "cabin-charter": { it: "charter", en: "charter", es: "charter-islas-egadi", fr: "charter-iles-egades", de: "charter-aegadische-inseln" },
  "boat-shared-full-day": {
    it: "boat-shared-full-day",
    en: "boat-shared-full-day",
    es: "excursion-compartida-islas-egadi-8-horas",
    fr: "excursion-partagee-iles-egades-8-heures",
    de: "geteilte-bootstour-aegadische-inseln-8-stunden",
  },
  "boat-exclusive-full-day": {
    it: "boat-exclusive-full-day",
    en: "boat-exclusive-full-day",
    es: "excursion-privada-islas-egadi-8-horas",
    fr: "excursion-privee-iles-egades-8-heures",
    de: "private-bootstour-aegadische-inseln-8-stunden",
  },
  "boat-exclusive-morning": {
    it: "boat-exclusive-morning",
    en: "boat-exclusive-morning",
    es: "excursion-privada-islas-egadi-4-horas-manana",
    fr: "excursion-privee-iles-egades-4-heures-matin",
    de: "private-bootstour-aegadische-inseln-4-stunden-vormittag",
  },
  "boat-exclusive-afternoon": {
    it: "boat-exclusive-afternoon",
    en: "boat-exclusive-afternoon",
    es: "excursion-privada-islas-egadi-4-horas-tarde",
    fr: "excursion-privee-iles-egades-4-heures-apres-midi",
    de: "private-bootstour-aegadische-inseln-4-stunden-nachmittag",
  },
};

const experienceSlugAliases = new Map(
  Object.entries(experienceSlugsByService).flatMap(([serviceId, byLocale]) => [
    [serviceId, serviceId] as const,
    ...Object.values(byLocale).map((slug) => [slug, serviceId] as const),
  ]),
);

function switchPathLocale(pathname: string, newLocale: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return `/${newLocale}`;
  segments.shift();

  if (segments[0]) {
    const internal = segmentAliases.get(segments[0]);
    if (internal) {
      segments[0] = localizedSegments[internal]?.[newLocale] ?? internal;
    }
  }

  if (segments[0] === localizedSegments.experiences[newLocale] && segments[1]) {
    const serviceId = experienceSlugAliases.get(segments[1]);
    if (serviceId) {
      segments[1] = experienceSlugsByService[serviceId]?.[newLocale] ?? serviceId;
    }
  }

  if (
    segments[0] === localizedSegments.prenota[newLocale] &&
    segments[1] === "success" &&
    (newLocale === "es" || newLocale === "fr" || newLocale === "de")
  ) {
    segments[1] = newLocale === "es" ? "confirmacion" : newLocale === "de" ? "bestaetigung" : "confirmation";
  } else if (
    segments[0] === localizedSegments.prenota[newLocale] &&
    (segments[1] === "confirmacion" || segments[1] === "confirmation" || segments[1] === "bestaetigung") &&
    newLocale !== "es" &&
    newLocale !== "fr" &&
    newLocale !== "de"
  ) {
    segments[1] = "success";
  }

  return `/${[newLocale, ...segments].join("/")}`;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function switchLocale(newLocale: string) {
    router.push(switchPathLocale(pathname, newLocale));
    setOpen(false);
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium text-inherit",
          liquidGlassButton,
        )}
        aria-label="Select language"
      >
        <CountryFlag code={localeFlagCodes[locale] ?? "IT"} />
        {localeLabels[locale] ?? locale.toUpperCase()}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-64 w-40 overflow-y-auto rounded-md border bg-white py-1 shadow-lg">
          {routing.locales.map((loc) => (
            <button
              key={loc}
              onClick={() => switchLocale(loc)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100",
                loc === locale && "bg-gray-100 font-semibold text-gray-900"
              )}
            >
              <CountryFlag code={localeFlagCodes[loc] ?? "IT"} />
              {localeLabels[loc] ?? loc.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
