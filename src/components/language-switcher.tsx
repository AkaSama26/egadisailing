"use client";

import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";

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
        className="flex items-center gap-1 rounded-md border border-white/30 px-2 py-1 text-sm font-medium transition-colors hover:bg-white/10"
        aria-label="Select language"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
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
        <div className="absolute right-0 top-full z-50 mt-1 max-h-64 w-32 overflow-y-auto rounded-md border bg-white py-1 shadow-lg">
          {routing.locales.map((loc) => (
            <button
              key={loc}
              onClick={() => switchLocale(loc)}
              className={cn(
                "block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100",
                loc === locale && "bg-gray-100 font-semibold text-gray-900"
              )}
            >
              {localeLabels[loc] ?? loc.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
