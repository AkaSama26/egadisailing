export type FavignanaGuideSlug =
  | "cosa-vedere-top-10"
  | "top-10-things-to-see"
  | "dove-fare-il-bagno-spiagge-cale"
  | "best-beaches-coves"
  | "favignana-in-un-giorno"
  | "favignana-in-one-day"
  | "cala-rossa"
  | "bue-marino-cave-tufo"
  | "bue-marino-tuff-quarries"
  | "bue-marino-canteras-toba"
  | "snorkeling-favignana"
  | "snorkeling-in-favignana"
  | "snorkel-en-favignana"
  | "come-arrivare-da-trapani-e-muoversi"
  | "how-to-get-from-trapani-and-get-around"
  | "como-llegar-desde-trapani-y-moverse"
  | "tour-in-barca-favignana-levanzo"
  | "favignana-levanzo-boat-tour"
  | "que-ver-en-favignana"
  | "mejores-playas-calas-favignana"
  | "favignana-en-un-dia"
  | "excursion-barco-favignana-levanzo"
  | "que-voir-a-favignana"
  | "plus-belles-plages-criques-favignana"
  | "favignana-en-une-journee"
  | "bue-marino-carrieres-tuf"
  | "snorkeling-a-favignana"
  | "comment-venir-depuis-trapani-et-se-deplacer"
  | "excursion-bateau-favignana-levanzo";

export const favignanaGuideSlugPairs = [
  {
    it: "cosa-vedere-top-10",
    en: "top-10-things-to-see",
    es: "que-ver-en-favignana",
    fr: "que-voir-a-favignana",
  },
  {
    it: "dove-fare-il-bagno-spiagge-cale",
    en: "best-beaches-coves",
    es: "mejores-playas-calas-favignana",
    fr: "plus-belles-plages-criques-favignana",
  },
  {
    it: "favignana-in-un-giorno",
    en: "favignana-in-one-day",
    es: "favignana-en-un-dia",
    fr: "favignana-en-une-journee",
  },
  { it: "cala-rossa", en: "cala-rossa", es: "cala-rossa", fr: "cala-rossa" },
  {
    it: "bue-marino-cave-tufo",
    en: "bue-marino-tuff-quarries",
    es: "bue-marino-canteras-toba",
    fr: "bue-marino-carrieres-tuf",
  },
  {
    it: "snorkeling-favignana",
    en: "snorkeling-in-favignana",
    es: "snorkel-en-favignana",
    fr: "snorkeling-a-favignana",
  },
  {
    it: "come-arrivare-da-trapani-e-muoversi",
    en: "how-to-get-from-trapani-and-get-around",
    es: "como-llegar-desde-trapani-y-moverse",
    fr: "comment-venir-depuis-trapani-et-se-deplacer",
  },
  {
    it: "tour-in-barca-favignana-levanzo",
    en: "favignana-levanzo-boat-tour",
    es: "excursion-barco-favignana-levanzo",
    fr: "excursion-bateau-favignana-levanzo",
  },
] as const satisfies Array<{
  it: FavignanaGuideSlug;
  en: FavignanaGuideSlug;
  es: FavignanaGuideSlug;
  fr: FavignanaGuideSlug;
}>;

export type FavignanaGuideLocale = "it" | "en" | "es" | "fr";

export function getFavignanaGuideSlugForLocale(
  slug: string,
  locale: FavignanaGuideLocale,
): FavignanaGuideSlug | undefined {
  const pair = favignanaGuideSlugPairs.find(
    (item) => item.it === slug || item.en === slug || item.es === slug || item.fr === slug,
  );
  return pair?.[locale];
}

export type FavignanaGuideCta = "cigala" | "neel" | "compare";

export interface FavignanaGuideSection {
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
  cta?: FavignanaGuideCta;
}

export interface FavignanaGuideFaq {
  question: string;
  answer: string;
}

export interface FavignanaGuideItem {
  name: string;
  description: string;
}

export interface FavignanaGuide {
  slug: FavignanaGuideSlug;
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
  itemList: FavignanaGuideItem[];
  sections: FavignanaGuideSection[];
  faqs: FavignanaGuideFaq[];
  relatedSlugs: FavignanaGuideSlug[];
}

export const favignanaGuideSourceLinks = [
  {
    label: "West of Sicily - Favignana",
    href: "https://www.westofsicily.com/it/mare-natura/favignana",
  },
  {
    label: "West of Sicily - Cala Rossa",
    href: "https://www.westofsicily.com/en/see-nature/cala-rossa",
  },
  {
    label: "Comune di Favignana - limitazioni veicoli",
    href: "https://www.comune.favignana.tp.it/it/news/la-giunta-municipale-approva-limitazioni-allafflusso-di-veicoli-sullisola-di-favignana-per-la-stagione-estiva",
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

export const favignanaGuides: FavignanaGuide[] = [
  {
    slug: "cosa-vedere-top-10",
    title: "Cosa vedere a Favignana: le 10 attrazioni da non perdere",
    shortTitle: "Top 10 attrazioni",
    metaTitle: "Cosa vedere a Favignana: top 10 attrazioni, cale e storia",
    metaDescription:
      "Guida alle 10 cose da vedere a Favignana: Cala Rossa, Bue Marino, Cala Azzurra, tonnara Florio, cave di tufo e tour in barca da Trapani.",
    heroImage: "/images/islands/favignana/hero.webp",
    heroAlt: "Favignana vista dal mare con acqua turchese e costa rocciosa",
    eyebrow: "Guida completa",
    intro:
      "Favignana non è solo una lista di spiagge famose: è un'isola da leggere tra cave di tufo, tonnara, acqua trasparente, piccoli approdi e versanti che cambiano carattere con il vento. Questa guida raccoglie le attrazioni più importanti per chi arriva per la prima volta e vuole capire cosa vedere davvero.",
    quickAnswer:
      "Le cose da vedere a Favignana sono Cala Rossa, Bue Marino, Cala Azzurra, Lido Burrone, l'Ex Stabilimento Florio, Palazzo Florio, il Castello di Santa Caterina, Scalo Cavallo, Grotta Perciata e Punta Sottile. Se hai poco tempo, scegli poche tappe e valuta un tour in barca da Trapani per vedere più costa senza perdere ore negli spostamenti.",
    primaryKeyword: "cosa vedere a Favignana",
    secondaryKeywords: [
      "top 10 Favignana",
      "attrazioni Favignana",
      "luoghi da visitare Favignana",
      "Favignana in barca",
    ],
    quickFacts: [
      { label: "Ideale per", value: "prima visita" },
      { label: "Tempo minimo", value: "1 giornata" },
      { label: "Da abbinare", value: "Levanzo in barca" },
    ],
    itemListTitle: "Le 10 attrazioni principali",
    itemList: [
      {
        name: "Cala Rossa",
        description:
          "La baia più iconica di Favignana, con acqua turchese, roccia calcarea e cave affacciate sul mare.",
      },
      {
        name: "Bue Marino",
        description:
          "Un tratto scenografico fatto di cave di tufo, mare profondo e fondali molto belli con condizioni favorevoli.",
      },
      {
        name: "Cala Azzurra",
        description:
          "Una cala luminosa, con sabbia chiara e acqua bassa, perfetta per un bagno più semplice.",
      },
      {
        name: "Lido Burrone",
        description:
          "La spiaggia più comoda e balneare dell'isola, indicata anche per famiglie e soste rilassate.",
      },
      {
        name: "Ex Stabilimento Florio",
        description:
          "Il grande complesso della tonnara, oggi museo e luogo centrale per capire la storia dell'isola.",
      },
      {
        name: "Palazzo Florio",
        description:
          "La residenza storica della famiglia Florio, vicino al porto e al centro di Favignana.",
      },
      {
        name: "Castello di Santa Caterina",
        description:
          "Il punto panoramico più evidente dell'isola, utile per leggere la forma di Favignana dall'alto.",
      },
      {
        name: "Scalo Cavallo",
        description:
          "Scogliera e vecchie cave sul mare, interessante per geologia, foto e snorkeling leggero.",
      },
      {
        name: "Grotta Perciata",
        description:
          "Archi naturali e costa bassa, una zona suggestiva quando il mare è pulito e la luce entra bene.",
      },
      {
        name: "Punta Sottile",
        description:
          "Il lato del faro e dei tramonti, più aperto e silenzioso rispetto alle cale più frequentate.",
      },
    ],
    sections: [
      {
        id: "mare",
        eyebrow: "Mare e cale",
        title: "Le prime tre tappe da mettere in agenda",
        body: [
          "Cala Rossa, Bue Marino e Cala Azzurra sono le tre immagini che quasi tutti associano a Favignana. Sono vicine nella memoria dei viaggiatori, ma molto diverse nella pratica: Cala Rossa è rocciosa e scenografica, Bue Marino è minerale e più profondo, Cala Azzurra è più morbida e luminosa.",
          "La scelta non dovrebbe dipendere solo dalla fama. A Favignana il vento decide molto: una cala perfetta con mare calmo può diventare scomoda con onda o affollamento. Per questo la visita dal mare funziona bene quando la rotta resta flessibile.",
        ],
        bullets: [
          "Cala Rossa: scenografia, cave, acqua turchese.",
          "Bue Marino: tufo, fondali, costa più verticale.",
          "Cala Azzurra: bagno semplice, fondale chiaro, ritmo rilassato.",
        ],
        cta: "cigala",
      },
      {
        id: "storia",
        eyebrow: "Oltre il bagno",
        title: "Tonnara Florio, Palazzo Florio e Castello di Santa Caterina",
        body: [
          "La storia di Favignana passa dalla pesca del tonno, dalla famiglia Florio e dal lavoro nelle cave. L'Ex Stabilimento Florio non è una tappa secondaria: racconta il modo in cui l'isola è cresciuta, ha lavorato e si è presentata al Mediterraneo.",
          "Palazzo Florio introduce il lato più elegante e urbano dell'isola, mentre il Castello di Santa Caterina permette di guardare Favignana dall'alto. Se vuoi una visita completa, alterna mare e storia: l'isola diventa molto più interessante.",
        ],
        cards: [
          {
            title: "Ex Stabilimento Florio",
            text: "Museo, memoria della tonnara e testimonianze dei tonnaroti.",
            tag: "Storia",
            image: "/images/islands/favignana/poi/tonnara.webp",
          },
          {
            title: "Palazzo Florio",
            text: "Il legame tra Favignana, economia del mare e famiglia Florio.",
            tag: "Centro",
            image: "/images/islands/favignana/poi/palazzo-florio.webp",
          },
          {
            title: "Castello di Santa Caterina",
            text: "Il punto panoramico per capire il profilo dell'isola.",
            tag: "Vista",
            image: "/images/islands/favignana/poi/castello-s-caterina.webp",
          },
        ],
        cta: "neel",
      },
      {
        id: "come-scegliere",
        eyebrow: "Consiglio pratico",
        title: "Se hai poco tempo, non provare a vedere tutto",
        body: [
          "Una giornata a Favignana può essere bellissima oppure diventare una corsa. Il consiglio più utile è scegliere un tema: mare e snorkeling, storia e centro, oppure giro in barca con soste selezionate. Provare a fare ogni cala via terra spesso significa consumare tempo in spostamenti e accessi non sempre comodi.",
          "In barca, invece, puoi vedere più costa e accettare meglio i cambi di programma: se una cala è troppo esposta, se ne sceglie un'altra più riparata. È un modo più naturale di vivere un'isola così legata al mare.",
        ],
        note:
          "Non promettere mai una singola cala come garantita: la rotta migliore è quella che rispetta meteo, sicurezza e comfort del gruppo.",
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "Qual è la cosa più bella da vedere a Favignana?",
        answer:
          "Cala Rossa è il luogo più iconico, ma non è l'unico. Bue Marino, Cala Azzurra, l'Ex Stabilimento Florio e il Castello di Santa Caterina completano una visita più equilibrata tra mare, storia e panorami.",
      },
      {
        question: "Quante ore servono per visitare Favignana?",
        answer:
          "Per un primo assaggio basta una giornata. Se vuoi vivere anche centro, tonnara, tramonto e più cale via terra, due o tre giorni sono più comodi. Con un tour in barca puoi concentrare molte soste costiere in meno tempo.",
      },
      {
        question: "Meglio vedere Favignana via terra o in barca?",
        answer:
          "Via terra è ideale per centro, tonnara, bici e alcuni accessi semplici. La barca è migliore per cale rocciose, snorkeling e per leggere la costa senza dover cambiare mezzo tra una tappa e l'altra.",
      },
    ],
    relatedSlugs: [
      "dove-fare-il-bagno-spiagge-cale",
      "favignana-in-un-giorno",
      "tour-in-barca-favignana-levanzo",
    ],
  },
  {
    slug: "dove-fare-il-bagno-spiagge-cale",
    title: "Dove fare il bagno a Favignana: spiagge e calette migliori",
    shortTitle: "Bagno, spiagge e cale",
    metaTitle: "Dove fare il bagno a Favignana: spiagge, cale e consigli",
    metaDescription:
      "Le migliori spiagge e cale dove fare il bagno a Favignana: Cala Rossa, Cala Azzurra, Lido Burrone, Bue Marino, Grotta Perciata e consigli sul vento.",
    heroImage: "/images/islands/favignana/poi/cala-azzurra.webp",
    heroAlt: "Cala Azzurra a Favignana con acqua chiara e fondale luminoso",
    eyebrow: "Spiagge e mare",
    intro:
      "Cercare dove fare il bagno a Favignana significa prima di tutto capire che non tutte le cale sono uguali. Alcune sono comode e sabbiose, altre sono rocciose, altre ancora sono meravigliose dal mare ma meno semplici via terra.",
    quickAnswer:
      "Per bagni facili scegli Cala Azzurra, Lido Burrone e Marasolo. Per scenari più forti guarda Cala Rossa, Bue Marino, Scalo Cavallo e Grotta Perciata. Con bambini o persone poco agili conviene privilegiare fondali più bassi e accessi semplici; in barca, invece, la crew sceglie la baia più riparata in base al vento.",
    primaryKeyword: "dove fare il bagno a Favignana",
    secondaryKeywords: [
      "spiagge Favignana",
      "calette Favignana",
      "Favignana mare",
      "spiagge per famiglie Favignana",
    ],
    quickFacts: [
      { label: "Bagno facile", value: "Cala Azzurra, Lido Burrone" },
      { label: "Roccia e foto", value: "Cala Rossa, Bue Marino" },
      { label: "Variabile chiave", value: "vento del giorno" },
    ],
    itemListTitle: "Le zone migliori per fare il bagno",
    itemList: [
      {
        name: "Cala Azzurra",
        description:
          "Una delle cale più adatte per acqua bassa, colori chiari e bagno rilassato.",
      },
      {
        name: "Lido Burrone",
        description:
          "Spiaggia sabbiosa e comoda, indicata per chi cerca servizi e accesso più semplice.",
      },
      {
        name: "Marasolo",
        description:
          "Zona più tranquilla del versante sud, utile per una sosta meno scenografica ma piacevole.",
      },
      {
        name: "Cala Rossa",
        description:
          "Bellissima e rocciosa, più adatta a chi cerca scenario e acqua turchese che comodità da spiaggia.",
      },
      {
        name: "Bue Marino",
        description:
          "Fondali intensi, cave di tufo e mare profondo: ottimo dal mare con condizioni adatte.",
      },
      {
        name: "Grotta Perciata",
        description:
          "Archi naturali e tratti rocciosi, bella per foto, snorkeling e navigazione lenta.",
      },
    ],
    sections: [
      {
        id: "spiagge-facili",
        eyebrow: "Accessi semplici",
        title: "Le spiagge più comode per famiglie e bagni tranquilli",
        body: [
          "Cala Azzurra e Lido Burrone sono spesso le prime risposte per chi cerca spiagge più semplici. Non hanno lo stesso impatto scenografico di Cala Rossa, ma permettono un bagno più immediato e una giornata più rilassata.",
          "Marasolo è un'altra scelta interessante quando si vuole restare su un ritmo morbido. In alta stagione, però, anche le spiagge più facili possono riempirsi: arrivare presto o scegliere la barca aiuta a evitare la parte più faticosa della logistica.",
        ],
        bullets: [
          "Cala Azzurra: colori chiari e fondale più basso.",
          "Lido Burrone: spiaggia sabbiosa e più servita.",
          "Marasolo: atmosfera più distesa sul versante sud.",
        ],
        cta: "cigala",
      },
      {
        id: "cale-rocciose",
        eyebrow: "Scenari forti",
        title: "Cale rocciose: bellissime, ma da scegliere con attenzione",
        body: [
          "Cala Rossa, Bue Marino e Scalo Cavallo sono luoghi potenti, ma non sempre sono i più facili. Via terra possono avere accessi rocciosi, spazi irregolari e poca ombra; dal mare sono più leggibili e spesso più godibili.",
          "Qui la sicurezza conta più della foto: se il vento entra male, una baia famosa può diventare meno piacevole di una cala più riparata. La scelta migliore è affidarsi a chi conosce i versanti e non forza il programma.",
        ],
        cards: [
          {
            title: "Cala Rossa",
            text: "Roccia, acqua turchese e cave: perfetta quando il mare è giusto.",
            tag: "Iconica",
            image: "/images/islands/favignana/poi/cala-rossa.webp",
          },
          {
            title: "Bue Marino",
            text: "Costa minerale e mare profondo, ideale per sosta dal mare.",
            tag: "Snorkeling",
            image: "/images/islands/favignana/poi/bue-marino.webp",
          },
          {
            title: "Scalo Cavallo",
            text: "Roccia, tracce di cava e fondali interessanti.",
            tag: "Costa nord",
            image: "/images/islands/favignana/poi/scalo-cavallo.webp",
          },
        ],
      },
      {
        id: "vento",
        eyebrow: "Consiglio locale",
        title: "Il vento decide dove fare il bagno",
        body: [
          "A Favignana non esiste una risposta valida tutti i giorni. Maestrale, Scirocco e Grecale cambiano esposizione, onda e comfort. Una giornata perfetta nasce dalla lettura del mare, non da una lista fissa.",
          "Per questo una barca privata o un tour ben organizzato vale soprattutto nei giorni in cui bisogna scegliere con intelligenza: si evita di insistere sulla cala famosa e si cerca il tratto più bello e riparato.",
        ],
        note:
          "Prima di partire controlla sempre meteo marino e indicazioni della crew: a Favignana la cala giusta è quella che quel giorno si vive bene.",
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "Qual è la spiaggia più bella di Favignana?",
        answer:
          "Cala Rossa è la più iconica, ma se cerchi una spiaggia più facile Cala Azzurra e Lido Burrone sono spesso più comode. La migliore dipende da vento, affollamento e tipo di giornata.",
      },
      {
        question: "Dove fare il bagno con bambini a Favignana?",
        answer:
          "Cala Azzurra, Lido Burrone e Marasolo sono tra le zone più adatte perché hanno un accesso più semplice e un ritmo meno roccioso rispetto a Cala Rossa o Bue Marino.",
      },
      {
        question: "Le cale di Favignana sono meglio via terra o in barca?",
        answer:
          "Le spiagge facili si vivono bene anche via terra. Le cale rocciose e scenografiche, come Cala Rossa, Bue Marino e Scalo Cavallo, spesso rendono meglio dal mare.",
      },
    ],
    relatedSlugs: ["cala-rossa", "bue-marino-cave-tufo", "snorkeling-favignana"],
  },
  {
    slug: "favignana-in-un-giorno",
    title: "Favignana in un giorno: itinerario pratico da Trapani",
    shortTitle: "Favignana in un giorno",
    metaTitle: "Favignana in un giorno: itinerario da Trapani e cose da vedere",
    metaDescription:
      "Itinerario pratico per visitare Favignana in un giorno da Trapani: cale, centro, tonnara, consigli su barca, bici, aliscafo e tempi.",
    heroImage: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
    heroAlt: "Gruppo in barca durante una giornata alle Isole Egadi da Trapani",
    eyebrow: "Itinerario pratico",
    intro:
      "Favignana in un giorno si può fare, ma va organizzata con lucidità. La tentazione è inserire troppe tappe; la scelta migliore è costruire una giornata con pochi luoghi forti, tempi realistici e un piano alternativo se vento o affollamento cambiano le condizioni.",
    quickAnswer:
      "Per vedere Favignana in un giorno da Trapani scegli tra due strade: sbarcare sull'isola e muoverti in bici o scooter, oppure partire direttamente in tour in barca. In entrambi i casi dai priorità a Cala Rossa o Bue Marino, Cala Azzurra o Lido Burrone, centro, Palazzo Florio ed Ex Stabilimento Florio.",
    primaryKeyword: "Favignana in un giorno",
    secondaryKeywords: [
      "itinerario Favignana un giorno",
      "gita Favignana da Trapani",
      "cosa vedere Favignana in giornata",
    ],
    quickFacts: [
      { label: "Partenza comoda", value: "Trapani" },
      { label: "Scelta chiave", value: "terra o barca" },
      { label: "Errore da evitare", value: "troppe tappe" },
    ],
    itemListTitle: "Itinerario consigliato",
    itemList: [
      {
        name: "Mattina sul mare",
        description:
          "Cala Rossa, Bue Marino o una cala riparata scelta in base al vento.",
      },
      {
        name: "Bagno facile",
        description:
          "Cala Azzurra, Lido Burrone o Marasolo per una pausa più semplice.",
      },
      {
        name: "Centro e porto",
        description:
          "Passeggiata nel paese, Palazzo Florio e area del porto.",
      },
      {
        name: "Ex Stabilimento Florio",
        description:
          "Tappa culturale per capire tonnara, famiglia Florio e identità dell'isola.",
      },
    ],
    sections: [
      {
        id: "mattina",
        eyebrow: "Prima scelta",
        title: "Mattina: decidi subito se vivere Favignana via terra o dal mare",
        body: [
          "Se prendi il collegamento di linea, appena arrivi devi scegliere un mezzo e impostare poche tappe. Bici ed e-bike funzionano bene perché l'isola è abbastanza pianeggiante, ma non tutte le cale sono comode e il caldo può pesare.",
          "Se invece parti in barca da Trapani, la giornata inizia già sul mare. Non devi pensare a noleggi, parcheggi o accessi: la rotta viene scelta in base alle condizioni e puoi vedere più costa in meno tempo.",
        ],
        steps: [
          {
            label: "09:30",
            title: "Partenza da Trapani",
            text: "Imbarco, briefing e lettura delle condizioni di vento e mare.",
          },
          {
            label: "11:00",
            title: "Prima cala",
            text: "Cala Rossa, Bue Marino o una baia più riparata se il mare lo richiede.",
          },
          {
            label: "13:00",
            title: "Pausa in rada",
            text: "Bagno, snorkeling e relax senza correre tra una tappa e l'altra.",
          },
        ],
        cta: "cigala",
      },
      {
        id: "pomeriggio",
        eyebrow: "Seconda parte",
        title: "Pomeriggio: non saltare centro e storia",
        body: [
          "Anche se il mare è il motivo principale del viaggio, una giornata a Favignana è più completa se lascia spazio al centro, a Palazzo Florio e all'Ex Stabilimento Florio. Sono luoghi vicini al porto e raccontano l'isola oltre le fotografie delle cale.",
          "Se resti via terra, tieni conto dei tempi di rientro e dell'eventuale coda per riconsegnare bici o scooter. Se sei in barca, valuta un passaggio panoramico verso Levanzo quando condizioni e durata lo permettono.",
        ],
        bullets: [
          "Centro storico: breve passeggiata tra porto e piazze.",
          "Palazzo Florio: storia e architettura vicino all'arrivo.",
          "Ex Stabilimento Florio: memoria della tonnara e del lavoro isolano.",
        ],
      },
      {
        id: "errori",
        eyebrow: "Da evitare",
        title: "Gli errori più comuni in una gita giornaliera",
        body: [
          "Il primo errore è voler vedere tutte le cale più famose nello stesso giorno. Il secondo è ignorare il vento: a Favignana può cambiare completamente l'esperienza. Il terzo è sottovalutare gli accessi rocciosi, soprattutto con bambini, borse, caldo e poco tempo.",
          "Una giornata riuscita non è quella con più nomi spuntati, ma quella con soste scelte bene. Meglio tre luoghi vissuti con calma che una corsa continua tra bici, strade bianche e discese al mare.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "Si può visitare Favignana in un solo giorno?",
        answer:
          "Sì, ma conviene limitare le tappe. In un giorno puoi vedere una o due cale, il centro e un luogo storico come l'Ex Stabilimento Florio. In barca riesci a vedere più costa senza organizzare mezzi sull'isola.",
      },
      {
        question: "Meglio noleggiare bici o fare un tour in barca?",
        answer:
          "La bici è piacevole se vuoi vivere l'isola via terra e hai tempo. Il tour in barca è più indicato se il tuo obiettivo principale sono cale, bagni e costa vista dal mare.",
      },
      {
        question: "Cosa non perdere a Favignana in giornata?",
        answer:
          "Cala Rossa o Bue Marino, Cala Azzurra o Lido Burrone, il centro, Palazzo Florio e l'Ex Stabilimento Florio sono le tappe più equilibrate per una prima visita.",
      },
    ],
    relatedSlugs: [
      "come-arrivare-da-trapani-e-muoversi",
      "cosa-vedere-top-10",
      "tour-in-barca-favignana-levanzo",
    ],
  },
  {
    slug: "cala-rossa",
    title: "Cala Rossa Favignana: come arrivare, quando andare e cosa sapere",
    shortTitle: "Cala Rossa",
    metaTitle: "Cala Rossa Favignana: come arrivare, mare e tour in barca",
    metaDescription:
      "Guida a Cala Rossa Favignana: come arrivare, quando andare, accessi, consigli sul vento e perché viverla in barca con rotta flessibile.",
    heroImage: "/images/islands/favignana/poi/cala-rossa.webp",
    heroAlt: "Cala Rossa a Favignana con acqua turchese e cave di tufo",
    eyebrow: "Cala simbolo",
    intro:
      "Cala Rossa è la cartolina più famosa di Favignana: acqua chiarissima, roccia bianca, pareti segnate dalle cave e un nome che porta con sé storia e leggenda. Proprio perché è così cercata, va raccontata bene: è splendida, ma non è una spiaggia facile in ogni condizione.",
    quickAnswer:
      "Cala Rossa si trova sul versante nord-orientale di Favignana. Puoi raggiungerla via terra con mezzi leggeri e un tratto a piedi, oppure viverla dal mare con un tour in barca. È rocciosa e molto frequentata: il momento migliore dipende da luce, vento e affollamento. Non va promessa come sosta garantita se il mare non è sicuro.",
    primaryKeyword: "Cala Rossa Favignana",
    secondaryKeywords: [
      "come arrivare a Cala Rossa",
      "Cala Rossa in barca",
      "Cala Rossa quando andare",
    ],
    quickFacts: [
      { label: "Tipo", value: "cala rocciosa" },
      { label: "Meglio con", value: "mare calmo" },
      { label: "Attenzione", value: "accessi e affollamento" },
    ],
    itemListTitle: "Cosa sapere prima di andare",
    itemList: [
      {
        name: "Accesso roccioso",
        description:
          "Non è una spiaggia sabbiosa: serve attenzione, soprattutto con bambini o poca agilità.",
      },
      {
        name: "Mare variabile",
        description:
          "Con vento sfavorevole può essere meno piacevole o non sicura per la sosta.",
      },
      {
        name: "Luce e colori",
        description:
          "I colori cambiano molto con sole, orario e trasparenza dell'acqua.",
      },
      {
        name: "Vista dal mare",
        description:
          "Dal mare si leggono meglio cave, pareti e profilo della baia.",
      },
    ],
    sections: [
      {
        id: "arrivare",
        eyebrow: "Accessi",
        title: "Come arrivare a Cala Rossa",
        body: [
          "Via terra, Cala Rossa si raggiunge muovendosi sull'isola con bici, e-bike, scooter o altri mezzi locali, poi proseguendo a piedi. L'accesso non è quello di una spiaggia attrezzata: ci sono rocce, superfici irregolari e poco riparo.",
          "Dal mare l'esperienza cambia: la cala si presenta nel suo insieme, con le cave e le pareti che scendono verso l'acqua. È spesso il modo più scenografico per vederla, ma la sosta dipende sempre dalla sicurezza del giorno.",
        ],
        cta: "cigala",
      },
      {
        id: "quando",
        eyebrow: "Timing",
        title: "Quando andare a Cala Rossa",
        body: [
          "La risposta più onesta è: quando vento, mare e luce lavorano insieme. Nelle ore centrali i colori possono essere molto forti, ma anche l'affollamento cresce. In alta stagione, arrivare senza un piano alternativo può trasformare la visita in una prova di pazienza.",
          "Se sei in barca, la crew può valutare se fermarsi, passare in navigazione o scegliere una baia più comoda. Questo approccio è più serio di una promessa fissa: a Favignana la bellezza va sempre mediata dal mare.",
        ],
        note:
          "Cala Rossa è una tappa simbolo, ma non deve essere una forzatura: una rotta intelligente preferisce una sosta sicura a una foto scomoda.",
      },
      {
        id: "cosa-vedere",
        eyebrow: "Dettagli",
        title: "Cave, colore dell'acqua e fondali",
        body: [
          "La forza di Cala Rossa sta nell'incontro tra roccia chiara e acqua turchese. Le antiche cave hanno lasciato un paesaggio geometrico, quasi tagliato, che rende la cala diversa da molte spiagge mediterranee.",
          "Per fotografie e snorkeling leggero, le condizioni migliori sono quelle con mare calmo e acqua pulita. Se cerchi un bagno più semplice, però, Cala Azzurra o Lido Burrone possono essere alternative più adatte.",
        ],
        cards: [
          {
            title: "Per foto",
            text: "Cerca luce alta, mare limpido e una prospettiva dal mare.",
            tag: "Vista",
          },
          {
            title: "Per bagno",
            text: "Valuta sempre roccia, onda e spazio disponibile.",
            tag: "Pratica",
          },
          {
            title: "Per famiglie",
            text: "Meglio scegliere soste più morbide se ci sono bambini piccoli.",
            tag: "Comfort",
          },
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "Cala Rossa è una spiaggia di sabbia?",
        answer:
          "No. Cala Rossa è soprattutto rocciosa, con accessi irregolari. È meravigliosa per il paesaggio, ma non è la scelta più comoda se cerchi una spiaggia sabbiosa.",
      },
      {
        question: "Si può arrivare a Cala Rossa in barca?",
        answer:
          "Sì, molti tour la includono come passaggio o possibile sosta. La fermata dipende da vento, mare, sicurezza e affollamento: una crew seria non la promette in ogni condizione.",
      },
      {
        question: "Cala Rossa è adatta ai bambini?",
        answer:
          "Dipende dall'età e dall'abitudine al mare roccioso. Per bambini piccoli sono spesso più semplici Cala Azzurra, Lido Burrone o soste in barca in baie più calme.",
      },
    ],
    relatedSlugs: [
      "dove-fare-il-bagno-spiagge-cale",
      "favignana-in-un-giorno",
      "tour-in-barca-favignana-levanzo",
    ],
  },
  {
    slug: "bue-marino-cave-tufo",
    title: "Bue Marino Favignana: cave di tufo, mare e snorkeling",
    shortTitle: "Bue Marino e cave",
    metaTitle: "Bue Marino Favignana: cave di tufo, snorkeling e barca",
    metaDescription:
      "Guida al Bue Marino a Favignana: cave di tufo, mare profondo, snorkeling, accessi e consigli per viverlo in barca in sicurezza.",
    heroImage: "/images/islands/favignana/poi/bue-marino.webp",
    heroAlt: "Bue Marino a Favignana con cave di tufo e mare blu",
    eyebrow: "Tufo e fondali",
    intro:
      "Bue Marino è uno dei luoghi che fanno capire quanto Favignana sia stata disegnata dal tufo. La costa sembra scavata, il mare diventa più profondo e il paesaggio ha un carattere diverso dalle spiagge più morbide del versante sud.",
    quickAnswer:
      "Bue Marino è una zona rocciosa e scenografica di Favignana, famosa per le cave di tufo e per il mare intenso. È bella dal mare e interessante per snorkeling quando visibilità e condizioni sono favorevoli. Via terra può risultare meno comoda di una spiaggia tradizionale.",
    primaryKeyword: "Bue Marino Favignana",
    secondaryKeywords: [
      "cave di tufo Favignana",
      "snorkeling Bue Marino",
      "Bue Marino in barca",
    ],
    quickFacts: [
      { label: "Tipo", value: "costa rocciosa" },
      { label: "Ideale per", value: "foto e snorkeling" },
      { label: "Meglio", value: "dal mare" },
    ],
    itemListTitle: "Perché vedere Bue Marino",
    itemList: [
      {
        name: "Cave di tufo",
        description:
          "Il paesaggio conserva tagli e forme legati all'estrazione della calcarenite.",
      },
      {
        name: "Mare profondo",
        description:
          "I colori sono più intensi rispetto alle cale con fondale sabbioso.",
      },
      {
        name: "Snorkeling",
        description:
          "Con mare calmo e visibilità buona, i fondali rocciosi sono interessanti.",
      },
      {
        name: "Navigazione lenta",
        description:
          "Dal mare si leggono meglio la costa, le pareti e la geometria delle cave.",
      },
    ],
    sections: [
      {
        id: "paesaggio",
        eyebrow: "Identità",
        title: "Il paesaggio del tufo che rende Favignana riconoscibile",
        body: [
          "A Bue Marino il rapporto tra uomo e costa è evidente. Le cave hanno lasciato forme nette, volumi tagliati e pareti che dialogano con l'acqua. Non è solo un posto dove fare il bagno: è una pagina della storia materiale dell'isola.",
          "Questa zona è particolarmente interessante da osservare in navigazione lenta, perché dal mare si capisce meglio il modo in cui la roccia è stata lavorata e poi restituita al paesaggio.",
        ],
        cta: "cigala",
      },
      {
        id: "snorkeling",
        eyebrow: "In acqua",
        title: "Snorkeling al Bue Marino: bello, ma da valutare sul posto",
        body: [
          "I fondali rocciosi possono essere molto belli quando l'acqua è pulita e il mare è calmo. Non bisogna però confondere il nome famoso con una garanzia: se onda e corrente non sono adatte, meglio scegliere un'altra sosta.",
          "Con una crew esperta, Bue Marino può diventare un passaggio spettacolare oppure una vera sosta bagno. La differenza sta nel leggere le condizioni, non nel seguire un programma rigido.",
        ],
        bullets: [
          "Porta maschera o usa l'attrezzatura inclusa nel tour.",
          "Entra in acqua solo quando la crew conferma che la sosta è sicura.",
          "Rispetta sempre fondali, Posidonia e regole dell'Area Marina Protetta.",
        ],
      },
      {
        id: "abbinamenti",
        eyebrow: "Rotta",
        title: "Con quali cale abbinarlo",
        body: [
          "Bue Marino si abbina bene a Cala Rossa, Scalo Cavallo, Cala Azzurra e Grotta Perciata, ma la rotta reale dipende dal vento. In una giornata completa, alternare una zona rocciosa a una sosta più morbida rende l'esperienza più equilibrata.",
          "Se il gruppo cerca comfort, può essere utile fermarsi in un punto più riparato per il bagno lungo e passare al Bue Marino come momento panoramico e fotografico.",
        ],
        cards: [
          {
            title: "Cala Rossa",
            text: "Per continuare sul lato scenografico e roccioso.",
            tag: "Icona",
            image: "/images/islands/favignana/poi/cala-rossa.webp",
          },
          {
            title: "Cala Azzurra",
            text: "Per cambiare ritmo con acqua più chiara e fondale morbido.",
            tag: "Bagno",
            image: "/images/islands/favignana/poi/cala-azzurra.webp",
          },
          {
            title: "Grotta Perciata",
            text: "Per archi naturali, costa bassa e fotografie.",
            tag: "Costa",
          },
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "Bue Marino è adatto allo snorkeling?",
        answer:
          "Sì, con mare calmo e buona visibilità può essere molto interessante. La scelta va fatta sul posto, perché vento, onda e corrente cambiano molto il comfort della sosta.",
      },
      {
        question: "Bue Marino è una spiaggia?",
        answer:
          "No, è soprattutto un tratto roccioso legato alle cave di tufo. È scenografico, ma non ha la comodità di una spiaggia sabbiosa come Lido Burrone.",
      },
      {
        question: "Meglio vedere Bue Marino da terra o in barca?",
        answer:
          "Dal mare è più leggibile e spesso più spettacolare. Via terra può essere interessante, ma meno immediato se cerchi un bagno comodo.",
      },
    ],
    relatedSlugs: ["snorkeling-favignana", "cala-rossa", "dove-fare-il-bagno-spiagge-cale"],
  },
  {
    slug: "snorkeling-favignana",
    title: "Snorkeling a Favignana: zone migliori e consigli",
    shortTitle: "Snorkeling",
    metaTitle: "Snorkeling a Favignana: zone migliori, fondali e tour",
    metaDescription:
      "Dove fare snorkeling a Favignana: Bue Marino, Cala Rossa, Scalo Cavallo, Grotta Perciata, consigli su meteo, sicurezza e Area Marina Protetta.",
    heroImage: "/images/experience-polaroids/barca-8-ore-snorkeling.webp",
    heroAlt: "Snorkeling nelle acque limpide delle Isole Egadi",
    eyebrow: "Fondali e sicurezza",
    intro:
      "Lo snorkeling a Favignana funziona quando si smette di ragionare per nomi famosi e si comincia a leggere mare, luce e fondale. L'isola offre sabbia chiara, roccia, praterie di Posidonia e tratti più profondi, ma ogni zona cambia molto con il vento.",
    quickAnswer:
      "Le zone più interessanti per snorkeling a Favignana sono Bue Marino, Cala Rossa, Scalo Cavallo, Grotta Perciata e alcuni tratti verso Cala Rotonda e Punta Sottile. Le condizioni migliori sono mare calmo, acqua pulita e rispetto delle regole dell'Area Marina Protetta.",
    primaryKeyword: "snorkeling Favignana",
    secondaryKeywords: [
      "dove fare snorkeling a Favignana",
      "fondali Favignana",
      "tour snorkeling Favignana",
      "Area Marina Protetta Egadi",
    ],
    quickFacts: [
      { label: "Zone rocciose", value: "Bue Marino, Scalo Cavallo" },
      { label: "Icona", value: "Cala Rossa" },
      { label: "Regola", value: "rispettare l'AMP" },
    ],
    itemListTitle: "Zone consigliate per snorkeling",
    itemList: [
      {
        name: "Bue Marino",
        description:
          "Fondali rocciosi e mare più profondo, molto interessante con acqua limpida.",
      },
      {
        name: "Scalo Cavallo",
        description:
          "Roccia, tracce di cava e profilo costiero adatto a osservare il fondale.",
      },
      {
        name: "Cala Rossa",
        description:
          "Colori forti e paesaggio iconico, da vivere solo con mare adatto.",
      },
      {
        name: "Grotta Perciata",
        description:
          "Archi naturali e costa bassa, interessante per snorkeling leggero.",
      },
      {
        name: "Cala Rotonda",
        description:
          "Versante occidentale più aperto, da valutare in base a vento e visibilità.",
      },
    ],
    sections: [
      {
        id: "zone",
        eyebrow: "Dove andare",
        title: "Le zone migliori non sono sempre le più famose",
        body: [
          "Bue Marino e Scalo Cavallo sono ottimi riferimenti per chi cerca fondali rocciosi. Cala Rossa è più iconica, ma proprio per questo va valutata con più attenzione: può essere affollata e non sempre comoda per entrare e uscire dall'acqua.",
          "Grotta Perciata, Cala Rotonda e alcuni tratti meno centrali possono sorprendere quando il mare è pulito. Lo snorkeling migliore non è una posizione fissa sulla mappa: è la combinazione tra fondale, luce e calma dell'acqua.",
        ],
        cta: "cigala",
      },
      {
        id: "sicurezza",
        eyebrow: "In pratica",
        title: "Sicurezza, attrezzatura e rispetto del mare",
        body: [
          "Maschera e boccaglio bastano per iniziare, ma la sicurezza viene prima: non entrare in acqua se c'è corrente, onda o passaggio di barche. In tour, ascolta sempre le indicazioni della crew e resta nella zona indicata.",
          "Favignana fa parte dell'Area Marina Protetta delle Isole Egadi. Questo significa che il mare va vissuto con attenzione: niente contatto con fondali fragili, niente raccolta, niente comportamenti invasivi.",
        ],
        bullets: [
          "Usa attrezzatura adatta e ben regolata.",
          "Non toccare fondali, organismi marini o Posidonia.",
          "Resta vicino alla barca o al gruppo se non sei esperto.",
          "Scegli soste riparate, non solo famose.",
        ],
      },
      {
        id: "tour",
        eyebrow: "Con Egadisailing",
        title: "Quando scegliere un tour con snorkeling incluso",
        body: [
          "Se vuoi fare snorkeling senza organizzare noleggi, accessi e spostamenti, un tour in barca è la soluzione più semplice. La barca permette di cambiare zona se il mare non è ideale e di alternare acqua, relax e navigazione.",
          "Per gruppi che vogliono più privacy, la formula privata permette di adattare ritmo e soste. Per chi vuole una giornata più completa, l'8 ore consente di combinare Favignana e Levanzo quando le condizioni sono favorevoli.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "Dove si fa snorkeling a Favignana?",
        answer:
          "Bue Marino, Scalo Cavallo, Cala Rossa, Grotta Perciata e alcuni tratti verso Cala Rotonda sono tra le zone più interessanti, ma la scelta dipende sempre da vento e visibilità.",
      },
      {
        question: "Serve attrezzatura propria per snorkeling?",
        answer:
          "Puoi portare la tua attrezzatura. Nei tour Egadisailing l'attrezzatura da snorkeling è inclusa dove prevista dall'esperienza, ma conviene sempre verificare i dettagli della scheda prima di prenotare.",
      },
      {
        question: "Lo snorkeling a Favignana è adatto ai principianti?",
        answer:
          "Sì, scegliendo baie calme e restando vicino alla barca o alla riva. Chi non è esperto dovrebbe evitare zone con corrente, onda o fondali troppo esposti.",
      },
    ],
    relatedSlugs: ["bue-marino-cave-tufo", "dove-fare-il-bagno-spiagge-cale", "tour-in-barca-favignana-levanzo"],
  },
  {
    slug: "come-arrivare-da-trapani-e-muoversi",
    title: "Come arrivare a Favignana da Trapani e come muoversi sull'isola",
    shortTitle: "Arrivare e muoversi",
    metaTitle: "Come arrivare a Favignana da Trapani: traghetti, aliscafi e tour",
    metaDescription:
      "Come arrivare a Favignana da Trapani e come muoversi sull'isola: aliscafo, traghetto, bici, scooter, limiti veicoli e alternative in barca.",
    heroImage: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
    heroAlt: "Barca in navigazione da Trapani verso le Isole Egadi",
    eyebrow: "Logistica",
    intro:
      "Arrivare a Favignana è semplice, ma organizzare bene la giornata richiede qualche scelta: collegamento di linea o tour in barca, bici o scooter, giro a terra o cale dal mare. Questa pagina chiarisce le opzioni senza inserire orari destinati a cambiare.",
    quickAnswer:
      "Favignana si raggiunge via mare dal porto di Trapani con collegamenti di linea o con escursioni in barca. Sull'isola ci si muove spesso con bici, e-bike, scooter o taxi locali. In estate possono esserci limitazioni ai veicoli non residenti: per orari, tariffe e regole aggiornate verifica sempre i siti ufficiali e il Comune.",
    primaryKeyword: "come arrivare a Favignana da Trapani",
    secondaryKeywords: [
      "traghetto Favignana",
      "aliscafo Favignana",
      "come muoversi a Favignana",
      "bici scooter Favignana",
    ],
    quickFacts: [
      { label: "Porto principale", value: "Trapani" },
      { label: "Sull'isola", value: "bici, e-bike, scooter" },
      { label: "Alternativa", value: "tour in barca da Trapani" },
    ],
    itemListTitle: "Le opzioni principali",
    itemList: [
      {
        name: "Aliscafo",
        description:
          "Soluzione veloce per sbarcare sull'isola e gestire la giornata in autonomia.",
      },
      {
        name: "Traghetto",
        description:
          "Opzione da verificare sui siti ufficiali, utile soprattutto per esigenze specifiche di trasporto.",
      },
      {
        name: "Bici ed e-bike",
        description:
          "Mezzi molto usati perché Favignana è abbastanza pianeggiante.",
      },
      {
        name: "Scooter",
        description:
          "Comodo per coprire più distanze, ma da valutare in base a stagione e disponibilità.",
      },
      {
        name: "Tour in barca",
        description:
          "Evita noleggi e accessi via terra se l'obiettivo principale sono cale e bagni.",
      },
    ],
    sections: [
      {
        id: "da-trapani",
        eyebrow: "Collegamenti",
        title: "Da Trapani a Favignana: collegamenti di linea o tour organizzato",
        body: [
          "Il porto di Trapani è il punto di riferimento naturale per raggiungere Favignana. Per i collegamenti di linea, orari e tariffe vanno controllati sui siti ufficiali perché cambiano in base a stagione, disponibilità e condizioni operative.",
          "La domanda da farsi è semplice: vuoi sbarcare sull'isola e muoverti in autonomia, oppure vuoi vivere direttamente il mare? Nel primo caso scegli aliscafo o traghetto; nel secondo, un tour in barca da Trapani elimina molta logistica.",
        ],
        cta: "cigala",
      },
      {
        id: "muoversi",
        eyebrow: "Sull'isola",
        title: "Bici, e-bike, scooter e limiti ai veicoli",
        body: [
          "Favignana è abbastanza pianeggiante e per questo bici ed e-bike sono molto diffuse. Lo scooter è più rapido, ma in alta stagione bisogna considerare disponibilità, traffico locale e regole aggiornate.",
          "Il Comune può introdurre limitazioni all'afflusso di veicoli non residenti in determinati periodi. Non conviene basarsi su informazioni vecchie: prima di organizzare auto o mezzi particolari, controlla sempre gli avvisi ufficiali.",
        ],
        bullets: [
          "Bici: adatta a chi vuole ritmo lento e distanze moderate.",
          "E-bike: utile con caldo, vento o più tappe.",
          "Scooter: più rapido, ma da prenotare e usare con prudenza.",
          "Barca: migliore se vuoi vedere soprattutto cale e costa.",
        ],
      },
      {
        id: "barca",
        eyebrow: "Alternativa",
        title: "Quando conviene partire direttamente in barca",
        body: [
          "Se il tuo obiettivo è fare il bagno nelle cale, vedere Cala Rossa, Bue Marino, Scalo Cavallo o abbinare Favignana a Levanzo, partire in barca da Trapani è spesso più lineare. Non perdi tempo tra biglietti, noleggi, parcheggi e accessi rocciosi.",
          "La rotta resta meteo-dipendente e può cambiare, ma proprio questo è il vantaggio: invece di adattare il mare al programma, si adatta il programma al mare.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "Da dove si prende il traghetto per Favignana?",
        answer:
          "Il punto principale è il porto di Trapani. Per orari e tariffe aggiornate consulta sempre i siti ufficiali dei vettori, perché le informazioni cambiano con stagione e disponibilità.",
      },
      {
        question: "Serve la macchina a Favignana?",
        answer:
          "Per una visita turistica breve di solito no. Bici, e-bike e scooter sono le soluzioni più comuni; per vedere le cale dal mare puoi evitare del tutto i mezzi sull'isola scegliendo un tour in barca.",
      },
      {
        question: "Ci sono limitazioni ai veicoli a Favignana?",
        answer:
          "In estate possono esserci limitazioni per i veicoli non residenti. La regola cambia e va verificata con gli avvisi ufficiali del Comune prima di partire.",
      },
    ],
    relatedSlugs: ["favignana-in-un-giorno", "tour-in-barca-favignana-levanzo", "dove-fare-il-bagno-spiagge-cale"],
  },
  {
    slug: "tour-in-barca-favignana-levanzo",
    title: "Tour in barca Favignana e Levanzo da Trapani: quale scegliere",
    shortTitle: "Tour Favignana e Levanzo",
    metaTitle: "Tour in barca Favignana e Levanzo da Trapani: quale scegliere",
    metaDescription:
      "Confronto tra tour in barca Favignana e Levanzo da Trapani: 4 ore, 8 ore, privato, condiviso, gourmet in trimarano e charter Egadi.",
    heroImage: "/images/boats/neel-47/neel-47-favignana.webp",
    heroAlt: "Trimarano Neel 47 alle Egadi vicino a Favignana",
    eyebrow: "Esperienze Egadisailing",
    intro:
      "Favignana e Levanzo sono due isole vicine ma diverse: la prima è più ampia, ricca di cale famose e storia Florio; la seconda è più raccolta, silenziosa e trasparente. Un tour in barca da Trapani permette di leggerle insieme quando meteo e durata lo consentono.",
    quickAnswer:
      "Scegli un tour di 4 ore se vuoi una mezza giornata agile, un tour di 8 ore se vuoi più soste e la possibilità di combinare Favignana e Levanzo, una barca privata se vuoi ritmo su misura, il trimarano gourmet se cerchi comfort premium con chef a bordo, il charter se vuoi vivere le Egadi per più giorni.",
    primaryKeyword: "tour in barca Favignana e Levanzo da Trapani",
    secondaryKeywords: [
      "tour Egadi da Trapani",
      "escursione Favignana Levanzo",
      "barca privata Favignana",
      "trimarano Egadi",
    ],
    quickFacts: [
      { label: "Partenza", value: "Trapani" },
      { label: "Durate", value: "4 ore, 8 ore, più giorni" },
      { label: "Rotta", value: "meteo-dipendente" },
    ],
    itemListTitle: "Quale esperienza scegliere",
    itemList: [
      {
        name: "Tour 4 ore privato",
        description:
          "Per una mezza giornata agile con barca riservata e soste scelte con lo skipper.",
      },
      {
        name: "Tour 8 ore condiviso",
        description:
          "Per una giornata completa con posti singoli, snorkeling e ritmo più disteso.",
      },
      {
        name: "Tour 8 ore privato",
        description:
          "Per gruppi che vogliono barca in esclusiva, privacy e rotta flessibile.",
      },
      {
        name: "Esperienza gourmet in trimarano",
        description:
          "Per chi cerca chef a bordo, comfort, skipper, hostess e giornata premium.",
      },
      {
        name: "Charter Egadi",
        description:
          "Per vivere Favignana, Levanzo e Marettimo su più giorni, con il trimarano come casa galleggiante.",
      },
    ],
    sections: [
      {
        id: "criteri",
        eyebrow: "Scelta rapida",
        title: "La domanda giusta non è quale tour sia migliore, ma quale ritmo vuoi",
        body: [
          "Un tour breve è perfetto se hai poco tempo o vuoi una fascia compatta. Una giornata di 8 ore permette più soste, più calma e una maggiore possibilità di abbinare Favignana e Levanzo. Il privato dà controllo sul ritmo; il condiviso è più semplice se viaggi in coppia o in piccoli gruppi.",
          "Il trimarano, invece, cambia categoria: non è solo spostamento e bagno, ma un'esperienza premium con spazi più ampi, chef a bordo e un modo diverso di vivere la giornata.",
        ],
        cta: "compare",
      },
      {
        id: "favignana-levanzo",
        eyebrow: "Rotta",
        title: "Perché abbinare Favignana e Levanzo",
        body: [
          "Favignana offre le cale più famose: Cala Rossa, Bue Marino, Cala Azzurra, Scalo Cavallo. Levanzo aggiunge acqua limpida, Cala Fredda, Cala Minnola e un borgo piccolo che cambia completamente atmosfera.",
          "Quando il mare lo consente, vederle insieme rende il tour più completo. Non sempre però è la scelta migliore: con vento forte o mare formato, una rotta più riparata può dare un'esperienza superiore rispetto all'inseguimento di troppe tappe.",
        ],
        bullets: [
          "Favignana: più varietà, più cale, più storia.",
          "Levanzo: più raccolta, acqua trasparente, ritmo lento.",
          "Insieme: ideale nelle giornate meteo giuste e con durata sufficiente.",
        ],
      },
      {
        id: "gourmet",
        eyebrow: "Premium",
        title: "Quando scegliere il trimarano gourmet",
        body: [
          "L'esperienza gourmet sul Neel 47 è pensata per chi vuole vivere le Egadi con comfort, spazi ampi e pranzo a bordo. Non è la scelta più essenziale, ma quella più adatta a eventi, coppie, famiglie o gruppi che vogliono un momento speciale.",
          "Chef, skipper e hostess permettono di concentrarsi sulla giornata, mentre la rotta resta costruita su meteo, mare e comfort degli ospiti.",
        ],
        cta: "neel",
      },
    ],
    faqs: [
      {
        question: "Meglio tour di 4 ore o 8 ore alle Egadi?",
        answer:
          "Il tour di 4 ore è adatto a chi vuole una mezza giornata agile. L'8 ore è migliore se vuoi più soste, snorkeling, relax e possibilità di combinare Favignana e Levanzo.",
      },
      {
        question: "Il tour Favignana e Levanzo è sempre garantito?",
        answer:
          "La rotta dipende da vento, mare e sicurezza. Favignana e Levanzo sono una combinazione molto richiesta, ma una crew seria adatta sempre il percorso alle condizioni del giorno.",
      },
      {
        question: "Quando conviene scegliere una barca privata?",
        answer:
          "La barca privata conviene se viaggi in gruppo, vuoi privacy, hai esigenze di ritmo o preferisci decidere le soste insieme allo skipper.",
      },
      {
        question: "Il trimarano è indicato per eventi speciali?",
        answer:
          "Sì. Il trimarano gourmet è spesso adatto a compleanni, anniversari, proposte, piccoli eventi privati e giornate premium con chef a bordo.",
      },
    ],
    relatedSlugs: ["cosa-vedere-top-10", "snorkeling-favignana", "favignana-in-un-giorno"],
  },
];

export const favignanaGuideSlugs = favignanaGuides.map((guide) => guide.slug);

export const favignanaGuideLinks = favignanaGuides.map((guide) => ({
  slug: guide.slug,
  title: guide.shortTitle,
  description: guide.metaDescription,
}));

export function getFavignanaGuide(slug: string): FavignanaGuide | undefined {
  return favignanaGuides.find((guide) => guide.slug === slug);
}
