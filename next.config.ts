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

const deploymentId =
  process.env.NEXT_DEPLOYMENT_ID ||
  process.env.DEPLOYMENT_VERSION ||
  process.env.SENTRY_RELEASE ||
  process.env.GIT_SHA ||
  undefined;

const nextConfig: NextConfig = {
  output: "standalone",
  deploymentId,
  poweredByHeader: false,
  images: {
    // Self-hosted image optimization: WebP avoids cold AVIF transcode latency.
    formats: ["image/webp"],
    qualities: [25, 40, 50, 60, 75, 80],
  },
  experimental: {
    serverActions: {
      allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : undefined,
    },
  },
  async redirects() {
    return [
      {
        source: "/it/esperienze/boat-shared-full-day",
        destination: "/it/esperienze/escursione-barca-favignana-levanzo-da-trapani",
        statusCode: 301,
      },
      {
        source: "/it/esperienze/boat-exclusive-full-day",
        destination: "/it/esperienze/tour-privato-favignana-levanzo-da-trapani",
        statusCode: 301,
      },
      {
        source: "/en/experiences/boat-shared-full-day",
        destination: "/en/experiences/favignana-levanzo-boat-tour-from-trapani",
        statusCode: 301,
      },
      {
        source: "/en/experiences/boat-exclusive-full-day",
        destination: "/en/experiences/private-favignana-levanzo-boat-tour-from-trapani",
        statusCode: 301,
      },
      {
        source: "/es/experiencias/boat-shared-full-day",
        destination: "/es/experiencias/excursion-compartida-islas-egadi-8-horas",
        statusCode: 301,
      },
      {
        source: "/es/experiencias/boat-exclusive-full-day",
        destination: "/es/experiencias/excursion-privada-islas-egadi-8-horas",
        statusCode: 301,
      },
      {
        source: "/fr/experiences/boat-shared-full-day",
        destination: "/fr/experiences/excursion-partagee-iles-egades-8-heures",
        statusCode: 301,
      },
      {
        source: "/fr/experiences/boat-exclusive-full-day",
        destination: "/fr/experiences/excursion-privee-iles-egades-8-heures",
        statusCode: 301,
      },
      {
        source: "/de/erlebnisse/boat-shared-full-day",
        destination: "/de/erlebnisse/geteilte-bootstour-aegadische-inseln-8-stunden",
        statusCode: 301,
      },
      {
        source: "/de/erlebnisse/boat-exclusive-full-day",
        destination: "/de/erlebnisse/private-bootstour-aegadische-inseln-8-stunden",
        statusCode: 301,
      },
      {
        source: "/it/esperienze/exclusive-experience",
        destination: "/it/esperienze/chef-a-bordo-egadi-trimarano-da-trapani",
        statusCode: 301,
      },
      {
        source: "/it/esperienze/charter",
        destination: "/it/esperienze/charter-egadi-trimarano-da-trapani",
        statusCode: 301,
      },
      {
        source: "/it/esperienze/boat-exclusive-morning",
        destination: "/it/esperienze/tour-privato-egadi-4-ore-mattina-da-trapani",
        statusCode: 301,
      },
      {
        source: "/it/esperienze/boat-exclusive-afternoon",
        destination: "/it/esperienze/tour-privato-egadi-4-ore-pomeriggio-da-trapani",
        statusCode: 301,
      },
      {
        source: "/it/esperienze/charter-pesca-egadi",
        destination: "/it/esperienze/charter-pesca-egadi-da-trapani",
        statusCode: 301,
      },
      {
        source: "/en/experiences/exclusive-experience",
        destination: "/en/experiences/chef-on-board-egadi-trimaran-from-trapani",
        statusCode: 301,
      },
      {
        source: "/en/experiences/charter",
        destination: "/en/experiences/egadi-trimaran-charter-from-trapani",
        statusCode: 301,
      },
      {
        source: "/en/experiences/boat-exclusive-morning",
        destination: "/en/experiences/private-egadi-4-hour-morning-boat-tour-from-trapani",
        statusCode: 301,
      },
      {
        source: "/en/experiences/boat-exclusive-afternoon",
        destination: "/en/experiences/private-egadi-4-hour-afternoon-boat-tour-from-trapani",
        statusCode: 301,
      },
      {
        source: "/en/experiences/egadi-fishing-charter",
        destination: "/en/experiences/egadi-fishing-charter-from-trapani",
        statusCode: 301,
      },
      {
        source: "/es/experiencias/chef-a-bordo-neel-47",
        destination: "/es/experiencias/chef-a-bordo-egadi-trimaran-desde-trapani",
        statusCode: 301,
      },
      {
        source: "/es/experiencias/charter-islas-egadi",
        destination: "/es/experiencias/charter-egadi-trimaran-desde-trapani",
        statusCode: 301,
      },
      {
        source: "/es/experiencias/excursion-privada-islas-egadi-4-horas-manana",
        destination: "/es/experiencias/tour-privado-egadi-4-horas-manana-desde-trapani",
        statusCode: 301,
      },
      {
        source: "/es/experiencias/excursion-privada-islas-egadi-4-horas-tarde",
        destination: "/es/experiencias/tour-privado-egadi-4-horas-tarde-desde-trapani",
        statusCode: 301,
      },
      {
        source: "/es/experiencias/charter-pesca-islas-egadi",
        destination: "/es/experiencias/charter-pesca-egadi-desde-trapani",
        statusCode: 301,
      },
      {
        source: "/fr/experiences/chef-a-bord-neel-47",
        destination: "/fr/experiences/chef-a-bord-egades-trimaran-depuis-trapani",
        statusCode: 301,
      },
      {
        source: "/fr/experiences/charter-iles-egades",
        destination: "/fr/experiences/charter-egades-trimaran-depuis-trapani",
        statusCode: 301,
      },
      {
        source: "/fr/experiences/excursion-privee-iles-egades-4-heures-matin",
        destination: "/fr/experiences/excursion-privee-egades-4-heures-matin-depuis-trapani",
        statusCode: 301,
      },
      {
        source: "/fr/experiences/excursion-privee-iles-egades-4-heures-apres-midi",
        destination: "/fr/experiences/excursion-privee-egades-4-heures-apres-midi-depuis-trapani",
        statusCode: 301,
      },
      {
        source: "/fr/experiences/charter-peche-iles-egades",
        destination: "/fr/experiences/charter-peche-egades-depuis-trapani",
        statusCode: 301,
      },
      {
        source: "/de/erlebnisse/chef-an-bord-neel-47",
        destination: "/de/erlebnisse/chef-an-bord-aegadische-inseln-trimaran-ab-trapani",
        statusCode: 301,
      },
      {
        source: "/de/erlebnisse/charter-aegadische-inseln",
        destination: "/de/erlebnisse/trimaran-charter-aegadische-inseln-ab-trapani",
        statusCode: 301,
      },
      {
        source: "/de/erlebnisse/private-bootstour-aegadische-inseln-4-stunden-vormittag",
        destination: "/de/erlebnisse/private-bootstour-aegadische-inseln-4-stunden-vormittag-ab-trapani",
        statusCode: 301,
      },
      {
        source: "/de/erlebnisse/private-bootstour-aegadische-inseln-4-stunden-nachmittag",
        destination: "/de/erlebnisse/private-bootstour-aegadische-inseln-4-stunden-nachmittag-ab-trapani",
        statusCode: 301,
      },
      {
        source: "/de/erlebnisse/angelcharter-aegadische-inseln",
        destination: "/de/erlebnisse/angelcharter-aegadische-inseln-ab-trapani",
        statusCode: 301,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.egadisailing.com" }],
        destination: "https://egadisailing.com/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/it.md", destination: "/api/markdown-mirror/it" },
        { source: "/en.md", destination: "/api/markdown-mirror/en" },
        { source: "/es.md", destination: "/api/markdown-mirror/es" },
        { source: "/fr.md", destination: "/api/markdown-mirror/fr" },
        { source: "/de.md", destination: "/api/markdown-mirror/de" },
        { source: "/it/:path*\.md", destination: "/api/markdown-mirror/it/:path*" },
        { source: "/en/:path*\.md", destination: "/api/markdown-mirror/en/:path*" },
        { source: "/es/:path*\.md", destination: "/api/markdown-mirror/es/:path*" },
        { source: "/fr/:path*\.md", destination: "/api/markdown-mirror/fr/:path*" },
        { source: "/de/:path*\.md", destination: "/api/markdown-mirror/de/:path*" },
      ],
    };
  },
  // Security headers defense-in-depth. HSTS resta al reverse proxy/edge per
  // evitare header duplicati sulla risposta pubblica.
  async headers() {
    const llmsHeaders = [
      { key: "Content-Type", value: "text/plain; charset=utf-8" },
      {
        key: "Cache-Control",
        value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
      { key: "X-Robots-Tag", value: "noindex, follow" },
    ];

    const serviceWorkerHeaders = [
      { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      { key: "Pragma", value: "no-cache" },
      { key: "Service-Worker-Allowed", value: "/" },
      {
        key: "Content-Security-Policy",
        value: "default-src 'self'; script-src 'self'",
      },
    ];

    return [
      {
        source: "/llms.txt",
        headers: llmsHeaders,
      },
      {
        source: "/llms-full.txt",
        headers: llmsHeaders,
      },
      {
        source: "/sw.js",
        headers: serviceWorkerHeaders,
      },
      {
        source: "/service-worker.js",
        headers: serviceWorkerHeaders,
      },
      {
        source: "/ngsw-worker.js",
        headers: serviceWorkerHeaders,
      },
      {
        source: "/firebase-messaging-sw.js",
        headers: serviceWorkerHeaders,
      },
      {
        source: "/OneSignalSDKWorker.js",
        headers: serviceWorkerHeaders,
      },
      {
        source: "/videos/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/images/boats/:path*/hero-video.webm",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        source: "/api/cron/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        source: "/api/webhooks/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://tagassistant.google.com" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
          // COOP non viene impostato sulle pagine pubbliche: Tag Assistant
          // deve mantenere il collegamento cross-origin con la finestra di debug.
          // Le aree admin sotto hanno un override strict dedicato.
          // X-Permitted-Cross-Domain-Policies: blocca Adobe Flash / PDF
          // reader legacy da leggere crossdomain.xml (header legacy ma
          // obbligatorio in pen-test corporate).
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
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
          // side-channel. Le pagine pubbliche non impostano COOP per compatibilita Tag Assistant.
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
