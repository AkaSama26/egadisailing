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

  return withLegacyCacheReset(req, intlMiddleware(req));
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
