import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Middleware unificato:
 *  1. `/admin/*` (eccetto `/admin/login`): richiede JWT NextAuth con
 *     `token.role === "ADMIN"`, altrimenti redirect a `/admin/login`.
 *     Defense-in-depth oltre al check in `(dashboard)/layout.tsx` (Round 10 Sec-C2).
 *  2. Public paths: delegate a `next-intl` per i18n routing.
 */
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
    });
    if (!token || token.role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // R22-A3-MEDIA-2: `/admin/:path*` NON matcha `/admin` bare (solo
    // `/admin/X`). Senza `/admin` esplicito, una request a `/admin` bypassa
    // il middleware guard — il layout RSC ne gestisce il check, ma
    // defense-in-depth vuole il middleware su ogni path admin.
    "/admin",
    "/admin/:path*",
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
