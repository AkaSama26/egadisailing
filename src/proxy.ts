import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";
import {
  getExperiencePublicSlug,
  isExperienceServiceId,
  resolveExperienceServiceIdFromSlug,
} from "./data/catalog/experiences";
import {
  isLegacyServiceWorkerPath,
  SERVICE_WORKER_TOMBSTONE_SCRIPT,
  serviceWorkerHeaders,
} from "./lib/legacy-service-worker";

const intlMiddleware = createIntlMiddleware(routing);
const NEXT_INTL_LOCALE_HEADER = "X-NEXT-INTL-LOCALE";

type PublicLocale = (typeof routing.locales)[number];
type LegacyRedirectRule = { from: string; to: string };

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

const EXPERIENCE_PATH_SEGMENT_BY_LOCALE = {
  it: "esperienze",
  en: "experiences",
  es: "experiencias",
  fr: "experiences",
  de: "erlebnisse",
} as const satisfies Record<PublicLocale, string>;

const REMOVED_ISLAND_GUIDE_PATH_PATTERN =
  /^\/(?:it|en|es|fr|de)\/(?:isole|islands|islas|iles|inseln)\/(?:favignana|levanzo|marettimo)\/[^/]+(?:\/.*)?$/;

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

function withCustomAlternates(req: NextRequest, response: NextResponse) {
  return withExperienceAlternates(req, response);
}

function isRemovedIslandGuidePath(pathname: string) {
  return REMOVED_ISLAND_GUIDE_PATH_PATTERN.test(pathname.replace(/\/$/, ""));
}

function createGoneResponse() {
  return new NextResponse("Gone", {
    status: 410,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      "X-Robots-Tag": "noindex",
    },
  });
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
  return withCustomAlternates(req, response);
}

/**
 * Proxy unificato:
 *  1. `/admin/*` (eccetto `/admin/login`): richiede JWT NextAuth con
 *     `token.role === "ADMIN"`, altrimenti redirect a `/admin/login`.
 *     Defense-in-depth oltre al check in `(dashboard)/layout.tsx` (Round 10 Sec-C2).
 *  2. Public paths: delegate a `next-intl` per i18n routing.
 */
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/it";
    return NextResponse.redirect(url, 308);
  }

  if (isLegacyServiceWorkerPath(pathname)) {
    return createServiceWorkerTombstoneResponse();
  }

  if (pathname.startsWith("/wp-")) {
    return createGoneResponse();
  }

  // Mantiene validi i link del primo prototipo: il mockup non contiene dati
  // reali e viene ora servito dalla rotta pubblica fuori dal layout protetto.
  if (pathname === "/admin/mockup-finanza") {
    const url = req.nextUrl.clone();
    url.pathname = "/mockup-finanza";
    return NextResponse.redirect(url);
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

  // Mockup dimostrativo con soli dati statici: deve poter essere condiviso
  // senza login admin e senza redirect automatico al prefisso lingua.
  if (
    pathname === "/mockup-finanza" ||
    pathname === "/mockup-dettaglio-prenotazione"
  ) {
    return NextResponse.next();
  }

  if (isRemovedIslandGuidePath(pathname)) {
    return createGoneResponse();
  }

  const legacyPublicRedirect = getLegacyPublicRedirect(req);

  if (legacyPublicRedirect) {
    return legacyPublicRedirect;
  }

  // Next 16 + next-intl pathnames can re-enter middleware after rewriting a
  // localized pathname to the internal route, causing a self-redirect on some
  // public localized URLs. Canonical alias routes render these paths directly.
  const directLocalizedRouteLocale = getDirectLocalizedRouteLocale(pathname);
  if (directLocalizedRouteLocale) {
    return nextWithLocale(req, directLocalizedRouteLocale);
  }

  return withCustomAlternates(req, intlMiddleware(req));
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
