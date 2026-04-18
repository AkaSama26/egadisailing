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

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
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
    "/admin/:path*",
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
