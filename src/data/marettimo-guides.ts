export type MarettimoGuideSlug =
  | "cosa-vedere"
  | "what-to-see"
  | "que-ver-en-marettimo"
  | "grotte-marine"
  | "sea-caves"
  | "cuevas-marinas"
  | "spiagge-cale"
  | "beaches-coves"
  | "playas-calas-marettimo"
  | "cala-bianca"
  | "marettimo-in-un-giorno"
  | "marettimo-in-one-day"
  | "marettimo-en-un-dia"
  | "come-arrivare-da-trapani"
  | "how-to-get-from-trapani"
  | "como-llegar-desde-trapani"
  | "trekking-sentieri"
  | "hiking-trails"
  | "senderismo-rutas"
  | "tour-in-barca-charter-egadi"
  | "boat-tour-egadi-charter"
  | "excursion-barco-charter-egadi"
  | "que-voir-a-marettimo"
  | "grottes-marines"
  | "plages-criques-marettimo"
  | "marettimo-en-une-journee"
  | "comment-venir-depuis-trapani"
  | "randonnee-sentiers"
  | "excursion-bateau-charter-egades";

export const marettimoGuideSlugPairs = [
  { it: "cosa-vedere", en: "what-to-see", es: "que-ver-en-marettimo", fr: "que-voir-a-marettimo" },
  { it: "grotte-marine", en: "sea-caves", es: "cuevas-marinas", fr: "grottes-marines" },
  { it: "spiagge-cale", en: "beaches-coves", es: "playas-calas-marettimo", fr: "plages-criques-marettimo" },
  { it: "cala-bianca", en: "cala-bianca", es: "cala-bianca", fr: "cala-bianca" },
  { it: "marettimo-in-un-giorno", en: "marettimo-in-one-day", es: "marettimo-en-un-dia", fr: "marettimo-en-une-journee" },
  { it: "come-arrivare-da-trapani", en: "how-to-get-from-trapani", es: "como-llegar-desde-trapani", fr: "comment-venir-depuis-trapani" },
  { it: "trekking-sentieri", en: "hiking-trails", es: "senderismo-rutas", fr: "randonnee-sentiers" },
  {
    it: "tour-in-barca-charter-egadi",
    en: "boat-tour-egadi-charter",
    es: "excursion-barco-charter-egadi",
    fr: "excursion-bateau-charter-egades",
  },
] as const satisfies Array<{ it: MarettimoGuideSlug; en: MarettimoGuideSlug; es: MarettimoGuideSlug; fr: MarettimoGuideSlug }>;

export type MarettimoGuideLocale = "it" | "en" | "es" | "fr";

export function getMarettimoGuideSlugForLocale(
  slug: string,
  locale: MarettimoGuideLocale,
): MarettimoGuideSlug | undefined {
  const pair = marettimoGuideSlugPairs.find(
    (item) => item.it === slug || item.en === slug || item.es === slug || item.fr === slug,
  );
  return pair?.[locale];
}

export function isMarettimoGuideSlug(slug: string): slug is MarettimoGuideSlug {
  return marettimoGuideSlugPairs.some(
    (item) => item.it === slug || item.en === slug || item.es === slug || item.fr === slug,
  );
}

export const marettimoGuideSlugs = [
  "cosa-vedere",
  "grotte-marine",
  "spiagge-cale",
  "cala-bianca",
  "marettimo-in-un-giorno",
  "come-arrivare-da-trapani",
  "trekking-sentieri",
  "tour-in-barca-charter-egadi",
] as const satisfies MarettimoGuideSlug[];

export type MarettimoGuideCta = "charter" | "private" | "compare";

export interface MarettimoGuideSection {
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
  cta?: MarettimoGuideCta;
}

export interface MarettimoGuideFaq {
  question: string;
  answer: string;
}

export interface MarettimoGuideItem {
  name: string;
  description: string;
}

export interface MarettimoGuide {
  slug: MarettimoGuideSlug;
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
  itemList: MarettimoGuideItem[];
  sections: MarettimoGuideSection[];
  faqs: MarettimoGuideFaq[];
  relatedSlugs: MarettimoGuideSlug[];
}

export const marettimoGuideSourceLinks = [
  {
    label: "West of Sicily - Marettimo",
    href: "https://www.westofsicily.com/it/localita/marettimo",
  },
  {
    label: "West of Sicily - Le grotte di Marettimo",
    href: "https://www.westofsicily.com/it/mare-natura/le-grotte-di-marettimo",
  },
  {
    label: "Comune di Favignana - Castello di Punta Troia",
    href: "https://www.comune.favignana.tp.it/it/vivere/castello-di-punta-troia",
  },
  {
    label: "AMP Isole Egadi",
    href: "https://www.ampisoleegadi.it/",
  },
  {
    label: "Visit Sicily - Relitto dei cannoni",
    href: "https://www.visitsicily.info/en/itinerario/marettimo-wreck-of-the-cannons/",
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

const marettimoHero = "/images/islands/marettimo/hero.webp";
const charterImage = "/images/experience-polaroids/charter-trimarano-egadi.webp";
const privateBoatImage = "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp";

export const marettimoGuides: MarettimoGuide[] = [
  {
    slug: "cosa-vedere",
    title: "Cosa vedere a Marettimo: grotte, Punta Troia, Cala Bianca e sentieri",
    shortTitle: "Cosa vedere",
    metaTitle: "Cosa vedere a Marettimo: grotte, Punta Troia e Cala Bianca",
    metaDescription:
      "Guida a cosa vedere a Marettimo: grotte marine, Cala Bianca, Castello di Punta Troia, Case Romane, Monte Falcone, sentieri e charter Egadi.",
    heroImage: marettimoHero,
    heroAlt: "Marettimo vista dal mare con costa alta e acqua blu",
    eyebrow: "Guida completa",
    intro:
      "Marettimo è l'isola più lontana e verticale delle Egadi: meno immediata di Favignana, più montuosa di Levanzo, con grotte marine, sentieri, cale di ciottoli e un borgo raccolto che vive ancora con un ritmo appartato.",
    quickAnswer:
      "Le cose da vedere a Marettimo sono il borgo, Scalo Vecchio e Scalo Nuovo, il Castello di Punta Troia, le Case Romane, Cala Bianca, le grotte marine, Punta Libeccio e i sentieri verso Monte Falcone. In una prima visita conviene scegliere tra giro in barca, trekking o una combinazione leggera, senza provare a fare tutto.",
    primaryKeyword: "cosa vedere a Marettimo",
    secondaryKeywords: [
      "Marettimo cosa vedere",
      "grotte Marettimo",
      "Cala Bianca Marettimo",
      "Punta Troia Marettimo",
    ],
    quickFacts: [
      { label: "Carattere", value: "selvaggia e verticale" },
      { label: "Da non perdere", value: "grotte marine" },
      { label: "Icona", value: "Punta Troia" },
      { label: "Ideale per", value: "charter e trekking" },
    ],
    itemListTitle: "Luoghi principali di Marettimo",
    itemList: [
      {
        name: "Grotte marine",
        description:
          "Grotta del Cammello, del Tuono, della Pipa, del Presepe e altre cavità raccontano la costa più scenografica dell'isola.",
      },
      {
        name: "Castello di Punta Troia",
        description:
          "Fortificazione a picco sul mare, raggiungibile a piedi o via mare, tra storia, panorama e memoria dell'isola.",
      },
      {
        name: "Cala Bianca",
        description:
          "Una delle cale più note di Marettimo, con acqua chiarissima e accesso da valutare in base a mare, tempo e allenamento.",
      },
      {
        name: "Case Romane",
        description:
          "Area archeologica e panoramica lungo i sentieri interni, con vista ampia verso il mare e le altre Egadi.",
      },
      {
        name: "Monte Falcone",
        description:
          "Il riferimento più alto dell'isola, adatto a escursionisti preparati e giornate non troppo calde.",
      },
    ],
    sections: [
      {
        id: "mare-e-grotte",
        eyebrow: "Dal mare",
        title: "Il volto più famoso: grotte, pareti e acqua profonda",
        body: [
          "Marettimo si capisce subito guardandola dal mare: la costa sale verticale, alterna pareti chiare, ingressi di grotte, tagli rocciosi e piccole cale che spesso sono più semplici da leggere in navigazione che via terra.",
          "Il giro delle grotte è uno degli intent più forti per chi cerca Marettimo online. Va però raccontato con onestà: non tutte le cavità sono accessibili ogni giorno e la rotta dipende da vento, onda e sicurezza.",
        ],
        bullets: [
          "Grotta del Cammello e Grotta del Tuono per scenografia.",
          "Grotta della Pipa e Grotta Perciata per geologia e fondali.",
          "Cala Bianca per acqua chiara e contesto selvaggio.",
          "Punta Troia per storia e profilo iconico.",
        ],
        cta: "charter",
      },
      {
        id: "terra-storia",
        eyebrow: "A piedi",
        title: "Punta Troia, Case Romane e sentieri",
        body: [
          "Marettimo non è soltanto mare. Dal borgo partono percorsi che salgono verso Case Romane, il Castello di Punta Troia, Monte Falcone e punti panoramici da cui l'isola cambia scala.",
          "Per molti viaggiatori il dubbio è se dedicare la giornata alle grotte o al trekking. La risposta dipende da stagione, allenamento e tempo disponibile: in estate piena conviene evitare le ore più calde, mentre in primavera e autunno i sentieri diventano una parte centrale dell'esperienza.",
        ],
      },
      {
        id: "come-viverla",
        eyebrow: "Scelta pratica",
        title: "Marettimo non va promessa come tappa automatica",
        body: [
          "Rispetto a Favignana e Levanzo, Marettimo richiede più navigazione e condizioni più favorevoli. Per questo è perfetta nei programmi charter di più giorni, mentre su una singola giornata va valutata con attenzione insieme alla crew.",
          "Il modo più corretto di proporla è come isola da desiderare, ma non da forzare: quando il mare è giusto regala scenari potenti; quando non lo è, una rotta più riparata alle Egadi può essere molto più piacevole.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "Cosa vedere a Marettimo in una prima visita?",
        answer:
          "Per una prima visita scegli tra borgo, Castello di Punta Troia, Case Romane, Cala Bianca e giro delle grotte. Se hai poco tempo, meglio concentrarsi su mare e grotte oppure su un itinerario a piedi, senza provare a fare tutto.",
      },
      {
        question: "Marettimo è meglio in barca o a piedi?",
        answer:
          "Dipende dal tipo di viaggio. La barca è ideale per grotte e costa; i sentieri sono perfetti per chi cerca natura, panorami e storia. La combinazione migliore richiede almeno due giorni o un charter flessibile.",
      },
      {
        question: "Si può vedere Marettimo in giornata da Trapani?",
        answer:
          "Sì, ma la giornata va organizzata bene e dipende dai collegamenti o dalla rotta in barca. Per vivere Marettimo con meno fretta, il charter di più giorni è la soluzione più naturale.",
      },
      {
        question: "Marettimo è adatta a famiglie?",
        answer:
          "Sì, se si scelgono attività adatte all'età e al mare del giorno. Alcuni sentieri e accessi alle cale sono impegnativi, quindi con bambini piccoli è meglio preferire soste semplici e barca comoda.",
      },
    ],
    relatedSlugs: ["grotte-marine", "cala-bianca", "tour-in-barca-charter-egadi"],
  },
  {
    slug: "grotte-marine",
    title: "Grotte di Marettimo: Grotta del Cammello, del Tuono, del Presepe e della Pipa",
    shortTitle: "Grotte marine",
    metaTitle: "Grotte di Marettimo: Cammello, Tuono, Presepe e Pipa",
    metaDescription:
      "Guida alle grotte marine di Marettimo: Grotta del Cammello, del Tuono, della Pipa, del Presepe, Perciata, Bombarda e consigli per vederle in barca.",
    heroImage: marettimoHero,
    heroAlt: "Costa rocciosa di Marettimo con grotte marine e mare blu",
    eyebrow: "Grotte e costa",
    intro:
      "Le grotte marine sono il motivo per cui molti scelgono Marettimo. Non sono un semplice elenco di nomi: sono ingressi, riflessi, fondali, pareti e cavità che cambiano completamente con luce, vento e moto ondoso.",
    quickAnswer:
      "Le grotte più cercate di Marettimo sono Grotta del Cammello, Grotta del Tuono, Grotta della Pipa, Grotta del Presepe, Grotta Perciata, Grotta Ficaredda, Grotta della Bombarda e Grotta degli Innamorati. Si visitano dal mare, ma accesso e soste dipendono sempre dalle condizioni.",
    primaryKeyword: "grotte Marettimo",
    secondaryKeywords: [
      "Grotta del Cammello Marettimo",
      "Grotta del Tuono Marettimo",
      "giro grotte Marettimo",
      "grotte marine Egadi",
    ],
    quickFacts: [
      { label: "Esperienza", value: "via mare" },
      { label: "Quando", value: "mare calmo" },
      { label: "Da sapere", value: "rotta variabile" },
      { label: "Ideale", value: "charter" },
    ],
    itemListTitle: "Grotte da conoscere",
    itemList: [
      {
        name: "Grotta del Cammello",
        description:
          "Una delle grotte più famose, associata a giochi di luce e forme rocciose riconoscibili.",
      },
      {
        name: "Grotta del Tuono",
        description:
          "Cavità scenografica della costa settentrionale, da valutare solo con condizioni marine adatte.",
      },
      {
        name: "Grotta della Pipa",
        description:
          "Grotta nota per le particolarità interne e per il rapporto tra roccia, acqua e memoria materiale.",
      },
      {
        name: "Grotta del Presepe",
        description:
          "Suggestiva per depositi calcarei e forme naturali che danno il nome alla cavità.",
      },
      {
        name: "Grotta della Bombarda",
        description:
          "Una delle cavità più particolari del periplo, con fondali e forme interne da osservare con rispetto.",
      },
    ],
    sections: [
      {
        id: "percorso",
        eyebrow: "Periplo",
        title: "Il giro delle grotte non è una lista fissa",
        body: [
          "Chi cerca le grotte di Marettimo spesso immagina un itinerario sempre identico. In realtà la costa va letta sul momento: una grotta può essere splendida con mare calmo e scomoda o non sicura con onda lunga.",
          "Per questo il valore della crew non è solo portarti davanti ai nomi famosi, ma scegliere il ritmo giusto, capire dove fermarsi e quando è meglio guardare un tratto in navigazione senza entrare.",
        ],
        cta: "charter",
      },
      {
        id: "nomi-famosi",
        eyebrow: "Da conoscere",
        title: "Cammello, Tuono, Pipa, Presepe: perché sono così cercate",
        body: [
          "La Grotta del Cammello è tra le più nominate perché unisce forma riconoscibile, acqua intensa e luce. La Grotta del Tuono parla già dal nome: qui il rapporto tra cavità e mare è parte dell'effetto.",
          "La Grotta della Pipa e la Grotta del Presepe aggiungono un registro più geologico, fatto di depositi, forme interne e piccoli dettagli. Sono luoghi da osservare senza ridurli a una foto veloce.",
        ],
        cards: [
          {
            title: "Luce",
            text: "Le ore centrali possono valorizzare riflessi e colore dell'acqua.",
            tag: "Foto",
            image: marettimoHero,
          },
          {
            title: "Sicurezza",
            text: "L'ingresso in grotta dipende da onda, vento e valutazione dello skipper.",
            tag: "Meteo",
            image: privateBoatImage,
          },
          {
            title: "Ritmo",
            text: "Un charter permette di non comprimere tutto in una sola corsa.",
            tag: "Charter",
            image: charterImage,
          },
        ],
      },
      {
        id: "amp",
        eyebrow: "Rispetto",
        title: "Area Marina Protetta e comportamento in grotta",
        body: [
          "Marettimo è dentro il sistema dell'Area Marina Protetta delle Isole Egadi. Questo significa che mare, fondali, specie protette e regole di fruizione non sono un dettaglio burocratico, ma parte dell'esperienza.",
          "La visita alle grotte deve essere lenta, rispettosa e compatibile con le condizioni. Niente forzature, niente rumore inutile, niente promesse assolute: il mare decide il margine della giornata.",
        ],
      },
    ],
    faqs: [
      {
        question: "Quali sono le grotte più belle di Marettimo?",
        answer:
          "Tra le più conosciute ci sono Grotta del Cammello, Grotta del Tuono, Grotta della Pipa, Grotta del Presepe, Grotta Perciata, Grotta Ficaredda, Grotta della Bombarda e Grotta degli Innamorati.",
      },
      {
        question: "Si può entrare sempre nelle grotte di Marettimo?",
        answer:
          "No. L'ingresso dipende da mare, vento, onda e sicurezza. In alcune giornate è più corretto osservare le grotte dall'esterno o cambiare tratto di costa.",
      },
      {
        question: "Serve prenotare un giro in barca per vedere le grotte?",
        answer:
          "Sì, le grotte marine si vedono dal mare. Puoi farlo con escursioni locali o inserirle in un programma charter quando la rotta verso Marettimo è compatibile con il meteo.",
      },
      {
        question: "Qual è il periodo migliore per le grotte di Marettimo?",
        answer:
          "Primavera, estate e inizio autunno sono i periodi più naturali, ma la vera differenza la fanno mare calmo, visibilità e vento del giorno.",
      },
    ],
    relatedSlugs: ["cosa-vedere", "cala-bianca", "tour-in-barca-charter-egadi"],
  },
  {
    slug: "spiagge-cale",
    title: "Spiagge e cale di Marettimo: Cala Bianca, Scalo Maestro, Cala Nera e Cretazzo",
    shortTitle: "Spiagge e cale",
    metaTitle: "Spiagge e cale di Marettimo: Cala Bianca e Scalo Maestro",
    metaDescription:
      "Guida alle spiagge e cale di Marettimo: Cala Bianca, Scalo Maestro, Cala Manione, Cala Nera, Cretazzo, Scalo Vecchio, Scalo Nuovo e consigli pratici.",
    heroImage: marettimoHero,
    heroAlt: "Cale di Marettimo con costa rocciosa e acqua trasparente",
    eyebrow: "Mare e cale",
    intro:
      "Le spiagge di Marettimo sono diverse da quelle che molti immaginano: non grandi lidi sabbiosi, ma cale piccole, ciottoli, approdi, acqua profonda e tratti che spesso si vivono meglio dal mare o con sentieri ben pianificati.",
    quickAnswer:
      "Le cale più note di Marettimo sono Cala Bianca, Scalo Maestro, Cala Manione, Cala Nera, Cretazzo, Scalo Vecchio, Scalo Nuovo e Praia dei Nacchi. La scelta migliore dipende da accesso, vento e tempo disponibile.",
    primaryKeyword: "spiagge Marettimo",
    secondaryKeywords: [
      "cale Marettimo",
      "Cala Bianca Marettimo",
      "Scalo Maestro Marettimo",
      "Cala Nera Marettimo",
    ],
    quickFacts: [
      { label: "Tipo", value: "ciottoli e roccia" },
      { label: "Iconica", value: "Cala Bianca" },
      { label: "Comode", value: "Scalo Vecchio e Nuovo" },
      { label: "Da valutare", value: "accessi e vento" },
    ],
    itemListTitle: "Cale principali",
    itemList: [
      {
        name: "Cala Bianca",
        description:
          "La cala più famosa, con acqua chiara e un contesto selvaggio che richiede tempo e condizioni giuste.",
      },
      {
        name: "Scalo Maestro",
        description:
          "Piccola cala sotto Punta Troia, legata al castello e alla parte settentrionale dell'isola.",
      },
      {
        name: "Cala Manione",
        description:
          "Riferimento vicino a Punta Troia, da leggere insieme a Scalo Maestro e al profilo del promontorio.",
      },
      {
        name: "Cala Nera",
        description:
          "Cala del versante occidentale, più appartata e da valutare soprattutto in barca.",
      },
      {
        name: "Cretazzo",
        description:
          "Tratto costiero più solitario, interessante per chi cerca un Marettimo meno immediato.",
      },
    ],
    sections: [
      {
        id: "cittadine",
        eyebrow: "Vicino al borgo",
        title: "Scalo Vecchio e Scalo Nuovo: il mare più immediato",
        body: [
          "Se arrivi con collegamenti di linea, le prime zone da considerare sono Scalo Vecchio e Scalo Nuovo. Non sono spiagge da cartolina patinata, ma punti pratici per entrare nel ritmo del paese e fare un bagno semplice.",
          "Sono utili quando hai poche ore, non vuoi affrontare sentieri lunghi o preferisci tenere il porto vicino per il rientro.",
        ],
      },
      {
        id: "cale-selvagge",
        eyebrow: "Più scenografiche",
        title: "Cala Bianca, Scalo Maestro, Cala Nera e Cretazzo",
        body: [
          "Cala Bianca è la più cercata, ma non è l'unica. Scalo Maestro e Cala Manione si collegano alla zona di Punta Troia; Cala Nera e Cretazzo raccontano un lato più selvaggio e meno immediato.",
          "Qui la domanda non è solo quale sia la più bella, ma quale abbia senso raggiungere quel giorno. Marettimo richiede di bilanciare desiderio, accesso, caldo, vento e tempi di rientro.",
        ],
        cta: "private",
      },
      {
        id: "barca-o-piedi",
        eyebrow: "Scelta",
        title: "Meglio barca o sentiero?",
        body: [
          "La barca è più adatta se vuoi vedere più cale e leggere la costa senza affrontare accessi lunghi. I sentieri sono perfetti se vuoi un'esperienza più fisica e panoramica.",
          "In estate, con sole forte e poco tempo, molte cale diventano più ragionevoli via mare. In primavera e autunno, invece, camminare può essere parte centrale della giornata.",
        ],
      },
    ],
    faqs: [
      {
        question: "Qual è la spiaggia più bella di Marettimo?",
        answer:
          "Cala Bianca è spesso considerata la più scenografica, ma la migliore dipende da mare, vento e accesso. Scalo Maestro, Cala Nera e Cretazzo possono essere più adatte in base alla giornata.",
      },
      {
        question: "Ci sono spiagge comode vicino al paese?",
        answer:
          "Sì, Scalo Vecchio e Scalo Nuovo sono le soluzioni più immediate vicino al borgo. Sono pratiche se hai poco tempo o vuoi restare vicino al porto.",
      },
      {
        question: "Le cale di Marettimo sono adatte ai bambini?",
        answer:
          "Alcune sì, ma molte sono di ciottoli o con accessi non banali. Con bambini piccoli conviene scegliere soste semplici e, se si esce in barca, seguire le indicazioni dello skipper.",
      },
      {
        question: "Serve la barca per vedere le cale più belle?",
        answer:
          "Non sempre, ma la barca aiuta molto. Alcune cale richiedono camminate lunghe o accessi scomodi, mentre dal mare si può adattare la rotta alle condizioni.",
      },
    ],
    relatedSlugs: ["cala-bianca", "grotte-marine", "marettimo-in-un-giorno"],
  },
  {
    slug: "cala-bianca",
    title: "Cala Bianca Marettimo: come arrivare, quando andare e cosa sapere",
    shortTitle: "Cala Bianca",
    metaTitle: "Cala Bianca Marettimo: come arrivare e quando andare",
    metaDescription:
      "Guida a Cala Bianca a Marettimo: come arrivare, quando conviene, cosa sapere su accesso, mare, barca, sentieri e visita durante un charter Egadi.",
    heroImage: marettimoHero,
    heroAlt: "Mare cristallino e costa alta a Marettimo",
    eyebrow: "Cala iconica",
    intro:
      "Cala Bianca è uno dei nomi più cercati quando si parla di Marettimo. Il fascino è chiaro: acqua luminosa, costa selvaggia, sensazione di distanza. Ma proprio per questo va raccontata senza semplificazioni.",
    quickAnswer:
      "Cala Bianca si può raggiungere via mare o tramite sentieri impegnativi. È una cala da scegliere con mare adatto, tempo sufficiente e consapevolezza dell'accesso. Per molti visitatori ha più senso inserirla in un giro in barca o in un charter meteo-dipendente.",
    primaryKeyword: "Cala Bianca Marettimo",
    secondaryKeywords: [
      "come arrivare Cala Bianca Marettimo",
      "Cala Bianca in barca",
      "spiaggia Cala Bianca Marettimo",
      "Marettimo Cala Bianca",
    ],
    quickFacts: [
      { label: "Famosa per", value: "acqua chiara" },
      { label: "Accesso", value: "da valutare" },
      { label: "Meglio con", value: "mare calmo" },
      { label: "Soluzione", value: "barca o charter" },
    ],
    itemListTitle: "Cosa sapere su Cala Bianca",
    itemList: [
      {
        name: "Accesso via mare",
        description:
          "È spesso la soluzione più naturale, perché evita sentieri lunghi e permette di valutare il mare sul momento.",
      },
      {
        name: "Accesso a piedi",
        description:
          "Richiede tempo, caldo da gestire e buona abitudine a camminare su percorsi isolani.",
      },
      {
        name: "Mare e vento",
        description:
          "La cala è splendida quando le condizioni sono favorevoli, meno comoda quando arriva onda o vento non adatto.",
      },
      {
        name: "Tempi",
        description:
          "Non va incastrata in modo frettoloso se hai coincidenze strette con aliscafi o rientri.",
      },
    ],
    sections: [
      {
        id: "come-arrivare",
        eyebrow: "Accesso",
        title: "Come arrivare a Cala Bianca",
        body: [
          "La domanda più comune è semplice: come si arriva a Cala Bianca? La risposta corretta è meno secca: si può valutare via mare o a piedi, ma entrambe le opzioni dipendono da tempo, allenamento, temperatura e mare.",
          "Via mare è spesso la scelta più confortevole, soprattutto se l'obiettivo è fare bagno e vivere la costa. A piedi, invece, diventa un'esperienza più escursionistica e richiede margine.",
        ],
        cta: "private",
      },
      {
        id: "quando",
        eyebrow: "Periodo",
        title: "Quando andare e quando evitarla",
        body: [
          "Cala Bianca dà il meglio con mare calmo, buona visibilità e luce alta. Nelle giornate giuste l'acqua sembra quasi irreale; in quelle sbagliate può diventare una tappa poco comoda.",
          "Il punto non è spuntare il nome a ogni costo, ma scegliere la finestra migliore. Una crew esperta può decidere se fermarsi, passare in navigazione o preferire un'altra cala più riparata.",
        ],
      },
      {
        id: "aspettative",
        eyebrow: "Onestà",
        title: "Non è una spiaggia facile nel senso classico",
        body: [
          "Chi cerca stabilimenti, servizi e accessi semplici deve sapere che Marettimo non funziona come una destinazione balneare tradizionale. Cala Bianca è più selvaggia, più essenziale, più legata al contesto naturale.",
          "Porta acqua, protezione solare e scarpe adatte se la raggiungi a piedi. Se la vivi dal mare, ascolta sempre le indicazioni dello skipper.",
        ],
      },
    ],
    faqs: [
      {
        question: "Cala Bianca a Marettimo è raggiungibile a piedi?",
        answer:
          "Sì, ma l'accesso richiede tempo e abitudine ai sentieri. In estate, con caldo forte, va valutato con attenzione.",
      },
      {
        question: "Cala Bianca è meglio in barca?",
        answer:
          "Per molti visitatori sì, perché la barca permette di arrivare dal mare, valutare le condizioni e non consumare la giornata in spostamenti a piedi.",
      },
      {
        question: "Cala Bianca è sempre inclusa nei tour?",
        answer:
          "No. Dipende da rotta, meteo marino, durata e sicurezza. È meglio considerarla una possibilità, non una promessa assoluta.",
      },
      {
        question: "Cala Bianca è adatta a chi non nuota bene?",
        answer:
          "Dipende dalle condizioni. Con mare calmo può essere piacevole, ma chi non nuota bene deve restare prudente e seguire le indicazioni della crew.",
      },
    ],
    relatedSlugs: ["spiagge-cale", "grotte-marine", "tour-in-barca-charter-egadi"],
  },
  {
    slug: "marettimo-in-un-giorno",
    title: "Marettimo in un giorno: itinerario pratico da Trapani",
    shortTitle: "In un giorno",
    metaTitle: "Marettimo in un giorno: cosa vedere partendo da Trapani",
    metaDescription:
      "Itinerario per vedere Marettimo in un giorno da Trapani: borgo, Castello di Punta Troia, grotte, Cala Bianca, sentieri e consigli pratici.",
    heroImage: marettimoHero,
    heroAlt: "Borgo e costa di Marettimo durante una giornata alle Egadi",
    eyebrow: "Itinerario pratico",
    intro:
      "Marettimo in un giorno è possibile, ma richiede una scelta netta. L'errore è voler fare grotte, trekking, Cala Bianca, borgo e rientro senza margine: l'isola è piccola sulla mappa, ma intensa nei tempi reali.",
    quickAnswer:
      "In un giorno a Marettimo scegli una delle tre strade: giro delle grotte e bagno, trekking verso Punta Troia/Case Romane, oppure visita leggera del borgo con mare vicino. Se parti da Trapani, controlla sempre collegamenti e margini di rientro su fonti ufficiali.",
    primaryKeyword: "Marettimo in un giorno",
    secondaryKeywords: [
      "itinerario Marettimo un giorno",
      "cosa fare a Marettimo in giornata",
      "Marettimo da Trapani",
      "gita Marettimo",
    ],
    quickFacts: [
      { label: "Tempo", value: "1 giornata" },
      { label: "Regola", value: "scegli poche tappe" },
      { label: "Rischio", value: "coincidenze strette" },
      { label: "Alternativa", value: "charter lento" },
    ],
    itemListTitle: "Itinerari possibili",
    itemList: [
      {
        name: "Grotte e bagno",
        description:
          "La scelta migliore se vuoi vivere Marettimo dal mare e concentrarti sulla costa.",
      },
      {
        name: "Punta Troia",
        description:
          "Itinerario storico e panoramico per chi ama camminare e vuole vedere il castello.",
      },
      {
        name: "Case Romane",
        description:
          "Tappa interna che unisce archeologia, natura e vista verso il mare.",
      },
      {
        name: "Borgo e scali",
        description:
          "Soluzione leggera se hai poche ore o vuoi restare vicino al porto.",
      },
    ],
    sections: [
      {
        id: "scelta",
        eyebrow: "Prima decisione",
        title: "Non fare tutto: scegli il tipo di giornata",
        body: [
          "Marettimo premia chi sceglie. Se vuoi vedere le grotte, costruisci la giornata intorno al mare. Se vuoi camminare, dedica tempo a Punta Troia o Case Romane. Se vuoi solo assaggiare l'isola, resta tra borgo e scali.",
          "Questa selezione non è una rinuncia: è il modo più intelligente per non trasformare una giornata bella in una corsa contro il rientro.",
        ],
      },
      {
        id: "programma",
        eyebrow: "Esempio",
        title: "Un itinerario ragionevole da Trapani",
        body: [
          "Arrivo al porto, passeggiata nel borgo, scelta tra giro in barca delle grotte o cammino verso un punto panoramico, pausa pranzo semplice e rientro con margine. Gli orari precisi vanno verificati sui siti ufficiali.",
          "Se invece sei in charter, il ritmo cambia: Marettimo può diventare una tappa più ampia, con rada, bagno, tramonto e ripartenza il giorno dopo.",
        ],
        steps: [
          {
            label: "Mattina",
            title: "Arrivo e scelta della rotta",
            text: "Decidi subito se puntare su grotte o sentieri, senza rimandare la scelta.",
          },
          {
            label: "Metà giornata",
            title: "Esperienza principale",
            text: "Giro in barca, Punta Troia o Case Romane: una sola priorità forte.",
          },
          {
            label: "Pomeriggio",
            title: "Borgo e rientro",
            text: "Tieni margine per porto, bagagli, acqua e coincidenze.",
          },
        ],
        cta: "charter",
      },
      {
        id: "errori",
        eyebrow: "Da evitare",
        title: "Gli errori più comuni",
        body: [
          "Il primo errore è sottovalutare il mare: anche se c'è sole, una rotta può non essere comoda. Il secondo è sottovalutare i sentieri, soprattutto con caldo e poco allenamento.",
          "Il terzo è affidarsi a orari vecchi salvati in screenshot. Per Marettimo i collegamenti vanno sempre verificati prima della partenza.",
        ],
      },
    ],
    faqs: [
      {
        question: "Marettimo si visita bene in un giorno?",
        answer:
          "Sì, ma solo scegliendo poche tappe. In una giornata conviene fare mare e grotte oppure trekking leggero, non entrambe le cose in modo completo.",
      },
      {
        question: "Cosa vedere a Marettimo in poche ore?",
        answer:
          "Con poche ore resta vicino al borgo, Scalo Vecchio, Scalo Nuovo e scegli una breve esperienza in barca solo se gli orari lo permettono.",
      },
      {
        question: "Meglio dormire a Marettimo?",
        answer:
          "Se vuoi sentieri, grotte e cale senza fretta, sì. Dormire sull'isola o in charter permette di vivere Marettimo con un ritmo molto più naturale.",
      },
      {
        question: "Si può fare Marettimo da Trapani con un tour privato?",
        answer:
          "Si può valutare, ma non va promessa come rotta fissa. Distanza, mare e tempi devono essere confermati dalla crew.",
      },
    ],
    relatedSlugs: ["come-arrivare-da-trapani", "grotte-marine", "trekking-sentieri"],
  },
  {
    slug: "come-arrivare-da-trapani",
    title: "Come arrivare a Marettimo da Trapani: aliscafi, traghetti e consigli",
    shortTitle: "Come arrivare",
    metaTitle: "Come arrivare a Marettimo da Trapani: aliscafi e traghetti",
    metaDescription:
      "Come arrivare a Marettimo da Trapani: collegamenti via mare, aliscafi, traghetti, consigli su orari ufficiali, rientro e alternative in barca.",
    heroImage: marettimoHero,
    heroAlt: "Navigazione verso Marettimo da Trapani",
    eyebrow: "Logistica",
    intro:
      "Arrivare a Marettimo significa organizzare bene il mare prima ancora dell'itinerario. L'isola è raggiungibile via mare, ma tempi, frequenze e condizioni operative cambiano: per questo conviene usare sempre fonti ufficiali.",
    quickAnswer:
      "Marettimo si raggiunge da Trapani con collegamenti di linea via mare, operati da compagnie ufficiali come Liberty Lines e Caronte & Tourist/Siremar. Orari e disponibilità cambiano per stagione, quindi non vanno copiati da vecchie guide: verifica sempre prima di partire.",
    primaryKeyword: "come arrivare a Marettimo da Trapani",
    secondaryKeywords: [
      "aliscafo Trapani Marettimo",
      "traghetto Trapani Marettimo",
      "Marettimo collegamenti",
      "Marettimo da Trapani",
    ],
    quickFacts: [
      { label: "Partenza", value: "Trapani" },
      { label: "Mezzo", value: "via mare" },
      { label: "Controlla", value: "orari ufficiali" },
      { label: "Alternativa", value: "charter" },
    ],
    itemListTitle: "Opzioni da valutare",
    itemList: [
      {
        name: "Aliscafo",
        description:
          "Soluzione veloce per passeggeri, con orari da verificare sul sito dell'operatore.",
      },
      {
        name: "Traghetto",
        description:
          "Alternativa più lenta e operativa in base alla programmazione della compagnia.",
      },
      {
        name: "Barca privata",
        description:
          "Da valutare per gruppi e solo con meteo, mare e durata compatibili.",
      },
      {
        name: "Charter",
        description:
          "La soluzione più naturale se vuoi includere Marettimo senza comprimere tempi e rientri.",
      },
    ],
    sections: [
      {
        id: "linea",
        eyebrow: "Collegamenti",
        title: "Aliscafi e traghetti: controlla sempre le fonti ufficiali",
        body: [
          "Per raggiungere Marettimo il riferimento principale è il porto di Trapani. Le compagnie di linea pubblicano orari, tratte e disponibilità aggiornate: sono quelle le informazioni da usare prima di pianificare la giornata.",
          "Evita screenshot vecchi o articoli con orari fissi: sulle isole il calendario cambia con stagione, meteo e operatività.",
        ],
      },
      {
        id: "rientro",
        eyebrow: "Margine",
        title: "Il rientro conta quanto l'andata",
        body: [
          "Marettimo è più lontana rispetto a Favignana e Levanzo. Questo significa che il rientro va pianificato con margine, soprattutto se vuoi fare un'attività a piedi o un giro in barca locale.",
          "Un itinerario bello ma troppo stretto rischia di diventare fragile: controlla l'ultimo collegamento utile e lascia tempo per tornare al porto.",
        ],
      },
      {
        id: "charter",
        eyebrow: "Alternativa",
        title: "Quando ha senso scegliere un charter",
        body: [
          "Se Marettimo è il cuore del viaggio e non una tappa da spuntare, il charter è la formula più coerente. Permette di allungare la rotta, fermarsi in rada quando possibile e aggiornare il programma giorno per giorno.",
          "Non elimina il meteo, ma ti dà più margine per adattarti al meteo invece di subire un solo orario di rientro.",
        ],
        cta: "charter",
      },
    ],
    faqs: [
      {
        question: "Da dove si parte per arrivare a Marettimo?",
        answer:
          "Il riferimento principale è il porto di Trapani. Orari e disponibilità vanno controllati sui siti ufficiali delle compagnie di collegamento.",
      },
      {
        question: "Meglio aliscafo o traghetto per Marettimo?",
        answer:
          "L'aliscafo è normalmente più veloce per passeggeri, il traghetto segue una logica più operativa. La scelta dipende da orari, disponibilità e necessità di viaggio.",
      },
      {
        question: "Si può arrivare a Marettimo con barca privata?",
        answer:
          "Sì, ma per una singola giornata va valutato con attenzione. Marettimo richiede più navigazione e condizioni meteo-marine favorevoli.",
      },
      {
        question: "Conviene andare a Marettimo solo per poche ore?",
        answer:
          "Può valere la pena se vuoi assaggiare il borgo, ma per grotte, sentieri e cale è meglio avere una giornata piena o più giorni.",
      },
    ],
    relatedSlugs: ["marettimo-in-un-giorno", "tour-in-barca-charter-egadi", "trekking-sentieri"],
  },
  {
    slug: "trekking-sentieri",
    title: "Trekking a Marettimo: sentieri, Case Romane, Monte Falcone e Punta Troia",
    shortTitle: "Trekking",
    metaTitle: "Trekking a Marettimo: sentieri, Case Romane e Punta Troia",
    metaDescription:
      "Guida al trekking a Marettimo: sentieri per Case Romane, Monte Falcone, Castello di Punta Troia, Punta Libeccio, consigli su stagione e sicurezza.",
    heroImage: marettimoHero,
    heroAlt: "Sentieri e montagne di Marettimo sopra il mare",
    eyebrow: "Sentieri e natura",
    intro:
      "Marettimo è l'isola delle Egadi che più parla agli escursionisti. Dal paese partono sentieri che salgono verso crinali, sorgenti, ruderi, castello e panorami ampi sul Mediterraneo.",
    quickAnswer:
      "I trekking più cercati a Marettimo sono Case Romane, Monte Falcone, Castello di Punta Troia, Punta Libeccio e percorsi panoramici verso il versante occidentale. Servono scarpe adatte, acqua, protezione solare e una valutazione seria di caldo e dislivello.",
    primaryKeyword: "trekking Marettimo",
    secondaryKeywords: [
      "sentieri Marettimo",
      "Case Romane Marettimo",
      "Monte Falcone Marettimo",
      "Punta Troia trekking",
    ],
    quickFacts: [
      { label: "Isola", value: "montuosa" },
      { label: "Icone", value: "Case Romane e Punta Troia" },
      { label: "Quota", value: "Monte Falcone" },
      { label: "Attenzione", value: "caldo e acqua" },
    ],
    itemListTitle: "Sentieri e tappe",
    itemList: [
      {
        name: "Case Romane",
        description:
          "Tappa archeologica e panoramica, spesso inserita negli itinerari a piedi più classici.",
      },
      {
        name: "Monte Falcone",
        description:
          "La salita più ambiziosa, da affrontare con allenamento, meteo adatto e tempo sufficiente.",
      },
      {
        name: "Castello di Punta Troia",
        description:
          "Percorso panoramico verso uno dei simboli storici dell'isola.",
      },
      {
        name: "Punta Libeccio",
        description:
          "Versante più appartato e marino, da pianificare con attenzione.",
      },
    ],
    sections: [
      {
        id: "case-romane",
        eyebrow: "Classico",
        title: "Case Romane: storia e panorama",
        body: [
          "Case Romane è una delle mete più naturali per chi vuole camminare a Marettimo senza puntare subito all'itinerario più impegnativo. Il valore sta nel dialogo tra resti antichi, chiesetta, montagna e vista sul mare.",
          "È una tappa utile anche per capire l'isola: Marettimo non è soltanto costa, ma un sistema di percorsi interni che partono dal borgo e si aprono a ventaglio.",
        ],
      },
      {
        id: "punta-troia",
        eyebrow: "Panorama",
        title: "Punta Troia e il castello",
        body: [
          "Il sentiero verso Punta Troia porta a uno dei profili più riconoscibili di Marettimo. Il castello è visitabile all'esterno e, negli orari previsti, anche negli ambienti interni secondo la gestione del sito.",
          "Il percorso non va banalizzato: alcuni tratti richiedono attenzione, soprattutto con caldo, vento o bambini. In alternativa, la zona può essere letta anche dal mare.",
        ],
        cta: "private",
      },
      {
        id: "monte-falcone",
        eyebrow: "Escursionisti",
        title: "Monte Falcone e percorsi più lunghi",
        body: [
          "Monte Falcone è la scelta per chi vuole un trekking vero, non una passeggiata. Richiede tempo, acqua, passo regolare e condizioni meteo adatte.",
          "Il consiglio è evitare improvvisazioni: scarpe, cappello, rientro e orario di partenza fanno la differenza tra una giornata memorabile e una giornata faticosa per i motivi sbagliati.",
        ],
      },
    ],
    faqs: [
      {
        question: "Quali sono i sentieri più belli di Marettimo?",
        answer:
          "I percorsi più cercati portano a Case Romane, Castello di Punta Troia, Monte Falcone e Punta Libeccio. La scelta dipende da allenamento, stagione e tempo disponibile.",
      },
      {
        question: "Serve attrezzatura da trekking a Marettimo?",
        answer:
          "Servono almeno scarpe adatte, acqua, protezione solare e abbigliamento comodo. Per percorsi lunghi è meglio avere esperienza e non partire nelle ore più calde.",
      },
      {
        question: "Il sentiero per Punta Troia è adatto a tutti?",
        answer:
          "Non sempre. È panoramico ma può essere impegnativo per chi non è abituato a camminare o viaggia con bambini piccoli.",
      },
      {
        question: "Meglio trekking o giro in barca a Marettimo?",
        answer:
          "Sono due esperienze diverse. Il trekking racconta la montagna e la storia; la barca racconta grotte, pareti e cale. Con più giorni conviene fare entrambe.",
      },
    ],
    relatedSlugs: ["cosa-vedere", "marettimo-in-un-giorno", "come-arrivare-da-trapani"],
  },
  {
    slug: "tour-in-barca-charter-egadi",
    title: "Tour in barca a Marettimo e charter Egadi: quando conviene",
    shortTitle: "Barca e charter",
    metaTitle: "Tour in barca Marettimo e charter Egadi: quando scegliere",
    metaDescription:
      "Guida a tour in barca e charter per Marettimo: quando conviene, differenze con Favignana e Levanzo, meteo, grotte, Cala Bianca e rotta in trimarano.",
    heroImage: charterImage,
    heroAlt: "Trimarano in navigazione alle Isole Egadi durante un charter",
    eyebrow: "Esperienze Egadi",
    intro:
      "Marettimo è l'isola che più di tutte richiede una scelta consapevole: è lontana, potente, bellissima, ma non sempre adatta a una promessa di tour giornaliero standard. Per questo il charter è spesso la formula più coerente.",
    quickAnswer:
      "Un tour in barca a Marettimo conviene quando meteo, durata e rotta permettono una navigazione sicura e piacevole. Il charter Egadi è più indicato se vuoi includere Marettimo con calma, grotte, Cala Bianca, rada e programma aggiornabile giorno per giorno.",
    primaryKeyword: "tour in barca Marettimo",
    secondaryKeywords: [
      "charter Marettimo",
      "charter Egadi Marettimo",
      "Marettimo in barca",
      "tour grotte Marettimo",
    ],
    quickFacts: [
      { label: "Formula migliore", value: "charter" },
      { label: "Motivo", value: "più margine meteo" },
      { label: "Da vedere", value: "grotte e Cala Bianca" },
      { label: "Promessa", value: "mai automatica" },
    ],
    itemListTitle: "Quale esperienza scegliere",
    itemList: [
      {
        name: "Charter Egadi",
        description:
          "La scelta più coerente per includere Marettimo in una rotta di più giorni, senza comprimere tempi e rientri.",
      },
      {
        name: "Tour privato",
        description:
          "Opzione da valutare caso per caso con skipper, meteo, durata e aspettative del gruppo.",
      },
      {
        name: "Giro grotte locale",
        description:
          "Soluzione utile se sei già sull'isola e vuoi concentrarti sul periplo e sulle grotte.",
      },
      {
        name: "Rotta alternativa",
        description:
          "Quando Marettimo non è adatta, Favignana e Levanzo possono offrire baie più riparate e giornate più confortevoli.",
      },
    ],
    sections: [
      {
        id: "perche-charter",
        eyebrow: "Scelta migliore",
        title: "Perché il charter è la formula più naturale",
        body: [
          "Marettimo richiede distanza, lettura del mare e tempo. In un charter di più giorni puoi inserirla quando le condizioni sono favorevoli, restare più a lungo se il meteo lo consente e cambiare programma senza rovinare la giornata.",
          "Il trimarano diventa una base mobile: dormi vicino al mare, riduci la pressione del rientro e vivi l'isola come tappa di viaggio, non come corsa.",
        ],
        cta: "charter",
      },
      {
        id: "privato",
        eyebrow: "Da valutare",
        title: "Tour privato giornaliero: possibile, ma non automatico",
        body: [
          "Un tour privato verso Marettimo può avere senso per gruppi che accettano flessibilità e valutazione meteo. Non è però una rotta da vendere come sempre garantita.",
          "La crew deve poter confermare o modificare la rotta in base a vento, mare, sicurezza e comfort. Questa è una garanzia di serietà, non un limite.",
        ],
        cta: "private",
      },
      {
        id: "copy-onesto",
        eyebrow: "Promessa corretta",
        title: "Cosa comunicare al cliente",
        body: [
          "Marettimo può essere la parte più memorabile di un viaggio alle Egadi, ma solo se viene scelta nel momento giusto. Promettere sempre Cala Bianca, grotte e Punta Troia non sarebbe corretto.",
          "Il messaggio migliore è chiaro: costruiamo la rotta con te, proviamo a includere Marettimo quando ha senso e scegliamo sempre la soluzione più bella e sicura del giorno.",
        ],
      },
    ],
    faqs: [
      {
        question: "Egadisailing fa tour giornalieri a Marettimo?",
        answer:
          "Marettimo può essere valutata su rotta privata o charter, ma non va considerata una tappa giornaliera sempre garantita. La decisione dipende da meteo, mare, tempi e sicurezza.",
      },
      {
        question: "Perché scegliere un charter per Marettimo?",
        answer:
          "Perché dà più tempo e più margine. Marettimo è più lontana e verticale: con più giorni puoi scegliere la finestra meteo migliore e vivere grotte, cale e rada senza fretta.",
      },
      {
        question: "Il charter include sempre Marettimo?",
        answer:
          "L'itinerario viene concordato con la crew e aggiornato secondo il meteo. Marettimo è una possibilità importante, ma non va forzata se le condizioni non sono adatte.",
      },
      {
        question: "Quale barca è più adatta a Marettimo?",
        answer:
          "Per un programma di più giorni il trimarano è la soluzione più comoda. Per uscite private giornaliere serve valutazione specifica su durata, mare e obiettivi del gruppo.",
      },
    ],
    relatedSlugs: ["grotte-marine", "cala-bianca", "come-arrivare-da-trapani"],
  },
];

export const marettimoGuideLinks = marettimoGuides.map((guide) => ({
  slug: guide.slug,
  title: guide.shortTitle,
  description: guide.metaDescription,
}));

export function getMarettimoGuide(slug: string): MarettimoGuide | undefined {
  return marettimoGuides.find((guide) => guide.slug === slug);
}
