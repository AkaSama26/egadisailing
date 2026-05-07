export type LevanzoGuideSlug =
  | "cosa-vedere"
  | "what-to-see"
  | "spiagge-cale"
  | "beaches-coves"
  | "grotta-del-genovese"
  | "levanzo-in-un-giorno"
  | "levanzo-in-one-day"
  | "come-arrivare-da-trapani"
  | "how-to-get-from-trapani"
  | "snorkeling-cala-minnola-calcara"
  | "tour-in-barca-da-trapani"
  | "boat-tour-from-trapani";

export const levanzoGuideSlugPairs = [
  { it: "cosa-vedere", en: "what-to-see" },
  { it: "spiagge-cale", en: "beaches-coves" },
  { it: "grotta-del-genovese", en: "grotta-del-genovese" },
  { it: "levanzo-in-un-giorno", en: "levanzo-in-one-day" },
  { it: "come-arrivare-da-trapani", en: "how-to-get-from-trapani" },
  { it: "snorkeling-cala-minnola-calcara", en: "snorkeling-cala-minnola-calcara" },
  { it: "tour-in-barca-da-trapani", en: "boat-tour-from-trapani" },
] as const satisfies Array<{ it: LevanzoGuideSlug; en: LevanzoGuideSlug }>;

export type LevanzoGuideLocale = "it" | "en";

export function getLevanzoGuideSlugForLocale(
  slug: string,
  locale: LevanzoGuideLocale,
): LevanzoGuideSlug | undefined {
  const pair = levanzoGuideSlugPairs.find((item) => item.it === slug || item.en === slug);
  return pair?.[locale];
}

export function isLevanzoGuideSlug(slug: string): slug is LevanzoGuideSlug {
  return levanzoGuideSlugPairs.some((item) => item.it === slug || item.en === slug);
}

export type LevanzoGuideCta = "cigala" | "neel" | "compare";

export interface LevanzoGuideSection {
  id: string;
  eyebrow?: string;
  title: string;
  body: string[];
  bullets?: string[];
  cards?: Array<{
    title: string;
    text: string;
    tag?: string;
    image?: string;
  }>;
  steps?: Array<{
    label: string;
    title: string;
    text: string;
  }>;
  note?: string;
  cta?: LevanzoGuideCta;
}

export interface LevanzoGuideFaq {
  question: string;
  answer: string;
}

export interface LevanzoGuideItem {
  name: string;
  description: string;
}

export interface LevanzoGuide {
  slug: LevanzoGuideSlug;
  title: string;
  shortTitle: string;
  metaTitle: string;
  metaDescription: string;
  heroImage: string;
  heroAlt: string;
  eyebrow: string;
  intro: string;
  quickAnswer: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  quickFacts: Array<{ label: string; value: string }>;
  itemListTitle: string;
  itemList: LevanzoGuideItem[];
  sections: LevanzoGuideSection[];
  faqs: LevanzoGuideFaq[];
  relatedSlugs: LevanzoGuideSlug[];
}

export const levanzoGuideSourceLinks = [
  {
    label: "West of Sicily - Cale di Levanzo",
    href: "https://www.westofsicily.com/en/see-nature/the-bays-of-levanzo",
  },
  {
    label: "West of Sicily - Grotta del Genovese",
    href: "https://www.westofsicily.com/it/mare-natura/grotta-del-genovese-a-levanzo",
  },
  {
    label: "Visit Sicily - Cala Minnola",
    href: "https://www.visitsicily.info/en/itinerario/levanzo-cala-minnola/",
  },
  {
    label: "Grotta del Genovese",
    href: "https://www.grottadelgenovese.it/eng/",
  },
  {
    label: "AMP Isole Egadi",
    href: "https://www.ampisoleegadi.it/",
  },
  {
    label: "Liberty Lines",
    href: "https://www.libertylines.it/",
  },
  {
    label: "Caronte & Tourist / Siremar",
    href: "https://www.carontetourist.it/en",
  },
];

const levanzoHero = "/images/islands/levanzo/hero.webp";
const boatImage = "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp";
const neelImage = "/images/boats/neel-47/neel-47-favignana.webp";
const snorkelingImage = "/images/experience-polaroids/barca-8-ore-snorkeling.webp";

export const levanzoGuides: LevanzoGuide[] = [
  {
    slug: "cosa-vedere",
    title: "Cosa vedere a Levanzo: calette, Grotta del Genovese e borgo",
    shortTitle: "Cosa vedere",
    metaTitle: "Cosa vedere a Levanzo: calette, Grotta del Genovese e borgo",
    metaDescription:
      "Guida a cosa vedere a Levanzo: Cala Fredda, Cala Minnola, Cala Dogana, Grotta del Genovese, borgo, Faraglione e tour in barca da Trapani.",
    heroImage: levanzoHero,
    heroAlt: "Levanzo vista dal mare con case bianche e acqua trasparente",
    eyebrow: "Guida completa",
    intro:
      "Levanzo è la più raccolta delle Egadi: meno estesa di Favignana, più silenziosa, con un borgo piccolo, coste chiare, calette vicine e una delle testimonianze preistoriche più importanti del Mediterraneo. Si visita con un ritmo lento, scegliendo poche tappe e lasciando spazio al mare.",
    quickAnswer:
      "Le cose da vedere a Levanzo sono Cala Dogana, Cala Fredda, Cala Minnola, il Faraglione, Cala Tramontana, Cala Calcara, Capo Grosso e la Grotta del Genovese. Se arrivi da Trapani per un giorno, puoi scegliere tra visita a piedi con grotta e borgo oppure tour in barca per vedere più costa e calette.",
    primaryKeyword: "cosa vedere a Levanzo",
    secondaryKeywords: [
      "Levanzo cosa vedere",
      "Levanzo in barca",
      "Grotta del Genovese Levanzo",
      "calette Levanzo",
    ],
    quickFacts: [
      { label: "Ideale per", value: "mare lento" },
      { label: "Da non perdere", value: "Grotta del Genovese" },
      { label: "Bagno facile", value: "Cala Fredda" },
      { label: "Da Trapani", value: "in giornata" },
    ],
    itemListTitle: "I luoghi principali di Levanzo",
    itemList: [
      {
        name: "Cala Dogana",
        description:
          "Il piccolo approdo del paese, con case bianche, barche dei pescatori e acqua chiara già vicino al borgo.",
      },
      {
        name: "Cala Fredda",
        description:
          "Una delle cale più semplici e amate, comoda da raggiungere e adatta a un bagno rilassato.",
      },
      {
        name: "Cala Minnola",
        description:
          "Una cala luminosa sul versante sud-orientale, nota anche per il fondale con reperti archeologici.",
      },
      {
        name: "Grotta del Genovese",
        description:
          "Sito preistorico con graffiti e pitture rupestri, visitabile con guida e prenotazione.",
      },
      {
        name: "Faraglione",
        description:
          "Uno degli scorci più riconoscibili di Levanzo, bello dal mare e al tramonto.",
      },
      {
        name: "Cala Tramontana",
        description:
          "Il lato più scenografico e verticale, da valutare in base a vento, mare e sicurezza.",
      },
    ],
    sections: [
      {
        id: "borgo-cale",
        eyebrow: "Prima visita",
        title: "Borgo, cale e acqua trasparente",
        body: [
          "La prima immagine di Levanzo è Cala Dogana: poche case bianche, il porticciolo, barche piccole e una scala di colori che passa dal bianco della roccia al verde e al blu del mare. Da qui si capisce subito che l'isola non va vissuta con fretta.",
          "Le tappe più semplici sono Cala Fredda e Cala Minnola. La prima è vicina e immediata, la seconda richiede più tempo ma ripaga con fondali chiari, pineta e un contesto più appartato. In barca, queste cale diventano parte di una lettura più completa della costa.",
        ],
        bullets: [
          "Cala Dogana per borgo e primo impatto.",
          "Cala Fredda per un bagno più semplice.",
          "Cala Minnola per mare, pineta e fondale storico.",
          "Faraglione per uno scorcio iconico dal mare.",
        ],
        cta: "cigala",
      },
      {
        id: "genovese",
        eyebrow: "Storia",
        title: "La Grotta del Genovese cambia il senso della visita",
        body: [
          "La Grotta del Genovese è il luogo culturale più importante di Levanzo. Le pitture e i graffiti preistorici raccontano un'isola abitata e osservata molto prima del turismo, del porto e delle rotte moderne.",
          "La visita non va improvvisata: il sito è accessibile con visita guidata e prenotazione. Per questo conviene decidere prima se dedicare la giornata alla grotta e al borgo, oppure se puntare su un tour in barca e lasciare la grotta per una visita organizzata separatamente.",
        ],
        note:
          "Egadisailing non sostituisce la visita ufficiale alla Grotta del Genovese: il tour in barca può completare la giornata con mare, calette e costa, mentre la grotta va prenotata tramite i canali autorizzati.",
      },
      {
        id: "barca",
        eyebrow: "Dal mare",
        title: "Perché Levanzo funziona molto bene in barca",
        body: [
          "Levanzo è piccola, ma non tutte le cale sono uguali da raggiungere. Alcuni tratti sono più comodi a piedi, altri si capiscono meglio dal mare, soprattutto quando lo skipper può scegliere il lato più riparato in base al vento.",
          "Un tour da Trapani permette di vedere Levanzo senza incastrare aliscafi, camminate, taxi mare e orari. È una soluzione naturale se vuoi combinare bagno, snorkeling e passaggi panoramici in una giornata senza troppa logistica.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "Cosa vedere a Levanzo in poche ore?",
        answer:
          "Con poche ore conviene concentrarsi su Cala Dogana, il borgo, Cala Fredda e un passaggio verso Cala Minnola. Se hai una giornata intera puoi aggiungere la Grotta del Genovese o un tour in barca lungo la costa.",
      },
      {
        question: "Levanzo è meglio a piedi o in barca?",
        answer:
          "A piedi vivi bene il borgo e alcune cale vicine. La barca è più adatta se vuoi vedere più costa, raggiungere baie diverse e adattare la giornata a vento e mare.",
      },
      {
        question: "Si può visitare Levanzo e Favignana nello stesso giorno?",
        answer:
          "Sì, è una combinazione molto richiesta nei tour in barca da Trapani. La fattibilità dipende da durata, meteo marino e condizioni della giornata.",
      },
    ],
    relatedSlugs: ["spiagge-cale", "grotta-del-genovese", "tour-in-barca-da-trapani"],
  },
  {
    slug: "spiagge-cale",
    title: "Spiagge e cale di Levanzo: Cala Fredda, Cala Minnola e Cala Dogana",
    shortTitle: "Spiagge e cale",
    metaTitle: "Spiagge e cale di Levanzo: Cala Fredda, Cala Minnola e Dogana",
    metaDescription:
      "Guida alle spiagge e cale di Levanzo: Cala Fredda, Cala Minnola, Cala Dogana, Cala Tramontana, Cala Calcara e consigli per vederle in barca.",
    heroImage: levanzoHero,
    heroAlt: "Costa chiara e mare cristallino a Levanzo",
    eyebrow: "Mare e calette",
    intro:
      "Le spiagge di Levanzo non sono lunghe distese sabbiose: sono cale piccole, approdi di pietra, acqua chiara e fondali che cambiano colore con la luce. La scelta della cala giusta dipende da vento, accesso, tempo disponibile e tipo di bagno che cerchi.",
    quickAnswer:
      "Le cale più conosciute di Levanzo sono Cala Dogana, Cala Fredda, Cala Minnola, Cala Faraglione, Cala Tramontana e Cala Calcara. Cala Fredda e Cala Dogana sono più immediate, Cala Minnola è perfetta per acqua e fondali, mentre Tramontana e Calcara vanno valutate soprattutto con meteo favorevole.",
    primaryKeyword: "spiagge Levanzo",
    secondaryKeywords: [
      "cale Levanzo",
      "Cala Fredda Levanzo",
      "Cala Minnola Levanzo",
      "dove fare il bagno a Levanzo",
    ],
    quickFacts: [
      { label: "Bagno semplice", value: "Cala Fredda" },
      { label: "Più iconica", value: "Cala Minnola" },
      { label: "Vicino al paese", value: "Cala Dogana" },
      { label: "Da valutare", value: "vento e mare" },
    ],
    itemListTitle: "Le cale da conoscere",
    itemList: [
      {
        name: "Cala Dogana",
        description:
          "La cala del paese, comoda e scenografica, ideale per chi vuole restare vicino al porto.",
      },
      {
        name: "Cala Fredda",
        description:
          "Piccola, chiara e abbastanza accessibile, spesso scelta per un bagno senza complicazioni.",
      },
      {
        name: "Cala Minnola",
        description:
          "Una delle zone più belle per colori e fondali, con un'importante memoria archeologica sommersa.",
      },
      {
        name: "Cala Faraglione",
        description:
          "Scorcio scenografico del versante sud-occidentale, molto bello visto dal mare.",
      },
      {
        name: "Cala Tramontana",
        description:
          "Costa più selvaggia e rocciosa, suggestiva ma da affrontare solo con condizioni adatte.",
      },
      {
        name: "Cala Calcara",
        description:
          "Fondali interessanti e paesaggio più appartato, adatta a chi cerca un lato meno immediato.",
      },
    ],
    sections: [
      {
        id: "facili",
        eyebrow: "Accesso semplice",
        title: "Cala Dogana e Cala Fredda: le soste più immediate",
        body: [
          "Cala Dogana è il punto di arrivo e il cuore del borgo. Non è una spiaggia classica, ma è perfetta per capire il carattere di Levanzo: case bianche, barche, acqua chiara e ritmo lento.",
          "Cala Fredda è spesso la risposta più pratica per chi cerca un bagno semplice. È piccola, luminosa e più facile da inserire in una giornata a piedi o in barca.",
        ],
        cta: "cigala",
      },
      {
        id: "minnola",
        eyebrow: "Fondali",
        title: "Cala Minnola: mare, pineta e archeologia sommersa",
        body: [
          "Cala Minnola è uno dei luoghi più interessanti di Levanzo perché unisce bagno, paesaggio e storia. Il mare assume spesso tonalità verdi e blu molto nette, mentre i fondali conservano testimonianze archeologiche legate alla navigazione antica.",
          "Non è solo una cala dove fare il bagno: è un punto che racconta il rapporto fra Levanzo e le rotte del Mediterraneo. Per chi ama snorkeling, mare limpido e luoghi con una storia, è una tappa da considerare con attenzione.",
        ],
        cards: [
          {
            title: "Mare chiaro",
            text: "Colori molto leggibili quando la luce è alta e il mare resta calmo.",
            tag: "Bagno",
            image: levanzoHero,
          },
          {
            title: "Fondale storico",
            text: "L'area è legata alla presenza di reperti archeologici sommersi.",
            tag: "Storia",
            image: snorkelingImage,
          },
          {
            title: "Sosta lenta",
            text: "Una cala da vivere senza fretta, rispettando fondale e Area Marina Protetta.",
            tag: "AMP",
            image: boatImage,
          },
        ],
      },
      {
        id: "barca",
        eyebrow: "Rotta",
        title: "Quali cale vedere in barca",
        body: [
          "Dal mare si leggono meglio Cala Faraglione, Cala Tramontana, Cala Calcara e i tratti più rocciosi dell'isola. Non sempre sono soste da bagno garantite, ma diventano passaggi panoramici molto belli quando le condizioni lo permettono.",
          "Per questo una rotta intelligente non promette una lista fissa: sceglie la cala più adatta al vento, alla luce, alla sicurezza e al comfort degli ospiti.",
        ],
        note:
          "Levanzo è dentro l'Area Marina Protetta delle Isole Egadi: ancoraggio, navigazione e attività in acqua devono rispettare regole e indicazioni vigenti.",
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "Qual è la spiaggia più bella di Levanzo?",
        answer:
          "Dipende da cosa cerchi. Cala Minnola è tra le più scenografiche per colori e fondali, Cala Fredda è più semplice per il bagno, Cala Dogana è la più comoda vicino al paese.",
      },
      {
        question: "A Levanzo ci sono spiagge sabbiose?",
        answer:
          "Levanzo è soprattutto fatta di cale piccole, ciottoli, roccia e fondali chiari. Non va scelta se cerchi lunghe spiagge sabbiose attrezzate.",
      },
      {
        question: "Meglio vedere le cale di Levanzo a piedi o in barca?",
        answer:
          "A piedi puoi raggiungere alcune cale vicine al paese. La barca permette di vedere più costa e di scegliere il lato più riparato in base al mare.",
      },
    ],
    relatedSlugs: ["cosa-vedere", "snorkeling-cala-minnola-calcara", "tour-in-barca-da-trapani"],
  },
  {
    slug: "grotta-del-genovese",
    title: "Grotta del Genovese a Levanzo: visita, storia e cosa sapere",
    shortTitle: "Grotta del Genovese",
    metaTitle: "Grotta del Genovese a Levanzo: visita, storia e informazioni",
    metaDescription:
      "Guida alla Grotta del Genovese a Levanzo: pitture e graffiti preistorici, visita guidata, prenotazione, accesso e idee per completare la giornata in barca.",
    heroImage: levanzoHero,
    heroAlt: "Scorcio roccioso di Levanzo verso la Grotta del Genovese",
    eyebrow: "Storia e archeologia",
    intro:
      "La Grotta del Genovese è il luogo che più distingue Levanzo dalle altre Egadi. Qui il mare incontra una memoria molto più antica: figure, graffiti e pitture che riportano l'isola alla preistoria mediterranea.",
    quickAnswer:
      "La Grotta del Genovese si trova sul lato nord-occidentale di Levanzo ed è visitabile con visita guidata e prenotazione. La visita può prevedere accesso via mare quando le condizioni lo permettono oppure trasferimento via terra e tratto a piedi. Va organizzata separatamente rispetto a un normale tour in barca.",
    primaryKeyword: "Grotta del Genovese Levanzo",
    secondaryKeywords: [
      "Grotta del Genovese visita",
      "grotte Levanzo",
      "pitture rupestri Levanzo",
      "sito preistorico Levanzo",
    ],
    quickFacts: [
      { label: "Tipo", value: "sito preistorico" },
      { label: "Accesso", value: "visita guidata" },
      { label: "Serve", value: "prenotazione" },
      { label: "Da abbinare", value: "borgo e mare" },
    ],
    itemListTitle: "Cosa sapere prima della visita",
    itemList: [
      {
        name: "Prenotazione",
        description:
          "La visita non va improvvisata: controlla sempre disponibilità, orari e modalità con il gestore ufficiale.",
      },
      {
        name: "Accesso",
        description:
          "In base alle condizioni, l'accesso può essere organizzato via mare oppure con trasferimento e tratto a piedi.",
      },
      {
        name: "Durata",
        description:
          "Prevedi tempo sufficiente: la grotta non è una sosta rapida da incastrare senza margine.",
      },
      {
        name: "Giornata",
        description:
          "Dopo la visita puoi completare Levanzo con borgo, Cala Fredda, Cala Minnola o un tour in barca.",
      },
    ],
    sections: [
      {
        id: "perche-importante",
        eyebrow: "Archeologia",
        title: "Perché la Grotta del Genovese è così importante",
        body: [
          "La Grotta del Genovese conserva segni che raccontano la presenza umana a Levanzo in epoche lontanissime. Le figure incise e dipinte sono uno dei motivi per cui l'isola non può essere ridotta a una semplice tappa di mare.",
          "Visitare la grotta significa cambiare prospettiva: Levanzo diventa un punto del Mediterraneo attraversato da uomini, animali, rotte e racconti molto prima del turismo contemporaneo.",
        ],
      },
      {
        id: "organizzare",
        eyebrow: "Pratico",
        title: "Come organizzare la visita senza errori",
        body: [
          "La cosa più importante è verificare sempre i canali ufficiali della Grotta del Genovese. Orari, disponibilità, accesso e modalità possono cambiare in base alla stagione e alle condizioni del mare.",
          "Se vuoi dedicare spazio alla grotta, evita di costruire una giornata troppo piena. Meglio lasciare margine per trasferimenti, spiegazione guidata e una sosta tranquilla nel borgo.",
        ],
        note:
          "Non inserire la Grotta del Genovese come promessa dentro un tour mare generico: è una visita culturale regolata, da prenotare e gestire con il soggetto autorizzato.",
      },
      {
        id: "dopo-visita",
        eyebrow: "Abbinamenti",
        title: "Cosa fare dopo la Grotta del Genovese",
        body: [
          "Dopo la grotta puoi tornare verso il paese, fermarti a Cala Dogana o Cala Fredda, oppure valutare una giornata separata in barca per vedere Cala Minnola, Faraglione e il lato più marino dell'isola.",
          "Questa distinzione è utile anche per scegliere l'esperienza giusta: cultura e grotta da una parte, mare e calette dall'altra. Insieme raccontano Levanzo meglio di una visita frettolosa.",
        ],
        cta: "cigala",
      },
    ],
    faqs: [
      {
        question: "Si può visitare la Grotta del Genovese senza prenotazione?",
        answer:
          "È meglio non contarci. La visita va verificata e prenotata tramite i canali ufficiali, perché accesso, orari e modalità possono cambiare.",
      },
      {
        question: "La Grotta del Genovese si raggiunge in barca?",
        answer:
          "In alcune condizioni l'accesso può avvenire via mare, ma dipende dall'organizzazione della visita e dal meteo. In alternativa sono previsti percorsi via terra con tratto a piedi.",
      },
      {
        question: "Egadisailing organizza la visita alla Grotta del Genovese?",
        answer:
          "Egadisailing propone esperienze in barca alle Egadi. La visita alla Grotta del Genovese va prenotata con il gestore autorizzato; il tour in barca può completare la scoperta di Levanzo dal mare.",
      },
    ],
    relatedSlugs: ["cosa-vedere", "levanzo-in-un-giorno", "come-arrivare-da-trapani"],
  },
  {
    slug: "levanzo-in-un-giorno",
    title: "Levanzo in un giorno: itinerario pratico da Trapani",
    shortTitle: "Levanzo in un giorno",
    metaTitle: "Levanzo in un giorno: itinerario da Trapani, cale e consigli",
    metaDescription:
      "Come visitare Levanzo in un giorno da Trapani: borgo, Cala Dogana, Cala Fredda, Cala Minnola, Grotta del Genovese e alternativa tour in barca.",
    heroImage: boatImage,
    heroAlt: "Barca Egadisailing in navigazione verso le Isole Egadi",
    eyebrow: "Itinerario pratico",
    intro:
      "Levanzo in un giorno è una scelta perfetta se vuoi una gita più lenta rispetto a Favignana. L'isola è piccola, ma va organizzata bene: poche tappe, tempi realistici e una decisione chiara fra visita a terra, Grotta del Genovese o tour in barca.",
    quickAnswer:
      "Per vedere Levanzo in un giorno da Trapani, scegli un percorso semplice: arrivo a Cala Dogana, passeggiata nel borgo, bagno a Cala Fredda, eventuale Cala Minnola e rientro. Se vuoi vedere più costa senza organizzare sentieri e taxi mare, scegli un tour in barca da Trapani.",
    primaryKeyword: "Levanzo in un giorno",
    secondaryKeywords: [
      "Levanzo da Trapani in giornata",
      "itinerario Levanzo",
      "gita Levanzo da Trapani",
      "cosa fare a Levanzo in un giorno",
    ],
    quickFacts: [
      { label: "Partenza", value: "Trapani" },
      { label: "Ritmo", value: "lento" },
      { label: "A piedi", value: "borgo e cale vicine" },
      { label: "In barca", value: "più costa" },
    ],
    itemListTitle: "Itinerario consigliato",
    itemList: [
      {
        name: "Mattina a Cala Dogana",
        description:
          "Arrivo, borgo, porticciolo e primo contatto con il ritmo dell'isola.",
      },
      {
        name: "Bagno a Cala Fredda",
        description:
          "Una sosta semplice e vicina, ideale per non complicare la mattinata.",
      },
      {
        name: "Cala Minnola",
        description:
          "Da aggiungere se hai tempo, energia e condizioni adatte.",
      },
      {
        name: "Grotta del Genovese",
        description:
          "Solo se prenotata e organizzata con anticipo, senza stringere troppo i tempi.",
      },
      {
        name: "Tour in barca",
        description:
          "Alternativa più comoda se l'obiettivo principale è vedere calette e costa dal mare.",
      },
    ],
    sections: [
      {
        id: "a-terra",
        eyebrow: "Opzione 1",
        title: "Levanzo a piedi: borgo, Cala Fredda e Cala Minnola",
        body: [
          "Se arrivi con collegamenti di linea, il percorso più naturale parte da Cala Dogana. Dedica tempo al borgo, poi spostati verso Cala Fredda per il bagno più semplice della giornata.",
          "Cala Minnola è la tappa da aggiungere se vuoi camminare un po' di più e se hai margine con gli orari di rientro. Non costruire un programma troppo stretto: a Levanzo il valore è proprio il ritmo lento.",
        ],
        steps: [
          {
            label: "Mattina",
            title: "Arrivo e borgo",
            text: "Cala Dogana, case bianche, porticciolo e orientamento.",
          },
          {
            label: "Mezzogiorno",
            title: "Cala Fredda",
            text: "Bagno semplice e pausa senza allontanarsi troppo.",
          },
          {
            label: "Pomeriggio",
            title: "Cala Minnola",
            text: "Tappa più lenta, da valutare con tempi e caldo.",
          },
        ],
      },
      {
        id: "grotta",
        eyebrow: "Opzione 2",
        title: "Giornata con Grotta del Genovese",
        body: [
          "Se il tuo interesse principale è culturale, organizza prima la visita alla Grotta del Genovese e costruisci il resto della giornata intorno a quell'orario. La grotta richiede prenotazione, tempo e modalità di accesso da verificare.",
          "In questo caso conviene ridurre le aspettative sulle cale: meglio una visita fatta bene e una sosta bagno semplice che una lista troppo lunga di tappe.",
        ],
      },
      {
        id: "barca",
        eyebrow: "Opzione 3",
        title: "Levanzo in barca da Trapani",
        body: [
          "Se vuoi concentrarti sul mare, la barca è spesso la scelta più lineare. Parti da Trapani, eviti coincidenze e noleggi, e lasci alla crew la scelta delle baie più adatte al vento.",
          "Questa formula funziona soprattutto se vuoi combinare Levanzo con Favignana o se cerchi una giornata di bagni, snorkeling e passaggi panoramici.",
        ],
        cta: "cigala",
      },
    ],
    faqs: [
      {
        question: "Basta un giorno per vedere Levanzo?",
        answer:
          "Sì, un giorno basta per un primo assaggio: borgo, Cala Fredda e magari Cala Minnola. Per aggiungere la Grotta del Genovese serve organizzazione e prenotazione.",
      },
      {
        question: "Meglio Levanzo in autonomia o con tour in barca?",
        answer:
          "In autonomia è bello se vuoi camminare e vivere il borgo. Il tour in barca è più adatto se vuoi vedere cale, costa e acqua senza pensare alla logistica.",
      },
      {
        question: "Si può fare Levanzo e Favignana nello stesso giorno?",
        answer:
          "Sì, soprattutto in barca. Con i collegamenti di linea può diventare più macchinoso, mentre un tour organizzato gestisce rotta e tempi in modo più fluido.",
      },
    ],
    relatedSlugs: ["come-arrivare-da-trapani", "tour-in-barca-da-trapani", "spiagge-cale"],
  },
  {
    slug: "come-arrivare-da-trapani",
    title: "Come arrivare a Levanzo da Trapani e come muoversi sull'isola",
    shortTitle: "Come arrivare",
    metaTitle: "Come arrivare a Levanzo da Trapani: aliscafo, traghetto e tour",
    metaDescription:
      "Come arrivare a Levanzo da Trapani e come muoversi: collegamenti via mare, borgo, camminate, taxi mare, tour in barca e consigli pratici.",
    heroImage: levanzoHero,
    heroAlt: "Porticciolo di Levanzo raggiunto via mare da Trapani",
    eyebrow: "Logistica",
    intro:
      "Levanzo si raggiunge via mare da Trapani, con collegamenti di linea o con escursioni in barca. Una volta sull'isola, la logistica è semplice ma limitata: si cammina, si usa il mare e si scelgono poche tappe con buon senso.",
    quickAnswer:
      "Per arrivare a Levanzo da Trapani puoi usare aliscafi e traghetti delle compagnie di linea, controllando sempre orari aggiornati sui siti ufficiali. Sull'isola ci si muove soprattutto a piedi o in barca; non è una destinazione pensata per auto e spostamenti veloci.",
    primaryKeyword: "come arrivare a Levanzo da Trapani",
    secondaryKeywords: [
      "aliscafo Trapani Levanzo",
      "traghetto Trapani Levanzo",
      "come muoversi a Levanzo",
      "tour Levanzo da Trapani",
    ],
    quickFacts: [
      { label: "Porto base", value: "Trapani" },
      { label: "Mezzi", value: "aliscafo o traghetto" },
      { label: "Sull'isola", value: "a piedi o in barca" },
      { label: "Orari", value: "fonti ufficiali" },
    ],
    itemListTitle: "Le opzioni principali",
    itemList: [
      {
        name: "Aliscafo",
        description:
          "Soluzione veloce per passeggeri, da verificare su orari e disponibilità aggiornati.",
      },
      {
        name: "Traghetto",
        description:
          "Alternativa più lenta e stagionale nelle disponibilità; controlla sempre le compagnie ufficiali.",
      },
      {
        name: "Tour in barca",
        description:
          "Scelta pratica se vuoi vivere direttamente mare, calette e costa senza organizzare spostamenti interni.",
      },
      {
        name: "A piedi",
        description:
          "La soluzione più naturale per borgo, Cala Dogana, Cala Fredda e alcuni percorsi semplici.",
      },
      {
        name: "Taxi mare",
        description:
          "Da valutare localmente per raggiungere alcune cale, in base a disponibilità e condizioni.",
      },
    ],
    sections: [
      {
        id: "trapani",
        eyebrow: "Partenza",
        title: "Dal porto di Trapani a Levanzo",
        body: [
          "Trapani è il punto di riferimento principale per raggiungere Levanzo. Orari, tratte e disponibilità cambiano in base a stagione e condizioni operative, quindi non conviene affidarsi a informazioni vecchie o screenshot salvati.",
          "Per una visita autonoma, controlla Liberty Lines e Caronte/Siremar prima di costruire l'itinerario. Per una giornata mare, invece, valuta direttamente una partenza in barca da Trapani.",
        ],
        cta: "cigala",
      },
      {
        id: "muoversi",
        eyebrow: "Sull'isola",
        title: "Come muoversi a Levanzo",
        body: [
          "Levanzo è un'isola da piedi, non da automobile. Il borgo è piccolo, alcune cale sono raggiungibili camminando e i tratti più marini si gestiscono meglio con barca o taxi mare.",
          "Questa semplicità è parte del fascino dell'isola, ma richiede realismo: scarpe comode, acqua, tempi larghi e attenzione al caldo nelle ore centrali.",
        ],
        bullets: [
          "Non programmare troppe tappe a piedi.",
          "Controlla sempre il rientro prima di allontanarti.",
          "Usa la barca se vuoi vedere più costa.",
          "Evita orari stretti se vuoi visitare la Grotta del Genovese.",
        ],
      },
      {
        id: "scelta",
        eyebrow: "Scelta",
        title: "Quando conviene il tour in barca",
        body: [
          "Il tour in barca conviene quando vuoi evitare logistica e dedicare la giornata al mare. Non sostituisce la visita culturale alla Grotta del Genovese, ma permette di vivere bene Cala Fredda, Cala Minnola, Faraglione e altri tratti costieri.",
          "È anche la soluzione più semplice se vuoi combinare Favignana e Levanzo nella stessa giornata, sempre compatibilmente con vento e mare.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "Da dove partono i collegamenti per Levanzo?",
        answer:
          "Il riferimento principale è il porto di Trapani. In alcuni periodi possono esserci collegamenti anche da altri porti, ma per orari e disponibilità bisogna controllare le compagnie ufficiali.",
      },
      {
        question: "A Levanzo serve noleggiare un mezzo?",
        answer:
          "No, Levanzo si vive soprattutto a piedi e in barca. È un'isola piccola, con logistica semplice e poche strade.",
      },
      {
        question: "Meglio aliscafo o tour in barca da Trapani?",
        answer:
          "L'aliscafo è utile se vuoi sbarcare e muoverti in autonomia. Il tour in barca è più adatto se vuoi vedere calette, costa e mare senza organizzare spostamenti interni.",
      },
    ],
    relatedSlugs: ["levanzo-in-un-giorno", "tour-in-barca-da-trapani", "cosa-vedere"],
  },
  {
    slug: "snorkeling-cala-minnola-calcara",
    title: "Snorkeling a Levanzo: Cala Minnola, Cala Calcara e fondali",
    shortTitle: "Snorkeling",
    metaTitle: "Snorkeling a Levanzo: Cala Minnola, Cala Calcara e fondali",
    metaDescription:
      "Dove fare snorkeling a Levanzo: Cala Minnola, Cala Calcara, Cala Fredda, Area Marina Protetta, fondali, sicurezza e tour in barca da Trapani.",
    heroImage: snorkelingImage,
    heroAlt: "Snorkeling alle Isole Egadi con acqua trasparente",
    eyebrow: "Fondali e AMP",
    intro:
      "Lo snorkeling a Levanzo è fatto di acqua chiara, roccia, posidonia, passaggi lenti e scelta attenta della cala. Non serve inseguire il punto più famoso: serve trovare il mare giusto nel giorno giusto.",
    quickAnswer:
      "Le zone più interessanti per snorkeling a Levanzo sono Cala Minnola, Cala Calcara, Cala Fredda e alcuni tratti vicino al Faraglione o alla costa più riparata. La scelta dipende da vento, visibilità, traffico di barche e regole dell'Area Marina Protetta.",
    primaryKeyword: "snorkeling Levanzo",
    secondaryKeywords: [
      "snorkeling Cala Minnola",
      "Cala Calcara Levanzo",
      "fondali Levanzo",
      "Area Marina Protetta Levanzo",
    ],
    quickFacts: [
      { label: "Migliore con", value: "mare calmo" },
      { label: "Zona chiave", value: "Cala Minnola" },
      { label: "Regole", value: "AMP Egadi" },
      { label: "Attrezzatura", value: "maschera e snorkel" },
    ],
    itemListTitle: "Zone snorkeling da valutare",
    itemList: [
      {
        name: "Cala Minnola",
        description:
          "Acqua limpida, fondale interessante e memoria archeologica: una delle aree simbolo.",
      },
      {
        name: "Cala Calcara",
        description:
          "Fondali più appartati e paesaggio roccioso, da scegliere con condizioni adatte.",
      },
      {
        name: "Cala Fredda",
        description:
          "Sosta più semplice, utile per un bagno chiaro e accessibile.",
      },
      {
        name: "Faraglione",
        description:
          "Scorcio bello dal mare, da valutare più per passaggio e bagno che come promessa fissa.",
      },
      {
        name: "Cala Tramontana",
        description:
          "Molto scenografica ma esposta: adatta solo quando mare e sicurezza lo permettono.",
      },
    ],
    sections: [
      {
        id: "zone",
        eyebrow: "Dove andare",
        title: "Le zone migliori non sono sempre le stesse",
        body: [
          "A Levanzo la qualità dello snorkeling dipende moltissimo dal mare del giorno. Cala Minnola è una delle zone più note, ma con vento o visibilità bassa può essere più intelligente scegliere una baia riparata.",
          "Una crew esperta non forza una tappa solo perché è famosa: valuta luce, corrente, traffico di barche e comfort del gruppo.",
        ],
        cta: "cigala",
      },
      {
        id: "amp",
        eyebrow: "Rispetto",
        title: "Area Marina Protetta: guardare senza disturbare",
        body: [
          "Levanzo fa parte dell'Area Marina Protetta delle Isole Egadi. Questo significa che snorkeling, navigazione e soste devono rispettare regole pensate per proteggere fondali, praterie di Posidonia e biodiversità.",
          "Per l'utente questo si traduce in un comportamento semplice: non toccare il fondale, non raccogliere nulla, restare nelle aree indicate e seguire sempre le istruzioni della crew.",
        ],
        bullets: [
          "Non camminare sulla Posidonia.",
          "Non raccogliere reperti, conchiglie o organismi.",
          "Resta vicino alla barca o al gruppo.",
          "Evita lo snorkeling con corrente, onda o traffico intenso.",
        ],
      },
      {
        id: "tour",
        eyebrow: "In barca",
        title: "Perché un tour aiuta chi vuole fare snorkeling",
        body: [
          "La barca permette di cambiare area se il primo punto non è adatto. Questo è il vero vantaggio: non resti bloccato su una cala scelta a tavolino, ma costruisci la giornata sulle condizioni reali.",
          "Per chi non conosce l'isola, avere maschera, tempi, assistenza e indicazioni dello skipper rende l'esperienza più semplice e più sicura.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "Dove fare snorkeling a Levanzo?",
        answer:
          "Cala Minnola, Cala Calcara, Cala Fredda e alcuni tratti vicino al Faraglione sono tra le zone da valutare. La scelta migliore dipende sempre dal mare del giorno.",
      },
      {
        question: "Serve essere esperti per fare snorkeling a Levanzo?",
        answer:
          "No, ma serve prudenza. Per principianti è meglio restare in acque calme, vicini alla barca o al gruppo, seguendo le indicazioni della crew.",
      },
      {
        question: "Lo snorkeling è sempre possibile?",
        answer:
          "No. Vento, onda, corrente, visibilità e traffico di barche possono rendere una zona poco adatta. In quel caso si cambia rotta o si evita l'attività.",
      },
    ],
    relatedSlugs: ["spiagge-cale", "tour-in-barca-da-trapani", "cosa-vedere"],
  },
  {
    slug: "tour-in-barca-da-trapani",
    title: "Tour in barca a Levanzo da Trapani: quando sceglierlo",
    shortTitle: "Tour in barca",
    metaTitle: "Tour in barca a Levanzo da Trapani: quale scegliere",
    metaDescription:
      "Guida ai tour in barca a Levanzo da Trapani: 4 ore, 8 ore, privato, condiviso, gourmet in trimarano, snorkeling e rotta con Favignana.",
    heroImage: boatImage,
    heroAlt: "Tour in barca da Trapani verso Levanzo e le Isole Egadi",
    eyebrow: "Esperienze Egadi",
    intro:
      "Un tour in barca a Levanzo da Trapani ha senso quando vuoi vivere l'isola dal mare, senza organizzare aliscafi, coincidenze, taxi mare e camminate sotto il sole. La rotta migliore non è rigida: nasce da vento, mare e durata scelta.",
    quickAnswer:
      "Scegli un tour di 4 ore se vuoi una mezza giornata agile, un tour di 8 ore se vuoi più soste e la possibilità di abbinare Favignana e Levanzo, una barca privata se vuoi ritmo su misura, il trimarano gourmet se cerchi comfort premium con chef a bordo.",
    primaryKeyword: "tour Levanzo da Trapani",
    secondaryKeywords: [
      "tour in barca Levanzo",
      "escursione Levanzo da Trapani",
      "Favignana Levanzo tour",
      "Levanzo barca privata",
    ],
    quickFacts: [
      { label: "Partenza", value: "Trapani" },
      { label: "Formati", value: "4 ore, 8 ore, privato" },
      { label: "Possibile abbinamento", value: "Favignana" },
      { label: "Scelta", value: "meteo e durata" },
    ],
    itemListTitle: "Quale esperienza scegliere",
    itemList: [
      {
        name: "Tour privato 4 ore",
        description:
          "Per chi vuole una fascia compatta, con barca riservata e poche soste scelte bene.",
      },
      {
        name: "Tour condiviso 8 ore",
        description:
          "Per chi cerca una giornata completa con più tempo per bagno, snorkeling e rotta flessibile.",
      },
      {
        name: "Tour privato 8 ore",
        description:
          "Per gruppi, famiglie o occasioni speciali che vogliono privacy e ritmo personalizzato.",
      },
      {
        name: "Esperienza gourmet in trimarano",
        description:
          "Per vivere Favignana e Levanzo con chef, comfort, spazi ampi e pranzo a bordo.",
      },
      {
        name: "Charter Egadi",
        description:
          "Per chi vuole allargare il viaggio su più giorni tra Favignana, Levanzo e Marettimo.",
      },
    ],
    sections: [
      {
        id: "quando",
        eyebrow: "Scelta",
        title: "Quando il tour in barca è la scelta più comoda",
        body: [
          "Il tour in barca è ideale se vuoi vedere Levanzo dal mare, fare il bagno, alternare soste e non pensare agli spostamenti. È meno adatto se il tuo obiettivo principale è visitare la Grotta del Genovese, che richiede una prenotazione specifica.",
          "Per una giornata mare, invece, partire da Trapani semplifica tutto: sali a bordo, la crew legge le condizioni e la rotta viene costruita sulle baie più adatte.",
        ],
        cta: "compare",
      },
      {
        id: "durata",
        eyebrow: "Durata",
        title: "4 ore, 8 ore o privato?",
        body: [
          "La mezza giornata è perfetta se vuoi una parentesi in mare senza occupare tutta la giornata. La formula da 8 ore dà più margine: più soste, più calma e più possibilità di combinare Levanzo con Favignana.",
          "Il privato conviene quando vuoi decidere il ritmo con lo skipper, viaggi in gruppo o hai esigenze particolari di orario, comfort o privacy.",
        ],
        cards: [
          {
            title: "4 ore privato",
            text: "Poche soste, ritmo agile e barca riservata.",
            tag: "Mezza giornata",
            image: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
          },
          {
            title: "8 ore condiviso",
            text: "Più tempo in acqua e possibilità di rotta tra Favignana e Levanzo.",
            tag: "Giornata",
            image: snorkelingImage,
          },
          {
            title: "Trimarano gourmet",
            text: "Chef, skipper, hostess, spazi ampi e pranzo a bordo.",
            tag: "Premium",
            image: neelImage,
          },
        ],
      },
      {
        id: "favignana",
        eyebrow: "Abbinamento",
        title: "Perché Levanzo si abbina spesso a Favignana",
        body: [
          "Favignana offre le cale più famose e una costa più varia; Levanzo aggiunge silenzio, acqua trasparente e un borgo molto piccolo. Insieme raccontano due anime diverse delle Egadi.",
          "Non sempre però bisogna forzare entrambe: se il mare suggerisce una rotta più riparata, è meglio vivere poche soste bene che inseguire troppi nomi sulla mappa.",
        ],
        cta: "neel",
      },
    ],
    faqs: [
      {
        question: "Quanto dura un tour in barca a Levanzo da Trapani?",
        answer:
          "Dipende dalla formula scelta. Una mezza giornata è più agile, mentre 8 ore danno più tempo per soste, snorkeling e possibile combinazione con Favignana.",
      },
      {
        question: "Il tour a Levanzo include sempre Favignana?",
        answer:
          "Non sempre. Favignana e Levanzo si combinano spesso, ma la rotta dipende da durata, vento, mare e sicurezza.",
      },
      {
        question: "Meglio tour condiviso o barca privata?",
        answer:
          "Il condiviso è semplice se viaggi in coppia o piccolo gruppo. Il privato è migliore se vuoi privacy, ritmo su misura e più flessibilità.",
      },
      {
        question: "La Grotta del Genovese è inclusa nel tour in barca?",
        answer:
          "No, la Grotta del Genovese è una visita culturale guidata da prenotare tramite canali autorizzati. Il tour in barca può completare la scoperta di Levanzo dal mare.",
      },
    ],
    relatedSlugs: ["levanzo-in-un-giorno", "spiagge-cale", "snorkeling-cala-minnola-calcara"],
  },
];

export const levanzoGuideSlugs = levanzoGuides.map((guide) => guide.slug);

export const levanzoGuideLinks = levanzoGuides.map((guide) => ({
  slug: guide.slug,
  title: guide.shortTitle,
  description: guide.metaDescription,
}));

export function getLevanzoGuide(slug: string): LevanzoGuide | undefined {
  return levanzoGuides.find((guide) => guide.slug === slug);
}
