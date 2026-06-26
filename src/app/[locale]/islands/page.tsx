import type { Metadata } from "next";
import { IslandsScrollSection } from "./islands-scroll";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  return buildPageMetadata({
    title: isEs
      ? "Islas Egadi en barco desde Trapani: Favignana, Levanzo y Marettimo"
      : isFr
      ? "Îles Égades en bateau depuis Trapani : Favignana, Levanzo et Marettimo"
      : isDe
      ? "Ägadische Inseln mit dem Boot ab Trapani: Favignana, Levanzo und Marettimo"
      : isEn
      ? "Egadi Islands Boat Guide: Favignana, Levanzo and Marettimo"
      : "Isole Egadi in Barca: Favignana, Levanzo e Marettimo",
    description: isEs
      ? "Guía de las Islas Egadi en barco desde Trapani: qué ver en Favignana, Levanzo y Marettimo, mejores calas, snorkel y rutas recomendadas."
      : isFr
      ? "Guide des îles Égades en bateau depuis Trapani : que voir à Favignana, Levanzo et Marettimo, plus belles criques, snorkeling et routes recommandées."
      : isDe
      ? "Guide zu den Ägadischen Inseln mit dem Boot: was Sie in Favignana, Levanzo und Marettimo sehen, die schönsten Buchten und Routen ab Trapani."
      : isEn
      ? "Guide to the Egadi Islands by boat from Trapani: Favignana, Levanzo, Marettimo, best coves, swim stops and routes for boat tours."
      : "Guida alle Isole Egadi in barca: cosa vedere a Favignana, Levanzo e Marettimo, le cale più belle e le rotte migliori per un tour da Trapani.",
    path: "/islands",
    locale,
  });
}

export default async function IslandsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="min-h-screen bg-[#071934]">
      <IslandsScrollSection locale={locale} />
    </div>
  );
}
