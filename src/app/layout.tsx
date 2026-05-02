import type { Metadata } from "next";
import { Poppins, Inter, Caveat } from "next/font/google";
import { getLocale } from "next-intl/server";
import { ServiceWorkerCleanup } from "@/components/service-worker-cleanup";
import { env } from "@/lib/env";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-handwriting",
  subsets: ["latin"],
  display: "swap",
});

const serviceWorkerInlineCleanupScript = `
(function () {
  var flag = "egadisailing:inline-service-worker-cleanup:20260501";

  function mark(value) {
    try {
      window.sessionStorage.setItem(flag, value);
    } catch (_error) {}
  }

  try {
    if (window.sessionStorage.getItem(flag) === "done") {
      return;
    }

    var hadServiceWorker = false;
    var hadCaches = false;

    var unregisters = "serviceWorker" in navigator
      ? navigator.serviceWorker.getRegistrations().then(function (registrations) {
          hadServiceWorker = registrations.length > 0 || Boolean(navigator.serviceWorker.controller);
          return Promise.allSettled(registrations.map(function (registration) {
            return registration.unregister();
          }));
        })
      : Promise.resolve();

    var cacheDeletes = "caches" in window
      ? window.caches.keys().then(function (keys) {
          hadCaches = keys.length > 0;
          return Promise.allSettled(keys.map(function (key) {
            return window.caches.delete(key);
          }));
        })
      : Promise.resolve();

    Promise.allSettled([unregisters, cacheDeletes]).then(function () {
      mark("done");

      if (hadServiceWorker || hadCaches || ("serviceWorker" in navigator && navigator.serviceWorker.controller)) {
        window.location.replace(window.location.href);
      }
    });
  } catch (_error) {
    mark("failed");
  }
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: {
    template: "%s — Egadisailing",
    default: "Egadisailing — Lascia la Terra Ferma",
  },
  description:
    "Favignana, Levanzo, Marettimo ti aspettano. Con chef, skipper e il lusso del mare aperto.",
  // Default social card (ogni pagina override con buildPageMetadata).
  openGraph: {
    siteName: "Egadisailing",
    locale: "it_IT",
    type: "website",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.ico" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Round 11 Reg-A1/SEO-C3: `lang` dinamico dal locale next-intl (derivato
  // dall'URL `/it/...` / `/en/...`). Default "it" se fuori dal pattern
  // (es. `/admin/*`, admin e' IT-only).
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${poppins.variable} ${inter.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <script dangerouslySetInnerHTML={{ __html: serviceWorkerInlineCleanupScript }} />
        <ServiceWorkerCleanup />
        {children}
      </body>
    </html>
  );
}
