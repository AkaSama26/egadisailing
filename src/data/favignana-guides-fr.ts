import type { FavignanaGuide, FavignanaGuideSlug } from "./favignana-guides";

const favignanaHero = "/images/islands/favignana/hero.webp";
const calaRossaImage = "/images/islands/favignana/poi/cala-rossa.webp";
const bueMarinoImage = "/images/islands/favignana/poi/bue-marino.webp";
const calaAzzurraImage = "/images/islands/favignana/poi/cala-azzurra.webp";
const tonnaraImage = "/images/islands/favignana/poi/tonnara.webp";
const boatImage = "/images/experience-polaroids/barca-8-ore-snorkeling.webp";

type GuideInput = Omit<FavignanaGuide, "eyebrow"> & {
  eyebrow?: string;
};

function favignanaGuide(guide: GuideInput): FavignanaGuide {
  return {
    eyebrow: "Guide",
    ...guide,
  };
}

const commonFacts = [
  { label: "Départ", value: "Trapani" },
  { label: "Idéal", value: "baignade et criques" },
  { label: "Zone", value: "îles Égades" },
];

export const favignanaGuidesFr: FavignanaGuide[] = [
  favignanaGuide({
    slug: "que-voir-a-favignana",
    title: "Que voir à Favignana : 10 lieux incontournables",
    shortTitle: "Que voir",
    metaTitle: "Que voir à Favignana : criques, plages et excursion en bateau",
    metaDescription:
      "Guide pour savoir que voir à Favignana : Cala Rossa, Bue Marino, Cala Azzurra, la tonnara Florio, les carrières de tuf et les excursions en bateau depuis Trapani.",
    heroImage: favignanaHero,
    heroAlt: "Favignana vue depuis la mer avec eau turquoise et côte rocheuse",
    intro:
      "Favignana est l'île la plus connue des Égades, mais elle ne se résume pas à une liste de plages. On y lit l'histoire des tonnare, les carrières de tuf, les criques claires et une côte qui change beaucoup selon le vent.",
    quickAnswer:
      "Les lieux essentiels à voir à Favignana sont Cala Rossa, Bue Marino, Cala Azzurra, Lido Burrone, l'ancien établissement Florio, Palazzo Florio, le château de Santa Caterina, Scalo Cavallo, Grotta Perciata et Punta Sottile. Avec peu de temps, une excursion en bateau depuis Trapani permet de voir davantage de côte sans perdre la journée dans les trajets.",
    primaryKeyword: "que voir à Favignana",
    secondaryKeywords: ["Favignana que faire", "îles Égades", "excursion en bateau Favignana", "Favignana depuis Trapani"],
    quickFacts: commonFacts,
    itemListTitle: "Les 10 lieux principaux",
    itemList: [
      { name: "Cala Rossa", description: "La crique emblématique de Favignana, avec roche claire et eau turquoise." },
      { name: "Bue Marino", description: "Un paysage minéral de carrières de tuf, superbe depuis la mer." },
      { name: "Cala Azzurra", description: "Une cala lumineuse, plus douce pour une baignade tranquille." },
      { name: "Tonnara Florio", description: "Le lieu-clé pour comprendre l'histoire maritime de l'île." },
      { name: "Punta Sottile", description: "Le côté des couchers de soleil et des vues plus ouvertes." },
    ],
    sections: [
      {
        id: "cote",
        eyebrow: "Mer et criques",
        title: "Cala Rossa, Bue Marino et Cala Azzurra n'ont pas le même caractère",
        body: [
          "Cala Rossa est photogénique, Bue Marino est plus rocheux et spectaculaire, Cala Azzurra est souvent plus simple pour entrer dans l'eau. Le meilleur choix dépend toujours de la mer du jour.",
          "Depuis un bateau, on peut lire Favignana comme une succession de façades : falaises claires, anciens fronts de taille, baies basses et zones plus ouvertes au vent.",
        ],
        bullets: ["Cala Rossa pour le paysage.", "Bue Marino pour les carrières de tuf.", "Cala Azzurra pour une baignade plus facile."],
        cta: "cigala",
      },
      {
        id: "histoire",
        eyebrow: "Culture",
        title: "La tonnara Florio donne de la profondeur à la visite",
        body: [
          "L'ancien établissement Florio raconte la pêche au thon, le travail maritime et l'importance de la famille Florio. C'est une pause utile entre deux baignades.",
          "Pour une première visite, l'équilibre idéal est simple : un peu de village, un peu d'histoire et une vraie lecture de la côte depuis la mer.",
        ],
        cards: [
          { title: "Tonnara Florio", text: "Mémoire maritime de Favignana.", tag: "Histoire", image: tonnaraImage },
          { title: "Côte en bateau", text: "Le relief se comprend mieux depuis l'eau.", tag: "Mer", image: boatImage },
        ],
        cta: "compare",
      },
    ],
    faqs: [
      { question: "Quel est le plus bel endroit de Favignana ?", answer: "Cala Rossa est le lieu le plus célèbre, mais Bue Marino, Cala Azzurra et la tonnara Florio rendent la visite plus complète." },
      { question: "Peut-on visiter Favignana en une journée ?", answer: "Oui. Il faut choisir peu d'étapes ou prendre une excursion en bateau pour voir plus de côte sans stress." },
    ],
    relatedSlugs: ["plus-belles-plages-criques-favignana", "favignana-en-une-journee", "excursion-bateau-favignana-levanzo"],
  }),
  favignanaGuide({
    slug: "plus-belles-plages-criques-favignana",
    title: "Les plus belles plages et criques de Favignana",
    shortTitle: "Plages et criques",
    metaTitle: "Plus belles plages et criques de Favignana : où se baigner",
    metaDescription:
      "Les plus belles plages et criques de Favignana : Cala Rossa, Cala Azzurra, Lido Burrone, Bue Marino, Grotta Perciata et conseils selon le vent.",
    heroImage: calaAzzurraImage,
    heroAlt: "Cala Azzurra à Favignana avec eau claire et fond lumineux",
    intro:
      "Les plages de Favignana alternent entre sable pratique, roches calcaires et criques très scénographiques. Certaines sont faciles à pied, d'autres se révèlent vraiment depuis la mer.",
    quickAnswer:
      "Pour une baignade simple, choisissez Cala Azzurra, Lido Burrone ou Marasolo. Pour le paysage, Cala Rossa, Bue Marino, Scalo Cavallo et Grotta Perciata sont les plus marquants. Le vent reste le critere principal.",
    primaryKeyword: "plages Favignana",
    secondaryKeywords: ["criques Favignana", "Cala Rossa Favignana", "baignade Favignana", "snorkeling Favignana"],
    quickFacts: [
      { label: "Baignade facile", value: "Cala Azzurra" },
      { label: "Paysage", value: "Cala Rossa" },
      { label: "Conseil", value: "suivre le vent" },
    ],
    itemListTitle: "Zones de baignade conseillées",
    itemList: [
      { name: "Cala Azzurra", description: "Eau claire, ambiance douce et accès plus simple." },
      { name: "Lido Burrone", description: "Plage de sable pratique avec services." },
      { name: "Cala Rossa", description: "Roche claire, couleurs intenses et vues très fortes." },
      { name: "Bue Marino", description: "Rochers, fond plus profond et décor de carrières." },
    ],
    sections: [
      {
        id: "choisir",
        title: "Choisir une plage selon le type de journée",
        body: [
          "Pour une journée détendue avec entrée facile dans l'eau, les plages de sable sont les plus pratiques. Pour une expérience plus visuelle, les criques rocheuses donnent l'image la plus forte de Favignana.",
          "En haute saison, arriver par la mer aide à éviter les accès les plus charges et à trouver une zone plus confortable pour se baigner.",
        ],
        cta: "cigala",
      },
      {
        id: "vent",
        title: "Le vent décide plus que la carte",
        body: [
          "Favignana à plusieurs expositions. Une crique parfaite par vent faible peut devenir moins agreable si la houle entre du mauvais côte.",
          "Un skipper local adapte l'itinéraire en temps réel, surtout pour une excursion en bateau Favignana et Levanzo depuis Trapani.",
        ],
      },
    ],
    faqs: [
      { question: "Quelle plage choisir avec des enfants ?", answer: "Cala Azzurra et Lido Burrone sont souvent les plus simples pour l'accès et la baignade." },
      { question: "Cala Rossa est-elle facile d'accès ?", answer: "Elle demande un accès rocheux. Elle est souvent plus confortable et plus belle vue depuis la mer." },
    ],
    relatedSlugs: ["cala-rossa", "bue-marino-carrieres-tuf", "snorkeling-a-favignana"],
  }),
  favignanaGuide({
    slug: "favignana-en-une-journee",
    title: "Favignana en une journée : itinéraire simple depuis Trapani",
    shortTitle: "En une journée",
    metaTitle: "Favignana en une journée depuis Trapani : itinéraire et bateau",
    metaDescription:
      "Comment visiter Favignana en une journée depuis Trapani : quoi voir, quelles criques choisir, quand prendre le bateau et comment éviter de courir.",
    heroImage: favignanaHero,
    heroAlt: "Côte de Favignana pendant une excursion en bateau",
    intro:
      "Une journée à Favignana suffit pour une première rencontre, à condition de ne pas vouloir tout cocher. Le bon rythme dépend de votre priorité : village, baignade, snorkeling ou côte vue depuis la mer.",
    quickAnswer:
      "Pour voir Favignana en une journée, partez tôt de Trapani, choisissez deux ou trois haltes maximum et gardez une marge pour le retour. Une excursion en bateau permet de combiner Favignana et Levanzo avec moins de transferts internes.",
    primaryKeyword: "Favignana en une journée",
    secondaryKeywords: ["Favignana depuis Trapani", "excursion Favignana Levanzo", "itinéraire Favignana", "tour en bateau Favignana"],
    quickFacts: commonFacts,
    itemListTitle: "Programme conseillé",
    itemList: [
      { name: "Matin", description: "Départ de Trapani et première baignade sur une côte protégée." },
      { name: "Midi", description: "Pause simple ou déjeuner selon le format choisi." },
      { name: "Apres-midi", description: "Deuxieme côte de l'île ou passage vers Levanzo." },
    ],
    sections: [
      {
        id: "rythme",
        title: "Ne transformez pas la journée en course",
        body: [
          "La tentation est forte de passer d'une cala à l'autre, mais les trajets internes prennent vite de la place. Mieux vaut privilégier des haltes bien choisies.",
          "En bateau, le temps se concentre davantage sur la mer, la baignade et les criques au lieu des navettes et des parkings.",
        ],
        cta: "compare",
      },
      {
        id: "option",
        title: "Favignana seule ou Favignana et Levanzo ?",
        body: [
          "Si vous cherchez une journée très complète en mer, l'association Favignana et Levanzo fonctionne très bien. Levanzo ajoute une côte plus intime et des eaux souvent calmes.",
        ],
      },
    ],
    faqs: [
      { question: "Faut-il dormir à Favignana ?", answer: "Ce n'est pas indispensable pour une première visite, mais une nuit permet de profiter du soir et de réduire le rythme." },
      { question: "Le bateau est-il preferable pour une journée ?", answer: "Oui si votre priorité est la mer : il reduit les transferts et permet d'adapter la route au vent." },
    ],
    relatedSlugs: ["que-voir-a-favignana", "excursion-bateau-favignana-levanzo", "comment-venir-depuis-trapani-et-se-deplacer"],
  }),
  favignanaGuide({
    slug: "cala-rossa",
    title: "Cala Rossa à Favignana : pourquoi elle est si célèbre",
    shortTitle: "Cala Rossa",
    metaTitle: "Cala Rossa Favignana : accès, baignade et excursion en bateau",
    metaDescription:
      "Guide de Cala Rossa à Favignana : couleurs, accès, meilleur moment, baignade, snorkeling et pourquoi la voir depuis la mer.",
    heroImage: calaRossaImage,
    heroAlt: "Cala Rossa à Favignana avec eau turquoise et roche claire",
    intro:
      "Cala Rossa est l'image carte postale de Favignana. Sa force vient du contraste entre eau turquoise, calcaire clair et traces de carrières qui sculptent le bord de mer.",
    quickAnswer:
      "Cala Rossa est magnifique mais rocheuse. L'accès par terre demande de bonnes chaussures et la baignade dépend de la mer. Depuis un bateau, on profite mieux des couleurs et on peut choisir le bon moment pour s'arrêter.",
    primaryKeyword: "Cala Rossa Favignana",
    secondaryKeywords: ["Cala Rossa bateau", "crique Favignana", "baignade Cala Rossa", "îles Égades"],
    quickFacts: [
      { label: "Type", value: "crique rocheuse" },
      { label: "Atout", value: "couleurs turquoise" },
      { label: "Accès", value: "plus simple par mer" },
    ],
    itemListTitle: "À savoir",
    itemList: [
      { name: "Roche", description: "Prévoir des chaussures adaptées si vous arrivez à pied." },
      { name: "Affluence", description: "Tres frequentee en ete, surtout aux heures centrales." },
      { name: "Mer", description: "La baignade dépend de l'exposition et du vent." },
    ],
    sections: [
      {
        id: "couleurs",
        title: "Les couleurs changent avec la lumière",
        body: [
          "Cala Rossa n'est pas seulement une plage : c'est un paysage. La roche claire amplifie la couleur de l'eau et donne à la baie son aspect presque irréel.",
          "Le meilleur moment dépend de la lumière, mais aussi de la mer. Une halte courte et bien placee vaut mieux qu'un arrêt force au mauvais moment.",
        ],
        cta: "cigala",
      },
      {
        id: "bateau",
        title: "Pourquoi la voir depuis la mer",
        body: [
          "Depuis le bateau, on comprend mieux la forme de la crique et l'ancien travail de la pierre. C'est aussi une maniere plus confortable d'en profiter lorsqu'il y à du monde à terre.",
        ],
      },
    ],
    faqs: [
      { question: "Peut-on se baigner à Cala Rossa ?", answer: "Oui, si la mer le permet. Le fond et l'accès sont rocheux, donc il faut rester prudent." },
      { question: "Cala Rossa vaut-elle le détour ?", answer: "Oui, c'est l'un des paysages les plus connus des îles Égades, surtout vu depuis la mer." },
    ],
    relatedSlugs: ["plus-belles-plages-criques-favignana", "bue-marino-carrieres-tuf", "excursion-bateau-favignana-levanzo"],
  }),
  favignanaGuide({
    slug: "bue-marino-carrieres-tuf",
    title: "Bue Marino et les carrières de tuf de Favignana",
    shortTitle: "Bue Marino",
    metaTitle: "Bue Marino Favignana : carrières de tuf, baignade et snorkeling",
    metaDescription:
      "Bue Marino à Favignana : paysage de carrières de tuf, mer profonde, accès, snorkeling et conseils pour le voir en bateau.",
    heroImage: bueMarinoImage,
    heroAlt: "Bue Marino à Favignana avec carrières de tuf et mer bleue",
    intro:
      "Bue Marino est l'un des paysages les plus puissants de Favignana. Les carrières de tuf dessinent une côte anguleuse, presque architecturale, avec une mer plus profonde que dans les criques sableuses.",
    quickAnswer:
      "Bue Marino se visite pour le paysage autant que pour la baignade. L'accès peut être moins simple que sur une plage classique ; en bateau, la lecture des carrières et des fonds est plus naturelle.",
    primaryKeyword: "Bue Marino Favignana",
    secondaryKeywords: ["carrières de tuf Favignana", "snorkeling Bue Marino", "côte Favignana", "excursion en bateau"],
    quickFacts: [
      { label: "Type", value: "côte rocheuse" },
      { label: "Intérêt", value: "carrières de tuf" },
      { label: "Baignade", value: "selon mer" },
    ],
    itemListTitle: "Pourquoi y aller",
    itemList: [
      { name: "Carrières", description: "Un paysage minéral unique sur l'île." },
      { name: "Couleurs", description: "Contraste fort entre pierre claire et bleu profond." },
      { name: "Snorkeling", description: "Interressant lorsque la mer est calme et claire." },
    ],
    sections: [
      {
        id: "paysage",
        title: "Une côte facon sculpture",
        body: [
          "Les anciennes carrières ne sont pas un décor secondaire : elles expliquent la forme de Bue Marino. Les coupes dans la pierre créent des lignes nettes et des ombres très reconnaissables.",
          "Ce secteur est moins 'plage' et plus paysage. Il convient bien à ceux qui veulent voir une Favignana plus brute.",
        ],
        cta: "cigala",
      },
      {
        id: "conditions",
        title: "Baignade et snorkeling seulement avec les bonnes conditions",
        body: [
          "La profondeur et la roche demandent plus d'attention. Quand la mer est calme, les fonds sont beaux ; quand elle bouge, il vaut mieux choisir une autre cala.",
        ],
      },
    ],
    faqs: [
      { question: "Bue Marino est-il une plage ?", answer: "Pas vraiment. C'est surtout une côte rocheuse avec anciennes carrières et points de baignade selon la mer." },
      { question: "Est-ce mieux en bateau ?", answer: "Oui, le bateau permet de voir le relief, les carrières et les couleurs sans dépendre d'un accès terrestre difficile." },
    ],
    relatedSlugs: ["cala-rossa", "snorkeling-a-favignana", "plus-belles-plages-criques-favignana"],
  }),
  favignanaGuide({
    slug: "snorkeling-a-favignana",
    title: "Snorkeling à Favignana : zones et conseils",
    shortTitle: "Snorkeling",
    metaTitle: "Snorkeling à Favignana : meilleurs spots et excursion bateau",
    metaDescription:
      "Ou faire du snorkeling à Favignana : Bue Marino, Cala Rossa, Scalo Cavallo, Grotta Perciata et conseils de sécurité selon vent et mer.",
    heroImage: boatImage,
    heroAlt: "Snorkeling pendant une excursion en bateau à Favignana",
    intro:
      "Le snorkeling à Favignana dépend moins d'une liste de spots que des conditions du jour. Visibilite, vent et exposition changent beaucoup le plaisir dans l'eau.",
    quickAnswer:
      "Pour le snorkeling à Favignana, regardez Bue Marino, Scalo Cavallo, Cala Rossa et Grotta Perciata quand la mer est calme. Une excursion en bateau aide à choisir les zones les plus protégées.",
    primaryKeyword: "snorkeling à Favignana",
    secondaryKeywords: ["snorkeling Favignana", "spots snorkeling Égades", "baignade Favignana", "excursion bateau snorkeling"],
    quickFacts: [
      { label: "Meilleur critere", value: "mer calme" },
      { label: "Zones", value: "roche et eau claire" },
      { label: "Format", value: "bateau flexible" },
    ],
    itemListTitle: "Zones à considerer",
    itemList: [
      { name: "Bue Marino", description: "Fond rocheux et eau profonde avec bonne visibilité." },
      { name: "Scalo Cavallo", description: "Roche et reliefs interessants lorsque la mer est plate." },
      { name: "Grotta Perciata", description: "Arches et passages à observer prudemment." },
    ],
    sections: [
      {
        id: "conditions",
        title: "Le meilleur spot est celui qui est protégé aujourd'hui",
        body: [
          "Un spot célèbre ne garantit pas une bonne sortie si le vent entre dans la baie. Le skipper choisit souvent l'arrêt selon la transparence et la sécurité.",
          "Masque, temps calme et distance raisonnable du bateau suffisent pour une expérience agreable sans forcer.",
        ],
        cta: "cigala",
      },
      {
        id: "respect",
        title: "Observer sans toucher",
        body: [
          "Les îles Égades font partie d'un environnement marin fragile. En snorkeling, on garde ses distances, on évite de toucher les fonds et on suit les consignes de l'equipage.",
        ],
      },
    ],
    faqs: [
      { question: "Le snorkeling est-il adapté aux débutants ?", answer: "Oui, si la mer est calme et si l'arrêt est choisi dans une zone protégée." },
      { question: "Faut-il son propre masque ?", answer: "Vous pouvez apporter le votre ; sur les excursions, verifiez toujours l'equipement inclus avant de réserver." },
    ],
    relatedSlugs: ["bue-marino-carrieres-tuf", "cala-rossa", "excursion-bateau-favignana-levanzo"],
  }),
  favignanaGuide({
    slug: "comment-venir-depuis-trapani-et-se-deplacer",
    title: "Comment venir à Favignana depuis Trapani et se déplacer",
    shortTitle: "Venir et bouger",
    metaTitle: "Comment aller à Favignana depuis Trapani : ferry, hydroglisseur, bateau",
    metaDescription:
      "Comment rejoindre Favignana depuis Trapani, differences entre ferry, hydroglisseur et excursion en bateau, puis comment se déplacer sur l'île.",
    heroImage: favignanaHero,
    heroAlt: "Port et côte de Favignana vus depuis la mer",
    intro:
      "Depuis Trapani, Favignana est facile à rejoindre, mais le choix du transport change la journée. Ligne régulière, ferry, location sur place ou excursion en bateau n'offrent pas la même expérience.",
    quickAnswer:
      "On rejoint Favignana depuis Trapani en hydroglisseur ou ferry. Sur place, on se deplace à pied dans le village, à vélo, scooter ou navette. Pour une journée orientee mer, une excursion en bateau depuis Trapani évite plusieurs transferts.",
    primaryKeyword: "comment aller à Favignana depuis Trapani",
    secondaryKeywords: ["ferry Trapani Favignana", "hydroglisseur Favignana", "se déplacer Favignana", "excursion bateau Trapani Favignana"],
    quickFacts: [
      { label: "Départ principal", value: "Trapani" },
      { label: "Sur l'île", value: "vélo ou scooter" },
      { label: "Alternative", value: "tour en bateau" },
    ],
    itemListTitle: "Options principales",
    itemList: [
      { name: "Hydroglisseur", description: "Rapide et pratique pour arriver au port de Favignana." },
      { name: "Ferry", description: "Plus lent, utile selon horaires et besoins." },
      { name: "Excursion en bateau", description: "Départ de Trapani avec baignades et itinéraire marin." },
    ],
    sections: [
      {
        id: "transport",
        title: "Ligne régulière ou excursion : deux logiques différentes",
        body: [
          "La ligne régulière vous dépose au port : il faut ensuite organiser les déplacements vers les criques. L'excursion en bateau transforme le trajet en partie de la journée.",
          "Si votre priorité est le village, la ligne régulière est coherente. Si votre priorité est la mer, le bateau depuis Trapani est plus direct.",
        ],
        cta: "compare",
      },
      {
        id: "mobilite",
        title: "Sur place, gardez de la marge",
        body: [
          "En ete, locations, navettes et routes peuvent être chargees. Prévoir moins d'étapes rend la visite plus agreable.",
        ],
      },
    ],
    faqs: [
      { question: "Faut-il une voiture à Favignana ?", answer: "Non. Pour une visite touristique, vélo, scooter, navette ou bateau suffisent généralement." },
      { question: "Peut-on partir directement en excursion depuis Trapani ?", answer: "Oui, c'est l'option la plus simple pour combiner navigation, baignade et retour le même jour." },
    ],
    relatedSlugs: ["favignana-en-une-journee", "excursion-bateau-favignana-levanzo", "que-voir-a-favignana"],
  }),
  favignanaGuide({
    slug: "excursion-bateau-favignana-levanzo",
    title: "Excursion en bateau Favignana et Levanzo depuis Trapani",
    shortTitle: "Favignana + Levanzo",
    metaTitle: "Excursion en bateau Favignana et Levanzo depuis Trapani",
    metaDescription:
      "Comment choisir une excursion en bateau à Favignana et Levanzo depuis Trapani : tour partagé, privé, snorkeling, déjeuner à bord et itinéraire.",
    heroImage: boatImage,
    heroAlt: "Excursion en bateau entre Favignana et Levanzo dans les îles Égades",
    eyebrow: "Excursion en bateau",
    intro:
      "L'association Favignana et Levanzo est l'une des plus recherchées depuis Trapani : elle combine les criques iconiques de Favignana avec l'atmosphère plus intime de Levanzo.",
    quickAnswer:
      "Pour une excursion en bateau Favignana et Levanzo, choisissez un tour partagé si vous voulez une journée simple avec billet individuel, ou un tour privé si vous voulez plus de flexibilité. Le format 8 heures est le plus complet pour baignade, snorkeling et pauses sans courir.",
    primaryKeyword: "excursion en bateau Favignana et Levanzo depuis Trapani",
    secondaryKeywords: ["tour en bateau îles Égades", "Favignana Levanzo depuis Trapani", "tour privé Favignana", "déjeuner à bord Égades"],
    quickFacts: [
      { label: "Durée conseillée", value: "8 heures" },
      { label: "Formats", value: "partagé ou privé" },
      { label: "Plus", value: "snorkeling et criques" },
    ],
    itemListTitle: "Comment choisir",
    itemList: [
      { name: "Tour partagé", description: "Idéal pour réserver une ou plusieurs places sans privatiser le bateau." },
      { name: "Tour privé", description: "Plus flexible pour familles, couples ou groupes." },
      { name: "Chef à bord", description: "Option premium sur Neel 47 avec déjeuner à bord." },
    ],
    sections: [
      {
        id: "formats",
        title: "Partage, privé ou premium",
        body: [
          "Le tour partagé convient aux voyageurs seuls, couples et petits groupes qui veulent une expérience complète sans louer tout le bateau.",
          "Le tour privé permet d'adapter davantage le rythme. Le Neel 47 ajoute une dimension plus confortable et gastronomique, avec déjeuner à bord.",
        ],
        cta: "compare",
      },
      {
        id: "itineraire",
        title: "L'itinéraire doit rester flexible",
        body: [
          "Les arrêts exacts dépendent du vent, de la mer et de la sécurité. Une bonne excursion ne force pas une cala si les conditions ne sont pas bonnes.",
        ],
      },
    ],
    faqs: [
      { question: "Peut-on réserver une seule place ?", answer: "Oui, sur les experiences partagees il est possible de réserver un billet individuel." },
      { question: "Le déjeuner à bord est-il inclus ?", answer: "Cela dépend de l'expérience choisie. Le format gourmet avec chef à bord privilégie le Neel 47." },
    ],
    relatedSlugs: ["favignana-en-une-journee", "plus-belles-plages-criques-favignana", "snorkeling-a-favignana"],
  }),
];

export function isFavignanaGuideFrSlug(slug: string): slug is FavignanaGuideSlug {
  return favignanaGuidesFr.some((guide) => guide.slug === slug);
}

export const favignanaGuideLinksFr: Array<{
  slug: FavignanaGuideSlug;
  title: string;
  description: string;
}> = favignanaGuidesFr.map((guide) => ({
  slug: guide.slug,
  title: guide.shortTitle,
  description: guide.quickAnswer,
}));
