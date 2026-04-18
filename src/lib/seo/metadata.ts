import type { Metadata } from "next";
import { env } from "@/lib/env";
import { routing } from "@/i18n/routing";

const SITE_NAME = "Egadisailing";

export interface PageSeoOptions {
  /** Titolo specifico della pagina. Usato in `<title>` e og:title. */
  title: string;
  /** Description per search engine + og:description. 140-160 char ideali. */
  description: string;
  /** Path relativo senza locale (es. "/boats", "/experiences/social-boating"). */
  path: string;
  /** Locale corrente (es. "it", "en"). */
  locale: string;
  /** Immagine OpenGraph (1200x630 preferito). Path relativo a `env.APP_URL`. */
  image?: string;
  /** `type` OpenGraph; default "website". "article" per post blog. */
  ogType?: "website" | "article";
  /** Robots override. Default index+follow. */
  noIndex?: boolean;
}

/**
 * Genera Metadata con Open Graph, Twitter Card, canonical + hreflang per
 * ogni locale supportato. Senza questo helper, ogni `generateMetadata` deve
 * duplicare ~20 righe di boilerplate (Round 11 SEO-C2).
 */
export function buildPageMetadata(opts: PageSeoOptions): Metadata {
  const base = env.APP_URL.replace(/\/$/, "");
  const path = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
  const canonicalUrl = `${base}/${opts.locale}${path === "/" ? "" : path}`;
  const image = opts.image ?? "/og-default.jpg";
  const imageUrl = image.startsWith("http") ? image : `${base}${image}`;

  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = `${base}/${loc}${path === "/" ? "" : path}`;
  }
  // `x-default`: pagina di fallback. Serviamo l'it canonica.
  languages["x-default"] = `${base}/${routing.defaultLocale}${path === "/" ? "" : path}`;

  return {
    title: opts.title,
    description: opts.description,
    robots: opts.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: opts.locale,
      type: opts.ogType ?? "website",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: opts.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [imageUrl],
    },
  };
}
