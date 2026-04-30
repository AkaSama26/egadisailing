import type { Metadata } from "next";
import { IslandsScrollSection } from "./islands-scroll";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Isole Egadi in Barca: Favignana, Levanzo e Marettimo",
    description:
      "Guida alle Isole Egadi in barca: cosa vedere a Favignana, Levanzo e Marettimo, le cale più belle e le rotte migliori per un tour da Trapani.",
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
