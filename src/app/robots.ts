import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { routing } from "@/i18n/routing";
import { localizedPath } from "@/lib/i18n/paths";
import { localizedStaticPath } from "@/lib/i18n/static-paths";

/**
 * robots.txt dinamico.
 *
 * Strategia:
 * - lascia indicizzabili le pagine marketing/SEO pubbliche;
 * - blocca dashboard, API e aree transazionali/customer a tutti i crawler;
 * - permette i fetcher AI/search che portano citazioni e traffico verso il sito;
 * - blocca i crawler usati principalmente per training/model development.
 *
 * Round 11 SEO-A1.
 */
const localizedPrivateDisallow = routing.locales.flatMap((locale) => [
  localizedStaticPath(locale, "/b/sessione"),
  `${localizedStaticPath(locale, "/b/sessione")}/`,
  localizedPath(locale, "/ticket/:code").replace(":code", ""),
  `${localizedStaticPath(locale, "/prenota")}/`,
  localizedPath(locale, "/prenota/success/:code").replace(":code", ""),
  localizedStaticPath(locale, "/recupera-prenotazione"),
  `${localizedStaticPath(locale, "/recupera-prenotazione")}/`,
]);

const protectedDisallow = [
  "/admin",
  "/admin/",
  "/api",
  "/api/",
  ...localizedPrivateDisallow,
];

const publicAiSearchAndUserFetchers = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-NotebookLM",
];

const aiTrainingAndDataMiningBots = [
  "GPTBot",
  "Google-Extended",
  "ClaudeBot",
  "anthropic-ai",
  "Anthropic-AI",
  "Claude-Web",
  "Applebot-Extended",
  "CCBot",
  "FacebookBot",
  "meta-externalagent",
  "Meta-ExternalAgent",
  "Bytespider",
  "Amazonbot",
  "cohere-ai",
  "Diffbot",
  "AI2Bot",
  "Ai2Bot-Dolma",
  "omgili",
  "omgilibot",
];

type RobotsRule = {
  userAgent: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
  crawlDelay?: number;
};

function publicContentRule(userAgent: string | string[]): RobotsRule {
  return {
    userAgent,
    allow: "/",
    disallow: protectedDisallow,
  };
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.APP_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: aiTrainingAndDataMiningBots,
        disallow: "/",
      },
      publicContentRule(publicAiSearchAndUserFetchers),
      publicContentRule("*"),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
