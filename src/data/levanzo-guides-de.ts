import type { LevanzoGuide } from "./levanzo-guides";

const levanzoHero = "/images/islands/levanzo/hero.webp";
const boatImage = "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp";
const neelImage = "/images/boats/neel-47/neel-47-favignana.webp";
const snorkelingImage = "/images/experience-polaroids/barca-8-ore-snorkeling.webp";

type GuideInput = Omit<LevanzoGuide, "eyebrow"> & { eyebrow?: string };

function levanzoGuide(guide: GuideInput): LevanzoGuide {
  return { eyebrow: "Guide", ...guide };
}

const commonFacts = [
  { label: "Start", value: "Trapani" },
  { label: "Ideal für", value: "ruhiges Meer" },
  { label: "Region", value: "Ägadische Inseln" },
];

export const levanzoGuidesDe: LevanzoGuide[] = [
  levanzoGuide({
    slug: "was-man-in-levanzo-sehen-sollte",
    title: "Was man in Levanzo sehen sollte: Buchten, Dorf und Grotta del Genovese",
    shortTitle: "Was sehen",
    metaTitle: "Was man in Levanzo sehen sollte: Buchten und Grotta del Genovese",
    metaDescription:
      "Guide zu Levanzo: Cala Dogana, Cala Fredda, Cala Minnola, Grotta del Genovese, Dorf, Faraglione und Bootstour ab Trapani.",
    heroImage: levanzoHero,
    heroAlt: "Levanzo vom Meer aus mit weißen Häusern und klarem Wasser",
    intro:
      "Levanzo ist die ruhigste und kleinste der Ägadischen Inseln. Die Insel lebt von einem langsamen Rhythmus: ein kleines Dorf, helle Küsten, transparente Buchten und die Grotta del Genovese.",
    quickAnswer:
      "In Levanzo sollte man Cala Dogana, Cala Fredda, Cala Minnola, Faraglione, Cala Tramontana, Cala Calcara, Capo Grosso und die Grotta del Genovese sehen. Wer ab Trapani kommt, wählt zwischen Landbesuch mit Höhle und Dorf oder Bootstour für mehr Küste und Badestopps.",
    primaryKeyword: "was man in Levanzo sehen sollte",
    secondaryKeywords: ["Levanzo Sehenswürdigkeiten", "Grotta del Genovese", "Bootstour Levanzo", "Ägadische Inseln"],
    quickFacts: commonFacts,
    itemListTitle: "Wichtige Orte",
    itemList: [
      { name: "Cala Dogana", description: "Der Bereich beim Dorf und der einfachste erste Kontakt mit der Insel." },
      { name: "Cala Fredda", description: "Klares Wasser und ruhige Stimmung nahe dem Dorf." },
      { name: "Cala Minnola", description: "Eine der bekanntesten Bade- und Schnorchelzonen." },
      { name: "Grotta del Genovese", description: "Die wichtigste kulturelle Sehenswürdigkeit der Insel." },
    ],
    sections: [
      { id: "dorf", title: "Levanzo versteht man langsam", body: ["Das Dorf ist klein und die Wege sind begrenzt. Genau darin liegt der Reiz: weniger Programm, mehr Licht, Wasser und Stille.", "Für einen ersten Besuch reichen wenige Ziele. Eine zu volle Liste nimmt Levanzo den Charakter."] },
      { id: "meer", title: "Vom Boot aus sieht man die ruhigere Seite der Insel", body: ["Cala Fredda, Cala Minnola und die Küstenstücke rund um Levanzo wirken besonders schön vom Wasser. Die Route muss aber zu Wind und Meer passen.", "Wenn die Bedingungen gut sind, lässt sich Levanzo ideal mit Favignana kombinieren."], cta: "compare" },
    ],
    faqs: [
      { question: "Kann man Levanzo an einem Tag besuchen?", answer: "Ja. Wählen Sie entweder Dorf und Grotta del Genovese oder eine Bootstour mit Badestopps." },
      { question: "Ist Levanzo gut zum Schnorcheln?", answer: "Ja, besonders bei ruhigem Meer rund um Cala Minnola und geschützte Abschnitte." },
    ],
    relatedSlugs: ["straende-buchten-levanzo", "levanzo-an-einem-tag", "bootstour-ab-trapani"],
  }),
  levanzoGuide({
    slug: "straende-buchten-levanzo",
    title: "Strände und Buchten von Levanzo: Cala Fredda, Cala Minnola und Cala Dogana",
    shortTitle: "Strände und Buchten",
    metaTitle: "Strände und Buchten auf Levanzo: Cala Fredda und Cala Minnola",
    metaDescription:
      "Die wichtigsten Strände und Buchten auf Levanzo: Cala Dogana, Cala Fredda, Cala Minnola, Cala Calcara und Tipps für Wind und Bootstouren.",
    heroImage: levanzoHero,
    heroAlt: "Klares Wasser und helle Küste auf Levanzo",
    intro:
      "Levanzo hat keine langen Sandstrände, sondern kleine Buchten, helle Felsen und sehr klares Wasser. Die beste Bucht ist oft diejenige, die am jeweiligen Tag am geschütztesten liegt.",
    quickAnswer:
      "Für einfaches Baden sind Cala Dogana und Cala Fredda praktisch. Cala Minnola ist besonders schön zum Schnorcheln. Cala Calcara und Tramontana hängen stärker von Meer und Wind ab.",
    primaryKeyword: "Strände Levanzo",
    secondaryKeywords: ["Buchten Levanzo", "Cala Minnola", "Cala Fredda", "Schnorcheln Levanzo"],
    quickFacts: [
      { label: "Einfach", value: "Cala Dogana" },
      { label: "Schnorcheln", value: "Cala Minnola" },
      { label: "Wichtig", value: "Windrichtung" },
    ],
    itemListTitle: "Buchten im Überblick",
    itemList: [
      { name: "Cala Dogana", description: "Zentral und praktisch nahe dem Dorf." },
      { name: "Cala Fredda", description: "Klares Wasser und entspannte Stimmung." },
      { name: "Cala Minnola", description: "Bekannt für transparentes Wasser und Meeresleben." },
      { name: "Cala Calcara", description: "Schöner, aber stärker vom Wetter abhängig." },
    ],
    sections: [
      { id: "auswahl", title: "Levanzo ist eine Insel der kleinen Stopps", body: ["Die Buchten sind nicht groß, dafür sehr klar und stimmungsvoll. Planen Sie weniger Orte und mehr Zeit im Wasser.", "Vom Boot aus kann die Crew die geschützteste Seite wählen und den Tag angenehmer machen."] },
      { id: "schnorcheln", title: "Cala Minnola ist der klassische Schnorchelname", body: ["Cala Minnola ist bekannt, aber auch hier gilt: Sicht und Sicherheit zählen mehr als der Name.", "Bei guter See ist sie eine der schönsten Zonen für ruhiges Schnorcheln."], cta: "cigala" },
    ],
    faqs: [
      { question: "Gibt es Sandstrände auf Levanzo?", answer: "Levanzo ist eher eine Insel kleiner Buchten und Felsen als klassischer Sandstrände." },
      { question: "Welche Bucht ist am einfachsten?", answer: "Cala Dogana und Cala Fredda sind in der Regel am einfachsten zu erreichen." },
    ],
    relatedSlugs: ["schnorcheln-cala-minnola-calcara", "was-man-in-levanzo-sehen-sollte", "levanzo-an-einem-tag"],
  }),
  levanzoGuide({
    slug: "grotte-del-genovese",
    title: "Grotta del Genovese auf Levanzo: Besuch, Bedeutung und Planung",
    shortTitle: "Grotta del Genovese",
    metaTitle: "Grotta del Genovese Levanzo: Besuch und praktische Tipps",
    metaDescription:
      "Guide zur Grotta del Genovese auf Levanzo: warum sie wichtig ist, wie man den Besuch plant und wie sie sich mit einem Meerestag kombinieren lässt.",
    heroImage: levanzoHero,
    heroAlt: "Levanzo-Küste in der Nähe der Grotta del Genovese",
    intro:
      "Die Grotta del Genovese ist die wichtigste kulturelle Sehenswürdigkeit von Levanzo. Sie gehört nicht zu einem normalen Badestopp, sondern erfordert eine gezielte, autorisierte Besichtigung.",
    quickAnswer:
      "Wenn Sie die Grotta del Genovese besuchen möchten, planen Sie sie separat über die offiziellen Kanäle. Eine Bootstour ergänzt den Besuch vom Meer aus, ersetzt ihn aber nicht.",
    primaryKeyword: "Grotta del Genovese Levanzo",
    secondaryKeywords: ["Levanzo Höhle", "Levanzo Kultur", "Bootstour Levanzo"],
    quickFacts: [
      { label: "Art", value: "Kulturstätte" },
      { label: "Planung", value: "separat buchen" },
      { label: "Kombination", value: "Meerestour möglich" },
    ],
    itemListTitle: "Wichtig zu wissen",
    itemList: [
      { name: "Nicht frei zugänglich", description: "Der Besuch folgt autorisierten Modalitäten." },
      { name: "Nicht mit Badestopp verwechseln", description: "Die Höhle ist Kultur, die Bootstour ist Meer." },
      { name: "Zeit einplanen", description: "Eine Besichtigung braucht Organisation und Puffer." },
    ],
    sections: [
      { id: "bedeutung", title: "Warum die Höhle wichtig ist", body: ["Die Grotta del Genovese bewahrt prähistorische Spuren und macht Levanzo kulturell besonders. Sie ergänzt die Meeresseite der Insel um eine historische Tiefe.", "Für viele Gäste ist sie der beste Grund, Levanzo nicht nur als Badeinsel zu sehen."] },
      { id: "kombination", title: "Wie man Höhle und Meer kombiniert", body: ["Wenn die Höhle Priorität hat, sollte der Tagesplan darum herum aufgebaut werden. Wenn Meer Priorität hat, ist die Bootstour die passendere Wahl.", "Beides an einem Tag ist möglich, aber nur mit realistischer Planung."], cta: "compare" },
    ],
    faqs: [
      { question: "Ist die Grotta del Genovese in der Bootstour enthalten?", answer: "Nein, sie wird normalerweise separat über autorisierte Kanäle besucht." },
      { question: "Lohnt sie sich?", answer: "Ja, wenn Sie neben Meer auch Kultur und Geschichte suchen." },
    ],
    relatedSlugs: ["was-man-in-levanzo-sehen-sollte", "levanzo-an-einem-tag", "bootstour-ab-trapani"],
  }),
  levanzoGuide({
    slug: "levanzo-an-einem-tag",
    title: "Levanzo an einem Tag: langsame Route zwischen Dorf, Höhle und Meer",
    shortTitle: "Ein Tag",
    metaTitle: "Levanzo an einem Tag: Route ab Trapani und Bootstour-Tipps",
    metaDescription:
      "Levanzo an einem Tag: was man sehen sollte, wann die Grotta del Genovese passt und wann eine Bootstour ab Trapani sinnvoll ist.",
    heroImage: levanzoHero,
    heroAlt: "Levanzo Dorf und klares Wasser an einem Tagesausflug",
    intro:
      "Levanzo an einem Tag funktioniert am besten mit einem einfachen Plan. Die Insel ist klein, aber gerade deshalb sollte man nicht zu viele Ziele in wenige Stunden drücken.",
    quickAnswer:
      "Wählen Sie entweder Dorf, Cala Dogana, Cala Fredda und eventuell Grotta del Genovese oder eine Bootstour mit Badestopps entlang der Küste. Für Favignana plus Levanzo ist eine 8-Stunden-Tour meist sinnvoller als ein kurzer Ausflug.",
    primaryKeyword: "Levanzo an einem Tag",
    secondaryKeywords: ["Levanzo Tagesausflug", "Levanzo ab Trapani", "Bootstour Levanzo", "Grotta del Genovese"],
    quickFacts: [
      { label: "Zeit", value: "1 Tag" },
      { label: "Rhythmus", value: "langsam" },
      { label: "Option", value: "Bootstour" },
    ],
    itemListTitle: "Tagesoptionen",
    itemList: [
      { name: "Dorf und nahe Buchten", description: "Für einen ruhigen Landbesuch." },
      { name: "Grotta del Genovese", description: "Für Kultur, wenn separat geplant." },
      { name: "Bootstour", description: "Für mehr Küste, Baden und mögliche Kombination mit Favignana." },
    ],
    sections: [
      { id: "plan", title: "Ein guter Tag auf Levanzo ist nicht überfüllt", body: ["Wählen Sie eine Hauptidee: Kultur, Dorf oder Meer. Wer alles gleichzeitig will, verliert leicht die Ruhe der Insel.", "Mit wenig Zeit lohnt sich ein klarer Fokus."] },
      { id: "boot", title: "Wann das Boot die bessere Wahl ist", body: ["Wenn Sie schwimmen, schnorcheln und die Küste sehen möchten, ist eine Bootstour ab Trapani bequem. Die Crew wählt Buchten nach den Bedingungen.", "Für die Kombination Favignana und Levanzo sind 8 Stunden deutlich entspannter."], cta: "compare" },
    ],
    faqs: [
      { question: "Reicht ein Tag für Levanzo?", answer: "Ja, wenn Sie bewusst wenige Stationen wählen." },
      { question: "Kann man Levanzo mit Favignana kombinieren?", answer: "Ja, besonders bei einer 8-Stunden-Bootstour und passenden Wetterbedingungen." },
    ],
    relatedSlugs: ["was-man-in-levanzo-sehen-sollte", "straende-buchten-levanzo", "bootstour-ab-trapani"],
  }),
  levanzoGuide({
    slug: "anreise-ab-trapani",
    title: "Von Trapani nach Levanzo: Anreise und praktische Tipps",
    shortTitle: "Anreise",
    metaTitle: "Von Trapani nach Levanzo: Verbindungen und Bootstouren",
    metaDescription:
      "So kommen Sie von Trapani nach Levanzo: Linienverbindungen, Tagesplanung, offizielle Fahrpläne und wann eine Bootstour ab Trapani sinnvoll ist.",
    heroImage: levanzoHero,
    heroAlt: "Anreise nach Levanzo über das Meer ab Trapani",
    intro:
      "Levanzo ist von Trapani aus erreichbar, aber Fahrpläne und Verfügbarkeiten ändern sich je nach Saison. Eine gute Planung entscheidet, ob der Tag ruhig oder hektisch wird.",
    quickAnswer:
      "Sie erreichen Levanzo mit Linienverbindungen oder im Rahmen einer Bootstour ab Trapani. Für Dorf und Grotta del Genovese passt die Linie gut; für Buchten, Baden und flexible Route ist die Bootstour bequemer.",
    primaryKeyword: "von Trapani nach Levanzo",
    secondaryKeywords: ["Levanzo Fähre", "Levanzo ab Trapani", "Bootstour Levanzo", "Ägadische Inseln"],
    quickFacts: [
      { label: "Start", value: "Trapani" },
      { label: "Optionen", value: "Linie oder Tour" },
      { label: "Prüfen", value: "offizielle Fahrpläne" },
    ],
    itemListTitle: "Planungsoptionen",
    itemList: [
      { name: "Linienverbindung", description: "Gut für Dorf, Spaziergang und organisierte Höhlenbesichtigung." },
      { name: "Bootstour", description: "Gut für Küste, Buchten und Baden." },
      { name: "Puffer", description: "Wichtig für Rückfahrt, Wetter und Saisonandrang." },
    ],
    sections: [
      { id: "fahrplaene", title: "Fahrpläne immer offiziell prüfen", body: ["Kopieren Sie keine alten Uhrzeiten aus Guides. Saison, Wetter und Anbieter können Details ändern.", "Planen Sie besonders im Sommer mit Puffer und buchen Sie rechtzeitig, wenn der Tag fix ist."] },
      { id: "tour", title: "Bootstour ab Trapani als Meerestag", body: ["Für Gäste, die Levanzo vom Wasser erleben möchten, ist die Bootstour die einfachere Lösung. Sie reduziert Transfers und konzentriert den Tag auf Buchten und Badestopps."], cta: "cigala" },
    ],
    faqs: [
      { question: "Wie kommt man nach Levanzo?", answer: "Mit Linienverbindungen ab Trapani oder mit einer organisierten Bootstour." },
      { question: "Was ist besser?", answer: "Für Kultur und Dorf die Linie; für Meer und Baden die Bootstour." },
    ],
    relatedSlugs: ["levanzo-an-einem-tag", "bootstour-ab-trapani", "was-man-in-levanzo-sehen-sollte"],
  }),
  levanzoGuide({
    slug: "schnorcheln-cala-minnola-calcara",
    title: "Schnorcheln bei Cala Minnola und Cala Calcara auf Levanzo",
    shortTitle: "Schnorcheln",
    metaTitle: "Schnorcheln auf Levanzo: Cala Minnola und Cala Calcara",
    metaDescription:
      "Schnorcheln auf Levanzo: Cala Minnola, Cala Calcara, klare Buchten, Windbedingungen und Tipps für Bootstouren ab Trapani.",
    heroImage: snorkelingImage,
    heroAlt: "Schnorcheln in klarem Wasser bei Levanzo",
    intro:
      "Levanzo eignet sich sehr gut für ruhige Schnorchelstopps, wenn Meer und Sicht passen. Cala Minnola ist der bekannteste Name, aber der beste Stopp hängt vom Tag ab.",
    quickAnswer:
      "Cala Minnola ist die klassische Zone zum Schnorcheln, Cala Calcara kann bei passenden Bedingungen spannend sein. Die Crew sollte die Route nach Wind, Sicht und Sicherheit wählen.",
    primaryKeyword: "Schnorcheln Levanzo",
    secondaryKeywords: ["Cala Minnola Schnorcheln", "Cala Calcara", "Bootstour Levanzo", "Ägadische Inseln"],
    quickFacts: [
      { label: "Top-Zone", value: "Cala Minnola" },
      { label: "Wichtig", value: "Sicht und Wind" },
      { label: "Ideal", value: "ruhige See" },
    ],
    itemListTitle: "Schnorchelzonen",
    itemList: [
      { name: "Cala Minnola", description: "Klares Wasser und bekannter Schnorchelbereich." },
      { name: "Cala Calcara", description: "Schöner Küstenabschnitt, stärker wetterabhängig." },
      { name: "Geschützte Buchten", description: "Oft besser als starre Namenslisten." },
    ],
    sections: [
      { id: "bedingungen", title: "Nicht der Name, sondern die Bedingungen entscheiden", body: ["Gutes Schnorcheln braucht klare Sicht, wenig Welle und einen sicheren Einstieg. Deshalb kann eine weniger bekannte Zone am richtigen Tag besser sein.", "Die Crew liest die Bedingungen und wählt den angenehmsten Stopp."] },
      { id: "respekt", title: "Schnorcheln mit Respekt", body: ["Berühren Sie nichts, halten Sie Abstand zum Meeresboden und nutzen Sie meeresfreundliche Sonnencreme.", "Levanzo lebt von Transparenz und Ruhe; genau so sollte man sich im Wasser bewegen."], cta: "cigala" },
    ],
    faqs: [
      { question: "Ist Cala Minnola immer erreichbar?", answer: "Sie ist bekannt, aber der Stopp hängt von Wind und Sicherheit ab." },
      { question: "Ist Schnorcheln für Anfänger geeignet?", answer: "Ja, bei ruhigen Bedingungen und nahe am Boot." },
    ],
    relatedSlugs: ["straende-buchten-levanzo", "levanzo-an-einem-tag", "bootstour-ab-trapani"],
  }),
  levanzoGuide({
    slug: "bootstour-ab-trapani",
    title: "Bootstour nach Levanzo ab Trapani: geteilte und private Optionen",
    shortTitle: "Bootstour",
    metaTitle: "Bootstour Levanzo ab Trapani: Optionen und Tipps",
    metaDescription:
      "Bootstour nach Levanzo ab Trapani: 4 Stunden privat, 8 Stunden geteilt oder privat, Kombination mit Favignana und Premium-Erlebnis auf dem Neel 47.",
    heroImage: boatImage,
    heroAlt: "Bootstour ab Trapani entlang der Küste von Levanzo",
    eyebrow: "Egadisailing-Erlebnisse",
    intro:
      "Eine Bootstour ist die bequemste Art, Levanzo als Meerestag zu erleben. Sie eignet sich für klare Buchten, Badestopps und eine mögliche Kombination mit Favignana.",
    quickAnswer:
      "Wählen Sie 4 Stunden privat für einen kompakten Ausflug, 8 Stunden für mehr Badestopps und mögliche Kombination mit Favignana, privat für Flexibilität und den Neel 47, wenn Sie Komfort und Mittagessen an Bord suchen.",
    primaryKeyword: "Bootstour Levanzo ab Trapani",
    secondaryKeywords: ["private Bootstour Trapani", "Favignana und Levanzo", "Schnorcheln Levanzo", "Ägadische Inseln"],
    quickFacts: [
      { label: "Formate", value: "4 Stunden, 8 Stunden, privat" },
      { label: "Kombination", value: "Favignana möglich" },
      { label: "Route", value: "nach Wetter" },
    ],
    itemListTitle: "Welche Erfahrung wählen",
    itemList: [
      { name: "Private 4 Stunden", description: "Für eine kompakte Ausfahrt mit reserviertem Boot." },
      { name: "Geteilte 8 Stunden", description: "Für einen ganzen Tag mit mehr Zeit im Wasser." },
      { name: "Private 8 Stunden", description: "Für Gruppen, Familien und besondere Anlässe." },
      { name: "Neel 47 Gourmet", description: "Für Chef an Bord, Komfort und Mittagessen auf dem Meer." },
    ],
    sections: [
      { id: "dauer", title: "4 Stunden, 8 Stunden oder privat?", body: ["Der Halbtag ist ideal, wenn Sie eine kompakte Meerespause möchten. Acht Stunden geben mehr Spielraum für Stopps, Schnorcheln und Kombinationen.", "Privat lohnt sich bei Gruppen, besonderen Zeiten oder dem Wunsch nach mehr Flexibilität."], cta: "compare" },
      { id: "kombination", title: "Warum Levanzo oft mit Favignana kombiniert wird", body: ["Favignana bietet berühmte Buchten und mehr Vielfalt; Levanzo bringt Stille, transparentes Wasser und ein kleines Dorf.", "Zusammen zeigen sie zwei Seiten der Ägadischen Inseln, solange die Seebedingungen passen."], cta: "neel" },
    ],
    faqs: [
      { question: "Wie lange dauert eine Bootstour nach Levanzo?", answer: "Je nach Formel 4 oder 8 Stunden. Acht Stunden sind entspannter, wenn Favignana kombiniert werden soll." },
      { question: "Ist die Grotta del Genovese enthalten?", answer: "Nein, die Höhle wird separat organisiert. Die Bootstour konzentriert sich auf Meer und Küste." },
    ],
    relatedSlugs: ["levanzo-an-einem-tag", "straende-buchten-levanzo", "schnorcheln-cala-minnola-calcara"],
  }),
];

export const levanzoGuideLinksDe = levanzoGuidesDe.map((guide) => ({
  slug: guide.slug,
  title: guide.shortTitle,
  description: guide.metaDescription,
}));
