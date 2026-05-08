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
  return buildPageMetadata({
    title: isEs
      ? "Islas Egadi en barco: Favignana, Levanzo y Marettimo"
      : isFr
      ? "Îles Égades en bateau : Favignana, Levanzo et Marettimo"
      : isEn
      ? "Egadi Islands by Boat: Favignana, Levanzo and Marettimo"
      : "Isole Egadi in Barca: Favignana, Levanzo e Marettimo",
    description: isEs
      ? "Guía de las Islas Egadi en barco: qué ver en Favignana, Levanzo y Marettimo, mejores calas y rutas desde Trapani."
      : isFr
      ? "Guide des îles Égades en bateau : que voir à Favignana, Levanzo et Marettimo, plus belles criques et routes depuis Trapani."
      : isEn
      ? "Guide to the Egadi Islands by boat: what to see in Favignana, Levanzo and Marettimo, the best coves and routes from Trapani."
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
