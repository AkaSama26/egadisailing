import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ScrollSection } from "@/components/scroll-section";
import { Button } from "@/components/ui/button";
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  InfoIcon,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Waves,
} from "lucide-react";
import { env } from "@/lib/env";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { localizedPath } from "@/lib/i18n/paths";
import { favignanaGuideLinks } from "@/data/favignana-guides";
import { favignanaGuideLinksEn } from "@/data/favignana-guides-en";
import { favignanaGuideLinksEs } from "@/data/favignana-guides-es";
import { favignanaGuideLinksFr } from "@/data/favignana-guides-fr";
import { favignanaGuideLinksDe } from "@/data/favignana-guides-de";
import { levanzoGuideLinks } from "@/data/levanzo-guides";
import { levanzoGuideLinksEn } from "@/data/levanzo-guides-en";
import { levanzoGuideLinksEs } from "@/data/levanzo-guides-es";
import { levanzoGuideLinksFr } from "@/data/levanzo-guides-fr";
import { levanzoGuideLinksDe } from "@/data/levanzo-guides-de";
import { marettimoGuideLinks } from "@/data/marettimo-guides";
import { marettimoGuideLinksEn } from "@/data/marettimo-guides-en";
import { marettimoGuideLinksEs } from "@/data/marettimo-guides-es";
import { marettimoGuideLinksFr } from "@/data/marettimo-guides-fr";
import { marettimoGuideLinksDe } from "@/data/marettimo-guides-de";
import { FavignanaPoiExplorer } from "./favignana-poi-explorer";

const validSlugs = ["favignana", "levanzo", "marettimo"] as const;

const gradients: Record<string, string> = {
  favignana: "from-[#0ea5e9] to-[#0284c7]",
  levanzo: "from-[#06b6d4] to-[#0891b2]",
  marettimo: "from-[#14b8a6] to-[#0d9488]",
};

const islandSeo: Record<
  (typeof validSlugs)[number],
  {
    title: Record<string, string>;
    description: Record<string, string>;
  }
> = {
  favignana: {
    title: {
      it: "Cosa vedere a Favignana: cale, mappa, spiagge e tour da Trapani",
      en: "Favignana by Boat: Cala Rossa, Cala Azzurra and Tours from Trapani",
      es: "Favignana en barco: Cala Rossa, Cala Azzurra y tours desde Trapani",
      fr: "Favignana en bateau : Cala Rossa, Cala Azzurra et excursions depuis Trapani",
      de: "Favignana mit dem Boot: Cala Rossa, Cala Azzurra und Touren ab Trapani",
    },
    description: {
      it: "Cosa vedere a Favignana: spiagge più belle, Cala Rossa, Cala Azzurra, Bue Marino, mappa, storia Florio, come arrivare e tour da Trapani.",
      en: "Guide to Favignana by boat: Cala Rossa, Cala Azzurra, Lido Burrone and the best stops for an Egadi tour from Trapani.",
      es: "Guía de Favignana en barco: Cala Rossa, Cala Azzurra, Bue Marino, playas, snorkel y excursiones por las Islas Egadi desde Trapani.",
      fr: "Guide de Favignana en bateau : Cala Rossa, Cala Azzurra, Bue Marino, plages, snorkeling et excursions aux îles Égades depuis Trapani.",
      de: "Guide zu Favignana mit dem Boot: Cala Rossa, Cala Azzurra, Bue Marino, Strände, Schnorcheln und Bootstouren zu den Ägadischen Inseln ab Trapani.",
    },
  },
  levanzo: {
    title: {
      it: "Levanzo in barca: Cala Fredda, Cala Minnola e tour alle Egadi",
      en: "Levanzo by Boat: Cala Fredda, Cala Minnola and Egadi Tours",
      es: "Levanzo en barco: Cala Fredda, Cala Minnola y excursiones Egadi",
      fr: "Levanzo en bateau : Cala Fredda, Cala Minnola et excursions aux Égades",
      de: "Levanzo mit dem Boot: Cala Fredda, Cala Minnola und Ägadische Inseln Touren",
    },
    description: {
      it: "Guida a Levanzo in barca: Cala Fredda, Cala Minnola, Grotta del Genovese e le soste migliori per snorkeling alle Egadi.",
      en: "Guide to Levanzo by boat: Cala Fredda, Cala Minnola, Grotta del Genovese and the best snorkelling stops in the Egadi Islands.",
      es: "Guía de Levanzo en barco: Cala Fredda, Cala Minnola, Grotta del Genovese y mejores paradas para snorkel en las Islas Egadi.",
      fr: "Guide de Levanzo en bateau : Cala Fredda, Cala Minnola, Grotte du Genovese et meilleures haltes de snorkeling aux îles Égades.",
      de: "Guide zu Levanzo mit dem Boot: Cala Fredda, Cala Minnola, Grotta del Genovese und die besten Schnorchelstopps auf den Ägadischen Inseln.",
    },
  },
  marettimo: {
    title: {
      it: "Marettimo in barca: grotte marine, Cala Bianca e tour Egadi",
      en: "Marettimo by Boat: Sea Caves, Cala Bianca and Egadi Tours",
      es: "Marettimo en barco: cuevas marinas, Cala Bianca y charter Egadi",
      fr: "Marettimo en bateau : grottes marines, Cala Bianca et charter Égades",
      de: "Marettimo mit dem Boot: Meereshöhlen, Cala Bianca und Charter",
    },
    description: {
      it: "Guida a Marettimo in barca: grotte marine, Cala Bianca, Punta Troia e rotte per scoprire l'isola più selvaggia delle Egadi.",
      en: "Guide to Marettimo by boat: sea caves, Cala Bianca, Punta Troia and routes to discover the wildest Egadi island.",
      es: "Guía de Marettimo en barco: cuevas marinas, Cala Bianca, Punta Troia y rutas para descubrir la isla más salvaje de las Egadi.",
      fr: "Guide de Marettimo en bateau : grottes marines, Cala Bianca, Punta Troia et itinéraires pour découvrir l'île la plus sauvage des Égades.",
      de: "Guide zu Marettimo mit dem Boot: Meereshöhlen, Cala Bianca, Punta Troia und Routen zur wildesten Insel der Ägadischen Inseln.",
    },
  },
};

function localize(value: Record<string, string>, locale: string) {
  return value[locale] ?? value.it;
}

function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const favignanaHeroStats = [
  { label: "Isola", value: "La maggiore delle Egadi" },
  { label: "Esperienza", value: "Cale, tufo e snorkeling" },
  { label: "Partenza", value: "Tour in barca da Trapani" },
];

const favignanaCoveGroups = [
  {
    title: "Cale iconiche dal mare",
    description:
      "Cala Rossa, Bue Marino e Scalo Cavallo mostrano la Favignana più scenografica: roccia calcarea, tagli di tufo, acqua profonda e colori che cambiano con il sole.",
    places: ["Cala Rossa", "Bue Marino", "Scalo Cavallo", "Cave Florio"],
  },
  {
    title: "Acqua facile e soste morbide",
    description:
      "Cala Azzurra, Lido Burrone e Marasolo sono perfette per chi cerca bagni lunghi, fondali più chiari e un ritmo rilassato, soprattutto quando si viaggia con ospiti poco abituati alla barca.",
    places: ["Cala Azzurra", "Lido Burrone", "Marasolo", "Cala Graziosa"],
  },
  {
    title: "Snorkeling, rocce e tramonto",
    description:
      "Grotta Perciata, Punta Fanfalo, Cala Rotonda e Punta Sottile raccontano un'isola più laterale: archi naturali, costa bassa, scorci occidentali e punti ideali quando la luce scende.",
    places: ["Grotta Perciata", "Cala Rotonda", "Punta Fanfalo", "Punta Sottile"],
  },
];

const favignanaHistoryBlocks = [
  {
    title: "Ex Stabilimento Florio e Tonnara",
    description:
      "L'ex Stabilimento Florio è il grande luogo della memoria marinara di Favignana. Macchinari, barche, sale museali e testimonianze raccontano la pesca del tonno e il lavoro dei tonnaroti, una parte essenziale dell'identità dell'isola.",
  },
  {
    title: "Palazzo Florio",
    description:
      "Palazzo Florio accoglie chi arriva vicino al porto e racconta la stagione in cui la famiglia Florio trasformò Favignana in un centro economico, produttivo e culturale del Mediterraneo.",
  },
  {
    title: "Castello di Santa Caterina",
    description:
      "Il castello domina il Monte Santa Caterina e aiuta a leggere la forma dell'isola dall'alto: il paese, le cave, la costa nord più rocciosa e il versante sud più morbido.",
  },
  {
    title: "Cala San Nicola e archeologia",
    description:
      "L'area di Cala San Nicola conserva tracce antiche legate agli approdi, alla lavorazione del pesce e alla presenza romana e tardoantica. È il punto giusto per ricordare che Favignana non è solo mare.",
  },
];

const favignanaNatureStats = [
  {
    value: "53.992 ha",
    label: "Area Marina Protetta Isole Egadi",
  },
  {
    value: "12.536 ha",
    label: "Prateria di Posidonia oceanica",
  },
  {
    value: "77",
    label: "Siti di immersione censiti dall'AMP",
  },
];

const favignanaBoatTips = [
  "La rotta migliore nasce dal vento: Maestrale, Scirocco e Grecale cambiano molto la scelta delle soste.",
  "Cala Rossa e Bue Marino sono magnifiche, ma vanno vissute quando mare e sicurezza lo permettono.",
  "In una giornata ben costruita si alternano cale celebri, passaggi panoramici e soste meno affollate.",
  "La barca permette di leggere Favignana dal suo lato più vero: cave, fondali, faraglioni e profilo costiero.",
];

const favignanaSearchIntentCards = [
  {
    question: "Cosa vedere a Favignana in un giorno?",
    answer:
      "Per una prima visita concentrati su Cala Rossa, Bue Marino, Cala Azzurra, il centro, Palazzo Florio e l'Ex Stabilimento Florio. In barca puoi vedere più costa senza perdere tempo negli spostamenti via terra.",
  },
  {
    question: "Quali sono le spiagge più belle di Favignana?",
    answer:
      "Le più cercate sono Cala Rossa, Cala Azzurra, Bue Marino, Lido Burrone, Grotta Perciata, Cala Rotonda e Scalo Cavallo. Non sono tutte uguali: alcune sono rocciose, altre più semplici per il bagno.",
  },
  {
    question: "Come arrivare a Favignana da Trapani?",
    answer:
      "Si arriva via mare dal porto di Trapani con collegamenti di linea o con escursioni organizzate. Se scegli un tour in barca, l'esperienza parte già da Trapani e non devi organizzare spostamenti sull'isola.",
  },
  {
    question: "Come muoversi a Favignana senza macchina?",
    answer:
      "Bici, e-bike e scooter sono le soluzioni più usate per chi resta sull'isola. Per una giornata di mare, però, la barca evita discese rocciose, parcheggi e cambi di mezzo tra una cala e l'altra.",
  },
  {
    question: "Meglio Favignana o Levanzo?",
    answer:
      "Favignana è più grande, varia e ricca di cale famose; Levanzo è più raccolta, silenziosa e scenografica. Quando il meteo lo permette, abbinarle nello stesso tour è spesso la scelta più completa.",
  },
  {
    question: "Quando andare a Favignana?",
    answer:
      "Da maggio a ottobre l'isola offre mare e luce molto forti. Luglio e agosto sono i mesi più richiesti; giugno, settembre e inizio ottobre sono spesso più equilibrati per clima, mare e affollamento.",
  },
];

const favignanaPlanningBlocks = [
  {
    title: "Favignana in un giorno",
    icon: Clock,
    description:
      "Se hai solo una giornata, evita di trasformarla in una corsa. Scegli poche tappe forti: una cala iconica, una sosta bagno più tranquilla, un passaggio nel centro e almeno un riferimento storico come la tonnara Florio.",
    points: ["Cala Rossa o Bue Marino", "Cala Azzurra o Lido Burrone", "Centro e area Florio"],
  },
  {
    title: "Come arrivare da Trapani",
    icon: Anchor,
    description:
      "La domanda più pratica è se raggiungere l'isola con mezzi di linea o vivere direttamente un'escursione in barca. La prima soluzione è adatta a chi vuole camminare o noleggiare un mezzo; la seconda è più comoda per vedere le cale dal mare.",
    points: ["Porto di Trapani", "Collegamenti di linea", "Tour in barca con rotta inclusa"],
  },
  {
    title: "Come muoversi sull'isola",
    icon: Compass,
    description:
      "Favignana è abbastanza pianeggiante, ma le cale non sono tutte vicine e alcuni accessi sono rocciosi. Bici ed e-bike funzionano bene per chi resta a terra; la barca è più efficiente per vedere più costa in meno tempo.",
    points: ["Bici ed e-bike", "Scooter", "Barca per cale e snorkeling"],
  },
  {
    title: "Spiagge per famiglie",
    icon: ShieldCheck,
    description:
      "Chi cerca ingressi più semplici guarda spesso Cala Azzurra, Lido Burrone e Marasolo. Cala Rossa e Bue Marino sono splendide, ma più rocciose e meno immediate per bambini piccoli o persone poco agili.",
    points: ["Cala Azzurra", "Lido Burrone", "Marasolo"],
  },
];

const favignanaAttractions = [
  {
    name: "Cala Rossa",
    description:
      "Baia rocciosa e scenografica di Favignana, nota per acqua turchese, calcarenite e antiche cave.",
  },
  {
    name: "Bue Marino",
    description:
      "Tratto costiero con cave di tufo, mare intenso e fondali adatti allo snorkeling con condizioni favorevoli.",
  },
  {
    name: "Cala Azzurra",
    description:
      "Cala luminosa con fondale chiaro e acqua bassa, molto amata per bagni rilassati e soste facili.",
  },
  {
    name: "Lido Burrone",
    description:
      "Spiaggia sabbiosa del versante sud, comoda e adatta anche a famiglie e bambini.",
  },
  {
    name: "Ex Stabilimento Florio",
    description:
      "Museo e complesso storico della tonnara di Favignana, legato alla pesca del tonno e alla famiglia Florio.",
  },
  {
    name: "Palazzo Florio",
    description:
      "Residenza storica progettata per la famiglia Florio, vicino al porto e al centro dell'isola.",
  },
  {
    name: "Castello di Santa Caterina",
    description:
      "Punto panoramico sul Monte Santa Caterina, riferimento storico e visuale del profilo di Favignana.",
  },
];

const favignanaFaqs = [
  {
    question: "Cosa vedere a Favignana in un giorno?",
    answer:
      "In un giorno conviene scegliere poche tappe ben collegate: Cala Rossa o Bue Marino per il lato più scenografico, Cala Azzurra o Lido Burrone per un bagno più semplice, il centro vicino al porto, Palazzo Florio e l'Ex Stabilimento Florio. Con un tour in barca da Trapani puoi vedere più costa senza dover noleggiare bici o scooter sull'isola.",
  },
  {
    question: "Quali sono le spiagge più belle di Favignana?",
    answer:
      "Tra le spiagge e cale più cercate ci sono Cala Rossa, Cala Azzurra, Bue Marino, Lido Burrone, Grotta Perciata, Scalo Cavallo, Cala Rotonda, Cala Grande e Punta Sottile. La scelta migliore dipende dal vento: una cala bellissima con mare formato può essere meno piacevole di una baia più riparata.",
  },
  {
    question: "Quali sono le cale più belle di Favignana da vedere in barca?",
    answer:
      "Le soste più richieste sono Cala Rossa, Bue Marino, Cala Azzurra, Grotta Perciata, Scalo Cavallo e Cala Rotonda. La scelta reale dipende sempre dal vento e dal mare: una buona uscita in barca non forza una cala, ma sceglie il versante più bello e sicuro del giorno.",
  },
  {
    question: "Come arrivare a Favignana da Trapani?",
    answer:
      "Favignana si raggiunge via mare dal porto di Trapani, con collegamenti di linea o con tour organizzati. Se l'obiettivo è vedere le cale, un tour in barca da Trapani evita l'organizzazione degli spostamenti sull'isola e permette di vivere subito la costa dal mare.",
  },
  {
    question: "Meglio aliscafo, traghetto o tour in barca per Favignana?",
    answer:
      "Aliscafo e traghetto sono utili se vuoi sbarcare a Favignana e gestire la giornata in autonomia. Il tour in barca è più adatto se vuoi vedere cale, snorkeling e costa senza pensare a noleggi, parcheggi o accessi rocciosi. Sono due esperienze diverse, non una sostituzione perfetta.",
  },
  {
    question: "Come muoversi a Favignana senza macchina?",
    answer:
      "Le soluzioni più comuni sono bici, e-bike, scooter e taxi locali. Molte persone scelgono mezzi leggeri perché l'isola è abbastanza pianeggiante, ma alcune cale richiedono comunque tratti a piedi. In estate possono esserci limitazioni ai veicoli non residenti: conviene verificare sempre le comunicazioni aggiornate del Comune.",
  },
  {
    question: "Quanto tempo serve per visitare Favignana?",
    answer:
      "Per un assaggio basta una giornata, soprattutto se fatta in barca. Due o tre giorni permettono di vivere anche il paese, il tramonto, l'Ex Stabilimento Florio e i versanti meno frequentati. Una settimana è ideale per chi vuole alternare mare, bici, snorkeling e ritmi lenti.",
  },
  {
    question: "Quando andare a Favignana?",
    answer:
      "Il periodo più richiesto va da giugno a settembre. Luglio e agosto hanno mare caldo e molta vita, ma anche più affollamento. Maggio, giugno, settembre e inizio ottobre sono spesso ottimi per chi cerca luce, bagni, meno folla e un ritmo più rilassato.",
  },
  {
    question: "Cala Rossa è sempre visitabile durante un tour?",
    answer:
      "Cala Rossa è una delle tappe simbolo di Favignana, ma non va promessa come sosta garantita. Con vento, onda o troppo affollamento può essere più intelligente passarci in navigazione e fermarsi in una baia più riparata.",
  },
  {
    question: "Cala Rossa è adatta ai bambini?",
    answer:
      "Cala Rossa è splendida ma rocciosa, con accessi via terra meno semplici rispetto a una spiaggia sabbiosa. Per bambini piccoli o ospiti poco agili spesso sono più comode Cala Azzurra, Lido Burrone o una sosta in barca scelta in base al mare calmo.",
  },
  {
    question: "Favignana è adatta a famiglie e bambini?",
    answer:
      "Sì, soprattutto scegliendo soste come Cala Azzurra, Lido Burrone, Marasolo o altre baie con acqua più calma. In barca il vantaggio è poter adattare ritmo, soste e tempi alle persone a bordo.",
  },
  {
    question: "Dove fare snorkeling a Favignana?",
    answer:
      "Le zone più interessanti per snorkeling cambiano con vento e visibilità. Bue Marino, Scalo Cavallo, Grotta Perciata, Cala Rossa e alcuni tratti verso Cala Rotonda possono offrire fondali rocciosi e acqua molto limpida. Bisogna sempre rispettare le regole dell'Area Marina Protetta.",
  },
  {
    question: "Cosa vedere a Favignana oltre al mare?",
    answer:
      "Oltre alle cale, vale la pena conoscere l'Ex Stabilimento Florio, Palazzo Florio, il Castello di Santa Caterina, le cave di tufo e l'area di Cala San Nicola. Sono luoghi che raccontano tonnara, famiglia Florio, archeologia e lavoro sull'isola.",
  },
  {
    question: "Si può visitare Favignana e Levanzo nello stesso giorno?",
    answer:
      "Sì, è una delle combinazioni più richieste nei tour in barca da Trapani. Favignana offre cale più famose e varietà di costa; Levanzo aggiunge un ritmo più silenzioso, acqua trasparente e un borgo molto piccolo. La fattibilità dipende da durata del tour e meteo marino.",
  },
  {
    question: "Meglio Favignana o Levanzo per un tour da Trapani?",
    answer:
      "Favignana offre più cale, più varietà e una forte identità storica. Levanzo è più piccola, silenziosa e intima. Molti tour combinano entrambe quando meteo e durata lo permettono, così si vive il contrasto tra le due isole.",
  },
  {
    question: "Si può fare snorkeling a Favignana?",
    answer:
      "Sì. Favignana è dentro l'Area Marina Protetta delle Isole Egadi e offre fondali molto diversi: sabbia chiara, roccia, praterie di Posidonia e tratti più profondi. Lo snorkeling va fatto rispettando regole dell'AMP, mare e indicazioni della crew.",
  },
];

function buildFavignanaJsonLd(base: string, locale: string, pageUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Egadisailing", item: `${base}/${locale}` },
          { "@type": "ListItem", position: 2, name: "Le Isole Egadi", item: `${base}/${locale}/islands` },
          { "@type": "ListItem", position: 3, name: "Favignana", item: pageUrl },
        ],
      },
      {
        "@type": "TouristDestination",
        name: "Favignana",
        description:
          "Cosa vedere a Favignana: cale, spiagge, storia Florio, Area Marina Protetta, mappa interattiva e consigli per tour alle Isole Egadi da Trapani.",
        url: pageUrl,
        containedInPlace: {
          "@type": "Place",
          name: "Isole Egadi",
        },
      },
      {
        "@type": "WebPage",
        name: "Cosa vedere a Favignana: cale, spiagge e tour da Trapani",
        description:
          "Guida a Favignana con risposte pratiche: cosa vedere in un giorno, spiagge più belle, come arrivare, come muoversi e tour in barca.",
        url: pageUrl,
        primaryImageOfPage: `${base}/images/islands/favignana/hero.webp`,
        about: favignanaAttractions.map((attraction) => ({
          "@type": "Thing",
          name: attraction.name,
        })),
      },
      {
        "@type": "ItemList",
        name: "Cosa vedere a Favignana",
        itemListElement: favignanaAttractions.map((attraction, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "TouristAttraction",
            name: attraction.name,
            description: attraction.description,
            containedInPlace: {
              "@type": "Place",
              name: "Favignana",
            },
          },
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: favignanaFaqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!validSlugs.includes(slug as any)) return { title: "Not Found" };
  const seo = islandSeo[slug as (typeof validSlugs)[number]];
  return buildPageMetadata({
    title: localize(seo.title, locale),
    description: localize(seo.description, locale),
    path: `/islands/${slug}`,
    locale,
    image: slug === "favignana" ? "/images/islands/favignana/hero.webp" : undefined,
  });
}

export default async function IslandDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  if (!validSlugs.includes(slug as any)) {
    notFound();
  }

  if (slug === "favignana" && locale === "it") {
    return <FavignanaDetailPage locale={locale} />;
  }

  const t = await getTranslations("islands");
  const base = env.APP_URL.replace(/\/$/, "");
  const pageUrl = `${base}${localizedPath(locale, `/islands/${slug}`)}`;
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Egadisailing", item: `${base}/${locale}` },
          { "@type": "ListItem", position: 2, name: t("title"), item: `${base}${localizedPath(locale, "/islands")}` },
          { "@type": "ListItem", position: 3, name: t(`${slug}.name`), item: pageUrl },
        ],
      },
      {
        "@type": "TouristDestination",
        name: t(`${slug}.name`),
        description: t(`${slug}.description`),
        url: pageUrl,
        inLanguage: locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : locale === "es" ? "es-ES" : locale === "en" ? "en-US" : "it-IT",
        containedInPlace: {
          "@type": "Place",
          name: locale === "de" ? "Ägadische Inseln" : locale === "en" ? "Egadi Islands" : locale === "es" ? "Islas Egadi" : locale === "fr" ? "Îles Égades" : "Isole Egadi",
        },
      },
    ],
  };

  const highlights = t(`${slug}.highlights`)
    .split(",")
    .map((h) => h.trim());

  return (
    <div className="bg-[#fefce8]/30 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(json) }} />
      {/* Hero */}
      <section
        className={`pt-32 pb-20 px-6 md:px-12 lg:px-20 bg-gradient-to-br ${gradients[slug]}`}
      >
        <div className="max-w-4xl mx-auto">
          <ScrollSection animation="fade-up">
            <Link
              href={localizedPath(locale, "/islands")}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("title")}
            </Link>

            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t(`${slug}.name`)}
            </h1>
          </ScrollSection>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-20 py-16 space-y-16">
        {/* Description */}
        <ScrollSection animation="fade-up">
          <p className="text-lg leading-relaxed text-muted-foreground">
            {t(`${slug}.description`)}
          </p>
        </ScrollSection>

        {slug === "favignana" ? <FavignanaGuideHub locale={locale} /> : null}
        {slug === "levanzo" ? <LevanzoGuideHub locale={locale} /> : null}
        {slug === "marettimo" ? <MarettimoGuideHub locale={locale} /> : null}

        {/* Highlights */}
        <ScrollSection animation="fade-up">
          <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)] mb-8">
            {locale === "es" ? "Puntos destacados" : locale === "fr" ? "Points forts" : locale === "de" ? "Highlights" : locale === "en" ? "Highlights" : "In evidenza"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlights.map((highlight, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-5 rounded-xl bg-white/80 shadow-sm"
              >
                <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-turquoise)]/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-[var(--color-turquoise)]" />
                </div>
                <span className="font-medium text-[var(--color-ocean)]">
                  {highlight}
                </span>
              </div>
            ))}
          </div>
        </ScrollSection>

        {/* Placeholder gallery */}
        <ScrollSection animation="fade-up">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className={`aspect-square rounded-xl bg-gradient-to-br ${gradients[slug]} opacity-${20 + n * 10} flex items-center justify-center`}
                style={{ opacity: 0.15 + n * 0.1 }}
              >
                <Compass className="h-8 w-8 text-white/40" />
              </div>
            ))}
          </div>
        </ScrollSection>

        {/* CTA */}
        <ScrollSection animation="fade-up">
          <div className="text-center py-10 px-6 rounded-2xl bg-gradient-to-br from-[#0ea5e9] via-[#0284c7] to-[#0369a1]">
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-white mb-4">
              {t("discoverExperiences")}
            </h2>
            <Link href={localizedPath(locale, "/experiences")}>
              <Button
                size="lg"
                className="bg-white text-[var(--color-ocean)] hover:bg-white/90 font-semibold text-lg px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                {t("discoverExperiences")}
              </Button>
            </Link>
          </div>
        </ScrollSection>
      </div>
    </div>
  );
}

function LevanzoGuideHub({ locale }: { locale: string }) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const guides = isDe ? levanzoGuideLinksDe : isFr ? levanzoGuideLinksFr : isEs ? levanzoGuideLinksEs : isEn ? levanzoGuideLinksEn : levanzoGuideLinks;

  return (
    <ScrollSection animation="fade-up">
      <section className="rounded-2xl border border-[#d9c79d] bg-white p-6 shadow-[0_18px_54px_rgba(10,38,55,0.08)] sm:p-8">
        <div className="mb-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#b58a27]">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {isEs ? "Guías de Levanzo" : isFr ? "Guides de Levanzo" : isDe ? "Levanzo-Guides" : isEn ? "Levanzo guides" : "Guide su Levanzo"}
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337]">
            {isEs
              ? "Guías prácticas para calas, Grotta del Genovese y excursiones en barco"
              : isFr
              ? "Guides pratiques pour les criques, la Grotte du Genovese et les excursions en bateau"
              : isDe
              ? "Praktische Guides zu Buchten, Grotta del Genovese und Bootstouren"
              : isEn
              ? "Practical guides for coves, Grotta del Genovese and boat tours"
              : "Approfondimenti per organizzare calette, grotta e tour in barca"}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#425f6f]">
            {isEs
              ? "Levanzo es pequeña, pero necesita el plan adecuado: estas guías ayudan a entender qué ver, dónde bañarse, cómo llegar desde Trapani y cuándo conviene vivir la isla directamente desde el mar."
              : isFr
              ? "Levanzo est petite, mais elle demande le bon plan : ces guides expliquent quoi voir, où se baigner, comment venir depuis Trapani et quand vivre l'île directement depuis la mer."
              : isDe
              ? "Levanzo ist klein, braucht aber den richtigen Plan: Diese Guides zeigen, was Sie sehen können, wo Sie baden, wie Sie ab Trapani anreisen und wann die Insel direkt vom Meer aus am schönsten ist."
              : isEn
              ? "Levanzo is small, but it needs the right plan: these guides help you understand what to see, where to swim, how to get there from Trapani and when it is better to experience the island directly from the sea."
              : "Levanzo è piccola, ma va scelta bene: qui trovi guide pratiche per capire cosa vedere, dove fare il bagno, come arrivare da Trapani e quando conviene viverla direttamente dal mare."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={localizedPath(locale, `/islands/levanzo/${guide.slug}`)}
              className="group flex min-h-full flex-col rounded-lg border border-[#d9c79d] bg-[#fbf7ee] p-5 transition hover:-translate-y-1 hover:border-[#b58a27] hover:bg-white hover:shadow-[0_14px_42px_rgba(10,38,55,0.1)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b58a27]">
                Levanzo
              </p>
              <h3 className="mt-3 font-heading text-xl font-bold leading-tight text-[#092337]">
                {guide.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-[#425f6f]">
                {guide.description}
              </p>
              <span className="mt-5 inline-flex items-center text-sm font-bold text-[#092337]">
                {isEs ? "Leer la guía" : isFr ? "Lire le guide" : isDe ? "Guide lesen" : isEn ? "Read the guide" : "Leggi la guida"}
                <ArrowRight
                  className="ml-2 h-4 w-4 transition group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </ScrollSection>
  );
}

function MarettimoGuideHub({ locale }: { locale: string }) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const guides = isDe ? marettimoGuideLinksDe : isFr ? marettimoGuideLinksFr : isEs ? marettimoGuideLinksEs : isEn ? marettimoGuideLinksEn : marettimoGuideLinks;

  return (
    <ScrollSection animation="fade-up">
      <section className="rounded-2xl border border-[#d9c79d] bg-white p-6 shadow-[0_18px_54px_rgba(10,38,55,0.08)] sm:p-8">
        <div className="mb-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#b58a27]">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {isEs ? "Guías de Marettimo" : isFr ? "Guides de Marettimo" : isDe ? "Marettimo-Guides" : isEn ? "Marettimo guides" : "Guide su Marettimo"}
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337]">
            {isEs
              ? "Guías prácticas para cuevas marinas, senderos, Cala Bianca y charter"
              : isFr
              ? "Guides pratiques pour les grottes marines, sentiers, Cala Bianca et charter"
              : isDe
              ? "Praktische Guides zu Meereshöhlen, Wanderwegen, Cala Bianca und Charter"
              : isEn
              ? "Practical guides for sea caves, trails, Cala Bianca and charter routes"
              : "Approfondimenti per grotte, sentieri, Cala Bianca e charter"}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#425f6f]">
            {isEs
              ? "Marettimo es la isla más salvaje y más dependiente de la meteorología de las Egadi: estas guías ayudan a entender qué ver, qué calas valorar, cómo llegar desde Trapani y cuándo tiene sentido incluirla en un charter."
              : isFr
              ? "Marettimo est l'île la plus sauvage et la plus dépendante de la météo aux Égades : ces guides aident à comprendre quoi voir, quelles criques privilégier, comment venir depuis Trapani et quand l'intégrer dans un charter."
              : isDe
              ? "Marettimo ist die wildeste und wetterabhängigste Insel der Ägadischen Inseln: Diese Guides helfen zu verstehen, was Sie sehen, welche Buchten sinnvoll sind, wie Sie ab Trapani anreisen und wann sie in einen Charter passt."
              : isEn
              ? "Marettimo is the wildest and most weather-dependent of the Egadi Islands: these guides help you understand what to see, which coves to consider, how to get there from Trapani and when it makes sense to include it in a charter."
              : "Marettimo è l'isola più selvaggia e meteo-dipendente delle Egadi: qui trovi guide pratiche per capire cosa vedere, quali cale valutare, come arrivare da Trapani e quando conviene inserirla in un charter."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={localizedPath(locale, `/islands/marettimo/${guide.slug}`)}
              className="group flex min-h-full flex-col rounded-lg border border-[#d9c79d] bg-[#fbf7ee] p-5 transition hover:-translate-y-1 hover:border-[#b58a27] hover:bg-white hover:shadow-[0_14px_42px_rgba(10,38,55,0.1)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b58a27]">
                Marettimo
              </p>
              <h3 className="mt-3 font-heading text-xl font-bold leading-tight text-[#092337]">
                {guide.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-[#425f6f]">
                {guide.description}
              </p>
              <span className="mt-5 inline-flex items-center text-sm font-bold text-[#092337]">
                {isEs ? "Leer la guía" : isFr ? "Lire le guide" : isDe ? "Guide lesen" : isEn ? "Read the guide" : "Leggi la guida"}
                <ArrowRight
                  className="ml-2 h-4 w-4 transition group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </ScrollSection>
  );
}

function FavignanaGuideHub({ locale }: { locale: string }) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const guides = isDe ? favignanaGuideLinksDe : isFr ? favignanaGuideLinksFr : isEs ? favignanaGuideLinksEs : isEn ? favignanaGuideLinksEn : favignanaGuideLinks;

  return (
    <ScrollSection animation="fade-up">
      <section className="rounded-2xl border border-[#d9c79d] bg-white p-6 shadow-[0_18px_54px_rgba(10,38,55,0.08)] sm:p-8">
        <div className="mb-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#b58a27]">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {isEs ? "Guías de Favignana" : isFr ? "Guides de Favignana" : isDe ? "Favignana-Guides" : isEn ? "Favignana guides" : "Guide su Favignana"}
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337]">
            {isEs
              ? "Guías prácticas para playas, calas y excursiones en barco"
              : isFr
              ? "Guides pratiques pour les plages, les criques et les excursions en bateau"
              : isDe
              ? "Praktische Guides zu Stränden, Buchten und Bootstouren"
              : isEn
              ? "Practical guides for beaches, coves and boat tours"
              : "Approfondimenti per organizzare mare, cale e tour in barca"}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#425f6f]">
            {isEs
              ? "Aquí tienes guías prácticas para decidir qué ver, dónde bañarte, cómo llegar desde Trapani y qué excursión en barco elegir entre Favignana y Levanzo."
              : isFr
              ? "Voici des guides pratiques pour choisir quoi voir, où se baigner, comment venir depuis Trapani et quelle excursion en bateau choisir entre Favignana et Levanzo."
              : isDe
              ? "Hier finden Sie praktische Guides, um zu entscheiden, was Sie sehen, wo Sie baden, wie Sie ab Trapani anreisen und welche Bootstour zwischen Favignana und Levanzo passt."
              : isEn
              ? "Explore dedicated Favignana guides for the best beaches, Cala Rossa, Bue Marino, snorkeling, one-day itineraries from Trapani and boat tours between Favignana and Levanzo."
              : "Qui trovi guide pratiche per scegliere cosa vedere, dove fare il bagno, come arrivare da Trapani e quale tour in barca valutare tra Favignana e Levanzo."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={localizedPath(locale, `/islands/favignana/${guide.slug}`)}
              className="group flex min-h-full flex-col rounded-lg border border-[#d9c79d] bg-[#fbf7ee] p-5 transition hover:-translate-y-1 hover:border-[#b58a27] hover:bg-white hover:shadow-[0_14px_42px_rgba(10,38,55,0.1)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b58a27]">
                Favignana
              </p>
              <h3 className="mt-3 font-heading text-xl font-bold leading-tight text-[#092337]">
                {guide.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-[#425f6f]">
                {guide.description}
              </p>
              <span className="mt-5 inline-flex items-center text-sm font-bold text-[#092337]">
                {isEs ? "Leer la guía" : isFr ? "Lire le guide" : isDe ? "Guide lesen" : isEn ? "Read the guide" : "Leggi la guida"}
                <ArrowRight
                  className="ml-2 h-4 w-4 transition group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </ScrollSection>
  );
}

function FavignanaDetailPage({ locale }: { locale: string }) {
  const base = env.APP_URL.replace(/\/$/, "");
  const pageUrl = `${base}${localizedPath(locale, "/islands/favignana")}`;
  const json = buildFavignanaJsonLd(base, locale, pageUrl);

  return (
    <div className="min-h-screen bg-[#f7f1e6] text-[#092337]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(json) }} />

      <section className="relative isolate min-h-[92svh] overflow-hidden bg-[#071934] px-4 pb-12 pt-28 text-white sm:px-6 lg:px-8">
        <Image
          src="/images/islands/favignana/hero.webp"
          alt="Favignana vista dal mare nelle Isole Egadi"
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,25,52,0.90)_0%,rgba(7,25,52,0.64)_48%,rgba(7,25,52,0.22)_100%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-[linear-gradient(180deg,transparent_0%,#071934_100%)]"
          aria-hidden="true"
        />

        <div className="mx-auto flex min-h-[calc(92svh-10rem)] max-w-7xl flex-col justify-center">
          <Link
            href={localizedPath(locale, "/islands")}
            className="mb-8 inline-flex w-fit items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white/78 backdrop-blur transition hover:border-white/40 hover:bg-white/16 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Le Isole Egadi
          </Link>

          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-gold)]">
              Guida a Favignana
            </p>
            <h1 className="mt-5 max-w-full font-heading text-[2rem] font-bold leading-[1] text-white min-[430px]:text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block">Favignana in barca:</span>
              <span className="block">cale, storia e mappa</span>
              <span className="block">dell&apos;isola</span>
            </h1>
            <p className="mt-6 max-w-[22rem] text-base leading-7 text-white/78 sm:max-w-2xl sm:text-lg">
              La più grande delle Egadi è una piccola geografia di contrasti:
              Cala Rossa e Bue Marino, spiagge chiare, cave di tufo, la memoria
              della tonnara Florio e un mare che cambia carattere a ogni versante.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={localizedPath(locale, "/experiences")} className="w-full sm:w-auto">
                <Button className="h-11 w-full rounded-md bg-[var(--color-gold)] px-5 text-sm font-bold text-[#071934] shadow-[0_16px_36px_rgba(0,0,0,0.22)] hover:bg-[#f0c35a] sm:w-auto">
                  Vedi tour per Favignana
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="#mappa-favignana" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-md border-white/30 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur hover:bg-white/18 hover:text-white sm:w-auto"
                >
                  Apri la mappa
                  <MapPin className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>

          <dl className="mt-12 grid max-w-4xl gap-3 sm:grid-cols-3">
            {favignanaHeroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-white/16 bg-white/10 p-4 backdrop-blur"
              >
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-white/56">
                  {stat.label}
                </dt>
                <dd className="mt-2 text-sm font-bold text-white sm:text-base">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <main>
        <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#b58a27]">
                Perché partire da qui
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
                Favignana è l&apos;isola delle Egadi che cambia volto più velocemente
              </h2>
            </div>
            <div className="space-y-5 text-base leading-7 text-[#425f6f] sm:text-lg">
              <p>
                A pochi tratti di navigazione da Trapani, Favignana concentra molti
                paesaggi in una sola isola. Il lato nord è più roccioso e segnato
                dalla calcarenite; il versante sud alterna fondali chiari, spiagge
                e cale più morbide; il ponente apre verso tramonti, faro e profilo
                più silenzioso.
              </p>
              <p>
                Per questo è una destinazione perfetta da vivere in barca: non si
                tratta solo di “spuntare” Cala Rossa, ma di scegliere il lato giusto
                in base al mare, alternare bagni e navigazione lenta, leggere cave,
                tonnara e costa come parti della stessa storia.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#b58a27]">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Domande frequenti
                </p>
                <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
                  Le risposte rapide prima di organizzare Favignana
                </h2>
                <p className="mt-5 text-base leading-7 text-[#425f6f] sm:text-lg">
                  Prima di prenotare, quasi tutti vogliono capire cosa vedere,
                  quali spiagge scegliere, come arrivare da Trapani e se conviene
                  muoversi via terra o via mare. Qui trovi le risposte essenziali,
                  poi sotto entriamo nei dettagli.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {favignanaSearchIntentCards.map((item) => (
                  <article
                    key={item.question}
                    className="rounded-lg border border-[#d9c79d] bg-[#fbf7ee] p-5 shadow-[0_12px_36px_rgba(10,38,55,0.06)]"
                  >
                    <h3 className="font-heading text-xl font-bold leading-tight text-[#092337]">
                      {item.question}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#425f6f]">
                      {item.answer}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f7f1e6] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#b58a27]">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  {locale === "es" ? "Guías de Favignana" : locale === "fr" ? "Guides de Favignana" : locale === "en" ? "Favignana guides" : "Guide su Favignana"}
                </p>
                <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
                  {locale === "es"
                    ? "Ideas prácticas para organizar mar, calas y tours sin dudas"
                    : locale === "fr"
                      ? "Conseils pratiques pour organiser mer, criques et tours sans hésitation"
                      : locale === "en"
                        ? "Practical insights to plan sea, coves and tours without doubts"
                        : "Approfondimenti per organizzare mare, cale e tour senza dubbi"}
                </h2>
              </div>
              <p className="text-base leading-7 text-[#425f6f] sm:text-lg">
                {locale === "es"
                  ? "Esta es la guía general de la isla. Aquí abajo encuentras contenidos prácticos para elegir qué ver, dónde bañarte, cómo llegar, qué calas valorar y qué excursión en barco reservar desde Trapani."
                  : locale === "fr"
                    ? "Voici le guide général de l'île. Vous trouverez ci-dessous des contenus pratiques pour choisir quoi voir, où se baigner, comment arriver, quelles criques considérer et quelle excursion en bateau réserver depuis Trapani."
                    : locale === "en"
                      ? "This is the general island guide. Below you will find practical guides to choose what to see, where to swim, how to arrive, which coves to consider and which boat tour to book from Trapani."
                      : "Questa è la guida generale dell'isola. Qui sotto trovi approfondimenti pratici per scegliere cosa vedere, dove fare il bagno, come arrivare, quali cale valutare e quale tour in barca prenotare da Trapani."}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(locale === "fr"
                ? favignanaGuideLinksFr
                : locale === "es"
                  ? favignanaGuideLinksEs
                  : locale === "en"
                    ? favignanaGuideLinksEn
                    : favignanaGuideLinks
              ).map((guide) => (
                <Link
                  key={guide.slug}
                  href={localizedPath(locale, `/islands/favignana/${guide.slug}`)}
                  className="group flex min-h-full flex-col rounded-lg border border-[#d9c79d] bg-white p-5 shadow-[0_14px_42px_rgba(10,38,55,0.07)] transition hover:-translate-y-1 hover:border-[#b58a27] hover:shadow-[0_18px_54px_rgba(10,38,55,0.12)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b58a27]">
                    Favignana
                  </p>
                  <h3 className="mt-3 font-heading text-xl font-bold leading-tight text-[#092337]">
                    {guide.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-[#425f6f]">
                    {guide.description}
                  </p>
                  <span className="mt-5 inline-flex items-center text-sm font-bold text-[#092337]">
                    {locale === "es" ? "Leer la guía" : locale === "fr" ? "Lire le guide" : locale === "en" ? "Read the guide" : "Leggi la guida"}
                    <ArrowRight
                      className="ml-2 h-4 w-4 transition group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section
          id="mappa-favignana"
          className="bg-[#ede2ce] px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#b58a27]">
                Mappa interattiva
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
                Le cale e i punti di interesse di Favignana
              </h2>
              <p className="mt-4 text-base leading-7 text-[#425f6f] sm:text-lg">
                Seleziona un punto sulla mappa per vedere foto, nome e descrizione.
                I luoghi principali hanno una scheda dedicata; gli altri restano
                mappati per orientarsi con precisione lungo l&apos;isola.
              </p>
            </div>

            <FavignanaPoiExplorer />
          </div>
        </section>

        <section className="bg-[#f7f1e6] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 grid gap-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-end">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#b58a27]">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Guida pratica
                </p>
                <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
                  Come organizzare Favignana senza perdere tempo tra spostamenti e dubbi
                </h2>
              </div>
              <p className="text-base leading-7 text-[#425f6f] sm:text-lg">
                Chi organizza una giornata a Favignana ha quasi sempre domande
                molto concrete: quanto tempo serve, come arrivare, come muoversi e
                quali cale sono adatte al proprio gruppo. Rispondere bene aiuta a
                scegliere l&apos;esperienza giusta prima ancora di salire a bordo.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {favignanaPlanningBlocks.map((block) => {
                const Icon = block.icon;

                return (
                  <article
                    key={block.title}
                    className="flex min-h-full flex-col rounded-lg border border-[#d9c79d] bg-white p-6 shadow-[0_16px_48px_rgba(10,38,55,0.08)]"
                  >
                    <Icon className="h-6 w-6 text-[#b58a27]" aria-hidden="true" />
                    <h3 className="mt-5 font-heading text-2xl font-bold leading-tight text-[#092337]">
                      {block.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#425f6f]">
                      {block.description}
                    </p>
                    <ul className="mt-5 space-y-2 border-t border-[#eadfca] pt-5">
                      {block.points.map((point) => (
                        <li key={point} className="flex items-center gap-2 text-sm font-semibold text-[#294657]">
                          <InfoIcon className="h-4 w-4 text-[#b58a27]" aria-hidden="true" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#b58a27]">
                  Le cale
                </p>
                <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
                  Dove fermarsi a Favignana dipende dal mare del giorno
                </h2>
              </div>
              <p className="text-base leading-7 text-[#425f6f] sm:text-lg">
                Le cale più famose sono spesso anche le più esposte o frequentate.
                Una rotta fatta bene mette insieme desiderio, sicurezza e bellezza:
                prima si legge il vento, poi si sceglie il versante.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {favignanaCoveGroups.map((group) => (
                <article
                  key={group.title}
                  className="rounded-lg border border-[#d9c79d] bg-white p-6 shadow-[0_16px_48px_rgba(10,38,55,0.08)]"
                >
                  <Waves className="h-6 w-6 text-[#b58a27]" aria-hidden="true" />
                  <h3 className="mt-5 font-heading text-2xl font-bold text-[#092337]">
                    {group.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#425f6f]">
                    {group.description}
                  </p>
                  <ul className="mt-5 space-y-2">
                    {group.places.map((place) => (
                      <li key={place} className="flex items-center gap-2 text-sm font-semibold text-[#294657]">
                        <CheckCircle2 className="h-4 w-4 text-[#b58a27]" aria-hidden="true" />
                        {place}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#d8c8a6] shadow-[0_22px_64px_rgba(10,38,55,0.14)]">
              <Image
                src="/images/islands/favignana/poi/tonnara.webp"
                alt="Tonnara ed Ex Stabilimento Florio a Favignana"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#b58a27]">
                Storia e cultura
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
                Favignana non è solo mare: è tonnara, cave, Florio e archeologia
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {favignanaHistoryBlocks.map((block) => (
                  <article key={block.title} className="border-t border-[#d9c79d] pt-4">
                    <h3 className="font-heading text-xl font-bold text-[#092337]">
                      {block.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#425f6f]">
                      {block.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#071934] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-gold)]">
                  Natura e AMP
                </p>
                <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-white sm:text-4xl">
                  Una mappa di mare protetto, Posidonia e biodiversità
                </h2>
                <p className="mt-5 text-base leading-7 text-white/70 sm:text-lg">
                  Favignana fa parte dell&apos;Area Marina Protetta Isole Egadi.
                  Questo significa fondali preziosi, regole da rispettare e un
                  modo di navigare che deve restare attento: ancoraggi, snorkeling
                  e soste seguono sempre sicurezza e tutela del mare.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {favignanaNatureStats.map((stat) => (
                  <div
                    key={stat.value}
                    className="rounded-lg border border-white/12 bg-white/[0.07] p-5"
                  >
                    <ShieldCheck className="h-6 w-6 text-[var(--color-gold)]" aria-hidden="true" />
                    <p className="mt-5 font-heading text-3xl font-bold text-white">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/68">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#b58a27]">
                In barca con Egadisailing
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
                La rotta giusta non è fissa: si costruisce sulle condizioni del mare
              </h2>
              <p className="mt-5 text-base leading-7 text-[#425f6f] sm:text-lg">
                Favignana dà il meglio quando non viene trattata come una lista
                rigida di tappe. La crew valuta esposizione, comfort e affollamento,
                poi combina bagni, navigazione e passaggi panoramici.
              </p>
              <ul className="mt-7 space-y-3">
                {favignanaBoatTips.map((tip) => (
                  <li key={tip} className="flex gap-3 text-sm leading-6 text-[#294657] sm:text-base">
                    <Anchor className="mt-0.5 h-5 w-5 shrink-0 text-[#b58a27]" aria-hidden="true" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-[#092337] p-6 text-white shadow-[0_22px_64px_rgba(10,38,55,0.16)] sm:p-8">
              <div className="absolute inset-0 opacity-30" aria-hidden="true">
                <Image
                  src="/images/islands/favignana/poi/cala-rossa.webp"
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  className="object-cover"
                />
              </div>
              <div className="relative">
                <Star className="h-7 w-7 text-[var(--color-gold)]" aria-hidden="true" />
                <h3 className="mt-5 font-heading text-3xl font-bold leading-tight">
                  Come scegliere l&apos;esperienza
                </h3>
                <div className="mt-6 space-y-5 text-sm leading-6 text-white/76 sm:text-base">
                  <p>
                    Per una giornata completa, Favignana si abbina spesso a Levanzo:
                    più varietà, più punti di vista e un ritmo equilibrato tra soste
                    celebri e baie più raccolte.
                  </p>
                  <p>
                    Per un&apos;esperienza privata, invece, si può dare più spazio
                    al lato dell&apos;isola che quel giorno offre il mare migliore.
                  </p>
                </div>
                <Link href={localizedPath(locale, "/experiences")} className="mt-7 inline-flex">
                  <Button className="h-11 rounded-md bg-white px-5 text-sm font-bold text-[#092337] hover:bg-[#f4e7c6]">
                    Scopri le esperienze
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#b58a27]">
                FAQ Favignana
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
                Domande frequenti prima di partire
              </h2>
            </div>
            <div className="mt-10 space-y-4">
              {favignanaFaqs.map((faq) => (
                <article
                  key={faq.question}
                  className="rounded-lg border border-[#d9c79d] bg-[#fbf7ee] p-5 sm:p-6"
                >
                  <h3 className="font-heading text-xl font-bold text-[#092337]">
                    {faq.question}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#425f6f] sm:text-base">
                    {faq.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-lg bg-[#071934] p-8 text-white shadow-[0_24px_70px_rgba(7,25,52,0.18)] sm:p-10 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-gold)]">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  Tour da Trapani
                </p>
                <h2 className="mt-4 font-heading text-3xl font-bold leading-tight sm:text-4xl">
                  Vuoi vivere Favignana dal mare?
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                  Scegli l&apos;esperienza più adatta e lascia che la rotta venga
                  costruita sulle condizioni del giorno: più sicurezza, più comfort
                  e più possibilità di vedere l&apos;isola nel suo lato migliore.
                </p>
              </div>
              <Link href={localizedPath(locale, "/experiences")}>
                <Button className="h-12 rounded-md bg-[var(--color-gold)] px-6 text-base font-bold text-[#071934] hover:bg-[#f0c35a]">
                  Vedi i tour
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
