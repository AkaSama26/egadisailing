import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";
import { favignanaGuideSlugPairs } from "./data/favignana-guides";
import { levanzoGuideSlugPairs } from "./data/levanzo-guides";
import { marettimoGuideSlugPairs } from "./data/marettimo-guides";
import {
  getExperiencePublicSlug,
  isExperienceServiceId,
  resolveExperienceServiceIdFromSlug,
} from "./data/catalog/experiences";
import {
  isLegacyServiceWorkerPath,
  LEGACY_CACHE_RESET_COOKIE,
  LEGACY_CACHE_RESET_VERSION,
  SERVICE_WORKER_TOMBSTONE_SCRIPT,
  serviceWorkerHeaders,
} from "./lib/legacy-service-worker";

const intlMiddleware = createIntlMiddleware(routing);
const NEXT_INTL_LOCALE_HEADER = "X-NEXT-INTL-LOCALE";

type PublicLocale = (typeof routing.locales)[number];
type GuideIsland = "favignana" | "levanzo" | "marettimo";
type GuidePair = { it: string; en: string; es: string; fr: string; de: string };
type LegacyRedirectRule = { from: string; to: string };

const GUIDE_SLUG_PAIRS = {
  favignana: favignanaGuideSlugPairs,
  levanzo: levanzoGuideSlugPairs,
  marettimo: marettimoGuideSlugPairs,
} as const satisfies Record<GuideIsland, readonly GuidePair[]>;

const LEGACY_PUBLIC_REDIRECTS = [
  { from: "/en/prenota/success", to: "/en/book/confirmation" },
  { from: "/en/prenota", to: "/en/book" },
  { from: "/en/recupera-prenotazione", to: "/en/find-booking" },
  { from: "/en/contacts", to: "/en/contact" },
  { from: "/it/about", to: "/it/chi-siamo" },
  { from: "/it/boats", to: "/it/barche" },
  { from: "/it/experiences", to: "/it/esperienze" },
  { from: "/it/islands", to: "/it/isole" },
  { from: "/it/contacts", to: "/it/contatti" },
] as const satisfies readonly LegacyRedirectRule[];

const ISLAND_PATH_SEGMENT_BY_LOCALE = {
  it: "isole",
  en: "islands",
  es: "islas",
  fr: "iles",
  de: "inseln",
} as const satisfies Record<PublicLocale, string>;

const EXPERIENCE_PATH_SEGMENT_BY_LOCALE = {
  it: "esperienze",
  en: "experiences",
  es: "experiencias",
  fr: "experiences",
  de: "erlebnisse",
} as const satisfies Record<PublicLocale, string>;

function getLegacyPublicRedirect(req: NextRequest) {
  const pathname = req.nextUrl.pathname.replace(/\/$/, "");

  for (const rule of LEGACY_PUBLIC_REDIRECTS) {
    if (pathname !== rule.from && !pathname.startsWith(`${rule.from}/`)) {
      continue;
    }

    const suffix = pathname.slice(rule.from.length);
    const url = req.nextUrl.clone();
    url.pathname = `${rule.to}${suffix}`;
    return NextResponse.redirect(url, 308);
  }

  return null;
}

function findGuideSlugPair(island: GuideIsland, slug: string) {
  return (
    GUIDE_SLUG_PAIRS[island].find(
      (guide) => guide.it === slug || guide.en === slug || guide.es === slug || guide.fr === slug || guide.de === slug,
    ) ?? null
  );
}

function parseIslandGuidePath(pathname: string) {
  const match = pathname.match(
    /^\/(it|en|es|fr|de)\/(?:isole|islands|islas|iles|inseln)\/(favignana|levanzo|marettimo)\/([^/]+)\/?$/,
  );
  if (!match) return null;
  const locale = match[1] as PublicLocale;
  return {
    locale,
    island: match[2] as GuideIsland,
    slug: match[3],
    usesCanonicalSegment: pathname.startsWith(
      `/${locale}/${ISLAND_PATH_SEGMENT_BY_LOCALE[locale]}/`,
    ),
  };
}

function externalGuidePath(locale: PublicLocale, island: GuideIsland, slug: string) {
  const base = ISLAND_PATH_SEGMENT_BY_LOCALE[locale];
  return `/${locale}/${base}/${island}/${slug}`;
}

function requestPublicOrigin(req: NextRequest) {
  const forwardedHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const forwardedProto =
    req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "") ?? "https";
  const host = forwardedHost.split(",")[0]?.trim() || req.nextUrl.host;
  const proto = forwardedProto.split(",")[0]?.trim() || "https";

  return `${proto}://${host}`;
}

function parseExperiencePath(pathname: string) {
  const match = pathname.match(
    /^\/(it|en|es|fr|de)\/(?:esperienze|experiences|experiencias|erlebnisse)\/([^/]+)\/?$/,
  );
  if (!match) return null;

  return {
    locale: match[1] as PublicLocale,
    slug: match[2],
  };
}

function externalExperiencePath(locale: PublicLocale, serviceId: string) {
  return `/${locale}/${EXPERIENCE_PATH_SEGMENT_BY_LOCALE[locale]}/${getExperiencePublicSlug(
    serviceId,
    locale,
  )}`;
}

function withExperienceAlternates(req: NextRequest, response: NextResponse) {
  const parsed = parseExperiencePath(req.nextUrl.pathname);
  if (!parsed) return response;

  const serviceId = resolveExperienceServiceIdFromSlug(parsed.slug);
  if (!isExperienceServiceId(serviceId)) return response;

  const origin = requestPublicOrigin(req);
  const italianUrl = `${origin}${externalExperiencePath("it", serviceId)}`;
  const englishUrl = `${origin}${externalExperiencePath("en", serviceId)}`;
  const spanishUrl = `${origin}${externalExperiencePath("es", serviceId)}`;
  const frenchUrl = `${origin}${externalExperiencePath("fr", serviceId)}`;
  const germanUrl = `${origin}${externalExperiencePath("de", serviceId)}`;
  response.headers.set(
    "link",
    `<${italianUrl}>; rel="alternate"; hreflang="it", <${englishUrl}>; rel="alternate"; hreflang="en", <${spanishUrl}>; rel="alternate"; hreflang="es", <${frenchUrl}>; rel="alternate"; hreflang="fr", <${germanUrl}>; rel="alternate"; hreflang="de", <${italianUrl}>; rel="alternate"; hreflang="x-default"`,
  );

  return response;
}

function withIslandGuideAlternates(req: NextRequest, response: NextResponse) {
  const parsed = parseIslandGuidePath(req.nextUrl.pathname);
  if (!parsed) return response;

  const guidePair = findGuideSlugPair(parsed.island, parsed.slug);
  if (!guidePair) return response;

  const origin = requestPublicOrigin(req);
  const italianUrl = `${origin}${externalGuidePath("it", parsed.island, guidePair.it)}`;
  const englishUrl = `${origin}${externalGuidePath("en", parsed.island, guidePair.en)}`;
  const spanishUrl = `${origin}${externalGuidePath("es", parsed.island, guidePair.es)}`;
  const frenchUrl = `${origin}${externalGuidePath("fr", parsed.island, guidePair.fr)}`;
  const germanUrl = `${origin}${externalGuidePath("de", parsed.island, guidePair.de)}`;
  response.headers.set(
    "link",
    `<${italianUrl}>; rel="alternate"; hreflang="it", <${englishUrl}>; rel="alternate"; hreflang="en", <${spanishUrl}>; rel="alternate"; hreflang="es", <${frenchUrl}>; rel="alternate"; hreflang="fr", <${germanUrl}>; rel="alternate"; hreflang="de", <${italianUrl}>; rel="alternate"; hreflang="x-default"`,
  );

  return response;
}

function withCustomAlternates(req: NextRequest, response: NextResponse) {
  return withExperienceAlternates(req, withIslandGuideAlternates(req, response));
}

function getIslandGuideRedirect(req: NextRequest) {
  const parsed = parseIslandGuidePath(req.nextUrl.pathname);
  if (!parsed) return null;

  const guidePair = findGuideSlugPair(parsed.island, parsed.slug);
  if (!guidePair) return null;

  const canonicalSlug = guidePair[parsed.locale];
  if (parsed.usesCanonicalSegment && canonicalSlug === parsed.slug) return null;

  const url = req.nextUrl.clone();
  url.pathname = externalGuidePath(parsed.locale, parsed.island, canonicalSlug);
  return NextResponse.redirect(url, 308);
}

function createServiceWorkerTombstoneResponse() {
  return new NextResponse(SERVICE_WORKER_TOMBSTONE_SCRIPT, {
    status: 200,
    headers: {
      ...serviceWorkerHeaders,
      "Clear-Site-Data": '"cache", "storage"',
    },
  });
}

function withLegacyCacheReset(req: NextRequest, response: NextResponse) {
  if (req.cookies.get(LEGACY_CACHE_RESET_COOKIE)?.value === LEGACY_CACHE_RESET_VERSION) {
    return response;
  }

  if (!response.headers.has("location")) {
    response.cookies.set(LEGACY_CACHE_RESET_COOKIE, LEGACY_CACHE_RESET_VERSION, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

function getDirectLocalizedRouteLocale(pathname: string): PublicLocale | null {
  if (/^\/it\/esperienze(?:\/.*)?\/?$/.test(pathname)) return "it";
  if (/^\/de\/(?:ueber-uns|boote(?:\/.*)?|erlebnisse(?:\/.*)?|inseln(?:\/.*)?|kontakt|buchen(?:\/.*)?|haeufige-fragen|datenschutz|agb|cookie-richtlinie|buchung-finden|b\/buchung)\/?$/.test(
    pathname,
  )) return "de";
  return null;
}

function nextWithLocale(req: NextRequest, locale: PublicLocale) {
  const headers = new Headers(req.headers);
  headers.set(NEXT_INTL_LOCALE_HEADER, locale);
  const response = NextResponse.next({
    request: { headers },
  });
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return withLegacyCacheReset(req, withCustomAlternates(req, response));
}

/**
 * Middleware unificato:
 *  1. `/admin/*` (eccetto `/admin/login`): richiede JWT NextAuth con
 *     `token.role === "ADMIN"`, altrimenti redirect a `/admin/login`.
 *     Defense-in-depth oltre al check in `(dashboard)/layout.tsx` (Round 10 Sec-C2).
 *  2. Public paths: delegate a `next-intl` per i18n routing.
 */
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isLegacyServiceWorkerPath(pathname)) {
    return createServiceWorkerTombstoneResponse();
  }

  if (pathname.startsWith("/wp-")) {
    return new NextResponse(null, {
      status: 410,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
  }

  // R26-P3 dev-test found: tutto `/admin*` bypassa il next-intl middleware.
  // Senza questo, `/admin/login` cadeva su intlMiddleware → redirect a
  // `/it/admin/login` (locale prepend) → 404. Admin dashboard + login sono
  // sempre in italiano, no i18n routing.
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      // Login page pubblica — no auth check, ma comunque fuori da i18n.
      return NextResponse.next();
    }
    const token = await getToken({
      req,
      // Round 11 B3: fallback a AUTH_SECRET (preferred v5) per migrazione
      // futura senza rompere middleware silenziosamente.
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
      // Auth.js v5 usa `__Secure-authjs.session-token` quando gira dietro
      // HTTPS in production. Senza questo flag `getToken()` cerca il cookie
      // non-secure e il middleware rimanda a /admin/login dopo un login valido.
      secureCookie: process.env.NODE_ENV === "production",
    });
    if (!token || token.role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const legacyPublicRedirect = getLegacyPublicRedirect(req);

  if (legacyPublicRedirect) {
    return legacyPublicRedirect;
  }

  const islandGuideRedirect = getIslandGuideRedirect(req);

  if (islandGuideRedirect) {
    return islandGuideRedirect;
  }

  // Next 16 + next-intl pathnames can re-enter middleware after rewriting a
  // localized pathname to the internal route, causing a self-redirect on some
  // public localized URLs. Canonical alias routes render these paths directly.
  const directLocalizedRouteLocale = getDirectLocalizedRouteLocale(pathname);
  if (directLocalizedRouteLocale) {
    return nextWithLocale(req, directLocalizedRouteLocale);
  }

  return withLegacyCacheReset(req, withCustomAlternates(req, intlMiddleware(req)));
}

export const config = {
  matcher: [
    "/sw.js",
    "/service-worker.js",
    "/pwa-sw.js",
    "/superpwa-sw.js",
    "/wp-pwa-sw.js",
    "/pwa-sw.php",
    "/superpwa-sw.php",
    "/wp-pwa-sw.php",
    "/wordpress-pwa-sw.php",
    "/wordpress-pwa-sw.js",
    "/OneSignalSDKWorker.js",
    "/OneSignalSDKUpdaterWorker.js",
    "/firebase-messaging-sw.js",
    "/ngsw-worker.js",
    "/workbox-sw.js",
    "/sw-precache.js",
    "/wp-content/:path*",
    "/wp-includes/:path*",
    "/wp-admin/:path*",
    // R22-A3-MEDIA-2: `/admin/:path*` NON matcha `/admin` bare (solo
    // `/admin/X`). Senza `/admin` esplicito, una request a `/admin` bypassa
    // il middleware guard — il layout RSC ne gestisce il check, ma
    // defense-in-depth vuole il middleware su ogni path admin.
    "/admin",
    "/admin/:path*",
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
