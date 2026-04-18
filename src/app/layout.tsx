import type { Metadata } from "next";
import { Poppins, Inter, Caveat } from "next/font/google";
import { getLocale } from "next-intl/server";
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

export const metadata: Metadata = {
  title: "Egadisailing — Lascia la Terra Ferma",
  description: "Favignana, Levanzo, Marettimo ti aspettano. Con chef, skipper e il lusso del mare aperto.",
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
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
