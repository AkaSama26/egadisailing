import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Anchor, Compass, Utensils } from "lucide-react";
import { ScrollSection } from "@/components/scroll-section";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { localizedStaticPath } from "@/lib/i18n/static-paths";

const crew = [
  {
    role: { it: "Skipper", en: "Skipper", es: "Patrón", fr: "Skipper", de: "Skipper" },
    image: "/images/about/skipper.webp",
    alt: {
      it: "Skipper Egadisailing durante una navigazione alle Isole Egadi",
      en: "Egadisailing skipper sailing through the Egadi Islands",
      es: "Patrón de Egadisailing navegando por las Islas Egadi",
      fr: "Skipper Egadisailing en navigation aux îles Égades",
      de: "Egadisailing-Skipper auf Fahrt durch die Ägadischen Inseln",
    },
    icon: Anchor,
    description: {
      it: "Guida la rotta, legge vento e mare, sceglie le cale più riparate e rende la navigazione sicura, fluida e piacevole.",
      en: "Guides the route, reads wind and sea conditions, chooses the most sheltered coves and keeps the navigation safe, smooth and enjoyable.",
      es: "Guía la ruta, lee el viento y el mar, elige las calas más protegidas y mantiene la navegación segura, fluida y agradable.",
      fr: "Guide la route, lit le vent et la mer, choisit les criques les plus abritées et garde une navigation sûre, fluide et agréable.",
      de: "Führt die Route, liest Wind und Meer, wählt die geschütztesten Buchten und hält die Navigation sicher, flüssig und angenehm.",
    },
    note: {
      it: "Rotte sicure, ritmo giusto, conoscenza vera delle Egadi.",
      en: "Safe routes, the right rhythm and real knowledge of the Egadi Islands.",
      es: "Rutas seguras, buen ritmo y conocimiento real de las Islas Egadi.",
      fr: "Routes sûres, bon rythme et vraie connaissance des îles Égades.",
      de: "Sichere Routen, passender Rhythmus und echte Kenntnis der Ägadischen Inseln.",
    },
  },
  {
    role: { it: "Hostess", en: "Hostess", es: "Azafata", fr: "Hôtesse", de: "Hostess" },
    image: "/images/about/hostess.webp",
    alt: {
      it: "Hostess Egadisailing che accoglie gli ospiti a bordo",
      en: "Egadisailing hostess welcoming guests on board",
      es: "Azafata de Egadisailing recibiendo a los huéspedes a bordo",
      fr: "Hôtesse Egadisailing accueillant les invités à bord",
      de: "Egadisailing-Hostess begrüßt Gäste an Bord",
    },
    icon: Compass,
    description: {
      it: "Si prende cura dell'accoglienza, dei dettagli a bordo e del comfort degli ospiti, dal primo sorriso fino al rientro in porto.",
      en: "Takes care of the welcome, the details on board and guest comfort, from the first smile to the return to harbour.",
      es: "Cuida la bienvenida, los detalles a bordo y el confort de los huéspedes desde el primer saludo hasta el regreso a puerto.",
      fr: "Prend soin de l'accueil, des détails à bord et du confort des invités, du premier sourire au retour au port.",
      de: "Kümmert sich um Empfang, Details an Bord und den Komfort der Gäste vom ersten Lächeln bis zur Rückkehr in den Hafen.",
    },
    note: {
      it: "Presenza discreta, attenzione concreta, ospitalità siciliana.",
      en: "Discreet presence, practical care and Sicilian hospitality.",
      es: "Presencia discreta, atención real y hospitalidad siciliana.",
      fr: "Présence discrète, attention concrète et hospitalité sicilienne.",
      de: "Diskrete Präsenz, konkrete Aufmerksamkeit und sizilianische Gastfreundschaft.",
    },
  },
  {
    role: { it: "Chef", en: "Chef", es: "Chef", fr: "Chef", de: "Chef" },
    image: "/images/about/chef.webp",
    alt: {
      it: "Chef Egadisailing che prepara un pranzo a bordo",
      en: "Egadisailing chef preparing lunch on board",
      es: "Chef de Egadisailing preparando la comida a bordo",
      fr: "Chef Egadisailing préparant le déjeuner à bord",
      de: "Egadisailing-Chef bereitet ein Mittagessen an Bord vor",
    },
    icon: Utensils,
    description: {
      it: "Porta in tavola sapori del territorio, ingredienti freschi e piatti pensati per essere gustati con il mare intorno.",
      en: "Brings local flavours, fresh ingredients and dishes designed to be enjoyed with the sea all around.",
      es: "Lleva a la mesa sabores locales, ingredientes frescos y platos pensados para disfrutarse con el mar alrededor.",
      fr: "Apporte à table les saveurs du territoire, des ingrédients frais et des plats pensés pour être dégustés avec la mer autour.",
      de: "Bringt lokale Aromen, frische Zutaten und Gerichte an den Tisch, die mit dem Meer rundherum genossen werden.",
    },
    note: {
      it: "Cucina di bordo, prodotti locali, pranzo vista Egadi.",
      en: "On-board cooking, local produce and lunch with views of the Egadi Islands.",
      es: "Cocina a bordo, producto local y comida con vistas a las Islas Egadi.",
      fr: "Cuisine à bord, produits locaux et déjeuner avec vue sur les Égades.",
      de: "Bordküche, lokale Produkte und Mittagessen mit Blick auf die Ägadischen Inseln.",
    },
  },
] as const;

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
      ? "Tripulación local para excursiones en barco a las Islas Egadi"
      : isFr
      ? "Équipage local pour excursions en bateau aux îles Égades"
      : isDe
      ? "Lokale Crew für Bootstouren zu den Ägadischen Inseln"
      : isEn
      ? "Local Crew for Egadi Boat Tours"
      : "Crew locale per escursioni in barca alle Egadi",
    description: isEs
      ? "Conoce a Egadisailing y Nicolò Genna: armador, patrón, azafata y chef para excursiones en barco por las Islas Egadi desde Trapani."
      : isFr
      ? "Découvrez Egadisailing et Nicolò Genna : armateur, skipper, hôtesse et chef pour excursions en bateau aux îles Égades depuis Trapani."
      : isDe
      ? "Lernen Sie Egadisailing und Nicolò Genna kennen: Eigner, Skipper, Hostess und Chef für Bootstouren zu den Ägadischen Inseln ab Trapani."
      : isEn
      ? "Meet Egadisailing and Nicolò Genna: owner, skipper, hostess and chef for boat tours in the Egadi Islands from Trapani."
      : "Scopri Egadisailing e Nicolò Genna: armatore, skipper, hostess e chef per escursioni in barca alle Isole Egadi da Trapani.",
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
  const crewLocale: "it" | "en" | "es" | "fr" | "de" = isDe ? "de" : isFr ? "fr" : isEs ? "es" : isEn ? "en" : "it";
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
    crewEyebrow: isEs ? "La tripulación" : isFr ? "L'équipage" : isDe ? "Die Crew" : isEn ? "The crew" : "La crew",
    crewTitle: isEs ? "Las personas que te acompañan a bordo" : isFr ? "Les personnes qui vous accompagnent à bord" : isDe ? "Die Menschen, die Sie an Bord begleiten" : isEn ? "The people who welcome you on board" : "Le persone che ti accompagnano a bordo",
    crewIntro: isEs
      ? "Patrón, azafata y chef trabajan juntos para que cada salida tenga una ruta segura, una atención cercana y sabores que hablan del territorio."
      : isFr
      ? "Skipper, hôtesse et chef travaillent ensemble pour que chaque sortie ait une route sûre, une attention proche et des saveurs qui parlent du territoire."
      : isDe
      ? "Skipper, Hostess und Chef arbeiten zusammen, damit jede Ausfahrt eine sichere Route, aufmerksame Gastfreundschaft und Aromen des Gebiets hat."
      : isEn
      ? "Skipper, hostess and chef work together so every outing has a safe route, attentive hospitality and flavours that tell the story of the territory."
      : "Skipper, hostess e chef lavorano insieme perché ogni uscita abbia una rotta sicura, un'accoglienza attenta e sapori capaci di raccontare il territorio.",
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

      <section className="bg-[#092337] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <ScrollSection animation="fade-up">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-gold)]">
                {copy.crewEyebrow}
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
                {copy.crewTitle}
              </h2>
              <p className="mt-5 text-base leading-7 text-white/66 sm:text-lg">
                {copy.crewIntro}
              </p>
            </div>
          </ScrollSection>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {crew.map((member, index) => {
              const Icon = member.icon;

              return (
	                <ScrollSection key={member.role.it} animation="fade-up" delay={index * 0.12}>
                  <article className="h-full overflow-hidden rounded-lg border border-white/10 bg-white/[0.05] shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
                    <div className="relative aspect-[4/5] bg-white/[0.04]">
	                      <Image
	                        src={member.image}
	                        alt={member.alt[crewLocale]}
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
	                        {member.role[crewLocale]}
                      </p>
	                      <p className="mt-3 text-base leading-7 text-white/72">
	                      {member.description[crewLocale]}
	                      </p>
	                      <p className="mt-5 border-t border-white/10 pt-5 text-sm font-medium leading-6 text-white">
	                        {member.note[crewLocale]}
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
