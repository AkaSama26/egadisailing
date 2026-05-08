import type { MarettimoGuide, MarettimoGuideSlug } from "./marettimo-guides";

const marettimoHero = "/images/islands/marettimo/hero.webp";
const cavesImage = "/images/islands/marettimo/poi/grotte.webp";
const calaBiancaImage = "/images/islands/marettimo/poi/cala-bianca.webp";
const castleImage = "/images/islands/marettimo/poi/castello-punta-troia.webp";
const boatImage = "/images/experience-polaroids/charter-fondeo.webp";

type GuideInput = Omit<MarettimoGuide, "eyebrow"> & {
  eyebrow?: string;
};

function marettimoGuide(guide: GuideInput): MarettimoGuide {
  return {
    eyebrow: "Guide",
    ...guide,
  };
}

const commonFacts = [
  { label: "Départ", value: "Trapani" },
  { label: "Ambiance", value: "sauvage et lente" },
  { label: "Idéal", value: "bateau privé ou charter" },
];

export const marettimoGuidesFr: MarettimoGuide[] = [
  marettimoGuide({
    slug: "que-voir-a-marettimo",
    title: "Que voir à Marettimo : grottes, sentiers et criques",
    shortTitle: "Que voir",
    metaTitle: "Que voir à Marettimo : grottes marines, criques et charter",
    metaDescription:
      "Guide de Marettimo dans les îles Égades : grottes marines, Cala Bianca, Castello di Punta Troia, sentiers, baignade et excursion en bateau.",
    heroImage: marettimoHero,
    heroAlt: "Marettimo vue depuis la mer avec montagne et eau bleue",
    intro:
      "Marettimo est l'île la plus sauvage et montagneuse des Égades. Elle demande plus de temps que Favignana ou Levanzo, mais elle offre des grottes, des sentiers et une sensation de bout du monde.",
    quickAnswer:
      "À Marettimo, voyez les grottes marines, Cala Bianca, le village, le Castello di Punta Troia, les sentiers et les criques accessibles par mer. Pour bien en profiter, un tour privé ou un charter est souvent plus adapté qu'une visite rapide.",
    primaryKeyword: "que voir à Marettimo",
    secondaryKeywords: ["Marettimo que faire", "îles Égades", "grottes Marettimo", "charter Égades"],
    quickFacts: commonFacts,
    itemListTitle: "Les lieux essentiels",
    itemList: [
      { name: "Grottes marines", description: "Le grand classique de Marettimo, spectaculaire depuis la mer." },
      { name: "Cala Bianca", description: "Eau claire et falaise lumineuse, selon conditions de mer." },
      { name: "Castello di Punta Troia", description: "Vue forte sur la côte et l'histoire de l'île." },
      { name: "Village", description: "Petit, calme et parfait pour sentir le rythme local." },
    ],
    sections: [
      {
        id: "caractere",
        title: "Marettimo est plus sauvage, donc moins immédiate",
        body: [
          "L'île est plus éloignée et plus verticale. Elle se mérite davantage, mais c'est aussi ce qui lui donne son charme.",
          "Pour une première expérience, il faut accepter un rythme plus lent et une navigation plus dépendante de la mer.",
        ],
        cta: "charter",
      },
      {
        id: "mer",
        title: "Les grottes et criques sont le cœur de la visite",
        body: [
          "La côte de Marettimo se lit depuis l'eau : grottes, falaises, transparences et criques ponctuent la navigation.",
        ],
        cards: [
          { title: "Grottes marines", text: "Le paysage le plus iconique de l'île.", tag: "Bateau", image: cavesImage },
          { title: "Punta Troia", text: "Vue, histoire et relief.", tag: "Panorama", image: castleImage },
        ],
      },
    ],
    faqs: [
      { question: "Marettimo vaut-elle une excursion depuis Trapani ?", answer: "Oui, surtout si vous cherchez une île plus sauvage. Il faut prévoir assez de temps et de bonnes conditions de mer." },
      { question: "Faut-il choisir un charter ?", answer: "Pour Marettimo, le charter ou le privé donne plus de marge et de confort qu'un programme trop rapide." },
    ],
    relatedSlugs: ["grottes-marines", "cala-bianca", "excursion-bateau-charter-egades"],
  }),
  marettimoGuide({
    slug: "grottes-marines",
    title: "Grottes marines de Marettimo : les voir en bateau",
    shortTitle: "Grottes marines",
    metaTitle: "Grottes marines de Marettimo : excursion en bateau et conseils",
    metaDescription:
      "Les grottes marines de Marettimo : comment les voir en bateau, pourquoi la mer décide l'itinéraire et quelles conditions privilégier.",
    heroImage: cavesImage,
    heroAlt: "Grotte marine de Marettimo avec eau bleue",
    intro:
      "Les grottes marines sont l'image la plus forte de Marettimo. Elles demandent une navigation attentive, car l'accès dépend de la houle, du vent et de la sécurité.",
    quickAnswer:
      "Les grottes de Marettimo se visitent en bateau avec un skipper local. L'itinéraire exact change selon la mer : certaines grottes peuvent être accessibles un jour et évitées le lendemain.",
    primaryKeyword: "grottes marines Marettimo",
    secondaryKeywords: ["grotte Marettimo", "excursion bateau Marettimo", "îles Égades grottes", "tour privé Marettimo"],
    quickFacts: [
      { label: "Accès", value: "uniquement en bateau" },
      { label: "Condition", value: "mer calme" },
      { label: "Format", value: "privé ou charter" },
    ],
    itemListTitle: "À retenir",
    itemList: [
      { name: "Sécurité", description: "L'entrée dans les grottes dépend de la mer." },
      { name: "Lumière", description: "Les couleurs changent fortement selon l'heure." },
      { name: "Skipper", description: "L'expérience locale est essentielle." },
    ],
    sections: [
      {
        id: "conditions",
        title: "La mer décide l'accès",
        body: [
          "Une grotte n'est jamais une promesse automatique. Si la houle entre, le skipper adapte la route et privilégie une zone plus sûre.",
          "Cette flexibilité fait partie de l'expérience à Marettimo.",
        ],
        cta: "private",
      },
      {
        id: "experience",
        title: "Pourquoi les voir en petit format",
        body: [
          "Un bateau plus flexible permet de gerer l'approche, les pauses et les angles de vue avec plus de calme.",
        ],
      },
    ],
    faqs: [
      { question: "Peut-on entrer dans toutes les grottes ?", answer: "Non. Cela dépend de la mer et des décisions de sécurité du skipper." },
      { question: "Quel est le meilleur format ?", answer: "Un tour privé ou un charter donne plus de souplesse pour Marettimo." },
    ],
    relatedSlugs: ["que-voir-a-marettimo", "cala-bianca", "excursion-bateau-charter-egades"],
  }),
  marettimoGuide({
    slug: "plages-criques-marettimo",
    title: "Plages et criques de Marettimo : les plus belles haltes",
    shortTitle: "Plages et criques",
    metaTitle: "Plages et criques de Marettimo : Cala Bianca et baignade",
    metaDescription:
      "Les plus belles criques de Marettimo : Cala Bianca, Scalo Maestro, zones de baignade, accès par mer et conseils selon le vent.",
    heroImage: calaBiancaImage,
    heroAlt: "Cala Bianca à Marettimo avec mer cristalline",
    intro:
      "Marettimo n'est pas une destination de plages faciles. Ses criques sont souvent plus sauvages, plus rocheuses et plus dépendantes de la navigation.",
    quickAnswer:
      "Les criques les plus recherchées sont Cala Bianca, Scalo Maestro et plusieurs haltes accessibles par mer. Pour la baignade, le bateau est souvent l'option la plus confortable.",
    primaryKeyword: "plages Marettimo",
    secondaryKeywords: ["criques Marettimo", "Cala Bianca", "baignade Marettimo", "tour en bateau Marettimo"],
    quickFacts: [
      { label: "Type", value: "criques rocheuses" },
      { label: "Incontournable", value: "Cala Bianca" },
      { label: "Accès", value: "souvent par mer" },
    ],
    itemListTitle: "Haltes à connaitre",
    itemList: [
      { name: "Cala Bianca", description: "La plus célèbre pour la couleur de l'eau." },
      { name: "Scalo Maestro", description: "Secteur utile selon vent et itinéraire." },
      { name: "Criques secondaires", description: "À choisir en fonction de la mer du jour." },
    ],
    sections: [
      {
        id: "choisir",
        title: "Ici, la meilleure crique est celle qui est protégée",
        body: [
          "La carte ne suffit pas. À Marettimo, l'exposition et la houle comptent beaucoup, surtout pour les arrêts de baignade.",
          "Un itinéraire flexible permet de profiter de l'île sans forcer un stop inconfortable.",
        ],
        cta: "private",
      },
      {
        id: "cala-bianca",
        title: "Cala Bianca reste la référence",
        body: [
          "Cala Bianca est souvent citée pour ses couleurs et son décor, mais elle doit être abordée avec les bonnes conditions de mer.",
        ],
      },
    ],
    faqs: [
      { question: "Marettimo a-t-elle des plages de sable ?", answer: "Très peu. On parle surtout de criques rocheuses et de baignades depuis le bateau." },
      { question: "Peut-on rejoindre Cala Bianca à pied ?", answer: "L'accès terrestre est plus exigeant ; par mer, l'expérience est généralement plus simple." },
    ],
    relatedSlugs: ["cala-bianca", "grottes-marines", "excursion-bateau-charter-egades"],
  }),
  marettimoGuide({
    slug: "cala-bianca",
    title: "Cala Bianca à Marettimo : couleurs, mer et accès",
    shortTitle: "Cala Bianca",
    metaTitle: "Cala Bianca Marettimo : baignade, accès et excursion en bateau",
    metaDescription:
      "Guide de Cala Bianca à Marettimo : pourquoi elle est célèbre, quand y aller, comment l'atteindre et pourquoi le bateau est conseillé.",
    heroImage: calaBiancaImage,
    heroAlt: "Cala Bianca à Marettimo avec eau transparente et roche claire",
    intro:
      "Cala Bianca est l'une des images les plus recherchées de Marettimo. Elle concentre ce que l'île a de plus lumineux : roche claire, eau transparente et relief sauvage.",
    quickAnswer:
      "Cala Bianca vaut le détour si la mer est favorable. L'accès par bateau est le plus naturel, tandis que l'accès terrestre peut être long et exigeant.",
    primaryKeyword: "Cala Bianca Marettimo",
    secondaryKeywords: ["Cala Bianca bateau", "baignade Marettimo", "crique Marettimo", "îles Égades"],
    quickFacts: [
      { label: "Atout", value: "eau claire" },
      { label: "Accès", value: "recommandé par mer" },
      { label: "Attention", value: "conditions marines" },
    ],
    itemListTitle: "Conseils pratiques",
    itemList: [
      { name: "Mer calme", description: "Condition indispensable pour en profiter vraiment." },
      { name: "Bateau", description: "Option la plus confortable et la plus scénographique." },
      { name: "Temps", description: "Prévoir une journée avec de la marge." },
    ],
    sections: [
      {
        id: "paysage",
        title: "Une crique à voir sans précipitation",
        body: [
          "Cala Bianca donne le meilleur d'elle-même quand la lumière et la mer sont favorables. L'expérience ne doit pas être réduite à une photo rapide.",
          "Sur un charter, elle peut devenir une vraie halte de baignade, pas seulement un passage.",
        ],
        cta: "charter",
      },
      {
        id: "conditions",
        title: "Ne pas forcer l'arrêt si la mer change",
        body: [
          "À Marettimo, l'itinéraire doit rester intelligent. Si Cala Bianca n'est pas confortable, il existe d'autres zones plus adaptées.",
        ],
      },
    ],
    faqs: [
      { question: "Cala Bianca est-elle la plus belle crique de Marettimo ?", answer: "C'est la plus célèbre, surtout pour les couleurs. La meilleure halte dépend toutefois de la mer." },
      { question: "Peut-on s'y baigner ?", answer: "Oui avec conditions favorables et en respectant les consignes de sécurité." },
    ],
    relatedSlugs: ["plages-criques-marettimo", "grottes-marines", "que-voir-a-marettimo"],
  }),
  marettimoGuide({
    slug: "marettimo-en-une-journee",
    title: "Marettimo en une journée : est-ce une bonne idee ?",
    shortTitle: "En une journée",
    metaTitle: "Marettimo en une journée depuis Trapani : bateau, grottes, timing",
    metaDescription:
      "Visiter Marettimo en une journée depuis Trapani : temps de trajet, grottes marines, Cala Bianca, bateau privé et alternatives en charter.",
    heroImage: marettimoHero,
    heroAlt: "Marettimo vue en navigation pendant une journée aux îles Égades",
    intro:
      "Marettimo en une journée est possible, mais ce n'est pas l'île la plus simple pour une visite rapide. Distance, mer et relief demandent une organisation plus confortable.",
    quickAnswer:
      "Marettimo en une journée convient surtout avec un tour privé bien organisé et de bonnes conditions de mer. Pour une expérience plus détendue, un charter de plusieurs jours dans les Égades est souvent meilleur.",
    primaryKeyword: "Marettimo en une journée",
    secondaryKeywords: ["Marettimo depuis Trapani", "excursion Marettimo", "charter Marettimo", "grottes Marettimo"],
    quickFacts: [
      { label: "Possible", value: "oui, avec marge" },
      { label: "Idéal", value: "privé ou charter" },
      { label: "Priorite", value: "grottes et baignade" },
    ],
    itemListTitle: "Programme realiste",
    itemList: [
      { name: "Navigation", description: "Prévoir plus de temps que pour Favignana." },
      { name: "Grottes", description: "À voir seulement avec mer favorable." },
      { name: "Baignade", description: "Une ou deux haltes bien choisies suffisent." },
    ],
    sections: [
      {
        id: "realiste",
        title: "Une seule journée doit rester selective",
        body: [
          "Il vaut mieux choisir entre grottes, baignade et balade au village plutot que tout vouloir faire.",
          "La météo doit être prise au sérieux : elle influence davantage Marettimo que les îles plus proches.",
        ],
        cta: "private",
      },
      {
        id: "charter",
        title: "Pour profiter vraiment, pensez à plusieurs jours",
        body: [
          "Un charter permet d'intégrer Marettimo sans pression, avec nuits à bord et itinéraire plus souple autour des Égades.",
        ],
        cta: "charter",
      },
    ],
    faqs: [
      { question: "Marettimo est-elle trop loin pour une journée ?", answer: "Pas forcement, mais elle demande plus de temps et de bonnes conditions." },
      { question: "Quel format choisir ?", answer: "Un tour privé ou un charter donne la meilleure marge pour adapter l'itinéraire." },
    ],
    relatedSlugs: ["que-voir-a-marettimo", "excursion-bateau-charter-egades", "grottes-marines"],
  }),
  marettimoGuide({
    slug: "comment-venir-depuis-trapani",
    title: "Comment venir à Marettimo depuis Trapani",
    shortTitle: "Venir depuis Trapani",
    metaTitle: "Comment aller à Marettimo depuis Trapani : ferry, bateau, charter",
    metaDescription:
      "Comment rejoindre Marettimo depuis Trapani : ferry, hydroglisseur, temps de trajet, excursion en bateau privé et charter dans les îles Égades.",
    heroImage: marettimoHero,
    heroAlt: "Navigation vers Marettimo depuis Trapani",
    intro:
      "Marettimo est plus éloignée que Favignana et Levanzo. Le choix du transport compte donc beaucoup dans le confort et le rythme de la journée.",
    quickAnswer:
      "On rejoint Marettimo depuis Trapani par ligne maritime selon les horaires, ou avec une expérience privée/charter. Pour voir grottes et criques, le bateau organisé donne plus de flexibilité.",
    primaryKeyword: "comment aller à Marettimo depuis Trapani",
    secondaryKeywords: ["ferry Trapani Marettimo", "Marettimo depuis Trapani", "charter Égades", "tour en bateau Marettimo"],
    quickFacts: [
      { label: "Départ", value: "Trapani" },
      { label: "Distance", value: "plus éloignée" },
      { label: "Format", value: "ligne ou charter" },
    ],
    itemListTitle: "Options",
    itemList: [
      { name: "Ligne régulière", description: "Pour rejoindre le village et organiser librement." },
      { name: "Tour privé", description: "Pour grottes et criques avec plus de controle." },
      { name: "Charter", description: "Pour intégrer Marettimo dans plusieurs jours aux Égades." },
    ],
    sections: [
      {
        id: "choisir",
        title: "Le transport doit correspondre à votre objectif",
        body: [
          "Si vous voulez surtout marcher ou dormir sur l'île, la ligne régulière peut suffire. Si vous voulez explorer les grottes, le bateau organisé est plus adapté.",
          "Le charter donne la meilleure liberte quand Marettimo devient une étape d'un itinéraire plus large.",
        ],
        cta: "charter",
      },
      {
        id: "meteo",
        title: "Verifier la mer avant de fixer le programme",
        body: [
          "Les distances et l'exposition rendent Marettimo plus sensible aux conditions. Il faut garder de la souplesse.",
        ],
      },
    ],
    faqs: [
      { question: "Peut-on aller à Marettimo en ferry ?", answer: "Oui, selon les horaires des lignes maritimes depuis Trapani." },
      { question: "Le charter est-il utile ?", answer: "Oui si vous voulez vivre Marettimo sans pression et avec un itinéraire flexible." },
    ],
    relatedSlugs: ["marettimo-en-une-journee", "excursion-bateau-charter-egades", "que-voir-a-marettimo"],
  }),
  marettimoGuide({
    slug: "randonnee-sentiers",
    title: "Randonnee à Marettimo : sentiers, vues et conseils",
    shortTitle: "Randonnee",
    metaTitle: "Randonnee à Marettimo : sentiers, Punta Troia et vues mer",
    metaDescription:
      "Guide randonnée à Marettimo : sentiers, Castello di Punta Troia, vues sur la mer, chaleur, eau et comment combiner marche et bateau.",
    heroImage: castleImage,
    heroAlt: "Sentier et Castello di Punta Troia à Marettimo",
    intro:
      "Marettimo est l'île des Égades qui se prete le mieux à la marche. Ses sentiers donnent une autre lecture de la mer, entre relief, maquis et vues ouvertes.",
    quickAnswer:
      "Pour randonner à Marettimo, partez tôt, emportez de l'eau, évitez les heures chaudes et choisissez un sentier adapté. Le Castello di Punta Troia est l'une des références les plus connues.",
    primaryKeyword: "randonnée Marettimo",
    secondaryKeywords: ["sentiers Marettimo", "Punta Troia Marettimo", "trekking Égades", "Marettimo à pied"],
    quickFacts: [
      { label: "Meilleur moment", value: "matin" },
      { label: "À prévoir", value: "eau et chaussures" },
      { label: "Reference", value: "Punta Troia" },
    ],
    itemListTitle: "Conseils essentiels",
    itemList: [
      { name: "Chaleur", description: "Eviter les heures centrales en ete." },
      { name: "Chaussures", description: "Prévoir une vraie semelle." },
      { name: "Temps", description: "Ne pas serrer le retour bateau." },
    ],
    sections: [
      {
        id: "rythme",
        title: "La marche demande un programme plus lent",
        body: [
          "Associer randonnée et baignade est possible, mais il faut réduire les ambitions. Marettimo n'est pas l'île à parcourir au pas de course.",
          "Un séjour ou un charter donne plus de flexibilité qu'une simple excursion rapide.",
        ],
      },
      {
        id: "mer",
        title: "Combiner sentiers et mer",
        body: [
          "Le contraste entre sentiers et grottes marines est ce qui rend Marettimo unique. Une journée bien pensee garde un temps pour les deux, sans surcharge.",
        ],
        cta: "charter",
      },
    ],
    faqs: [
      { question: "Marettimo est-elle adaptée à la randonnée ?", answer: "Oui, c'est même l'une des meilleures îles des Égades pour marcher." },
      { question: "Peut-on randonner en sandales ?", answer: "Ce n'est pas conseillé. Les sentiers demandent de bonnes chaussures." },
    ],
    relatedSlugs: ["que-voir-a-marettimo", "marettimo-en-une-journee", "comment-venir-depuis-trapani"],
  }),
  marettimoGuide({
    slug: "excursion-bateau-charter-egades",
    title: "Excursion en bateau et charter à Marettimo et aux Égades",
    shortTitle: "Bateau et charter",
    metaTitle: "Excursion en bateau Marettimo et charter aux îles Égades",
    metaDescription:
      "Choisir une excursion en bateau ou un charter à Marettimo : grottes marines, Cala Bianca, tour privé, nuits à bord et itinéraire aux îles Égades.",
    heroImage: boatImage,
    heroAlt: "Charter aux îles Égades avec mouillage calme pres de Marettimo",
    eyebrow: "Bateau et charter",
    intro:
      "Marettimo est l'île qui justifie le plus un format privé ou charter. La distance, les grottes et la météo demandent de la marge, pas un programme trop rigide.",
    quickAnswer:
      "Pour Marettimo, choisissez une excursion privée si vous avez une journée et de bonnes conditions, ou un charter aux îles Égades si vous voulez intégrer l'île dans un itinéraire plus lent avec nuits à bord.",
    primaryKeyword: "charter îles Égades Marettimo",
    secondaryKeywords: ["excursion bateau Marettimo", "tour privé Marettimo", "grottes Marettimo bateau", "charter Égades"],
    quickFacts: [
      { label: "Meilleur format", value: "privé ou charter" },
      { label: "Points forts", value: "grottes et Cala Bianca" },
      { label: "Rythme", value: "flexible" },
    ],
    itemListTitle: "Formats à comparer",
    itemList: [
      { name: "Tour privé journée", description: "Pour voir grottes et baignades avec un rythme ajuste." },
      { name: "Charter 3-7 jours", description: "Pour vivre Marettimo comme une étape des Égades." },
      { name: "Neel 47", description: "Pour plus de confort, d'espace et de stabilite." },
    ],
    sections: [
      {
        id: "charter",
        title: "Pourquoi Marettimo aime les programmes souples",
        body: [
          "La mer décide beaucoup : ordre des grottes, pauses de baignade, temps de navigation. Un charter absorbe mieux ces variables.",
          "Le Neel 47 apporte espace, confort et une sensation plus premium pour les groupes qui veulent vivre la mer lentement.",
        ],
        cta: "charter",
      },
      {
        id: "journee",
        title: "Une excursion privée reste possible",
        body: [
          "Avec une bonne fenêtre météo, une journée privée peut fonctionner. Elle doit toutefois rester selective : quelques grottes, une belle baignade et un retour sans pression.",
        ],
        cta: "private",
      },
    ],
    faqs: [
      { question: "Marettimo est-elle incluse dans les tours partages ?", answer: "Pas toujours. Pour Marettimo, un privé ou un charter est souvent plus coherent." },
      { question: "Combien de jours pour un charter aux Égades ?", answer: "Trois à sept jours permettent de combiner Favignana, Levanzo, Marettimo et des mouillages plus calmes." },
    ],
    relatedSlugs: ["marettimo-en-une-journee", "grottes-marines", "cala-bianca"],
  }),
];

export function isMarettimoGuideFrSlug(slug: string): slug is MarettimoGuideSlug {
  return marettimoGuidesFr.some((guide) => guide.slug === slug);
}

export const marettimoGuideLinksFr: Array<{
  slug: MarettimoGuideSlug;
  title: string;
  description: string;
}> = marettimoGuidesFr.map((guide) => ({
  slug: guide.slug,
  title: guide.shortTitle,
  description: guide.quickAnswer,
}));
