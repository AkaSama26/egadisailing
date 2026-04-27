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
        source: "/videos/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=31536000",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
          // R22-A3-MEDIA-1: Cross-Origin-Opener-Policy isola Stripe/Turnstile
          // popup dal contesto principale → mitigazione side-channel Spectre
          // + clickjacking cross-origin window. `same-origin-allow-popups`
          // necessario per Stripe 3DS popup (pagina hosted in iframe cross-
          // origin → `same-origin` strict rompe la sessione).
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          // X-Permitted-Cross-Domain-Policies: blocca Adobe Flash / PDF
          // reader legacy da leggere crossdomain.xml (header legacy ma
          // obbligatorio in pen-test corporate).
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
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
      // R15-REG-SEC-A1: escludiamo /admin/login (pagina pubblica, no PII;
      // dev HMR+iframe tooling beneficia di regime rilassato). La login
      // resta protetta dalle default SAMEORIGIN + headers globali.
      // R16-REG-C1: il pattern `/admin/((?!login$|login/).*)` richiede
      // almeno uno slash dopo `/admin`, quindi NON matchava `/admin` bare
      // (dashboard home con KPI+booking imminenti). Doppia entry copre
      // entrambi senza matchare /admin/login.
      {
        source: "/admin",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Cache-Control", value: "private, no-store, must-revalidate" },
          // R22-A3-BASSA-1: HTTP/1.0 proxy legacy (corporate Squid anni 2005+)
          // ignora `Cache-Control: no-store` e cacha comunque se non vede
          // `Pragma: no-cache`. Belt-and-suspenders per reti aziendali cliente.
          { key: "Pragma", value: "no-cache" },
          // R22-P2-MEDIA-4: admin non ha popup Stripe 3DS, quindi
          // `same-origin` strict (no `-allow-popups`) riduce surface Spectre
          // side-channel. Override globale che usa `same-origin-allow-popups`.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/admin/((?!login$|login/).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Cache-Control", value: "private, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      // R22-A3-BASSA-2: `/admin/login` pubblica ma sensibile (form password).
      // Regime rilassato frame-ancestors (dev HMR) ma no-store e' safe
      // (nessun asset statico servito da questa route — solo HTML+Action).
      // Password autocomplete va evitato in cache browser avversariale
      // (shared device, public kiosk).
      {
        source: "/admin/login",
        headers: [
          { key: "Cache-Control", value: "private, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
