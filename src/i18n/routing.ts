import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: [
    "it", "en", "de", "fr", "es", "nl", "pl", "sv", "pt", "ru",
    "zh", "ja", "hu", "hr", "tr", "ar", "el", "mt", "cs", "da",
    "no", "fi", "ro", "bg", "sr",
  ],
  defaultLocale: "it",
});

export type Locale = (typeof routing.locales)[number];
