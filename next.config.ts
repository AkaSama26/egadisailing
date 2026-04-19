import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * `serverActions.allowedOrigins` e' obbligatorio dietro reverse proxy (Caddy/
 * Nginx) in prod: Next.js 16 rifiuta Server Actions se `X-Forwarded-Host`
 * diverge da `Host`. La lista accetta env override per multi-env (staging).
 * Round 10 Sec-C1.
 */
const allowedOrigins = (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : undefined,
    },
  },
  // Security headers defense-in-depth (reverse proxy dovrebbe metterli, ma
  // duplicato lato app protegge contro misconfig).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
          // HSTS solo in prod (localhost lo rompe).
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
      // R15-SEC-A1: admin NON deve mai essere framable (clickjacking admin
      // compromesso via XSS su public page) + NON deve essere cached da
      // CDN/reverse-proxy/browser (PII cliente + confirmationCode).
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Cache-Control", value: "private, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
