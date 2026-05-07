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
};

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
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
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
