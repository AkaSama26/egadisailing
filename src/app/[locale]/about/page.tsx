import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollSection } from "@/components/scroll-section";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { localizedStaticPath } from "@/lib/i18n/static-paths";

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
      ? "Egadisailing: excursiones en barco a las Islas Egadi desde Trapani"
      : isFr
      ? "Egadisailing : excursions bateau aux îles Égades depuis Trapani"
      : isDe
      ? "Egadisailing: Bootstouren zu den Ägadischen Inseln ab Trapani"
      : isEn
      ? "Egadisailing: Egadi Islands Boat Tours from Trapani"
      : "Egadisailing: escursioni in barca alle Egadi da Trapani",
    description: isEs
      ? "Conoce a Egadisailing y Nicolò Genna: una base local en Trapani para excursiones en barco por las Islas Egadi, tours privados, charter y almuerzo a bordo."
      : isFr
      ? "Découvrez Egadisailing et Nicolò Genna : une base locale à Trapani pour excursions bateau aux îles Égades, tours privés, charter et déjeuner à bord."
      : isDe
      ? "Lernen Sie Egadisailing und Nicolò Genna kennen: eine lokale Basis in Trapani für Bootstouren zu den Ägadischen Inseln, private Touren, Charter und Mittagessen an Bord."
      : isEn
      ? "Meet Egadisailing in Trapani: a local base for Egadi Islands boat tours, private charters, trimaran days and lunch on board experiences."
      : "Scopri Egadisailing e Nicolò Genna: una base locale a Trapani per escursioni in barca alle Isole Egadi, tour privati, charter e pranzo a bordo.",
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
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const copy = {
    eyebrow: isEs ? "Sobre nosotros" : isFr ? "À propos" : isDe ? "Über uns" : isEn ? "About us" : "Chi siamo",
    title: isEs
      ? "El mar de las Egadi, contado por quienes lo viven cada día"
      : isFr
      ? "La mer des Égades, racontée par celles et ceux qui la vivent chaque jour"
      : isDe
      ? "Das Meer der Ägadischen Inseln, erzählt von Menschen, die es täglich leben"
      : isEn
      ? "The Egadi sea, told by those who live it every day"
      : "Il mare delle Egadi, raccontato da chi lo vive ogni giorno",
    intro: isEs
      ? "Egadisailing nace en Trapani de una pasión sencilla: llevar a los huéspedes entre Favignana, Levanzo y Marettimo con el cuidado de una tripulación local, barcos preparados y una hospitalidad profundamente siciliana."
      : isFr
      ? "Egadisailing naît à Trapani d'une passion simple : emmener les invités entre Favignana, Levanzo et Marettimo avec le soin d'un équipage local, des bateaux préparés et une hospitalité profondément sicilienne."
      : isDe
      ? "Egadisailing entsteht in Trapani aus einer einfachen Leidenschaft: Gäste zwischen Favignana, Levanzo und Marettimo zu begleiten, mit lokaler Crew, vorbereiteten Booten und tief sizilianischer Gastfreundschaft."
      : isEn
      ? "Egadisailing was born in Trapani from a simple passion: bringing guests between Favignana, Levanzo and Marettimo with the care of a local crew, well-prepared boats and a way of welcoming people that feels deeply Sicilian."
      : "Egadisailing nasce a Trapani da una passione semplice: portare gli ospiti tra Favignana, Levanzo e Marettimo con la cura di una crew locale, barche preparate e un modo di accogliere che sa di Sicilia.",
    chips: isEs
      ? ["Excursiones desde Trapani", "Tripulación local", "Cocina a bordo"]
      : isFr
      ? ["Excursions depuis Trapani", "Équipage local", "Cuisine à bord"]
      : isDe
      ? ["Touren ab Trapani", "Lokale Crew", "Küche an Bord"]
      : isEn
      ? ["Tours from Trapani", "Local crew", "On-board cooking"]
      : ["Escursioni da Trapani", "Crew locale", "Cucina a bordo"],
    ownerLabel: isEs ? "Armador" : isFr ? "Armateur" : isDe ? "Eigner" : isEn ? "Owner" : "Armatore",
    ownerAlt: isEs
      ? "Nicolò Genna, armador de Egadisailing a bordo en las Islas Egadi"
      : isFr
      ? "Nicolò Genna, armateur Egadisailing à bord aux îles Égades"
      : isDe
      ? "Nicolò Genna, Eigner von Egadisailing an Bord auf den Ägadischen Inseln"
      : isEn
      ? "Nicolò Genna, Egadisailing owner on board in the Egadi Islands"
      : "Nicolò Genna, armatore Egadisailing a bordo alle Isole Egadi",
    ownerText: isEs
      ? "Creció con las Islas Egadi frente a él y convirtió ese conocimiento en una forma de navegar basada en hospitalidad, rutas bien elegidas y respeto por el mar."
      : isFr
      ? "Il a grandi avec les îles Égades devant lui et a transformé cette connaissance en une façon de naviguer fondée sur l'hospitalité, des routes bien choisies et le respect de la mer."
      : isDe
      ? "Er ist mit den Ägadischen Inseln vor Augen aufgewachsen und hat dieses Wissen in eine Art des Navigierens verwandelt, die auf Gastfreundschaft, gut gewählten Routen und Respekt vor dem Meer basiert."
      : isEn
      ? "He grew up with the Egadi Islands in front of him and turned that knowledge into a way of sailing built on hospitality, well-chosen routes and respect for the sea."
      : "È cresciuto con le Egadi davanti agli occhi e ha trasformato quella conoscenza in un modo di navigare fatto di accoglienza, rotte scelte bene e rispetto per il mare.",
    storyEyebrow: isEs ? "Nuestra historia" : isFr ? "Notre histoire" : isDe ? "Unsere Geschichte" : isEn ? "Our story" : "La nostra storia",
    storyTitle: isEs
      ? "Una familia de mar, una base en Trapani y las Islas Egadi delante"
      : isFr
      ? "Une famille de mer, une base à Trapani et les îles Égades devant"
      : isDe
      ? "Eine Familie des Meeres, eine Basis in Trapani und die Ägadischen Inseln voraus"
      : isEn
      ? "A seafaring family, a base in Trapani and the Egadi Islands ahead"
      : "Una famiglia di mare, una base a Trapani, le Egadi davanti",
    storyParagraphs: isEs
      ? [
          "Crecimos con las Islas Egadi en el horizonte. Las hemos visto cambiar con la luz de la mañana, con el mistral, con el siroco y con esos días de calma en los que el mar parece una lámina de cristal.",
          "Para nosotros, una excursión en barco no es solo una lista de paradas. Es elegir el momento adecuado para entrar en una cala, entender dónde el agua está más limpia y crear una hospitalidad sencilla, cuidada y memorable.",
          "Egadisailing reúne experiencia local, seguridad, confort en navegación y cocina a bordo. Es nuestra forma de compartir Favignana, Levanzo y Marettimo con quienes quieren descubrirlas sin prisas.",
        ]
      : isFr
      ? [
          "Nous avons grandi avec les îles Égades à l'horizon. Nous les avons vues changer avec la lumière du matin, le Mistral, le Sirocco et ces journées calmes où la mer ressemble à une plaque de verre.",
          "Pour nous, une excursion en bateau n'est pas une simple liste d'arrêts. C'est choisir le bon moment pour entrer dans une baie, comprendre où l'eau est plus claire et créer une hospitalité simple, soignée et mémorable.",
          "Egadisailing réunit expérience locale, sécurité, confort en navigation et cuisine à bord. C'est notre façon de partager Favignana, Levanzo et Marettimo avec des invités qui veulent les découvrir sans se presser.",
        ]
      : isDe
      ? [
          "Wir sind mit den Ägadischen Inseln am Horizont aufgewachsen. Wir haben gesehen, wie sie sich mit Morgenlicht, Mistral, Scirocco und ruhigen Tagen verändern, an denen das Meer wie Glas wirkt.",
          "Für uns ist eine Bootstour keine einfache Abfolge von Stopps. Sie bedeutet, den richtigen Moment für eine Bucht zu wählen, klareres Wasser zu lesen und eine einfache, sorgfältige und erinnerungswürdige Gastfreundschaft an Bord zu schaffen.",
          "Egadisailing verbindet lokale Erfahrung, Aufmerksamkeit für Sicherheit, Komfort in der Navigation und Küche an Bord. So teilen wir Favignana, Levanzo und Marettimo mit Gästen, die sie ohne Eile entdecken möchten.",
        ]
      : isEn
      ? [
          "We grew up with the Egadi Islands on the horizon. We have watched them change with the morning light, with the Mistral, with the Sirocco and with those calm days when the sea looks like glass and every cove becomes a small landing place.",
          "For us, a boat trip is not just a sequence of stops. It means choosing the right moment to enter a bay, understanding where the water is clearer, leaving space for silence when it is needed and creating an on-board hospitality that is simple, careful and memorable.",
          "Egadisailing brings together local experience, attention to safety, comfort while sailing and on-board cooking. It is our way of sharing Favignana, Levanzo and Marettimo with guests who want to discover them without rushing.",
        ]
      : [
          "Siamo cresciuti con le Isole Egadi all'orizzonte. Le abbiamo viste cambiare con la luce del mattino, con il Maestrale, con lo Scirocco, con quelle giornate calme in cui il mare sembra una lastra e ogni cala diventa un piccolo approdo.",
          "Per noi un'escursione in barca non è solo una sequenza di soste. È scegliere il momento giusto per entrare in una baia, capire dove il mare è più pulito, lasciare spazio al silenzio quando serve e creare a bordo un'ospitalità semplice, curata, memorabile.",
          "Egadisailing mette insieme esperienza locale, attenzione alla sicurezza, comfort in navigazione e cucina di bordo. È il nostro modo di condividere Favignana, Levanzo e Marettimo con chi vuole scoprirle senza fretta.",
        ],
    ctaEyebrow: isEs ? "Sube a bordo" : isFr ? "Montez à bord" : isDe ? "Kommen Sie an Bord" : isEn ? "Come on board" : "Sali a bordo",
    ctaTitle: isEs
      ? "La mejor forma de conocernos es pasar un día en el mar"
      : isFr
      ? "La meilleure façon de nous connaître est de passer une journée en mer"
      : isDe
      ? "Der beste Weg, uns kennenzulernen, ist ein Tag auf dem Meer"
      : isEn
      ? "The best way to get to know us is to spend a day at sea"
      : "Il modo migliore per conoscerci è vivere una giornata in mare",
    ctaText: isEs
      ? "Elige la experiencia que mejor encaja contigo y déjate guiar entre calas, rutas y sabores de las Islas Egadi."
      : isFr
      ? "Choisissez l'expérience qui vous correspond le mieux et laissez-nous vous guider entre criques, routes et saveurs des îles Égades."
      : isDe
      ? "Wählen Sie das Erlebnis, das am besten zu Ihnen passt, und lassen Sie sich zwischen Buchten, Routen und Aromen der Ägadischen Inseln führen."
      : isEn
      ? "Choose the experience that fits you best and let us guide you through the coves, routes and flavours of the Egadi Islands."
      : "Scegli l'esperienza più adatta e lasciati guidare tra le cale, le rotte e i sapori delle Egadi.",
    ctaLabel: isEs ? "Ver experiencias" : isFr ? "Voir les expériences" : isDe ? "Erlebnisse entdecken" : isEn ? "Discover the experiences" : "Scopri le esperienze",
  };

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
                {copy.eyebrow}
              </p>
              <h1 className="mt-5 font-heading text-4xl font-bold leading-[0.98] text-white sm:text-5xl md:text-6xl lg:text-7xl">
                {copy.title}
              </h1>
              <p className="mt-6 text-base leading-7 text-white/72 sm:text-lg">
                {copy.intro}
              </p>
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/76">
                {copy.chips.map((chip) => (
                  <span key={chip} className="rounded-full border border-white/16 bg-white/[0.06] px-4 py-2">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </ScrollSection>

          <ScrollSection animation="fade-right">
            <div className="relative mx-auto max-w-xl">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-white/[0.05] shadow-[0_28px_90px_rgba(0,0,0,0.38)]">
	                <Image
	                  src="/images/about/armatore.webp"
	                  alt={copy.ownerAlt}
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
                    {copy.ownerLabel}
                  </p>
                  <p className="mt-2 font-heading text-3xl font-bold leading-tight text-white">
                    Nicolò Genna
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/78 sm:text-base">
                    {copy.ownerText}
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
                {copy.storyEyebrow}
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl md:text-5xl">
                {copy.storyTitle}
              </h2>
            </div>
          </ScrollSection>

          <ScrollSection animation="fade-up" delay={0.1}>
            <div className="space-y-6 text-base leading-8 text-[#425f6f] sm:text-lg">
              {copy.storyParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </ScrollSection>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <ScrollSection animation="fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#b58a27]">
              {copy.ctaEyebrow}
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
              {copy.ctaTitle}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#425f6f] sm:text-lg">
              {copy.ctaText}
            </p>
            <Link
              href={localizedStaticPath(locale, "/experiences")}
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#092337] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#123d5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b58a27]"
            >
              {copy.ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </ScrollSection>
        </div>
      </section>
    </div>
  );
}
