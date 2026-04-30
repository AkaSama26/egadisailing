"use client";

import type { MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Anchor, ArrowRight, Compass, MapPin, Waves } from "lucide-react";

const islands = [
  {
    key: "favignana",
    name: "Favignana",
    subtitle: "L'isola farfalla",
    heroText:
      "Cale turchesi, cave di tufo e la grande memoria della tonnara Florio.",
    image: "/images/islands/favignana/hero.webp",
    svg: "/images/islands/favignana.svg",
    svgWidth: 1371,
    svgHeight: 765,
    badge: "Cale iconiche",
    intro:
      "Favignana è la più grande delle Egadi e la più immediata da vivere in barca. La costa alterna sabbia chiara, scogliere basse, cave di tufo e baie color smeraldo: ogni lato dell'isola cambia carattere in base al vento e alla luce.",
    longText:
      "Per chi arriva da Trapani, Favignana è spesso il primo incontro con l'arcipelago. Il mare di Cala Rossa e Cala Azzurra è il suo biglietto da visita, ma la vera bellezza sta nella possibilità di scegliere il versante più riparato e costruire la giornata intorno al mare migliore.",
    highlights: ["Cala Rossa", "Cala Azzurra", "Bue Marino", "Ex Stabilimento Florio"],
    fromTheBoat: [
      "Entrare nelle cale quando la luce accende il fondale e il vento lascia acqua piatta.",
      "Alternare bagni lunghi a passaggi panoramici sotto le pareti di tufo.",
      "Fermarsi lontano dagli accessi via terra nei momenti più affollati della giornata.",
    ],
    practical: [
      "Ideale per una giornata intera o per itinerari combinati con Levanzo.",
      "Perfetta per snorkeling facile e soste fotografiche.",
      "Il versante migliore cambia con Maestrale, Scirocco e Grecale.",
    ],
  },
  {
    key: "levanzo",
    name: "Levanzo",
    subtitle: "Silenzio e acqua limpida",
    heroText:
      "Un borgo bianco, fondali trasparenti e calette intime da raggiungere lentamente.",
    image: "/images/islands/levanzo/hero.webp",
    svg: "/images/islands/levanzo.svg",
    svgWidth: 1185,
    svgHeight: 885,
    badge: "Ritmo lento",
    intro:
      "Levanzo è la più piccola delle Egadi, raccolta intorno a Cala Dogana e a un paesaggio essenziale. È l'isola del silenzio: poche strade, case bianche, roccia chiara e un mare che sembra disegnato per soste tranquille.",
    longText:
      "La barca permette di cogliere Levanzo senza fretta, muovendosi tra Cala Fredda, Cala Minnola e il Faraglione. L'isola custodisce anche la Grotta del Genovese, una delle testimonianze preistoriche più importanti del Mediterraneo.",
    highlights: ["Cala Fredda", "Cala Minnola", "Grotta del Genovese", "Faraglione"],
    fromTheBoat: [
      "Costeggiare il borgo di Cala Dogana e scegliere rade piccole, protette e luminose.",
      "Fare snorkeling sui fondali di Cala Minnola, dove il mare resta spesso chiarissimo.",
      "Abbinarla a Favignana per una rotta equilibrata tra cale famose e angoli più quieti.",
    ],
    practical: [
      "Ottima per chi cerca un'esperienza più intima e rilassata.",
      "Si presta bene a itinerari di mezza giornata estesi o giornate leggere.",
      "Le soste migliori dipendono molto dall'esposizione al vento.",
    ],
  },
  {
    key: "marettimo",
    name: "Marettimo",
    subtitle: "La montagna sul mare",
    heroText:
      "Grotte marine, pareti alte e il profilo più selvaggio dell'arcipelago.",
    image: "/images/islands/marettimo/hero.webp",
    svg: "/images/islands/marettimo.svg",
    svgWidth: 1371,
    svgHeight: 765,
    badge: "Natura profonda",
    intro:
      "Marettimo è la più lontana e la più verticale delle Egadi. Qui l'isola sale dal mare con un carattere diverso: montagne, sentieri, grotte marine e un borgo piccolo che conserva un'atmosfera appartata.",
    longText:
      "Una giornata in barca verso Marettimo richiede più navigazione e condizioni meteo favorevoli, ma ripaga con scenari potenti: Punta Troia, Cala Bianca, Scalo Maestro e le grotte del Cammello, del Presepe e del Tuono.",
    highlights: ["Grotta del Cammello", "Punta Troia", "Cala Bianca", "Scalo Maestro"],
    fromTheBoat: [
      "Scoprire le grotte marine quando il mare consente ingressi sicuri e luminosi.",
      "Navigare sotto pareti alte, con colori più profondi rispetto alle altre isole.",
      "Unire bagni, fotografia e passaggi panoramici in una rotta dal respiro più avventuroso.",
    ],
    practical: [
      "Consigliata per giornata intera e ospiti che amano navigare.",
      "La fattibilità dipende più delle altre isole dal meteo marino.",
      "Perfetta per chi cerca una Egadi meno balneare e più selvaggia.",
    ],
  },
] as const;

function scrollToIsland(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();

  const target = document.getElementById(id);
  if (!target) return;

  window.history.pushState(null, "", `#${id}`);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({
    top: target.getBoundingClientRect().top + window.scrollY,
    behavior: prefersReducedMotion ? "auto" : "smooth",
  });
}

export function IslandsScrollSection({ locale }: { locale: string }) {
  return (
    <>
      <section className="relative isolate min-h-[100svh] overflow-hidden bg-[linear-gradient(180deg,#061529_0%,#092f4b_52%,#071934_100%)] px-4 pb-14 pt-28 text-white sm:px-6 lg:px-8">

        <div className="mx-auto flex min-h-[calc(100svh-10.5rem)] max-w-7xl flex-col justify-center">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-gold)]">
              Arcipelago delle Egadi
            </p>
            <h1 className="mt-5 font-heading text-4xl font-bold leading-[0.96] text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Le isole Egadi, una rotta alla volta
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              Favignana, Levanzo e Marettimo sono vicine sulla carta, ma molto diverse in mare.
              Questa pagina raccoglie cosa vedere, come viverle in barca e quali sensazioni aspettarsi
              prima di scegliere il tour giusto da Trapani.
            </p>
          </div>

          <nav
            aria-label="Isole Egadi"
            className="mt-10 grid gap-4 md:grid-cols-3 lg:mt-14"
          >
            {islands.map((island) => (
              <a
                key={island.key}
                href={`#${island.key}`}
                onClick={(event) => scrollToIsland(event, island.key)}
                className="group flex min-h-[16rem] flex-col justify-between rounded-lg border border-white/20 bg-white/[0.08] p-5 text-left shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-[var(--color-gold)] hover:bg-white/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
              >
                <span className="flex items-start justify-between gap-5">
                  <span>
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--color-gold)]">
                      {island.subtitle}
                    </span>
                    <span className="mt-3 block font-heading text-3xl font-bold text-white">
                      {island.name}
                    </span>
                  </span>
                  <Image
                    src={island.svg}
                    alt=""
                    width={island.svgWidth}
                    height={island.svgHeight}
                    className="h-20 w-24 shrink-0 object-contain opacity-80 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
                  />
                </span>

                <span className="mt-6 block">
                  <span className="block text-sm leading-6 text-white/70">
                    {island.heroText}
                  </span>
                  <span className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm font-semibold text-white">
                    <span>{island.badge}</span>
                    <ArrowRight className="h-4 w-4 text-[var(--color-gold)] transition duration-300 group-hover:translate-x-1" />
                  </span>
                </span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      <main className="relative z-10 bg-[#f7f1e6] text-[#0a2637]">
        <section className="border-b border-[#d9c79d]/60 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#b58a27]">
                Guida rapida
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
                Tre isole, tre modi diversi di sentire il mare
              </h2>
            </div>
            <p className="text-base leading-7 text-[#294657] sm:text-lg">
              L&apos;arcipelago delle Egadi è una riserva marina in cui il programma migliore nasce
              sempre dal meteo. In barca si può scegliere la costa riparata, modulare le soste
              e leggere l&apos;isola dal suo lato più vero: quello dell&apos;acqua.
            </p>
          </div>
        </section>

        {islands.map((island, index) => {
          const reverse = index % 2 === 1;

          return (
            <section
              key={island.key}
              id={island.key}
              className="min-h-[100svh] overflow-hidden border-b border-[#d9c79d]/60 px-4 py-16 sm:px-6 sm:py-20 lg:flex lg:items-center lg:px-8 lg:py-24"
            >
              <div
                className={[
                  "mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center",
                  reverse ? "lg:[&>*:first-child]:order-2" : "",
                ].join(" ")}
              >
                <div className="relative">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-[#d8c8a6] shadow-[0_24px_70px_rgba(10,38,55,0.20)] sm:aspect-[5/4] lg:aspect-[4/5]">
                    <Image
                      src={island.image}
                      alt={`${island.name}, Isole Egadi`}
                      fill
                      sizes="(min-width: 1024px) 44vw, 100vw"
                      className="object-cover"
                    />
                    <div
                      className="absolute inset-0 bg-[linear-gradient(180deg,transparent_54%,rgba(7,25,52,0.50)_100%)]"
                      aria-hidden="true"
                    />
                    <svg
                      viewBox="0 0 800 150"
                      preserveAspectRatio="none"
                      className="absolute inset-x-0 bottom-0 h-28 w-full"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M0 50 C120 86 236 18 374 44 C518 71 638 83 800 28 V150 H0 Z"
                        fill="rgba(7,25,52,0.78)"
                      />
                      <path
                        d="M0 75 C135 104 252 56 390 72 C535 89 660 88 800 53 V150 H0 Z"
                        fill="rgba(181,138,39,0.18)"
                      />
                    </svg>
                    <div className="absolute bottom-5 left-5 right-5 z-10 flex items-center justify-between gap-4 text-white">
                      <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">
                        {island.subtitle}
                      </span>
                      <Anchor className="h-5 w-5 text-[var(--color-gold)]" aria-hidden="true" />
                    </div>
                  </div>

                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#b58a27]">
                    Isole Egadi
                  </p>
                  <h2 className="mt-3 font-heading text-4xl font-bold leading-tight text-[#092337] sm:text-5xl">
                    {island.name}
                  </h2>
                  <p className="mt-5 text-lg leading-8 text-[#294657]">
                    {island.intro}
                  </p>
                  <p className="mt-4 text-base leading-7 text-[#425f6f]">
                    {island.longText}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    {island.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="inline-flex items-center gap-2 rounded-full border border-[#c5ad72]/60 bg-white/55 px-3 py-2 text-sm font-medium text-[#17384a]"
                      >
                        <MapPin className="h-4 w-4 text-[#b58a27]" aria-hidden="true" />
                        {highlight}
                      </span>
                    ))}
                  </div>

                  <div className="mt-10 grid gap-6 md:grid-cols-2">
                    <div>
                      <div className="flex items-center gap-3 text-[#092337]">
                        <Waves className="h-5 w-5 text-[#0a8ca8]" aria-hidden="true" />
                        <h3 className="font-heading text-2xl font-bold">Dal mare</h3>
                      </div>
                      <ul className="mt-4 space-y-3 text-sm leading-6 text-[#425f6f]">
                        {island.fromTheBoat.map((item) => (
                          <li key={item} className="flex gap-3">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b58a27]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="flex items-center gap-3 text-[#092337]">
                        <Compass className="h-5 w-5 text-[#0a8ca8]" aria-hidden="true" />
                        <h3 className="font-heading text-2xl font-bold">Da sapere</h3>
                      </div>
                      <ul className="mt-4 space-y-3 text-sm leading-6 text-[#425f6f]">
                        {island.practical.map((item) => (
                          <li key={item} className="flex gap-3">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b58a27]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Link
                    href={`/${locale}/experiences`}
                    className="mt-10 inline-flex items-center gap-2 rounded-lg bg-[#092337] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#123d5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b58a27]"
                  >
                    Vivi {island.name} in barca
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
