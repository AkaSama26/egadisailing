import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { rootBodyClassName, rootHtmlClassName, RootRuntime } from "@/app/_components/root-runtime";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { FloatingWhatsAppButton } from "@/components/floating-whatsapp-button";
import { MobileHomeStickyCta } from "@/components/mobile-home-sticky-cta";
import { env } from "@/lib/env";
import { getCookieConsentPublicServices } from "@/lib/cookie-consent/server";
import { getSiteVerificationMetadata } from "@/lib/site-verification";
import { buildGlobalSeoJsonLd, jsonLd } from "@/lib/seo/structured-data";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import "../globals.css";

const siteVerification = getSiteVerificationMetadata();

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: {
    template: "%s | Egadisailing",
    default: "Egadisailing | Tour in barca alle Egadi da Trapani",
  },
  description:
    "Favignana, Levanzo, Marettimo ti aspettano. Con chef, skipper e il lusso del mare aperto.",
  openGraph: {
    siteName: "Egadisailing",
    locale: "it_IT",
    type: "website",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  manifest: "/favicon_io/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon_io/apple-touch-icon.png",
  },
  ...(siteVerification ? { verification: siteVerification } : {}),
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const cookieConsentServices = getCookieConsentPublicServices();
  const globalSeoJsonLd = buildGlobalSeoJsonLd(locale);

  return (
    <html lang={locale} className={rootHtmlClassName}>
      <body className={rootBodyClassName}>
        <RootRuntime trackingServices={cookieConsentServices} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(globalSeoJsonLd) }}
        />
        <NextIntlClientProvider messages={messages}>
          {/* R19-A11y BLOCKER WCAG 2.4.1: skip link obbligatorio EAA 2025. Visibile
              solo su focus — utente tastiera/SR salta navbar/language-switcher. */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-[#0ea5e9]"
          >
            {locale === "es"
              ? "Saltar al contenido"
              : locale === "fr"
                ? "Aller au contenu"
                : locale === "de"
                  ? "Zum Inhalt springen"
                  : locale === "en"
                    ? "Skip to content"
                    : "Vai al contenuto"}
          </a>
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <MobileHomeStickyCta locale={locale} />
          <CookieConsentBanner locale={locale} services={cookieConsentServices} />
          <FloatingWhatsAppButton locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
