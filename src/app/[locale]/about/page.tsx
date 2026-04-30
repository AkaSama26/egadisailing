import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Anchor, Compass, Utensils } from "lucide-react";
import { ScrollSection } from "@/components/scroll-section";
import { buildPageMetadata } from "@/lib/seo/metadata";

const crew = [
  {
    role: "Skipper",
    image: "/images/about/skipper.webp",
    alt: "Skipper Egadisailing durante una navigazione alle Isole Egadi",
    icon: Anchor,
    description:
      "Guida la rotta, legge vento e mare, sceglie le cale più riparate e rende la navigazione sicura, fluida e piacevole.",
    note: "Rotte sicure, ritmo giusto, conoscenza vera delle Egadi.",
  },
  {
    role: "Hostess",
    image: "/images/about/hostess.webp",
    alt: "Hostess Egadisailing che accoglie gli ospiti a bordo",
    icon: Compass,
    description:
      "Si prende cura dell'accoglienza, dei dettagli a bordo e del comfort degli ospiti, dal primo sorriso fino al rientro in porto.",
    note: "Presenza discreta, attenzione concreta, ospitalità siciliana.",
  },
  {
    role: "Chef",
    image: "/images/about/chef.webp",
    alt: "Chef Egadisailing che prepara un pranzo a bordo",
    icon: Utensils,
    description:
      "Porta in tavola sapori del territorio, ingredienti freschi e piatti pensati per essere gustati con il mare intorno.",
    note: "Cucina di bordo, prodotti locali, pranzo vista Egadi.",
  },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Chi Siamo: Crew Locale per Escursioni alle Egadi",
    description:
      "Scopri Egadisailing e Nicolò Genna: armatore, skipper, hostess e chef per escursioni in barca alle Isole Egadi da Trapani.",
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
    <div className="min-h-screen bg-[#f7f1e6] text-[#0a2637]">
      <section className="relative isolate overflow-hidden bg-[#071934] px-4 pb-20 pt-32 text-white sm:px-6 lg:px-8 lg:pb-28 lg:pt-36">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(14,165,233,0.18),transparent_34%),linear-gradient(180deg,#071934_0%,#0a2a4a_58%,#071934_100%)]"
          aria-hidden="true"
        />

        <div className="mx-auto grid max-w-7xl gap-12 lg:min-h-[72vh] lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <ScrollSection animation="fade-left">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-gold)]">
                Chi siamo
              </p>
              <h1 className="mt-5 font-heading text-4xl font-bold leading-[0.98] text-white sm:text-5xl md:text-6xl lg:text-7xl">
                Il mare delle Egadi, raccontato da chi lo vive ogni giorno
              </h1>
              <p className="mt-6 text-base leading-7 text-white/72 sm:text-lg">
                Egadisailing nasce a Trapani da una passione semplice: portare gli ospiti
                tra Favignana, Levanzo e Marettimo con la cura di una crew locale, barche
                preparate e un modo di accogliere che sa di Sicilia.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/76">
                <span className="rounded-full border border-white/16 bg-white/[0.06] px-4 py-2">
                  Escursioni da Trapani
                </span>
                <span className="rounded-full border border-white/16 bg-white/[0.06] px-4 py-2">
                  Crew locale
                </span>
                <span className="rounded-full border border-white/16 bg-white/[0.06] px-4 py-2">
                  Cucina a bordo
                </span>
              </div>
            </div>
          </ScrollSection>

          <ScrollSection animation="fade-right">
            <div className="relative mx-auto max-w-xl">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-white/[0.05] shadow-[0_28px_90px_rgba(0,0,0,0.38)]">
                <Image
                  src="/images/about/armatore.webp"
                  alt="Nicolò Genna, armatore Egadisailing a bordo alle Isole Egadi"
                  fill
                  priority
                  sizes="(min-width: 1024px) 48vw, 100vw"
                  className="object-cover"
                />
                <div
                  className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,25,52,0.05)_42%,rgba(7,25,52,0.76)_100%)]"
                  aria-hidden="true"
                />
                <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-white/14 bg-[#071934]/55 p-5 backdrop-blur-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-gold)]">
                    Armatore
                  </p>
                  <p className="mt-2 font-heading text-3xl font-bold leading-tight text-white">
                    Nicolò Genna
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/78 sm:text-base">
                    È cresciuto con le Egadi davanti agli occhi e ha trasformato quella
                    conoscenza in un modo di navigare fatto di accoglienza, rotte scelte
                    bene e rispetto per il mare.
                  </p>
                </div>
              </div>
            </div>
          </ScrollSection>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <ScrollSection animation="fade-up">
            <div className="lg:sticky lg:top-28">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#b58a27]">
                La nostra storia
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl md:text-5xl">
                Una famiglia di mare, una base a Trapani, le Egadi davanti
              </h2>
            </div>
          </ScrollSection>

          <ScrollSection animation="fade-up" delay={0.1}>
            <div className="space-y-6 text-base leading-8 text-[#425f6f] sm:text-lg">
              <p>
                Siamo cresciuti con le Isole Egadi all&apos;orizzonte. Le abbiamo viste cambiare
                con la luce del mattino, con il Maestrale, con lo Scirocco, con quelle giornate
                calme in cui il mare sembra una lastra e ogni cala diventa un piccolo approdo.
              </p>
              <p>
                Per noi un&apos;escursione in barca non è solo una sequenza di soste. È scegliere
                il momento giusto per entrare in una baia, capire dove il mare è più pulito,
                lasciare spazio al silenzio quando serve e creare a bordo un&apos;ospitalità
                semplice, curata, memorabile.
              </p>
              <p>
                Egadisailing mette insieme esperienza locale, attenzione alla sicurezza,
                comfort in navigazione e cucina di bordo. È il nostro modo di condividere
                Favignana, Levanzo e Marettimo con chi vuole scoprirle senza fretta.
              </p>
            </div>
          </ScrollSection>
        </div>
      </section>

      <section className="bg-[#092337] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <ScrollSection animation="fade-up">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-gold)]">
                La crew
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
                Le persone che ti accompagnano a bordo
              </h2>
              <p className="mt-5 text-base leading-7 text-white/66 sm:text-lg">
                Skipper, hostess e chef lavorano insieme perché ogni uscita abbia una rotta
                sicura, un&apos;accoglienza attenta e sapori capaci di raccontare il territorio.
              </p>
            </div>
          </ScrollSection>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {crew.map((member, index) => {
              const Icon = member.icon;

              return (
                <ScrollSection key={member.role} animation="fade-up" delay={index * 0.12}>
                  <article className="h-full overflow-hidden rounded-lg border border-white/10 bg-white/[0.05] shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
                    <div className="relative aspect-[4/5] bg-white/[0.04]">
                      <Image
                        src={member.image}
                        alt={member.alt}
                        fill
                        sizes="(min-width: 768px) 31vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-6">
                      <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-gold)]/14 text-[var(--color-gold)]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-gold)]">
                        {member.role}
                      </p>
                      <p className="mt-3 text-base leading-7 text-white/72">
                        {member.description}
                      </p>
                      <p className="mt-5 border-t border-white/10 pt-5 text-sm font-medium leading-6 text-white">
                        {member.note}
                      </p>
                    </div>
                  </article>
                </ScrollSection>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <ScrollSection animation="fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#b58a27]">
              Sali a bordo
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
              Il modo migliore per conoscerci è vivere una giornata in mare
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#425f6f] sm:text-lg">
              Scegli l&apos;esperienza più adatta e lasciati guidare tra le cale, le rotte
              e i sapori delle Egadi.
            </p>
            <Link
              href={`/${locale}/experiences`}
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#092337] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#123d5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b58a27]"
            >
              Scopri le esperienze
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </ScrollSection>
        </div>
      </section>
    </div>
  );
}
