import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

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
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      {/* R19-A11y BLOCKER WCAG 2.4.1: skip link obbligatorio EAA 2025. Visibile
          solo su focus — utente tastiera/SR salta navbar/language-switcher. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-[#0ea5e9]"
      >
        Vai al contenuto
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </NextIntlClientProvider>
  );
}
