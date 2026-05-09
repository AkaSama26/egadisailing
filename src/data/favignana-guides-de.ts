import type { FavignanaGuide } from "./favignana-guides";

const favignanaHero = "/images/islands/favignana/hero.webp";
const calaRossaImage = "/images/islands/favignana/poi/cala-rossa.webp";
const bueMarinoImage = "/images/islands/favignana/poi/bue-marino.webp";
const calaAzzurraImage = "/images/islands/favignana/poi/cala-azzurra.webp";
const tonnaraImage = "/images/islands/favignana/poi/tonnara.webp";
const boatImage = "/images/experience-polaroids/barca-8-ore-snorkeling.webp";

type GuideInput = Omit<FavignanaGuide, "eyebrow"> & { eyebrow?: string };

function favignanaGuide(guide: GuideInput): FavignanaGuide {
  return { eyebrow: "Guide", ...guide };
}

const commonFacts = [
  { label: "Start", value: "Trapani" },
  { label: "Ideal für", value: "Baden und Buchten" },
  { label: "Region", value: "Ägadische Inseln" },
];

export const favignanaGuidesDe: FavignanaGuide[] = [
  favignanaGuide({
    slug: "was-man-in-favignana-sehen-sollte",
    title: "Was man in Favignana sehen sollte: 10 wichtige Orte",
    shortTitle: "Was sehen",
    metaTitle: "Was man in Favignana sehen sollte: Buchten, Strände und Bootstour",
    metaDescription:
      "Guide zu Favignana: Cala Rossa, Bue Marino, Cala Azzurra, Tonnara Florio, Tuffsteinbrüche und Bootstouren ab Trapani.",
    heroImage: favignanaHero,
    heroAlt: "Favignana vom Meer aus mit türkisfarbenem Wasser und heller Felsküste",
    intro:
      "Favignana ist die bekannteste Insel der Ägadischen Inseln, aber sie ist mehr als eine Liste schöner Strände. Die Insel verbindet Tonnara-Geschichte, Tuffsteinbrüche, klare Buchten und eine Küste, die je nach Wind ihren Charakter verändert.",
    quickAnswer:
      "Zu den wichtigsten Orten in Favignana gehören Cala Rossa, Bue Marino, Cala Azzurra, Lido Burrone, die ehemalige Tonnara Florio, Palazzo Florio, Castello di Santa Caterina, Scalo Cavallo, Grotta Perciata und Punta Sottile. Wenn Sie wenig Zeit haben, hilft eine Bootstour ab Trapani, mehr Küste ohne lange Transfers zu sehen.",
    primaryKeyword: "was man in Favignana sehen sollte",
    secondaryKeywords: ["Favignana Sehenswürdigkeiten", "Ägadische Inseln", "Bootstour Favignana", "Favignana ab Trapani"],
    quickFacts: commonFacts,
    itemListTitle: "Die wichtigsten Orte",
    itemList: [
      { name: "Cala Rossa", description: "Die ikonische Bucht mit hellem Fels und intensiv türkisfarbenem Wasser." },
      { name: "Bue Marino", description: "Eine mineralische Küstenlandschaft mit alten Tuffsteinbrüchen." },
      { name: "Cala Azzurra", description: "Eine helle, weichere Bucht für einen einfachen Badestopp." },
      { name: "Tonnara Florio", description: "Der zentrale Ort, um die maritime Geschichte der Insel zu verstehen." },
      { name: "Punta Sottile", description: "Der westliche Bereich für offene Blicke und Sonnenuntergangsstimmung." },
    ],
    sections: [
      {
        id: "kueste",
        eyebrow: "Meer und Buchten",
        title: "Cala Rossa, Bue Marino und Cala Azzurra haben unterschiedliche Stimmungen",
        body: [
          "Cala Rossa ist besonders fotogen, Bue Marino wirkt felsiger und dramatischer, Cala Azzurra ist oft einfacher zum Baden. Die beste Wahl hängt immer vom Meer des Tages ab.",
          "Vom Boot aus liest man Favignana als Abfolge heller Felsen, alter Abbaufronten, niedriger Buchten und windoffener Küstenstücke.",
        ],
        bullets: ["Cala Rossa für das Panorama.", "Bue Marino für Tuffsteinbrüche.", "Cala Azzurra für einfacheres Baden."],
        cta: "cigala",
      },
      {
        id: "geschichte",
        eyebrow: "Kultur",
        title: "Die Tonnara Florio gibt der Insel Tiefe",
        body: [
          "Die ehemalige Tonnara Florio erzählt von Thunfischfang, Arbeit am Meer und der Bedeutung der Familie Florio. Sie ist eine sinnvolle Pause zwischen zwei Badestopps.",
          "Für einen ersten Besuch ist die richtige Mischung einfach: etwas Dorf, etwas Geschichte und eine echte Küstenperspektive vom Meer aus.",
        ],
        cards: [
          { title: "Tonnara Florio", text: "Maritime Erinnerung von Favignana.", tag: "Geschichte", image: tonnaraImage },
          { title: "Küste vom Boot", text: "Das Relief versteht man vom Wasser besser.", tag: "Meer", image: boatImage },
        ],
        cta: "compare",
      },
    ],
    faqs: [
      { question: "Was ist der schönste Ort in Favignana?", answer: "Cala Rossa ist der bekannteste Ort, aber Bue Marino, Cala Azzurra und die Tonnara Florio machen den Besuch vollständiger." },
      { question: "Kann man Favignana an einem Tag besuchen?", answer: "Ja. Wählen Sie wenige Stationen oder nehmen Sie eine Bootstour, um mehr Küste ohne Stress zu sehen." },
    ],
    relatedSlugs: ["schoenste-straende-buchten-favignana", "favignana-an-einem-tag", "bootstour-favignana-levanzo"],
  }),
  favignanaGuide({
    slug: "schoenste-straende-buchten-favignana",
    title: "Die schönsten Strände und Buchten von Favignana",
    shortTitle: "Strände und Buchten",
    metaTitle: "Schönste Strände und Buchten auf Favignana",
    metaDescription:
      "Die schönsten Strände und Buchten von Favignana: Cala Rossa, Cala Azzurra, Lido Burrone, Bue Marino, Grotta Perciata und Tipps nach Wind.",
    heroImage: calaAzzurraImage,
    heroAlt: "Cala Azzurra auf Favignana mit hellem Wasser und flachem Grund",
    intro:
      "Favignanas Strände wechseln zwischen Sand, Kalkstein und sehr szenischen Buchten. Manche sind zu Fuß einfach, andere zeigen ihre beste Seite erst vom Meer.",
    quickAnswer:
      "Für einfaches Baden eignen sich Cala Azzurra, Lido Burrone und Marasolo. Für Landschaft und Fotos sind Cala Rossa, Bue Marino, Scalo Cavallo und Grotta Perciata besonders stark. Der Wind bleibt das wichtigste Kriterium.",
    primaryKeyword: "Strände Favignana",
    secondaryKeywords: ["Buchten Favignana", "Cala Rossa Favignana", "Baden Favignana", "Schnorcheln Favignana"],
    quickFacts: [
      { label: "Einfaches Baden", value: "Cala Azzurra" },
      { label: "Panorama", value: "Cala Rossa" },
      { label: "Tipp", value: "Wind beachten" },
    ],
    itemListTitle: "Empfohlene Badebereiche",
    itemList: [
      { name: "Cala Azzurra", description: "Klares Wasser, weiche Stimmung und einfacher Zugang." },
      { name: "Lido Burrone", description: "Praktischer Sandstrand mit Services." },
      { name: "Cala Rossa", description: "Heller Fels, intensive Farben und starke Ausblicke." },
      { name: "Bue Marino", description: "Felsen, tieferer Grund und Kulisse alter Steinbrüche." },
    ],
    sections: [
      {
        id: "auswahl",
        title: "Wählen Sie die Bucht nach Art des Tages",
        body: [
          "Für einen entspannten Tag mit einfachem Einstieg sind Sandstrände praktischer. Für ein visuelleres Erlebnis zeigen felsige Buchten das stärkste Bild von Favignana.",
          "In der Hochsaison hilft die Anreise vom Meer, die vollsten Zugänge zu vermeiden und einen bequemeren Badebereich zu finden.",
        ],
        cta: "cigala",
      },
      {
        id: "boot",
        title: "Warum eine Bootstour bei den Buchten hilft",
        body: [
          "Eine Bootstour ersetzt nicht jeden Landbesuch, aber sie macht die Küste verständlicher. Sie sehen, welche Bereiche geschützt sind und wo Wasser und Felsen am besten wirken.",
          "Die Crew passt die Stopps an Wind, Meer und Besucheraufkommen an. Das ist auf Favignana wichtiger als eine starre Liste von Namen.",
        ],
        cards: [
          { title: "Cala Rossa", text: "Die berühmteste Bucht.", tag: "Ikone", image: calaRossaImage },
          { title: "Bue Marino", text: "Steinbrüche und tiefes Blau.", tag: "Fels", image: bueMarinoImage },
        ],
      },
    ],
    faqs: [
      { question: "Welche Bucht ist am einfachsten zum Baden?", answer: "Cala Azzurra und Lido Burrone sind meist einfacher. Cala Rossa und Bue Marino sind landschaftlich stärker, aber felsiger." },
      { question: "Braucht man Badeschuhe?", answer: "Für felsige Bereiche sind Badeschuhe hilfreich. Auf dem Boot reisen Sie am besten leicht, mit Handtuch, Sonnencreme und Hut." },
    ],
    relatedSlugs: ["cala-rossa", "bue-marino-tuffsteinbrueche", "schnorcheln-in-favignana"],
  }),
  favignanaGuide({
    slug: "favignana-an-einem-tag",
    title: "Favignana an einem Tag: Route zwischen Meer, Dorf und Geschichte",
    shortTitle: "Ein Tag",
    metaTitle: "Favignana an einem Tag: Route, Strände und Bootstour ab Trapani",
    metaDescription:
      "Favignana an einem Tag: was priorisieren, wie man sich bewegt, welche Buchten sich lohnen und wann eine Bootstour ab Trapani sinnvoll ist.",
    heroImage: favignanaHero,
    heroAlt: "Favignana-Küste vom Boot aus gesehen",
    intro:
      "Ein Tag auf Favignana kann sehr schön sein, wenn Sie nicht versuchen, alles zu sehen. Die beste Route kombiniert wenige starke Orte, einen realistischen Rhythmus und ausreichend Zeit für das Meer.",
    quickAnswer:
      "Für einen Tag wählen Sie Cala Rossa oder Bue Marino, Cala Azzurra oder Lido Burrone, das Zentrum und die Tonnara Florio. Wenn Sie ab Trapani starten und mehr Küste sehen möchten, ist eine Bootstour oft die bequemere Lösung.",
    primaryKeyword: "Favignana an einem Tag",
    secondaryKeywords: ["Favignana Tagesausflug", "Favignana ab Trapani", "Bootstour Favignana", "Cala Rossa"],
    quickFacts: [
      { label: "Zeit", value: "1 Tag" },
      { label: "Priorität", value: "wenige Stopps" },
      { label: "Alternative", value: "Bootstour ab Trapani" },
    ],
    itemListTitle: "Prioritäten für einen Tag",
    itemList: [
      { name: "Cala Rossa oder Bue Marino", description: "Für die stärkste Küstenlandschaft." },
      { name: "Cala Azzurra oder Lido Burrone", description: "Für ein einfacheres Bad." },
      { name: "Zentrum und Florio", description: "Für Dorf, Pause und Geschichte." },
    ],
    sections: [
      {
        id: "land",
        title: "Landroute: Fahrrad, Scooter und wenige Ziele",
        body: [
          "Wenn Sie auf der Insel ankommen, planen Sie nicht zu viele Stopps. Fahrrad oder Scooter helfen, aber Hitze, Verkehr und volle Zugänge kosten Zeit.",
          "Die Tonnara Florio ist die beste kulturelle Ergänzung, wenn Sie nicht nur baden möchten.",
        ],
      },
      {
        id: "boot",
        title: "Bootsroute: mehr Küste mit weniger Reibung",
        body: [
          "Wenn der Fokus auf Meer, Buchten und Schnorcheln liegt, ist eine Bootstour ab Trapani oft einfacher. Sie steigen ein, die Route wird an das Meer angepasst und Sie vermeiden Insel-Logistik.",
          "Besonders bei wenig Zeit zählt nicht die Anzahl der Orte, sondern wie gut die Stopps zum Tag passen.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      { question: "Reicht ein Tag für Favignana?", answer: "Ja, für einen ersten Eindruck. Für alles braucht es mehr Zeit; für einen Tag sollten Sie klare Prioritäten setzen." },
      { question: "Ist eine Bootstour besser als die Fähre?", answer: "Nicht immer. Wenn Sie Dorf und Land sehen möchten, ist die Fähre passend. Wenn Sie mehr Küste und Badestopps wollen, ist die Bootstour oft bequemer." },
    ],
    relatedSlugs: ["was-man-in-favignana-sehen-sollte", "schoenste-straende-buchten-favignana", "bootstour-favignana-levanzo"],
  }),
  favignanaGuide({
    slug: "cala-rossa",
    title: "Cala Rossa auf Favignana: Farben, Zugang und beste Perspektive",
    shortTitle: "Cala Rossa",
    metaTitle: "Cala Rossa Favignana: Tipps, Zugang und Bootsperspektive",
    metaDescription:
      "Guide zur Cala Rossa auf Favignana: warum sie berühmt ist, wann sie schön ist, worauf man bei Wind achten sollte und warum die Perspektive vom Boot besonders stark ist.",
    heroImage: calaRossaImage,
    heroAlt: "Cala Rossa auf Favignana mit hellem Fels und türkisfarbenem Wasser",
    intro:
      "Cala Rossa ist das bekannteste Bild von Favignana: heller Fels, intensives Wasser und eine Form, die vom Meer besonders gut lesbar wird.",
    quickAnswer:
      "Cala Rossa lohnt sich wegen Farben und Landschaft. Der Zugang vom Land ist felsig und in der Hochsaison voll; vom Boot ist die Perspektive oft entspannter, solange Wind und Meer passen.",
    primaryKeyword: "Cala Rossa Favignana",
    secondaryKeywords: ["Cala Rossa Bootstour", "Favignana Buchten", "Ägadische Inseln", "Baden Cala Rossa"],
    quickFacts: [
      { label: "Bekannt für", value: "Farben und Fels" },
      { label: "Zugang", value: "felsig" },
      { label: "Beste Sicht", value: "vom Meer" },
    ],
    itemListTitle: "Was Sie wissen sollten",
    itemList: [
      { name: "Farben", description: "Besonders stark bei gutem Licht und ruhigem Meer." },
      { name: "Felsen", description: "Schön, aber nicht immer bequem zum Einstieg." },
      { name: "Boot", description: "Gibt die vollständigste Perspektive auf die Bucht." },
    ],
    sections: [
      { id: "blick", title: "Warum Cala Rossa so berühmt ist", body: ["Die Bucht verbindet helle Steinbrüche, türkisfarbenes Wasser und eine geschützte Form. Deshalb ist sie die visuelle Ikone von Favignana.", "Gerade weil sie so bekannt ist, sollte man sie nicht starr planen: Wind, Wellen und Besucheraufkommen entscheiden über die Qualität des Stopps."] },
      { id: "boot", title: "Vom Boot aus wirkt Cala Rossa vollständiger", body: ["Vom Wasser sieht man die Form der Bucht und die alten Abbauflächen besser. Bei guten Bedingungen kann die Crew einen komfortablen Badestopp wählen.", "Wenn die Bucht zu voll oder zu offen ist, ist eine alternative geschützte Cala oft die bessere Entscheidung."], cta: "cigala" },
    ],
    faqs: [
      { question: "Kann man in Cala Rossa baden?", answer: "Ja, aber der Einstieg ist felsig und hängt von Meer und Wind ab." },
      { question: "Ist Cala Rossa immer Teil einer Bootstour?", answer: "Sie ist sehr gefragt, aber die Route wird nach Sicherheit und Bedingungen bestätigt." },
    ],
    relatedSlugs: ["schoenste-straende-buchten-favignana", "bue-marino-tuffsteinbrueche", "schnorcheln-in-favignana"],
  }),
  favignanaGuide({
    slug: "bue-marino-tuffsteinbrueche",
    title: "Bue Marino und die Tuffsteinbrüche von Favignana",
    shortTitle: "Bue Marino",
    metaTitle: "Bue Marino Favignana: Tuffsteinbrüche und Meer vom Boot aus",
    metaDescription:
      "Guide zu Bue Marino auf Favignana: Tuffsteinbrüche, klares Wasser, felsige Küste, Zugang und warum eine Bootsperspektive oft ideal ist.",
    heroImage: bueMarinoImage,
    heroAlt: "Bue Marino auf Favignana mit Tuffsteinbrüchen und tiefblauem Wasser",
    intro:
      "Bue Marino zeigt eine andere Seite von Favignana: weniger Strandbild, mehr Fels, Steinbruch, Tiefe und eine fast monumentale Küstenlandschaft.",
    quickAnswer:
      "Bue Marino lohnt sich für die Tuffsteinbrüche und die starke Meeresperspektive. Es ist kein klassischer Sandstrand; der beste Eindruck entsteht oft vom Boot oder bei ruhigem Meer.",
    primaryKeyword: "Bue Marino Favignana",
    secondaryKeywords: ["Tuffsteinbrüche Favignana", "Bue Marino Bootstour", "Schnorcheln Favignana"],
    quickFacts: [
      { label: "Charakter", value: "felsig und mineralisch" },
      { label: "Ideal", value: "Panorama und Schnorcheln" },
      { label: "Zugang", value: "nicht strandtypisch" },
    ],
    itemListTitle: "Warum Bue Marino besonders ist",
    itemList: [
      { name: "Tuffstein", description: "Alte Abbaufronten direkt über dem Meer." },
      { name: "Wasser", description: "Intensive Farben bei ruhigen Bedingungen." },
      { name: "Perspektive", description: "Vom Boot ist der Ort leichter zu lesen." },
    ],
    sections: [
      { id: "stein", title: "Eine Küste aus Stein und Geschichte", body: ["Die Tuffsteinbrüche machen Bue Marino zu einem der markantesten Orte auf Favignana. Das Meer wirkt hier tiefer und dramatischer als in den flacheren Buchten.", "Der Ort ist besonders für Gäste interessant, die nicht nur baden, sondern die Form der Insel verstehen möchten."] },
      { id: "sicherheit", title: "Warum Bedingungen hier wichtig sind", body: ["Felsige Zugänge und tieferes Wasser machen Bue Marino weniger bequem als Cala Azzurra oder Lido Burrone. Die Crew bewertet deshalb immer Wind, Wellen und Komfort.", "Wenn alles passt, ist es ein starker Badestopp; wenn nicht, ist eine geschütztere Bucht sinnvoller."], cta: "compare" },
    ],
    faqs: [
      { question: "Ist Bue Marino ein Strand?", answer: "Nicht im klassischen Sinn. Es ist eher eine felsige Küstenzone mit Steinbrüchen und tiefem Wasser." },
      { question: "Kann man dort schnorcheln?", answer: "Bei ruhigem Meer ja. Die Entscheidung hängt immer von Sicherheit und Sicht ab." },
    ],
    relatedSlugs: ["cala-rossa", "schoenste-straende-buchten-favignana", "bootstour-favignana-levanzo"],
  }),
  favignanaGuide({
    slug: "schnorcheln-in-favignana",
    title: "Schnorcheln in Favignana: Buchten, Bedingungen und Tipps",
    shortTitle: "Schnorcheln",
    metaTitle: "Schnorcheln in Favignana: beste Buchten und Bootstour-Tipps",
    metaDescription:
      "Schnorcheln in Favignana: Cala Rossa, Bue Marino, Cala Azzurra, Posidonia, Windbedingungen und warum Bootstouren die Auswahl erleichtern.",
    heroImage: boatImage,
    heroAlt: "Schnorcheln bei Favignana während einer Bootstour",
    intro:
      "Favignana ist für klares Wasser bekannt, aber gutes Schnorcheln hängt nicht nur vom Namen der Bucht ab. Wind, Wellen, Licht und Besucheraufkommen entscheiden viel.",
    quickAnswer:
      "Für Schnorcheln eignen sich je nach Bedingungen Cala Rossa, Bue Marino, Cala Azzurra, Scalo Cavallo und geschützte Abschnitte der Küste. Eine Bootstour hilft, am selben Tag die passendste Zone zu wählen.",
    primaryKeyword: "Schnorcheln Favignana",
    secondaryKeywords: ["Schnorcheln Ägadische Inseln", "Bootstour Favignana", "Cala Rossa Schnorcheln", "Bue Marino"],
    quickFacts: [
      { label: "Wichtig", value: "Wind und Sicht" },
      { label: "Ausrüstung", value: "Maske an Bord" },
      { label: "Beste Wahl", value: "geschützte Bucht" },
    ],
    itemListTitle: "Gute Zonen zum Schnorcheln",
    itemList: [
      { name: "Cala Rossa", description: "Bei ruhigem Wasser besonders farbintensiv." },
      { name: "Bue Marino", description: "Felsiger und tiefer, stark bei guter Sicht." },
      { name: "Cala Azzurra", description: "Heller und oft einfacher für entspannte Stopps." },
    ],
    sections: [
      { id: "bedingungen", title: "Gutes Schnorcheln beginnt mit der richtigen Bucht des Tages", body: ["Eine berühmte Cala ist nicht automatisch die beste zum Schnorcheln. Wenn Wind oder Wellen ungünstig stehen, ist eine weniger bekannte geschützte Zone oft besser.", "Die Crew kann unterwegs reagieren und Stopps wählen, an denen Wasser, Sicherheit und Komfort zusammenpassen."] },
      { id: "respekt", title: "Achtsamkeit gegenüber Posidonia und Meeresleben", body: ["Schnorcheln bedeutet auch, Abstand zu halten, nichts zu berühren und keine Seegraswiesen zu beschädigen. Posidonia ist ein wichtiger Teil des Ökosystems.", "Meeresfreundliche Sonnencreme und ruhiges Verhalten im Wasser machen den Unterschied."], cta: "cigala" },
    ],
    faqs: [
      { question: "Ist Schnorcheln für Anfänger geeignet?", answer: "Ja, wenn die Bedingungen ruhig sind. Wer unsicher ist, bleibt nahe am Boot und folgt den Hinweisen der Crew." },
      { question: "Wird Ausrüstung gestellt?", answer: "Bei vielen Erlebnissen ist Schnorchelausrüstung vorgesehen. Die genaue Inklusivleistung steht in der Erlebnisbeschreibung." },
    ],
    relatedSlugs: ["schoenste-straende-buchten-favignana", "cala-rossa", "bootstour-favignana-levanzo"],
  }),
  favignanaGuide({
    slug: "anreise-ab-trapani-und-fortbewegung",
    title: "Von Trapani nach Favignana: Anreise und Fortbewegung",
    shortTitle: "Anreise",
    metaTitle: "Von Trapani nach Favignana: Fähre, Tragflügelboot und Bootstour",
    metaDescription:
      "So kommen Sie von Trapani nach Favignana: Fähren, Tragflügelboote, Fortbewegung auf der Insel und wann eine Bootstour ab Trapani sinnvoller ist.",
    heroImage: favignanaHero,
    heroAlt: "Favignana vom Meer aus während der Anreise ab Trapani",
    intro:
      "Favignana ist von Trapani gut erreichbar, aber Zeiten, Verfügbarkeiten und Regeln ändern sich je nach Saison. Für einen stressfreien Tag sollten Sie die Route nicht nur nach Entfernung planen.",
    quickAnswer:
      "Von Trapani erreicht man Favignana per Linienverbindung oder mit einer organisierten Bootstour. Auf der Insel bewegt man sich meist zu Fuß, per Fahrrad, Scooter oder Shuttle. Für einen Meerestag kann die Bootstour ab Trapani die einfachere Option sein.",
    primaryKeyword: "von Trapani nach Favignana",
    secondaryKeywords: ["Favignana Fähre", "Favignana Fortbewegung", "Bootstour ab Trapani", "Ägadische Inseln"],
    quickFacts: [
      { label: "Start", value: "Trapani" },
      { label: "Optionen", value: "Linie oder Bootstour" },
      { label: "Prüfen", value: "offizielle Fahrpläne" },
    ],
    itemListTitle: "Optionen",
    itemList: [
      { name: "Linienverbindung", description: "Gut, wenn Sie das Dorf und die Insel selbst erkunden möchten." },
      { name: "Bootstour", description: "Gut, wenn Meer, Buchten und Badestopps im Fokus stehen." },
      { name: "Fahrrad oder Scooter", description: "Praktisch auf der Insel, aber in der Hochsaison zu planen." },
    ],
    sections: [
      { id: "linie", title: "Linienverbindungen immer aktuell prüfen", body: ["Fahrpläne, Fahrzeugregeln und Verfügbarkeiten ändern sich je nach Saison. Nutzen Sie für operative Details immer offizielle Quellen.", "Wenn Sie auf eigene Faust reisen, planen Sie genügend Puffer für Rückfahrt, Hitze und Wege auf der Insel."] },
      { id: "tour", title: "Wann die Bootstour ab Trapani bequemer ist", body: ["Wenn Sie hauptsächlich baden, schnorcheln und Küste sehen möchten, spart eine Bootstour Logistik. Die Crew kümmert sich um Route, Timing und Stopps.", "Das ist besonders sinnvoll, wenn Sie Favignana mit Levanzo kombinieren möchten."], cta: "compare" },
    ],
    faqs: [
      { question: "Sollte ich Fahrpläne vorher buchen?", answer: "In der Hochsaison ist das empfehlenswert. Prüfen Sie immer die offiziellen Anbieter." },
      { question: "Brauche ich auf Favignana ein Fahrzeug?", answer: "Nicht zwingend. Es hängt davon ab, ob Sie mehrere Landstopps planen oder vor allem die Küste vom Meer aus erleben möchten." },
    ],
    relatedSlugs: ["favignana-an-einem-tag", "bootstour-favignana-levanzo", "was-man-in-favignana-sehen-sollte"],
  }),
  favignanaGuide({
    slug: "bootstour-favignana-levanzo",
    title: "Bootstour Favignana und Levanzo ab Trapani: welche Option passt?",
    shortTitle: "Bootstour",
    metaTitle: "Bootstour Favignana und Levanzo ab Trapani",
    metaDescription:
      "Vergleich der Bootstouren Favignana und Levanzo ab Trapani: 4 Stunden privat, 8 Stunden geteilt oder privat, Gourmet-Erlebnis und Charter.",
    heroImage: boatImage,
    heroAlt: "Bootstour zwischen Favignana und Levanzo ab Trapani",
    eyebrow: "Egadisailing-Erlebnisse",
    intro:
      "Favignana und Levanzo liegen nah beieinander, fühlen sich aber sehr unterschiedlich an. Eine Bootstour ab Trapani kann beide Inseln verbinden, wenn Wetter, Dauer und Route es erlauben.",
    quickAnswer:
      "Wählen Sie 4 Stunden für eine agile private Halbtagestour, 8 Stunden für mehr Stopps und mögliche Kombination Favignana/Levanzo, privat für maximale Flexibilität, den Neel 47 mit Chef an Bord für Premium-Komfort oder Charter für mehrere Tage.",
    primaryKeyword: "Bootstour Favignana Levanzo ab Trapani",
    secondaryKeywords: ["Bootstour Ägadische Inseln", "private Bootstour Trapani", "Schnorcheln Favignana", "Mittagessen an Bord"],
    quickFacts: [
      { label: "Start", value: "Trapani" },
      { label: "Dauer", value: "4 Stunden, 8 Stunden, mehrere Tage" },
      { label: "Route", value: "wetterabhängig" },
    ],
    itemListTitle: "Welche Erfahrung wählen",
    itemList: [
      { name: "Private 4-Stunden-Tour", description: "Für einen kompakten Halbtag mit reserviertem Boot." },
      { name: "Geteilte 8-Stunden-Tour", description: "Für einzelne Plätze, Schnorcheln und einen entspannten ganzen Tag." },
      { name: "Private 8-Stunden-Tour", description: "Für Gruppen, Privatsphäre und flexible Route." },
      { name: "Chef an Bord", description: "Für Komfort, Mittagessen an Bord und Premium-Rhythmus auf dem Neel 47." },
      { name: "Charter", description: "Für mehrere Tage zwischen Favignana, Levanzo und Marettimo." },
    ],
    sections: [
      { id: "rhythmus", eyebrow: "Schnelle Wahl", title: "Die richtige Frage ist nicht welche Tour besser ist, sondern welchen Rhythmus Sie möchten", body: ["Eine kurze Tour passt bei wenig Zeit. Acht Stunden geben mehr Ruhe, mehr Badestopps und mehr Möglichkeiten, Favignana und Levanzo zu kombinieren.", "Privat bedeutet mehr Kontrolle über den Rhythmus; geteilt ist einfacher, wenn Sie allein, zu zweit oder in einer kleinen Gruppe reisen."], cta: "compare" },
      { id: "premium", eyebrow: "Premium", title: "Wann der Neel 47 mit Chef an Bord passt", body: ["Das Gourmet-Erlebnis auf dem Neel 47 ist für Gäste gedacht, die Platz, Komfort und Mittagessen an Bord suchen. Es ist weniger eine schnelle Tour, sondern ein kuratierter Meerestag.", "Skipper, Chefkoch und Hostess lassen Sie sich auf die Erfahrung konzentrieren, während die Route nach Meer, Wetter und Komfort gewählt wird."], cta: "neel" },
    ],
    faqs: [
      { question: "Sind Favignana und Levanzo immer garantiert?", answer: "Nein. Die Route hängt von Wind, Meer und Sicherheit ab. Eine gute Crew passt den Plan an den Tag an." },
      { question: "Ist die 4-Stunden-Tour geteilt?", answer: "Nein. Die 4-Stunden-Tour wird als private Tour am Vormittag oder Nachmittag angeboten." },
      { question: "Wann lohnt sich ein privates Boot?", answer: "Wenn Sie als Gruppe reisen, Privatsphäre wünschen oder den Rhythmus mit dem Skipper anpassen möchten." },
    ],
    relatedSlugs: ["was-man-in-favignana-sehen-sollte", "schnorcheln-in-favignana", "favignana-an-einem-tag"],
  }),
];

export const favignanaGuideLinksDe = favignanaGuidesDe.map((guide) => ({
  slug: guide.slug,
  title: guide.shortTitle,
  description: guide.metaDescription,
}));
