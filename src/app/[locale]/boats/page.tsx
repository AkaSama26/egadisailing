// @ts-nocheck - legacy schema references, refactored in Plan 2-5
import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ScrollSection } from "@/components/scroll-section";
import { BedDouble, DoorOpen, UtensilsCrossed, Bath, Users, Gauge, ArrowRight } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Le Nostre Barche",
    description:
      "Trimarano luxury con chef e barca motoscafo per tour alle Isole Egadi da Trapani.",
    path: "/boats",
    locale,
  });
}

export default async function BoatsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();

  const boats = await db.boat.findMany({
    include: {
      services: {
        where: { active: true },
        select: { id: true, name: true, type: true },
      },
    },
  });

  const trimaran = boats.find((b) => b.type === "trimaran");
  const motorboat = boats.find((b) => b.type === "motorboat");

  const getDescription = (boat: typeof boats[0]) =>
    boat.description
      ? (boat.description as Record<string, string>)[locale] ||
        (boat.description as Record<string, string>).it ||
        ""
      : "";

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #071934 0%, #0a2a4a 30%, #0c3d5e 50%, #0a2a4a 80%, #071934 100%)",
      }}
    >
      {/* ── Hero: H1 + bouquet image ── */}
      <section className="pt-36 pb-32 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: H1 */}
            <ScrollSection animation="fade-left">
              <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white leading-tight">
                Le Isole Egadi Meritano la Barca Giusta
              </h1>
              <p className="text-white/50 text-lg mt-6 max-w-lg">
                Trimarano luxury con chef a bordo e barca motoscafo per tour esclusivi. Scegli la tua.
              </p>
            </ScrollSection>

            {/* Right: placeholder for bouquet image */}
            <ScrollSection animation="fade-right">
              <div className="relative flex items-center justify-center h-[400px] md:h-[500px]">
                <div
                  className="absolute w-[80%] aspect-square rounded-full"
                  style={{
                    background: "radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 60%)",
                    filter: "blur(40px)",
                  }}
                />
                <div className="relative w-full h-full rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center overflow-hidden">
                  <Image
                    src="/images/trimarano.webp"
                    alt="Le nostre barche"
                    width={2752}
                    height={1536}
                    className="w-[85%] h-auto object-contain drop-shadow-[0_15px_40px_rgba(14,165,233,0.15)]"
                    priority
                  />
                  <p className="absolute bottom-4 right-4 text-white/20 text-xs tracking-wider uppercase">Foto completa in arrivo</p>
                </div>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* ── Trimarano detail ── */}
      {trimaran && (
        <section className="pb-32 px-4 md:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Image */}
              <ScrollSection animation="fade-left">
                <div className="relative flex justify-center">
                  <Image
                    src="/images/trimarano.webp"
                    alt={trimaran.name}
                    width={2752}
                    height={1536}
                    className="w-full h-auto drop-shadow-[0_20px_60px_rgba(14,165,233,0.2)]"
                  />
                  <div
                    className="absolute inset-0 -z-10 scale-110"
                    style={{
                      background: "radial-gradient(ellipse, rgba(14,165,233,0.12) 0%, transparent 60%)",
                      filter: "blur(40px)",
                    }}
                  />
                </div>
              </ScrollSection>

              {/* Info */}
              <ScrollSection animation="fade-right">
                <div className="space-y-6">
                  <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white">
                    {trimaran.name}
                  </h2>
                  <p className="text-white/70 text-lg leading-relaxed">
                    {getDescription(trimaran)}
                  </p>

                  {/* Specs icons */}
                  <div className="flex flex-wrap gap-8 py-4">
                    <div className="text-center">
                      <DoorOpen className="h-7 w-7 text-[var(--color-gold)] mx-auto mb-2" />
                      <p className="text-white font-bold text-xl">3</p>
                      <p className="text-white/40 text-xs uppercase tracking-wider">Cabine</p>
                    </div>
                    <div className="text-center">
                      <BedDouble className="h-7 w-7 text-[var(--color-gold)] mx-auto mb-2" />
                      <p className="text-white font-bold text-xl">10</p>
                      <p className="text-white/40 text-xs uppercase tracking-wider">Posti Letto</p>
                    </div>
                    <div className="text-center">
                      <UtensilsCrossed className="h-7 w-7 text-[var(--color-gold)] mx-auto mb-2" />
                      <p className="text-white font-bold text-xl">1</p>
                      <p className="text-white/40 text-xs uppercase tracking-wider">Cucina</p>
                    </div>
                    <div className="text-center">
                      <Bath className="h-7 w-7 text-[var(--color-gold)] mx-auto mb-2" />
                      <p className="text-white font-bold text-xl">1</p>
                      <p className="text-white/40 text-xs uppercase tracking-wider">Bagno</p>
                    </div>
                  </div>

                  {/* Linked services */}
                  {trimaran.services.length > 0 && (
                    <div>
                      <h3 className="text-white/40 text-xs font-semibold uppercase tracking-[3px] mb-4">
                        Esperienze disponibili
                      </h3>
                      <div className="space-y-3">
                        {trimaran.services.map((svc) => (
                          <Link
                            key={svc.id}
                            href={`/${locale}/experiences/${svc.id}`}
                            className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors group"
                          >
                            <span className="text-white font-medium">{svc.name}</span>
                            <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-[var(--color-gold)] transition-colors" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollSection>
            </div>
          </div>
        </section>
      )}

      {/* ── Divider ── */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ── Motorboat section ── */}
      {motorboat && (
        <section className="py-32 px-4 md:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* SVG placeholder */}
              <ScrollSection animation="fade-left">
                <div className="relative flex items-center justify-center h-[400px]">
                  {/* Glow */}
                  <div
                    className="absolute w-[70%] aspect-square rounded-full"
                    style={{
                      background: "radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 60%)",
                      filter: "blur(30px)",
                    }}
                  />
                  {/* Boat silhouette SVG */}
                  <svg viewBox="0 0 400 200" fill="none" className="w-[80%] h-auto relative z-10 drop-shadow-[0_10px_40px_rgba(14,165,233,0.1)]">
                    {/* Hull */}
                    <path
                      d="M40 140 Q40 170 80 175 L320 175 Q360 170 360 140 L350 120 Q340 110 50 110 Z"
                      fill="white"
                      opacity="0.08"
                      stroke="white"
                      strokeWidth="1"
                      strokeOpacity="0.2"
                    />
                    {/* Cabin */}
                    <rect x="120" y="85" width="160" height="30" rx="8" fill="white" opacity="0.06" stroke="white" strokeWidth="1" strokeOpacity="0.15" />
                    {/* Windshield */}
                    <path d="M130 85 L150 65 L260 65 L270 85" fill="white" opacity="0.04" stroke="white" strokeWidth="1" strokeOpacity="0.12" />
                    {/* Railing */}
                    <line x1="80" y1="108" x2="320" y2="108" stroke="white" strokeWidth="0.8" strokeOpacity="0.15" />
                    {/* Wake lines */}
                    <path d="M360 145 Q380 145 400 150" stroke="white" strokeWidth="0.8" strokeOpacity="0.1" />
                    <path d="M360 155 Q385 155 400 162" stroke="white" strokeWidth="0.6" strokeOpacity="0.08" />
                  </svg>
                </div>
              </ScrollSection>

              {/* Info */}
              <ScrollSection animation="fade-right">
                <div className="space-y-6">
                  <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white">
                    {motorboat.name}
                  </h2>
                  <p className="text-white/70 text-lg leading-relaxed">
                    {getDescription(motorboat)}
                  </p>

                  {/* Specs icons */}
                  <div className="flex flex-wrap gap-8 py-4">
                    <div className="text-center">
                      <Users className="h-7 w-7 text-[var(--color-gold)] mx-auto mb-2" />
                      <p className="text-white font-bold text-xl">10</p>
                      <p className="text-white/40 text-xs uppercase tracking-wider">Posti</p>
                    </div>
                    <div className="text-center">
                      <Gauge className="h-7 w-7 text-[var(--color-gold)] mx-auto mb-2" />
                      <p className="text-white font-bold text-xl">200</p>
                      <p className="text-white/40 text-xs uppercase tracking-wider">HP</p>
                    </div>
                  </div>

                  {/* Linked services */}
                  {motorboat.services.length > 0 && (
                    <div>
                      <h3 className="text-white/40 text-xs font-semibold uppercase tracking-[3px] mb-4">
                        Esperienze disponibili
                      </h3>
                      <div className="space-y-3">
                        {motorboat.services.map((svc) => (
                          <Link
                            key={svc.id}
                            href={`/${locale}/experiences/${svc.id}`}
                            className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors group"
                          >
                            <span className="text-white font-medium">{svc.name}</span>
                            <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-[var(--color-gold)] transition-colors" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollSection>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
