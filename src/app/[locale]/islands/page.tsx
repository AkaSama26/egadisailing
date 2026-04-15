import type { Metadata } from "next";
import { IslandsScrollSection } from "./islands-scroll";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Le Isole Egadi: Favignana, Levanzo e Marettimo — Egadisailing",
    description: "Scopri le Isole Egadi: cosa vedere a Favignana, le calette di Levanzo e la natura incontaminata di Marettimo. Escursioni in barca da Trapani.",
  };
}

export default async function IslandsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #071934 0%, #0a2a4a 30%, #0c3d5e 50%, #0a2a4a 80%, #071934 100%)",
      }}
    >
      <IslandsScrollSection locale={locale} />
    </div>
  );
}
