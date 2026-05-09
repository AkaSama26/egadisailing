"use client";

import type { MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Anchor, ArrowRight, Compass, MapPin, Waves } from "lucide-react";

type IslandScrollItem = {
  key: string;
  name: string;
  subtitle: string;
  heroText: string;
  image: string;
  svg: string;
  svgWidth: number;
  svgHeight: number;
  badge: string;
  intro: string;
  longText: string;
  highlights: readonly string[];
  fromTheBoat: readonly string[];
  practical: readonly string[];
};

type IslandsScrollCopy = {
  heroEyebrow: string;
  heroTitle: string;
  heroText: string;
  navLabel: string;
  quickEyebrow: string;
  quickTitle: string;
  quickText: string;
  imageAltSuffix: string;
  fromSeaTitle: string;
  practicalTitle: string;
  ctaBefore: string;
  ctaAfter: string;
  islands: readonly IslandScrollItem[];
};

const islandsIt = [
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

const islandsEn: readonly IslandScrollItem[] = [
  {
    key: "favignana",
    name: "Favignana",
    subtitle: "The butterfly island",
    heroText:
      "Turquoise coves, tuff quarries and the great memory of the Florio tuna fishery.",
    image: "/images/islands/favignana/hero.webp",
    svg: "/images/islands/favignana.svg",
    svgWidth: 1371,
    svgHeight: 765,
    badge: "Iconic coves",
    intro:
      "Favignana is the largest of the Egadi Islands and the easiest to experience by boat. Its coast alternates pale sand, low cliffs, tuff quarries and emerald bays: every side of the island changes character with the wind and the light.",
    longText:
      "For guests leaving from Trapani, Favignana is often the first encounter with the archipelago. Cala Rossa and Cala Azzurra are its calling cards, but the real beauty is being able to choose the most sheltered coast and shape the day around the best sea conditions.",
    highlights: ["Cala Rossa", "Cala Azzurra", "Bue Marino", "Ex Stabilimento Florio"],
    fromTheBoat: [
      "Enter the coves when the light brightens the seabed and the wind leaves the water flat.",
      "Alternate long swims with scenic passages below the tuff walls.",
      "Stop away from land access points during the busiest part of the day.",
    ],
    practical: [
      "Ideal for a full day or for routes combined with Levanzo.",
      "Perfect for easy snorkelling and photo stops.",
      "The best side changes with the Mistral, Sirocco and Grecale winds.",
    ],
  },
  {
    key: "levanzo",
    name: "Levanzo",
    subtitle: "Silence and clear water",
    heroText:
      "A white village, transparent seabeds and intimate little coves to reach slowly.",
    image: "/images/islands/levanzo/hero.webp",
    svg: "/images/islands/levanzo.svg",
    svgWidth: 1185,
    svgHeight: 885,
    badge: "Slow pace",
    intro:
      "Levanzo is the smallest of the Egadi Islands, gathered around Cala Dogana and an essential landscape. It is the island of silence: few roads, white houses, pale rock and a sea made for calm stops.",
    longText:
      "A boat lets you experience Levanzo without rushing, moving between Cala Fredda, Cala Minnola and the Faraglione. The island also preserves the Grotta del Genovese, one of the most important prehistoric sites in the Mediterranean.",
    highlights: ["Cala Fredda", "Cala Minnola", "Grotta del Genovese", "Faraglione"],
    fromTheBoat: [
      "Coast past the village of Cala Dogana and choose small, sheltered, bright anchorages.",
      "Snorkel over the seabed of Cala Minnola, where the water often stays exceptionally clear.",
      "Pair it with Favignana for a balanced route between famous coves and quieter corners.",
    ],
    practical: [
      "Excellent for guests looking for a more intimate and relaxed experience.",
      "Works well for extended half days or light full-day routes.",
      "The best stops depend strongly on wind exposure.",
    ],
  },
  {
    key: "marettimo",
    name: "Marettimo",
    subtitle: "The mountain on the sea",
    heroText:
      "Sea caves, high cliffs and the wildest profile of the archipelago.",
    image: "/images/islands/marettimo/hero.webp",
    svg: "/images/islands/marettimo.svg",
    svgWidth: 1371,
    svgHeight: 765,
    badge: "Deep nature",
    intro:
      "Marettimo is the farthest and most vertical of the Egadi Islands. Here the island rises from the sea with a different character: mountains, trails, sea caves and a small village with a secluded atmosphere.",
    longText:
      "A boat day towards Marettimo involves more navigation and favourable sea conditions, but it rewards you with powerful scenery: Punta Troia, Cala Bianca, Scalo Maestro and the Cammello, Presepe and Tuono caves.",
    highlights: ["Grotta del Cammello", "Punta Troia", "Cala Bianca", "Scalo Maestro"],
    fromTheBoat: [
      "Discover the sea caves when conditions allow safe, bright entrances.",
      "Navigate below high cliffs, with deeper colours than the other islands.",
      "Combine swims, photography and panoramic passages in a more adventurous route.",
    ],
    practical: [
      "Recommended for full-day outings and guests who enjoy navigation.",
      "Its feasibility depends on marine weather more than the other islands.",
      "Perfect for those looking for a less beach-focused and wilder Egadi experience.",
    ],
  },
];

const islandsEs: readonly IslandScrollItem[] = [
  {
    key: "favignana",
    name: "Favignana",
    subtitle: "La isla mariposa",
    heroText:
      "Calas turquesas, canteras de toba y la gran memoria de la tonnara Florio.",
    image: "/images/islands/favignana/hero.webp",
    svg: "/images/islands/favignana.svg",
    svgWidth: 1371,
    svgHeight: 765,
    badge: "Calas icónicas",
    intro:
      "Favignana es la mayor de las Islas Egadi y la más inmediata para vivir en barco. Su costa alterna arena clara, acantilados bajos, canteras de toba y bahías de color esmeralda: cada lado de la isla cambia de carácter según el viento y la luz.",
    longText:
      "Para quien sale desde Trapani, Favignana suele ser el primer encuentro con el archipiélago. El mar de Cala Rossa y Cala Azzurra es su carta de presentación, pero la verdadera belleza está en poder elegir la costa más resguardada y construir la jornada alrededor del mejor mar.",
    highlights: ["Cala Rossa", "Cala Azzurra", "Bue Marino", "Ex Stabilimento Florio"],
    fromTheBoat: [
      "Entrar en las calas cuando la luz enciende el fondo marino y el viento deja el agua plana.",
      "Alternar baños largos con pasos panorámicos bajo las paredes de toba.",
      "Parar lejos de los accesos por tierra en los momentos más concurridos del día.",
    ],
    practical: [
      "Ideal para una jornada completa o para itinerarios combinados con Levanzo.",
      "Perfecta para snorkel fácil y paradas fotográficas.",
      "La mejor vertiente cambia con Mistral, Siroco y Grecale.",
    ],
  },
  {
    key: "levanzo",
    name: "Levanzo",
    subtitle: "Silencio y agua clara",
    heroText:
      "Un pueblo blanco, fondos transparentes y calas íntimas para alcanzar sin prisa.",
    image: "/images/islands/levanzo/hero.webp",
    svg: "/images/islands/levanzo.svg",
    svgWidth: 1185,
    svgHeight: 885,
    badge: "Ritmo lento",
    intro:
      "Levanzo es la más pequeña de las Islas Egadi, reunida alrededor de Cala Dogana y de un paisaje esencial. Es la isla del silencio: pocas calles, casas blancas, roca clara y un mar pensado para paradas tranquilas.",
    longText:
      "El barco permite descubrir Levanzo sin prisas, moviéndose entre Cala Fredda, Cala Minnola y el Faraglione. La isla conserva también la Grotta del Genovese, uno de los testimonios prehistóricos más importantes del Mediterráneo.",
    highlights: ["Cala Fredda", "Cala Minnola", "Grotta del Genovese", "Faraglione"],
    fromTheBoat: [
      "Costear el pueblo de Cala Dogana y elegir fondeaderos pequeños, protegidos y luminosos.",
      "Hacer snorkel en los fondos de Cala Minnola, donde el agua suele mantenerse muy clara.",
      "Combinarla con Favignana para una ruta equilibrada entre calas famosas y rincones más tranquilos.",
    ],
    practical: [
      "Muy buena para quien busca una experiencia más íntima y relajada.",
      "Funciona bien en medias jornadas ampliadas o en jornadas completas ligeras.",
      "Las mejores paradas dependen mucho de la exposición al viento.",
    ],
  },
  {
    key: "marettimo",
    name: "Marettimo",
    subtitle: "La montaña sobre el mar",
    heroText:
      "Cuevas marinas, paredes altas y el perfil más salvaje del archipiélago.",
    image: "/images/islands/marettimo/hero.webp",
    svg: "/images/islands/marettimo.svg",
    svgWidth: 1371,
    svgHeight: 765,
    badge: "Naturaleza profunda",
    intro:
      "Marettimo es la más lejana y vertical de las Islas Egadi. Aquí la isla sube desde el mar con un carácter distinto: montañas, senderos, cuevas marinas y un pueblo pequeño que conserva una atmósfera apartada.",
    longText:
      "Una jornada en barco hacia Marettimo requiere más navegación y condiciones meteorológicas favorables, pero recompensa con escenarios potentes: Punta Troia, Cala Bianca, Scalo Maestro y las cuevas del Cammello, del Presepe y del Tuono.",
    highlights: ["Grotta del Cammello", "Punta Troia", "Cala Bianca", "Scalo Maestro"],
    fromTheBoat: [
      "Descubrir las cuevas marinas cuando el mar permite entradas seguras y luminosas.",
      "Navegar bajo paredes altas, con colores más profundos que en las otras islas.",
      "Unir baños, fotografía y pasos panorámicos en una ruta de aire más aventurero.",
    ],
    practical: [
      "Recomendada para jornada completa y para huéspedes a quienes les gusta navegar.",
      "Su viabilidad depende del tiempo marítimo más que en las otras islas.",
      "Perfecta para quien busca unas Egadi menos playeras y más salvajes.",
    ],
  },
];

const islandsFr: readonly IslandScrollItem[] = [
  {
    key: "favignana",
    name: "Favignana",
    subtitle: "L'île papillon",
    heroText:
      "Criques turquoise, carrières de tuf et grande mémoire de la tonnara Florio.",
    image: "/images/islands/favignana/hero.webp",
    svg: "/images/islands/favignana.svg",
    svgWidth: 1371,
    svgHeight: 765,
    badge: "Criques iconiques",
    intro:
      "Favignana est la plus grande des îles Égades et la plus immédiate à vivre en bateau. Sa côte alterne sable clair, falaises basses, carrières de tuf et baies couleur émeraude : chaque côté de l'île change de caractère selon le vent et la lumière.",
    longText:
      "Pour les voyageurs qui partent de Trapani, Favignana est souvent la première rencontre avec l'archipel. Cala Rossa et Cala Azzurra sont sa carte de visite, mais la vraie beauté consiste à choisir le versant le plus abrité et à construire la journée autour de la meilleure mer.",
    highlights: ["Cala Rossa", "Cala Azzurra", "Bue Marino", "Ex Stabilimento Florio"],
    fromTheBoat: [
      "Entrer dans les criques lorsque la lumière réveille les fonds et que le vent laisse l'eau plate.",
      "Alterner longues baignades et passages panoramiques sous les parois de tuf.",
      "S'arrêter loin des accès terrestres aux moments les plus fréquentés de la journée.",
    ],
    practical: [
      "Idéale pour une journée complète ou des itinéraires combinés avec Levanzo.",
      "Parfaite pour un snorkeling facile et des arrêts photo.",
      "Le meilleur versant change avec le mistral, le sirocco et le Grecale.",
    ],
  },
  {
    key: "levanzo",
    name: "Levanzo",
    subtitle: "Silence et eau claire",
    heroText:
      "Un village blanc, des fonds transparents et de petites criques intimes à rejoindre lentement.",
    image: "/images/islands/levanzo/hero.webp",
    svg: "/images/islands/levanzo.svg",
    svgWidth: 1185,
    svgHeight: 885,
    badge: "Rythme lent",
    intro:
      "Levanzo est la plus petite des îles Égades, rassemblée autour de Cala Dogana et d'un paysage essentiel. C'est l'île du silence : peu de routes, maisons blanches, roche claire et une mer faite pour les pauses tranquilles.",
    longText:
      "Le bateau permet de découvrir Levanzo sans se presser, entre Cala Fredda, Cala Minnola et le Faraglione. L'île conserve aussi la Grotte du Genovese, l'un des sites préhistoriques les plus importants de la Méditerranée.",
    highlights: ["Cala Fredda", "Cala Minnola", "Grotte du Genovese", "Faraglione"],
    fromTheBoat: [
      "Longer le village de Cala Dogana et choisir de petits mouillages lumineux et protégés.",
      "Faire du snorkeling sur les fonds de Cala Minnola, où l'eau reste souvent très claire.",
      "L'associer à Favignana pour une route équilibrée entre criques célèbres et coins plus calmes.",
    ],
    practical: [
      "Excellente pour ceux qui cherchent une expérience plus intime et détendue.",
      "Fonctionne bien en demi-journée élargie ou en journée complète légère.",
      "Les meilleurs arrêts dépendent beaucoup de l'exposition au vent.",
    ],
  },
  {
    key: "marettimo",
    name: "Marettimo",
    subtitle: "La montagne sur la mer",
    heroText:
      "Grottes marines, falaises hautes et le profil le plus sauvage de l'archipel.",
    image: "/images/islands/marettimo/hero.webp",
    svg: "/images/islands/marettimo.svg",
    svgWidth: 1371,
    svgHeight: 765,
    badge: "Nature profonde",
    intro:
      "Marettimo est la plus lointaine et la plus verticale des îles Égades. Ici l'île s'élève depuis la mer avec un caractère différent : montagnes, sentiers, grottes marines et un petit village à l'atmosphère retirée.",
    longText:
      "Une journée en bateau vers Marettimo demande plus de navigation et de bonnes conditions météo, mais elle offre des paysages puissants : Punta Troia, Cala Bianca, Scalo Maestro et les grottes du Cammello, du Presepe et du Tuono.",
    highlights: ["Grotte du Cammello", "Punta Troia", "Cala Bianca", "Scalo Maestro"],
    fromTheBoat: [
      "Découvrir les grottes marines lorsque la mer permet des entrées sûres et lumineuses.",
      "Naviguer sous de hautes parois, avec des couleurs plus profondes que sur les autres iles.",
      "Combiner baignades, photographie et passages panoramiques dans une route plus aventureuse.",
    ],
    practical: [
      "Recommandée pour les sorties de journée complète et les hôtes qui aiment naviguer.",
      "Sa faisabilité dépend davantage de la météo marine que celle des autres îles.",
      "Parfaite pour ceux qui cherchent des Égades moins balnéaires et plus sauvages.",
    ],
  },
];

const islandsDe: readonly IslandScrollItem[] = [
  {
    key: "favignana",
    name: "Favignana",
    subtitle: "Die Schmetterlingsinsel",
    heroText: "Türkisfarbene Buchten, Tuffsteinbrüche und die Geschichte der Florio-Tonnara.",
    image: "/images/islands/favignana/hero.webp",
    svg: "/images/islands/favignana.svg",
    svgWidth: 1371,
    svgHeight: 765,
    badge: "Ikonische Buchten",
    intro:
      "Favignana ist die größte der Ägadischen Inseln und lässt sich vom Boot aus besonders direkt erleben. Die Küste wechselt zwischen hellem Sand, niedrigen Felsen, Tuffsteinbrüchen und smaragdgrünen Buchten.",
    longText:
      "Für Gäste ab Trapani ist Favignana oft die erste Begegnung mit dem Archipel. Cala Rossa und Cala Azzurra sind die bekanntesten Bilder, doch der eigentliche Vorteil des Boots ist, die geschützteste Seite des Tages zu wählen.",
    highlights: ["Cala Rossa", "Cala Azzurra", "Bue Marino", "Ex Stabilimento Florio"],
    fromTheBoat: [
      "In Buchten einfahren, wenn das Licht den Meeresgrund aufhellt und der Wind das Wasser ruhig lässt.",
      "Lange Badestopps mit Panoramapassagen unter Tuffsteinwänden verbinden.",
      "In den vollsten Stunden abseits der Landzugänge ankern.",
    ],
    practical: [
      "Ideal für einen ganzen Tag oder Routen in Kombination mit Levanzo.",
      "Perfekt für einfaches Schnorcheln und Fotostopps.",
      "Die beste Seite verändert sich mit Mistral, Scirocco und Grecale.",
    ],
  },
  {
    key: "levanzo",
    name: "Levanzo",
    subtitle: "Stille und klares Wasser",
    heroText: "Ein weißes Dorf, transparente Meeresgründe und kleine Buchten, die man langsam erreicht.",
    image: "/images/islands/levanzo/hero.webp",
    svg: "/images/islands/levanzo.svg",
    svgWidth: 1185,
    svgHeight: 885,
    badge: "Langsamer Rhythmus",
    intro:
      "Levanzo ist die kleinste der Ägadischen Inseln, rund um Cala Dogana und eine reduzierte Landschaft gesammelt: weiße Häuser, heller Fels und Wasser für ruhige Stopps.",
    longText:
      "Mit dem Boot erleben Sie Levanzo ohne Eile, zwischen Cala Fredda, Cala Minnola und dem Faraglione. Die Insel bewahrt außerdem die Grotta del Genovese, eine wichtige prähistorische Stätte.",
    highlights: ["Cala Fredda", "Cala Minnola", "Grotta del Genovese", "Faraglione"],
    fromTheBoat: [
      "Am Dorf Cala Dogana entlangfahren und kleine, geschützte Ankerplätze wählen.",
      "Über den klaren Gründen von Cala Minnola schnorcheln.",
      "Mit Favignana zu einer ausgewogenen Route zwischen berühmten Buchten und ruhigeren Ecken kombinieren.",
    ],
    practical: [
      "Sehr gut für Gäste, die ein intimeres und entspannteres Erlebnis suchen.",
      "Passt zu erweiterten Halbtagen oder leichten Ganztagesrouten.",
      "Die besten Stopps hängen stark von der Windexposition ab.",
    ],
  },
  {
    key: "marettimo",
    name: "Marettimo",
    subtitle: "Der Berg im Meer",
    heroText: "Meeresgrotten, hohe Wände und das wildeste Profil des Archipels.",
    image: "/images/islands/marettimo/hero.webp",
    svg: "/images/islands/marettimo.svg",
    svgWidth: 1371,
    svgHeight: 765,
    badge: "Tiefe Natur",
    intro:
      "Marettimo ist die fernste und vertikalste der Ägadischen Inseln. Berge, Wege, Meeresgrotten und ein kleines Dorf geben ihr einen deutlich wilderen Charakter.",
    longText:
      "Eine Bootsfahrt nach Marettimo bedeutet mehr Navigation und passende Seebedingungen, belohnt aber mit Punta Troia, Cala Bianca, Scalo Maestro und den Grotten del Cammello, del Presepe und del Tuono.",
    highlights: ["Grotta del Cammello", "Punta Troia", "Cala Bianca", "Scalo Maestro"],
    fromTheBoat: [
      "Meeresgrotten entdecken, wenn sichere und helle Einfahrten möglich sind.",
      "Unter hohen Wänden navigieren, mit tieferen Farben als bei den anderen Inseln.",
      "Baden, Fotografie und Panoramapassagen in einer abenteuerlicheren Route verbinden.",
    ],
    practical: [
      "Empfohlen für Ganztagesausfahrten und Gäste, die Navigation mögen.",
      "Die Machbarkeit hängt stärker vom Seewetter ab als bei den anderen Inseln.",
      "Perfekt für alle, die wildere und weniger klassische Ägadische Inseln suchen.",
    ],
  },
] as const;

const copyByLocale: Record<"it" | "en" | "es" | "fr" | "de", IslandsScrollCopy> = {
  it: {
    heroEyebrow: "Arcipelago delle Egadi",
    heroTitle: "Le isole Egadi, una rotta alla volta",
    heroText:
      "Favignana, Levanzo e Marettimo sono vicine sulla carta, ma molto diverse in mare. Questa pagina raccoglie cosa vedere, come viverle in barca e quali sensazioni aspettarsi prima di scegliere il tour giusto da Trapani.",
    navLabel: "Isole Egadi",
    quickEyebrow: "Guida rapida",
    quickTitle: "Tre isole, tre modi diversi di sentire il mare",
    quickText:
      "L'arcipelago delle Egadi è una riserva marina in cui il programma migliore nasce sempre dal meteo. In barca si può scegliere la costa riparata, modulare le soste e leggere l'isola dal suo lato più vero: quello dell'acqua.",
    imageAltSuffix: "Isole Egadi",
    fromSeaTitle: "Dal mare",
    practicalTitle: "Da sapere",
    ctaBefore: "Vivi",
    ctaAfter: "in barca",
    islands: islandsIt,
  },
  en: {
    heroEyebrow: "Egadi Islands",
    heroTitle: "The Egadi Islands, one route at a time",
    heroText:
      "Favignana, Levanzo and Marettimo are close on the map, but very different at sea. This page collects what to see, how to experience them by boat and what to expect before choosing the right tour from Trapani.",
    navLabel: "Egadi Islands",
    quickEyebrow: "Quick guide",
    quickTitle: "Three islands, three different ways to feel the sea",
    quickText:
      "The Egadi archipelago is a marine reserve where the best plan always starts from the weather. By boat you can choose the sheltered coast, shape the stops and read each island from its truest side: the water.",
    imageAltSuffix: "Egadi Islands",
    fromSeaTitle: "From the sea",
    practicalTitle: "Good to know",
    ctaBefore: "Experience",
    ctaAfter: "by boat",
    islands: islandsEn,
  },
  es: {
    heroEyebrow: "Archipiélago de las Egadi",
    heroTitle: "Las Islas Egadi, una ruta cada vez",
    heroText:
      "Favignana, Levanzo y Marettimo están cerca en el mapa, pero son muy distintas en el mar. Esta página reúne qué ver, cómo vivirlas en barco y qué sensaciones esperar antes de elegir la excursión adecuada desde Trapani.",
    navLabel: "Islas Egadi",
    quickEyebrow: "Guía rápida",
    quickTitle: "Tres islas, tres formas distintas de sentir el mar",
    quickText:
      "El archipiélago de las Egadi es una reserva marina donde el mejor programa nace siempre de la meteorología. En barco se puede elegir la costa resguardada, modular las paradas y leer la isla desde su lado más auténtico: el agua.",
    imageAltSuffix: "Islas Egadi",
    fromSeaTitle: "Desde el mar",
    practicalTitle: "Conviene saber",
    ctaBefore: "Vive",
    ctaAfter: "en barco",
    islands: islandsEs,
  },
  fr: {
    heroEyebrow: "Archipel des Égades",
    heroTitle: "Les îles Égades, une route à la fois",
    heroText:
      "Favignana, Levanzo et Marettimo sont proches sur la carte, mais très différentes en mer. Cette page rassemble quoi voir, comment les vivre en bateau et quelles sensations attendre avant de choisir la bonne excursion depuis Trapani.",
    navLabel: "Îles Égades",
    quickEyebrow: "Guide rapide",
    quickTitle: "Trois îles, trois manières différentes de sentir la mer",
    quickText:
      "L'archipel des Égades est une réserve marine où le meilleur programme naît toujours de la météo. En bateau, on peut choisir la côte abritée, ajuster les arrêts et lire chaque île par son côté le plus vrai : l'eau.",
    imageAltSuffix: "Îles Égades",
    fromSeaTitle: "Depuis la mer",
    practicalTitle: "À savoir",
    ctaBefore: "Vivre",
    ctaAfter: "en bateau",
    islands: islandsFr,
  },
  de: {
    heroEyebrow: "Ägadischer Archipel",
    heroTitle: "Die Ägadischen Inseln, Route für Route",
    heroText:
      "Favignana, Levanzo und Marettimo liegen nah beieinander, fühlen sich auf dem Meer aber sehr unterschiedlich an. Diese Seite zeigt, was Sie sehen können, wie man die Inseln per Boot erlebt und welches Erlebnis ab Trapani am besten passt.",
    navLabel: "Ägadische Inseln",
    quickEyebrow: "Schneller Guide",
    quickTitle: "Drei Inseln, drei Arten, das Meer zu spüren",
    quickText:
      "Der Ägadische Archipel ist ein Meeresschutzgebiet, in dem der beste Plan immer beim Wetter beginnt. Mit dem Boot wählen Sie die geschützte Küste, passen Stopps an und erleben jede Insel von ihrer ehrlichsten Seite: vom Wasser.",
    imageAltSuffix: "Ägadische Inseln",
    fromSeaTitle: "Vom Meer aus",
    practicalTitle: "Gut zu wissen",
    ctaBefore: "Erleben Sie",
    ctaAfter: "mit dem Boot",
    islands: islandsDe,
  },
};

function getCopy(locale: string): IslandsScrollCopy {
  if (locale === "de") return copyByLocale.de;
  if (locale === "fr") return copyByLocale.fr;
  if (locale === "es") return copyByLocale.es;
  if (locale === "en") return copyByLocale.en;
  return copyByLocale.it;
}

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
  const copy = getCopy(locale);
  const islands = copy.islands;

  return (
    <>
      <section className="relative isolate min-h-[100svh] overflow-hidden bg-[linear-gradient(180deg,#061529_0%,#092f4b_52%,#071934_100%)] px-4 pb-14 pt-28 text-white sm:px-6 lg:px-8">

        <div className="mx-auto flex min-h-[calc(100svh-10.5rem)] max-w-7xl flex-col justify-center">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-gold)]">
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-5 font-heading text-4xl font-bold leading-[0.96] text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              {copy.heroText}
            </p>
          </div>

          <nav
            aria-label={copy.navLabel}
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
                {copy.quickEyebrow}
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
                {copy.quickTitle}
              </h2>
            </div>
            <p className="text-base leading-7 text-[#294657] sm:text-lg">
              {copy.quickText}
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
                      alt={`${island.name}, ${copy.imageAltSuffix}`}
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
                    {copy.navLabel}
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
                        <h3 className="font-heading text-2xl font-bold">{copy.fromSeaTitle}</h3>
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
                        <h3 className="font-heading text-2xl font-bold">{copy.practicalTitle}</h3>
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
                    {copy.ctaBefore} {island.name} {copy.ctaAfter}
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
