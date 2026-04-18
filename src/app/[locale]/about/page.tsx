import type { Metadata } from "next";
import Link from "next/link";
import { ScrollSection } from "@/components/scroll-section";
import { Waves, Heart, Anchor, Users, ArrowRight } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Chi Siamo",
    description:
      "Ogni onda racconta la nostra storia. Scopri la famiglia dietro Egadisailing, la passione per il mare e le Isole Egadi.",
    path: "/about",
    locale,
  });
}

export default async function AboutPage({
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
      {/* ── Hero: H1 left + photo right ── */}
      <section className="pt-36 pb-32 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
            {/* Left: text */}
            <ScrollSection animation="fade-left">
              <div className="space-y-8">
                <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
                  Ogni Onda Racconta la Nostra Storia
                </h1>
                <p className="text-white/60 text-lg md:text-xl leading-relaxed max-w-lg">
                  Tutto è iniziato con una barca e un sogno: far scoprire le Egadi come le conosciamo noi. La passione è la stessa — il mare, l&apos;ospitalità siciliana, e la promessa di un&apos;esperienza che non dimenticherai.
                </p>
              </div>
            </ScrollSection>

            {/* Right: armatore photo placeholder */}
            <ScrollSection animation="fade-right">
              <div className="flex justify-center">
                <div className="relative w-80 h-96 md:w-96 md:h-[28rem]">
                  {/* Glow */}
                  <div
                    className="absolute inset-0 -z-10 scale-110"
                    style={{
                      background: "radial-gradient(ellipse, rgba(14,165,233,0.12) 0%, transparent 60%)",
                      filter: "blur(30px)",
                    }}
                  />
                  {/* Placeholder */}
                  <div className="w-full h-full rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col items-center justify-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
                      <Users className="h-12 w-12 text-white/20" />
                    </div>
                    <p className="text-white/20 text-sm tracking-wider uppercase">Foto Armatore</p>
                  </div>
                </div>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* ── La Nostra Storia ── */}
      <section className="pb-32 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <ScrollSection animation="fade-left">
              <div className="space-y-6">
                <h2 className="font-heading text-4xl md:text-5xl font-bold text-white">
                  La Nostra Storia
                </h2>
                <p className="text-white/60 text-lg leading-relaxed">
                  Siamo nati a Trapani, cresciuti guardando le Egadi all&apos;orizzonte. Conosciamo ogni cala, ogni grotta, ogni corrente. Non è solo il nostro lavoro — è la nostra vita.
                </p>
                <p className="text-white/60 text-lg leading-relaxed">
                  Abbiamo scelto un trimarano perché volevamo offrire qualcosa di diverso: spazio, comfort, stabilità. Un&apos;esperienza che non esiste altrove in Sicilia. Con uno chef a bordo che cucina il pesce del giorno, e una crew che ti fa sentire a casa.
                </p>
              </div>
            </ScrollSection>

            <ScrollSection animation="fade-right">
              <div className="space-y-6">
                <p className="text-white/60 text-lg leading-relaxed">
                  Ogni mattina salpiamo dal Porto di Trapani con lo stesso entusiasmo del primo giorno. Perché ogni uscita è diversa — la luce, il vento, i colori del mare. E la faccia dei nostri ospiti quando vedono Cala Rossa per la prima volta non ha prezzo.
                </p>
                <p className="text-white/60 text-lg leading-relaxed">
                  Non siamo un&apos;agenzia. Siamo una famiglia che ha fatto del mare la propria vita, e che vuole condividerla con te.
                </p>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* ── I Nostri Valori ── */}
      <section className="pb-32 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <ScrollSection animation="fade-up">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white text-center mb-16">
              I Nostri Valori
            </h2>
          </ScrollSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Waves className="h-8 w-8" />,
                title: "Passione per il Mare",
                description: "Il Mediterraneo non è solo il nostro ufficio — è la nostra casa. Ogni giorno in mare è un privilegio che non diamo mai per scontato.",
              },
              {
                icon: <Heart className="h-8 w-8" />,
                title: "Ospitalità Siciliana",
                description: "Ti accogliamo come famiglia. Dal welcome drink al pranzo dello chef, ogni dettaglio è curato per farti sentire speciale.",
              },
              {
                icon: <Anchor className="h-8 w-8" />,
                title: "Qualità Senza Compromessi",
                description: "Barche mantenute alla perfezione, crew professionale, ingredienti freschi. Non facciamo sconti sulla qualità dell'esperienza.",
              },
            ].map((value, i) => (
              <ScrollSection key={value.title} animation="fade-up" delay={i * 0.15}>
                <div className="p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08] h-full">
                  <div className="w-14 h-14 rounded-xl bg-[var(--color-gold)]/10 flex items-center justify-center text-[var(--color-gold)] mb-6">
                    {value.icon}
                  </div>
                  <h3 className="font-heading text-xl font-bold text-white mb-3">
                    {value.title}
                  </h3>
                  <p className="text-white/50 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── La Crew ── */}
      <section className="pb-32 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <ScrollSection animation="fade-up">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white text-center mb-16">
              La Crew
            </h2>
          </ScrollSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                role: "Skipper",
                description: "Il capitano che conosce ogni segreto delle Egadi. Rotte sicure, calette nascoste, e storie da raccontare.",
              },
              {
                role: "Chef",
                description: "Pesce freschissimo dal mercato di Trapani, cucinato a bordo con ricette della tradizione siciliana. Un pranzo vista mare indimenticabile.",
              },
              {
                role: "Hostess",
                description: "L'accoglienza a bordo. Si prende cura di ogni dettaglio perché tu possa solo goderti il mare.",
              },
            ].map((member, i) => (
              <ScrollSection key={member.role} animation="fade-up" delay={i * 0.15}>
                <div className="text-center">
                  {/* Avatar placeholder */}
                  <div className="w-28 h-28 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mx-auto mb-6">
                    <Users className="h-10 w-10 text-white/20" />
                  </div>
                  <h3 className="font-heading text-2xl font-bold text-white mb-2">
                    {member.role}
                  </h3>
                  <p className="text-white/50 leading-relaxed max-w-xs mx-auto">
                    {member.description}
                  </p>
                </div>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="pb-32 px-4 md:px-8 lg:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollSection animation="fade-up">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-6">
              Vieni a Conoscerci a Bordo
            </h2>
            <p className="text-white/50 text-lg mb-10">
              Le parole non bastano. Sali a bordo e scopri perché i nostri ospiti tornano ogni anno.
            </p>
            <Link
              href={`/${locale}/experiences`}
              className="inline-flex items-center gap-2 bg-[var(--color-gold)] text-[var(--color-ocean)] font-semibold text-lg px-10 py-4 rounded-full hover:bg-[var(--color-gold)]/90 transition-colors shadow-lg"
            >
              Scopri le Esperienze <ArrowRight className="h-5 w-5" />
            </Link>
          </ScrollSection>
        </div>
      </section>
    </div>
  );
}
