import type { MarettimoGuide } from "./marettimo-guides";

const marettimoHero = "/images/islands/marettimo/hero.webp";
const charterImage = "/images/experience-polaroids/charter-trimarano-egadi.webp";
const privateBoatImage = "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp";

type GuideInput = Omit<MarettimoGuide, "eyebrow"> & { eyebrow?: string };

function marettimoGuide(guide: GuideInput): MarettimoGuide {
  return { eyebrow: "Guide", ...guide };
}

const commonFacts = [
  { label: "Start", value: "Trapani" },
  { label: "Charakter", value: "wild und entfernt" },
  { label: "Beste Formel", value: "Charter oder flexible Route" },
];

export const marettimoGuidesDe: MarettimoGuide[] = [
  marettimoGuide({
    slug: "was-man-in-marettimo-sehen-sollte",
    title: "Was man in Marettimo sehen sollte: Höhlen, Punta Troia und Cala Bianca",
    shortTitle: "Was sehen",
    metaTitle: "Was man in Marettimo sehen sollte: Höhlen, Cala Bianca und Wanderwege",
    metaDescription:
      "Guide zu Marettimo: Meereshöhlen, Cala Bianca, Castello di Punta Troia, Case Romane, Monte Falcone, Wanderwege und Charter auf den Ägadischen Inseln.",
    heroImage: marettimoHero,
    heroAlt: "Marettimo vom Meer aus mit hoher Küste und blauem Wasser",
    intro:
      "Marettimo ist die entfernteste und vertikalste der Ägadischen Inseln. Sie ist wilder als Favignana, bergiger als Levanzo und ideal für Höhlen, Wanderwege und ruhige Buchten.",
    quickAnswer:
      "Zu den wichtigsten Orten in Marettimo gehören das Dorf, Scalo Vecchio und Scalo Nuovo, Castello di Punta Troia, Case Romane, Cala Bianca, die Meereshöhlen, Punta Libeccio und die Wege zum Monte Falcone. Für einen ersten Besuch wählen Sie Boot, Wandern oder eine leichte Kombination.",
    primaryKeyword: "was man in Marettimo sehen sollte",
    secondaryKeywords: ["Marettimo Sehenswürdigkeiten", "Marettimo Höhlen", "Cala Bianca", "Charter Ägadische Inseln"],
    quickFacts: commonFacts,
    itemListTitle: "Wichtige Orte",
    itemList: [
      { name: "Meereshöhlen", description: "Die berühmteste Meeresseite von Marettimo." },
      { name: "Cala Bianca", description: "Eine der schönsten Buchten, nur bei passenden Bedingungen sinnvoll." },
      { name: "Punta Troia", description: "Burg, Panorama und starke Landschaft." },
      { name: "Dorf", description: "Klein, ruhig und sehr anders als Favignana." },
    ],
    sections: [
      { id: "charakter", title: "Marettimo ist kein schneller Checklisten-Ort", body: ["Die Insel braucht Zeit, Meer-Reading und realistische Erwartungen. Sie ist spektakulär, aber nicht jede Tagesroute passt immer.", "Gerade deshalb ist ein Charter oft die ehrlichste Art, Marettimo einzubeziehen."] },
      { id: "wahl", title: "Boot oder Wandern?", body: ["Vom Boot erleben Sie Höhlen, Cala Bianca und die vertikale Küste. Zu Fuß entdecken Sie Punta Troia, Case Romane und die Bergseite.", "Für einen Tag ist eine klare Wahl besser als ein überfüllter Plan."], cta: "compare" },
    ],
    faqs: [
      { question: "Kann man Marettimo an einem Tag sehen?", answer: "Ja, aber nur mit klaren Prioritäten und passenden Bedingungen." },
      { question: "Ist Marettimo immer Teil der Bootstour?", answer: "Nein. Die Entfernung und das Meer machen eine flexible Entscheidung notwendig." },
    ],
    relatedSlugs: ["meereshoehlen", "cala-bianca", "bootstour-charter-aegadische-inseln"],
  }),
  marettimoGuide({
    slug: "meereshoehlen",
    title: "Meereshöhlen von Marettimo: was Sie erwarten können",
    shortTitle: "Meereshöhlen",
    metaTitle: "Meereshöhlen von Marettimo: Bootstour und Tipps",
    metaDescription:
      "Guide zu den Meereshöhlen von Marettimo: Grotta del Cammello, Grotta del Tuono, Bedingungen, Sicherheit und warum flexible Bootsrouten wichtig sind.",
    heroImage: marettimoHero,
    heroAlt: "Felsküste von Marettimo mit Meereshöhlen",
    intro:
      "Die Meereshöhlen sind einer der Hauptgründe, nach Marettimo zu kommen. Sie verlangen aber ruhige Bedingungen, lokale Erfahrung und eine Route, die Sicherheit vor Versprechen stellt.",
    quickAnswer:
      "Die Höhlen von Marettimo sind am besten mit dem Boot zu erleben, wenn Meer und Wind es erlauben. Nicht jede Höhle ist immer erreichbar; eine gute Crew entscheidet vor Ort.",
    primaryKeyword: "Meereshöhlen Marettimo",
    secondaryKeywords: ["Marettimo Bootstour", "Grotta del Cammello", "Ägadische Inseln", "Cala Bianca"],
    quickFacts: [
      { label: "Zugang", value: "vom Meer" },
      { label: "Wichtig", value: "ruhige See" },
      { label: "Plan", value: "flexibel" },
    ],
    itemListTitle: "Bekannte Höhlen und Bereiche",
    itemList: [
      { name: "Grotta del Cammello", description: "Eine der bekanntesten Höhlen der Insel." },
      { name: "Grotta del Tuono", description: "Spektakulär, aber abhängig von Bedingungen." },
      { name: "Küstenperimeter", description: "Der eigentliche Wert liegt in der gesamten Felsküste." },
    ],
    sections: [
      { id: "sicherheit", title: "Bei Höhlen zählt Sicherheit mehr als Namen", body: ["Höhlen sind keine starre Attraktion. Der Zugang hängt von Welle, Windrichtung und Komfort der Gäste ab.", "Eine seriöse Tour verspricht keine unmöglichen Stopps, sondern wählt die schönsten sicheren Bereiche des Tages."] },
      { id: "charter", title: "Warum Charter mehr Spielraum gibt", body: ["Mit mehreren Tagen kann Marettimo in das beste Wetterfenster gelegt werden. Das macht Höhlen und Cala Bianca realistischer und entspannter.", "Ein Tagesausflug kann funktionieren, sollte aber flexibel bleiben."], cta: "charter" },
    ],
    faqs: [
      { question: "Sind die Höhlen immer erreichbar?", answer: "Nein. Meer und Wind entscheiden." },
      { question: "Ist ein Charter besser?", answer: "Für Marettimo oft ja, weil er mehr Zeit und bessere Wetterfenster bietet." },
    ],
    relatedSlugs: ["was-man-in-marettimo-sehen-sollte", "cala-bianca", "bootstour-charter-aegadische-inseln"],
  }),
  marettimoGuide({
    slug: "straende-buchten-marettimo",
    title: "Strände und Buchten von Marettimo: Cala Bianca und stille Stopps",
    shortTitle: "Strände und Buchten",
    metaTitle: "Strände und Buchten von Marettimo: Cala Bianca und Bootszugang",
    metaDescription:
      "Die wichtigsten Buchten von Marettimo: Cala Bianca, Kiesbuchten, Bootszugang, Wetterbedingungen und Tipps für Charter oder private Tour.",
    heroImage: marettimoHero,
    heroAlt: "Klares Wasser und Felsküste auf Marettimo",
    intro:
      "Marettimo ist keine Insel langer Strände. Sie lebt von Kiesbuchten, Felswänden, Höhlen und Wasser, das bei guten Bedingungen unglaublich klar wirkt.",
    quickAnswer:
      "Cala Bianca ist die berühmteste Bucht, aber nicht immer die bequemste oder sicherste. Viele der schönsten Stopps hängen von Bootszugang, Wind und Meer ab.",
    primaryKeyword: "Strände Marettimo",
    secondaryKeywords: ["Buchten Marettimo", "Cala Bianca", "Marettimo Bootstour", "Ägadische Inseln"],
    quickFacts: [
      { label: "Top-Name", value: "Cala Bianca" },
      { label: "Typ", value: "Kies und Fels" },
      { label: "Zugang", value: "oft vom Boot" },
    ],
    itemListTitle: "Badebereiche",
    itemList: [
      { name: "Cala Bianca", description: "Die ikonische helle Bucht von Marettimo." },
      { name: "Scalo Maestro", description: "Bekannter Bereich mit stärkerem Inselgefühl." },
      { name: "Kleine Kiesbuchten", description: "Schön, aber abhängig von Meer und Zugang." },
    ],
    sections: [
      { id: "realistisch", title: "Marettimo verlangt realistische Badeplanung", body: ["Viele Bereiche sind nicht so einfach zugänglich wie auf Favignana. Genau deshalb ist die Perspektive vom Boot wichtig.", "Wer flexibel bleibt, erlebt meist den besseren Tag."] },
      { id: "cala-bianca", title: "Cala Bianca ist stark, aber keine Garantie", body: ["Cala Bianca ist ein Wunschziel, sollte aber nicht unabhängig vom Wetter versprochen werden.", "Bei passenden Bedingungen ist sie einer der schönsten Stopps des Archipels."], cta: "charter" },
    ],
    faqs: [
      { question: "Hat Marettimo Sandstrände?", answer: "Kaum. Die Insel ist eher felsig und von Kiesbuchten geprägt." },
      { question: "Ist Cala Bianca immer möglich?", answer: "Nein, sie hängt von Wetter, Meer und Route ab." },
    ],
    relatedSlugs: ["cala-bianca", "meereshoehlen", "bootstour-charter-aegadische-inseln"],
  }),
  marettimoGuide({
    slug: "cala-bianca",
    title: "Cala Bianca auf Marettimo: wann sie sich wirklich lohnt",
    shortTitle: "Cala Bianca",
    metaTitle: "Cala Bianca Marettimo: Bootstour, Bedingungen und Tipps",
    metaDescription:
      "Guide zu Cala Bianca auf Marettimo: warum sie berühmt ist, wann sie erreichbar ist und warum Charter oder flexible private Routen sinnvoll sind.",
    heroImage: marettimoHero,
    heroAlt: "Helle Küste und blaues Wasser bei Cala Bianca auf Marettimo",
    intro:
      "Cala Bianca ist einer der Namen, die man mit Marettimo verbindet. Sie ist schön, aber sie ist auch ein gutes Beispiel dafür, warum diese Insel flexible Routen braucht.",
    quickAnswer:
      "Cala Bianca lohnt sich bei ruhigem Meer und passender Route. Sie sollte nicht als immer garantierter Stopp verstanden werden; eine Crew entscheidet nach Sicherheit und Komfort.",
    primaryKeyword: "Cala Bianca Marettimo",
    secondaryKeywords: ["Marettimo Cala Bianca", "Bootstour Marettimo", "Charter Ägadische Inseln"],
    quickFacts: [
      { label: "Bekannt für", value: "helles Wasser" },
      { label: "Zugang", value: "vom Boot" },
      { label: "Bedingung", value: "ruhige See" },
    ],
    itemListTitle: "Wichtig zu wissen",
    itemList: [
      { name: "Kein starres Versprechen", description: "Die Route hängt vom Meer ab." },
      { name: "Starke Perspektive", description: "Vom Boot wirkt die Bucht am besten." },
      { name: "Mehr Zeit hilft", description: "Charter erhöht die Chance auf das passende Fenster." },
    ],
    sections: [
      { id: "bedingungen", title: "Warum Cala Bianca vom Wetter abhängt", body: ["Marettimo liegt weiter draußen. Wind, Welle und Rückweg müssen zusammenpassen.", "Das macht Cala Bianca nicht weniger schön, sondern erfordert eine ehrliche Planung."] },
      { id: "charter", title: "Mit Charter wird Cala Bianca realistischer", body: ["Bei mehreren Tagen kann die Crew die Route an das beste Wetterfenster anpassen. Dadurch wird Marettimo entspannter und weniger gehetzt.", "Für einen Tagesausflug gilt: möglich, aber nicht automatisch."], cta: "charter" },
    ],
    faqs: [
      { question: "Kann man in Cala Bianca baden?", answer: "Bei passenden Bedingungen ja." },
      { question: "Ist Cala Bianca bei jeder Tour garantiert?", answer: "Nein. Sicherheit und Seebedingungen haben Vorrang." },
    ],
    relatedSlugs: ["meereshoehlen", "straende-buchten-marettimo", "bootstour-charter-aegadische-inseln"],
  }),
  marettimoGuide({
    slug: "marettimo-an-einem-tag",
    title: "Marettimo an einem Tag: Boot, Wandern oder Dorf?",
    shortTitle: "Ein Tag",
    metaTitle: "Marettimo an einem Tag: Route, Höhlen und praktische Tipps",
    metaDescription:
      "Marettimo an einem Tag: realistische Planung zwischen Bootstour, Meereshöhlen, Cala Bianca, Wanderwegen und Dorfbesuch.",
    heroImage: marettimoHero,
    heroAlt: "Marettimo an einem Tagesausflug vom Meer aus",
    intro:
      "Ein Tag in Marettimo kann unvergesslich sein, wenn er nicht überladen wird. Die Insel ist weiter entfernt und verlangt mehr Planung als Favignana oder Levanzo.",
    quickAnswer:
      "Für einen Tag wählen Sie eine Hauptidee: Höhlen und Baden mit Boot, Wanderung Richtung Punta Troia oder ein leichter Besuch des Dorfes mit Meer in der Nähe. Versuchen Sie nicht, alles zu kombinieren.",
    primaryKeyword: "Marettimo an einem Tag",
    secondaryKeywords: ["Marettimo Tagesausflug", "Marettimo ab Trapani", "Höhlen Marettimo", "Cala Bianca"],
    quickFacts: [
      { label: "Regel", value: "eine Hauptidee" },
      { label: "Risiko", value: "zu viel planen" },
      { label: "Alternative", value: "Charter" },
    ],
    itemListTitle: "Drei sinnvolle Tagespläne",
    itemList: [
      { name: "Boot und Höhlen", description: "Für die maritime Seite der Insel." },
      { name: "Wandern", description: "Für Punta Troia, Case Romane und Panorama." },
      { name: "Dorf und nahes Meer", description: "Für einen ruhigeren, leichteren Tag." },
    ],
    sections: [
      { id: "plan", title: "Marettimo braucht einen klaren Fokus", body: ["Die Insel ist stärker und weiter entfernt. Ein voller Plan kann schnell anstrengend werden.", "Wählen Sie lieber eine gute Erfahrung als drei halbe."] },
      { id: "mehrtage", title: "Warum mehrere Tage besser sein können", body: ["Mit einem Charter können Sie Marettimo in ein passendes Wetterfenster legen und müssen nicht alles in einen Tag pressen.", "Das ist oft die komfortabelste Art, die Insel wirklich zu erleben."], cta: "charter" },
    ],
    faqs: [
      { question: "Ist Marettimo für einen Tagesausflug geeignet?", answer: "Ja, aber mit klarer Auswahl und Wetterpuffer." },
      { question: "Was ist die beste Tagesidee?", answer: "Für das erste Mal meist Boot und Küste, wenn die Seebedingungen passen." },
    ],
    relatedSlugs: ["was-man-in-marettimo-sehen-sollte", "meereshoehlen", "anreise-ab-trapani"],
  }),
  marettimoGuide({
    slug: "anreise-ab-trapani",
    title: "Von Trapani nach Marettimo: Anreise und sinnvolle Planung",
    shortTitle: "Anreise",
    metaTitle: "Von Trapani nach Marettimo: Fähre, Dauer und Charter-Optionen",
    metaDescription:
      "So planen Sie die Anreise von Trapani nach Marettimo: Linienverbindungen, Wetter, Puffer, Tagesausflug und wann ein Charter sinnvoller ist.",
    heroImage: marettimoHero,
    heroAlt: "Marettimo vom Meer aus bei der Anreise",
    intro:
      "Marettimo liegt weiter draußen als Favignana und Levanzo. Deshalb sind Anreise, Fahrpläne, Wetter und Rückweg wichtiger als bei den näheren Inseln.",
    quickAnswer:
      "Marettimo erreicht man von Trapani mit Linienverbindungen oder über eine geplante private Route/Charter. Prüfen Sie offizielle Fahrpläne und planen Sie mehr Puffer als bei den anderen Inseln.",
    primaryKeyword: "von Trapani nach Marettimo",
    secondaryKeywords: ["Marettimo Fähre", "Marettimo ab Trapani", "Charter Marettimo", "Ägadische Inseln"],
    quickFacts: [
      { label: "Start", value: "Trapani" },
      { label: "Wichtig", value: "Puffer" },
      { label: "Prüfen", value: "offizielle Fahrpläne" },
    ],
    itemListTitle: "Planungspunkte",
    itemList: [
      { name: "Fahrpläne", description: "Saisonal und wetterabhängig prüfen." },
      { name: "Rückfahrt", description: "Nicht zu knapp planen." },
      { name: "Charter", description: "Mehr Flexibilität und bessere Wetterfenster." },
    ],
    sections: [
      { id: "linie", title: "Linienverbindung: gut, aber mit Puffer", body: ["Nutzen Sie offizielle Quellen für aktuelle Zeiten und Verfügbarkeit. Alte Angaben aus Guides können falsch sein.", "Für einen Tagesausflug ist die Rückfahrt der kritische Punkt."] },
      { id: "charter", title: "Charter als entspanntere Alternative", body: ["Ein mehrtägiger Charter nimmt Druck aus der Anreise. Marettimo wird dann eine Etappe, nicht ein Rennen gegen die Uhr.", "Das passt besonders, wenn Höhlen und Cala Bianca wichtig sind."], cta: "charter" },
    ],
    faqs: [
      { question: "Ist Marettimo weiter entfernt?", answer: "Ja, deutlich weiter als Favignana und Levanzo." },
      { question: "Sollte man Fahrpläne prüfen?", answer: "Unbedingt, direkt bei offiziellen Anbietern." },
    ],
    relatedSlugs: ["marettimo-an-einem-tag", "bootstour-charter-aegadische-inseln", "was-man-in-marettimo-sehen-sollte"],
  }),
  marettimoGuide({
    slug: "wandern-routen",
    title: "Wandern auf Marettimo: Wege, Panorama und Vorbereitung",
    shortTitle: "Wandern",
    metaTitle: "Wandern auf Marettimo: Routen, Punta Troia und Monte Falcone",
    metaDescription:
      "Wandern auf Marettimo: Wege zu Punta Troia, Case Romane, Monte Falcone, Vorbereitung, Wasser, Hitze und Kombination mit Meer.",
    heroImage: marettimoHero,
    heroAlt: "Bergige Küste von Marettimo mit Wanderwegen",
    intro:
      "Marettimo ist die bergigste der Ägadischen Inseln. Wer nur an Buchten denkt, verpasst eine wichtige Seite der Insel: Wege, Ausblicke und eine deutlich wildere Landschaft.",
    quickAnswer:
      "Zum Wandern auf Marettimo eignen sich Routen Richtung Punta Troia, Case Romane und Monte Falcone. Planen Sie Wasser, Sonne, Schuhe und Zeit sorgfältig; im Sommer ist der frühe Start wichtig.",
    primaryKeyword: "Wandern Marettimo",
    secondaryKeywords: ["Marettimo Routen", "Punta Troia", "Monte Falcone", "Ägadische Inseln Wandern"],
    quickFacts: [
      { label: "Ausrüstung", value: "Schuhe und Wasser" },
      { label: "Beste Zeit", value: "früh starten" },
      { label: "Kombination", value: "Meer danach" },
    ],
    itemListTitle: "Routenideen",
    itemList: [
      { name: "Punta Troia", description: "Klassischer Weg mit Burg und Panorama." },
      { name: "Case Romane", description: "Geschichte und leichterer Einstieg." },
      { name: "Monte Falcone", description: "Anspruchsvoller, mit starken Ausblicken." },
    ],
    sections: [
      { id: "vorbereitung", title: "Marettimo-Wandern braucht Vorbereitung", body: ["Sonne, Steigung und Distanz werden leicht unterschätzt. Nehmen Sie Wasser, Kopfbedeckung und passende Schuhe mit.", "Bei Hitze sind frühe Stunden sinnvoller als der Mittag."] },
      { id: "meer", title: "Wandern und Meer kombinieren", body: ["Eine leichte Wanderung und ein späterer Badestopp können ein sehr guter Tagesplan sein.", "Wenn Sie auch Höhlen und Cala Bianca möchten, ist ein mehrtägiger Plan realistischer."], cta: "compare" },
    ],
    faqs: [
      { question: "Braucht man Wanderschuhe?", answer: "Für die längeren Wege sind feste Schuhe empfehlenswert." },
      { question: "Kann man Wandern und Bootstour kombinieren?", answer: "Ja, aber nicht zu viel an einem Tag. Besser mit klarer Priorität planen." },
    ],
    relatedSlugs: ["marettimo-an-einem-tag", "was-man-in-marettimo-sehen-sollte", "anreise-ab-trapani"],
  }),
  marettimoGuide({
    slug: "bootstour-charter-aegadische-inseln",
    title: "Bootstour Marettimo und Charter Ägadische Inseln: wann es sich lohnt",
    shortTitle: "Boot und Charter",
    metaTitle: "Bootstour Marettimo und Charter Ägadische Inseln",
    metaDescription:
      "Guide zu Bootstour und Charter für Marettimo: wann es sinnvoll ist, Unterschiede zu Favignana und Levanzo, Wetter, Höhlen, Cala Bianca und Trimaran-Route.",
    heroImage: charterImage,
    heroAlt: "Neel 47 Trimaran während eines Charters auf den Ägadischen Inseln",
    eyebrow: "Egadisailing-Erlebnisse",
    intro:
      "Marettimo ist die Insel, bei der eine ehrliche Planung am wichtigsten ist. Sie ist weit, kraftvoll und wunderschön, aber nicht immer passend für ein standardisiertes Tagesversprechen.",
    quickAnswer:
      "Eine Bootstour nach Marettimo lohnt sich, wenn Wetter, Dauer und Route eine sichere und angenehme Navigation erlauben. Ein Charter ist meist passender, wenn Sie Marettimo mit Höhlen, Cala Bianca und ruhigem Rhythmus wirklich einbauen möchten.",
    primaryKeyword: "Bootstour Marettimo",
    secondaryKeywords: ["Charter Marettimo", "Charter Ägadische Inseln", "Marettimo mit Boot", "Marettimo Höhlen"],
    quickFacts: [
      { label: "Beste Formel", value: "Charter" },
      { label: "Grund", value: "mehr Wetterspielraum" },
      { label: "Zu sehen", value: "Höhlen und Cala Bianca" },
      { label: "Versprechen", value: "nie automatisch" },
    ],
    itemListTitle: "Welche Erfahrung wählen",
    itemList: [
      { name: "Charter Ägadische Inseln", description: "Die stimmigste Wahl, um Marettimo in eine mehrtägige Route einzubauen." },
      { name: "Private Tour", description: "Fallweise mit Skipper, Wetter, Dauer und Gruppenerwartungen zu bewerten." },
      { name: "Alternative Route", description: "Wenn Marettimo nicht passt, bieten Favignana und Levanzo oft geschütztere Buchten." },
    ],
    sections: [
      { id: "charter", eyebrow: "Beste Wahl", title: "Warum Charter die natürlichste Formel ist", body: ["Marettimo braucht Distanz, Meer-Reading und Zeit. In einem mehrtägigen Charter kann sie eingeplant werden, wenn die Bedingungen günstig sind.", "Der Trimaran wird zur mobilen Basis: weniger Druck bei der Rückkehr, mehr Raum für Route und Wetter."], cta: "charter" },
      { id: "privat", eyebrow: "Zu bewerten", title: "Private Tagestour: möglich, aber nicht automatisch", body: ["Eine private Tagestour kann für Gruppen sinnvoll sein, die Flexibilität akzeptieren. Sie sollte aber nicht als immer garantiert verkauft werden.", "Die Crew muss Route und Ziel nach Wind, Meer, Sicherheit und Komfort bestätigen können."], cta: "private" },
    ],
    faqs: [
      { question: "Macht Egadisailing Tagestouren nach Marettimo?", answer: "Marettimo kann auf privater Route oder im Charter geprüft werden, ist aber keine immer garantierte Tagesetappe." },
      { question: "Warum Charter für Marettimo?", answer: "Weil mehr Tage mehr Wetterspielraum und einen ruhigeren Rhythmus geben." },
      { question: "Ist Marettimo im Charter immer enthalten?", answer: "Die Route wird mit der Crew vereinbart und nach Wetter aktualisiert. Marettimo ist eine wichtige Möglichkeit, aber wird nicht erzwungen." },
    ],
    relatedSlugs: ["meereshoehlen", "cala-bianca", "anreise-ab-trapani"],
  }),
];

export const marettimoGuideLinksDe = marettimoGuidesDe.map((guide) => ({
  slug: guide.slug,
  title: guide.shortTitle,
  description: guide.metaDescription,
}));
