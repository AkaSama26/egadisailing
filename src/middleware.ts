import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";
import {
  isLegacyServiceWorkerPath,
  LEGACY_CACHE_RESET_COOKIE,
  LEGACY_CACHE_RESET_VERSION,
  SERVICE_WORKER_TOMBSTONE_SCRIPT,
  serviceWorkerHeaders,
} from "./lib/legacy-service-worker";

const intlMiddleware = createIntlMiddleware(routing);

const FAVIGNANA_GUIDE_SLUG_PAIRS = [
  { it: "cosa-vedere-top-10", en: "top-10-things-to-see" },
  { it: "dove-fare-il-bagno-spiagge-cale", en: "best-beaches-coves" },
  { it: "favignana-in-un-giorno", en: "favignana-in-one-day" },
  { it: "cala-rossa", en: "cala-rossa" },
  { it: "bue-marino-cave-tufo", en: "bue-marino-tuff-quarries" },
  { it: "snorkeling-favignana", en: "snorkeling-in-favignana" },
  {
    it: "come-arrivare-da-trapani-e-muoversi",
    en: "how-to-get-from-trapani-and-get-around",
  },
  { it: "tour-in-barca-favignana-levanzo", en: "favignana-levanzo-boat-tour" },
] as const;

const FAVIGNANA_GUIDE_SLUGS = new Set(
  FAVIGNANA_GUIDE_SLUG_PAIRS.flatMap((guide) => [guide.it, guide.en]),
);

const LEVANZO_GUIDE_SLUG_PAIRS = [
  { it: "cosa-vedere", en: "what-to-see" },
  { it: "spiagge-cale", en: "beaches-coves" },
  { it: "grotta-del-genovese", en: "grotta-del-genovese" },
  { it: "levanzo-in-un-giorno", en: "levanzo-in-one-day" },
  { it: "come-arrivare-da-trapani", en: "how-to-get-from-trapani" },
  { it: "snorkeling-cala-minnola-calcara", en: "snorkeling-cala-minnola-calcara" },
  { it: "tour-in-barca-da-trapani", en: "boat-tour-from-trapani" },
] as const;

const LEVANZO_GUIDE_SLUGS = new Set(
  LEVANZO_GUIDE_SLUG_PAIRS.flatMap((guide) => [guide.it, guide.en]),
);

const MARETTIMO_GUIDE_SLUG_PAIRS = [
  { it: "cosa-vedere", en: "what-to-see" },
  { it: "grotte-marine", en: "sea-caves" },
  { it: "spiagge-cale", en: "beaches-coves" },
  { it: "cala-bianca", en: "cala-bianca" },
  { it: "marettimo-in-un-giorno", en: "marettimo-in-one-day" },
  { it: "come-arrivare-da-trapani", en: "how-to-get-from-trapani" },
  { it: "trekking-sentieri", en: "hiking-trails" },
  { it: "tour-in-barca-charter-egadi", en: "boat-tour-egadi-charter" },
] as const;

const MARETTIMO_GUIDE_SLUGS = new Set(
  MARETTIMO_GUIDE_SLUG_PAIRS.flatMap((guide) => [guide.it, guide.en]),
);

function getLevanzoGuideSlugPair(slug: string) {
  return LEVANZO_GUIDE_SLUG_PAIRS.find((guide) => guide.it === slug || guide.en === slug) ?? null;
}

function getFavignanaGuideSlugPair(slug: string) {
  return (
    FAVIGNANA_GUIDE_SLUG_PAIRS.find((guide) => guide.it === slug || guide.en === slug) ?? null
  );
}

function getMarettimoGuideSlugPair(slug: string) {
  return (
    MARETTIMO_GUIDE_SLUG_PAIRS.find((guide) => guide.it === slug || guide.en === slug) ?? null
  );
}

function getIslandGuideSlug(
  pathname: string,
  island: "favignana" | "levanzo" | "marettimo",
  slugs: Set<string>,
) {
  const match = pathname.match(new RegExp(`^/(?:it|en)/islands/${island}/([^/]+)/?$`));
  const slug = match?.[1];
  return slug && slugs.has(slug) ? slug : null;
}

function withIslandGuideAlternates(req: NextRequest, response: NextResponse) {
  const favignanaGuideSlug = getIslandGuideSlug(
    req.nextUrl.pathname,
    "favignana",
    FAVIGNANA_GUIDE_SLUGS,
  );

  if (favignanaGuideSlug) {
    const favignanaGuidePair = getFavignanaGuideSlugPair(favignanaGuideSlug);

    if (!favignanaGuidePair) {
      return response;
    }

    const italianUrl = `${req.nextUrl.origin}/it/islands/favignana/${favignanaGuidePair.it}`;
    const englishUrl = `${req.nextUrl.origin}/en/islands/favignana/${favignanaGuidePair.en}`;
    response.headers.set(
      "link",
      `<${italianUrl}>; rel="alternate"; hreflang="it", <${englishUrl}>; rel="alternate"; hreflang="en", <${italianUrl}>; rel="alternate"; hreflang="x-default"`,
    );

    return response;
  }

  const levanzoGuideSlug = getIslandGuideSlug(
    req.nextUrl.pathname,
    "levanzo",
    LEVANZO_GUIDE_SLUGS,
  );

  if (levanzoGuideSlug) {
    const levanzoGuidePair = getLevanzoGuideSlugPair(levanzoGuideSlug);

    if (!levanzoGuidePair) {
      return response;
    }

    const italianUrl = `${req.nextUrl.origin}/it/islands/levanzo/${levanzoGuidePair.it}`;
    const englishUrl = `${req.nextUrl.origin}/en/islands/levanzo/${levanzoGuidePair.en}`;
    response.headers.set(
      "link",
      `<${italianUrl}>; rel="alternate"; hreflang="it", <${englishUrl}>; rel="alternate"; hreflang="en", <${italianUrl}>; rel="alternate"; hreflang="x-default"`,
    );
  }

  const marettimoGuideSlug = getIslandGuideSlug(
    req.nextUrl.pathname,
    "marettimo",
    MARETTIMO_GUIDE_SLUGS,
  );

  if (marettimoGuideSlug) {
    const marettimoGuidePair = getMarettimoGuideSlugPair(marettimoGuideSlug);

    if (!marettimoGuidePair) {
      return response;
    }

    const italianUrl = `${req.nextUrl.origin}/it/islands/marettimo/${marettimoGuidePair.it}`;
    const englishUrl = `${req.nextUrl.origin}/en/islands/marettimo/${marettimoGuidePair.en}`;
    response.headers.set(
      "link",
      `<${italianUrl}>; rel="alternate"; hreflang="it", <${englishUrl}>; rel="alternate"; hreflang="en", <${italianUrl}>; rel="alternate"; hreflang="x-default"`,
    );
  }

  return response;
}

function getFavignanaEnglishGuideRedirect(req: NextRequest) {
  const match = req.nextUrl.pathname.match(/^\/en\/islands\/favignana\/([^/]+)\/?$/);
  const slug = match?.[1];

  if (!slug) {
    return null;
  }

  const favignanaGuidePair = getFavignanaGuideSlugPair(slug);

  if (!favignanaGuidePair || favignanaGuidePair.en === slug) {
    return null;
  }

  const url = req.nextUrl.clone();
  url.pathname = `/en/islands/favignana/${favignanaGuidePair.en}`;
  return NextResponse.redirect(url, 308);
}

function getLevanzoEnglishGuideRedirect(req: NextRequest) {
  const match = req.nextUrl.pathname.match(/^\/en\/islands\/levanzo\/([^/]+)\/?$/);
  const slug = match?.[1];

  if (!slug) {
    return null;
  }

  const levanzoGuidePair = getLevanzoGuideSlugPair(slug);

  if (!levanzoGuidePair || levanzoGuidePair.en === slug) {
    return null;
  }

  const url = req.nextUrl.clone();
  url.pathname = `/en/islands/levanzo/${levanzoGuidePair.en}`;
  return NextResponse.redirect(url, 308);
}

function getMarettimoEnglishGuideRedirect(req: NextRequest) {
  const match = req.nextUrl.pathname.match(/^\/en\/islands\/marettimo\/([^/]+)\/?$/);
  const slug = match?.[1];

  if (!slug) {
    return null;
  }

  const marettimoGuidePair = getMarettimoGuideSlugPair(slug);

  if (!marettimoGuidePair || marettimoGuidePair.en === slug) {
    return null;
  }

  const url = req.nextUrl.clone();
  url.pathname = `/en/islands/marettimo/${marettimoGuidePair.en}`;
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

  const favignanaEnglishGuideRedirect = getFavignanaEnglishGuideRedirect(req);

  if (favignanaEnglishGuideRedirect) {
    return favignanaEnglishGuideRedirect;
  }

  const levanzoEnglishGuideRedirect = getLevanzoEnglishGuideRedirect(req);

  if (levanzoEnglishGuideRedirect) {
    return levanzoEnglishGuideRedirect;
  }

  const marettimoEnglishGuideRedirect = getMarettimoEnglishGuideRedirect(req);

  if (marettimoEnglishGuideRedirect) {
    return marettimoEnglishGuideRedirect;
  }

  return withLegacyCacheReset(req, withIslandGuideAlternates(req, intlMiddleware(req)));
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
