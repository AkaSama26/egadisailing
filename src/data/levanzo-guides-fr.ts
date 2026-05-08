import type { LevanzoGuide, LevanzoGuideSlug } from "./levanzo-guides";

const levanzoHero = "/images/islands/levanzo/hero.webp";
const calaMinnolaImage = "/images/islands/levanzo/poi/cala-minnola.webp";
const calaCalcaraImage = "/images/islands/levanzo/poi/cala-calcara.webp";
const grottaGenoveseImage = "/images/islands/levanzo/poi/grotta-del-genovese.webp";
const boatImage = "/images/experience-polaroids/barca-8-ore-snorkeling.webp";

type GuideInput = Omit<LevanzoGuide, "eyebrow"> & {
  eyebrow?: string;
};

function levanzoGuide(guide: GuideInput): LevanzoGuide {
  return {
    eyebrow: "Guide",
    ...guide,
  };
}

const commonFacts = [
  { label: "Départ", value: "Trapani" },
  { label: "Ambiance", value: "calme et criques" },
  { label: "À combiner", value: "Favignana" },
];

export const levanzoGuidesFr: LevanzoGuide[] = [
  levanzoGuide({
    slug: "que-voir-a-levanzo",
    title: "Que voir à Levanzo : village, criques et grotte",
    shortTitle: "Que voir",
    metaTitle: "Que voir à Levanzo : criques, village et excursion en bateau",
    metaDescription:
      "Guide de Levanzo dans les îles Égades : village, Cala Minnola, Cala Calcara, Grotta del Genovese, snorkeling et excursion en bateau depuis Trapani.",
    heroImage: levanzoHero,
    heroAlt: "Levanzo vue depuis la mer avec village blanc et eau claire",
    intro:
      "Levanzo est la plus intime des îles proches de Trapani. Son village blanc, ses criques rocheuses et son rythme lent en font une halte parfaite avec Favignana.",
    quickAnswer:
      "À Levanzo, voyez le village, Cala Minnola, Cala Calcara, la Grotta del Genovese et les criques accessibles par mer. Pour une journée depuis Trapani, l'excursion en bateau Favignana et Levanzo est souvent le format le plus fluide.",
    primaryKeyword: "que voir à Levanzo",
    secondaryKeywords: ["Levanzo que faire", "îles Égades", "excursion bateau Levanzo", "Levanzo depuis Trapani"],
    quickFacts: commonFacts,
    itemListTitle: "Les lieux essentiels",
    itemList: [
      { name: "Village de Levanzo", description: "Petit port blanc, calme et très photogénique." },
      { name: "Cala Minnola", description: "Crique connue pour la baignade et le snorkeling." },
      { name: "Cala Calcara", description: "Baie plus ouverte, à choisir selon le vent." },
      { name: "Grotta del Genovese", description: "Site archéologique majeur, visite sur réservation." },
    ],
    sections: [
      {
        id: "village",
        title: "Un village minuscule, mais une vraie atmosphère",
        body: [
          "Le charme de Levanzo tient à sa simplicité : quelques rues, le port, des maisons blanches et une lumière très douce sur l'eau.",
          "La visite n'a pas besoin d'être longue. Levanzo fonctionne surtout comme respiration dans une journée de mer.",
        ],
        cta: "compare",
      },
      {
        id: "criques",
        title: "Les criques se lisent mieux depuis un bateau",
        body: [
          "Cala Minnola et Cala Calcara ne donnent pas la même expérience selon le vent. Depuis la mer, le skipper choisit l'arrêt le plus confortable.",
        ],
        cards: [
          { title: "Cala Minnola", text: "Baignade et snorkeling dans une baie claire.", tag: "Snorkeling", image: calaMinnolaImage },
          { title: "Grotta del Genovese", text: "Mémoire préhistorique de l'île.", tag: "Culture", image: grottaGenoveseImage },
        ],
      },
    ],
    faqs: [
      { question: "Levanzo vaut-elle le détour ?", answer: "Oui, surtout si vous cherchez une île plus calme que Favignana et de belles haltes de baignade." },
      { question: "Peut-on combiner Levanzo et Favignana ?", answer: "Oui, c'est l'une des combinaisons les plus naturelles en excursion en bateau depuis Trapani." },
    ],
    relatedSlugs: ["plages-criques-levanzo", "grotte-du-genovese", "excursion-bateau-depuis-trapani"],
  }),
  levanzoGuide({
    slug: "plages-criques-levanzo",
    title: "Plages et criques de Levanzo : où se baigner",
    shortTitle: "Plages et criques",
    metaTitle: "Plages et criques de Levanzo : Cala Minnola, Calcara et bateau",
    metaDescription:
      "Les plus belles criques de Levanzo : Cala Minnola, Cala Calcara, Faraglione, baignade, snorkeling et conseils selon la mer.",
    heroImage: calaMinnolaImage,
    heroAlt: "Cala Minnola à Levanzo avec eau claire",
    intro:
      "Levanzo n'est pas une île de grandes plages. Sa beaute vient plutot de petites criques, d'eau claire et de rochers bas qui changent d'aspect selon la lumière.",
    quickAnswer:
      "Les criques principales sont Cala Minnola, Cala Calcara et les zones proches du Faraglione. Pour se baigner confortablement, il faut suivre le vent et privilégier une excursion en bateau flexible.",
    primaryKeyword: "plages Levanzo",
    secondaryKeywords: ["criques Levanzo", "Cala Minnola", "Cala Calcara", "snorkeling Levanzo"],
    quickFacts: [
      { label: "Baignade", value: "petites criques" },
      { label: "Spot connu", value: "Cala Minnola" },
      { label: "Conseil", value: "vérifier le vent" },
    ],
    itemListTitle: "Criques à connaitre",
    itemList: [
      { name: "Cala Minnola", description: "La plus connue pour l'eau claire et le snorkeling." },
      { name: "Cala Calcara", description: "Plus sauvage, à choisir avec mer favorable." },
      { name: "Faraglione", description: "Reference cotiere intéressante depuis la mer." },
    ],
    sections: [
      {
        id: "calas",
        title: "Des criques plus que des plages",
        body: [
          "À Levanzo, on cherche moins le sable que la transparence. Les accès peuvent être rocheux ; le bateau rend les haltes plus simples.",
          "Le format idéal est une pause de baignade bien choisie, pas une liste de plages à enchainer.",
        ],
        cta: "cigala",
      },
      {
        id: "conditions",
        title: "Cala Minnola n'est parfaite que si la mer l'est aussi",
        body: [
          "Comme partout aux Égades, une crique reputee peut devenir inconfortable avec le mauvais vent. L'itinéraire doit rester adaptable.",
        ],
      },
    ],
    faqs: [
      { question: "Y a-t-il des plages de sable à Levanzo ?", answer: "Très peu. Levanzo est surtout une île de criques rocheuses et d'eau claire." },
      { question: "Quelle crique choisir pour le snorkeling ?", answer: "Cala Minnola est la plus connue, mais le meilleur choix dépend de la mer du jour." },
    ],
    relatedSlugs: ["snorkeling-cala-minnola-calcara", "que-voir-a-levanzo", "excursion-bateau-depuis-trapani"],
  }),
  levanzoGuide({
    slug: "grotte-du-genovese",
    title: "Grotte du Genovese à Levanzo : visite et contexte",
    shortTitle: "Grotte du Genovese",
    metaTitle: "Grotte du Genovese à Levanzo : réservation, histoire et accès",
    metaDescription:
      "Guide de la Grotte du Genovese à Levanzo : pourquoi elle est importante, comment organiser la visite et comment l'intégrer à une journée en bateau.",
    heroImage: grottaGenoveseImage,
    heroAlt: "Entree de la Grotte du Genovese à Levanzo",
    intro:
      "La Grotte du Genovese est l'un des sites archeologiques les plus importants des îles Égades. Elle donne une profondeur culturelle à une île souvent associee seulement aux criques.",
    quickAnswer:
      "La Grotte du Genovese se visite normalement avec réservation et organisation locale. Elle ne remplace pas une journée de mer, mais elle complète très bien une visite de Levanzo si vous avez le temps.",
    primaryKeyword: "Grotte du Genovese Levanzo",
    secondaryKeywords: ["Grotta del Genovese", "Levanzo histoire", "visite Levanzo", "îles Égades culture"],
    quickFacts: [
      { label: "Type", value: "site archéologique" },
      { label: "Organisation", value: "sur réservation" },
      { label: "À prévoir", value: "temps dédié" },
    ],
    itemListTitle: "À retenir",
    itemList: [
      { name: "Importance", description: "Peintures et gravures prehistoriques." },
      { name: "Accès", description: "À organiser avec les opérateurs autorisés." },
      { name: "Timing", description: "À combiner seulement si le programme le permet." },
    ],
    sections: [
      {
        id: "histoire",
        title: "Une visite pour comprendre l'île autrement",
        body: [
          "La grotte rappelle que Levanzo n'est pas seulement une escale de baignade. Elle porte une mémoire très ancienne, anterieure au village et aux routes maritimes actuelles.",
          "Si vous aimez alterner nature et culture, c'est la visite la plus forte de l'île.",
        ],
      },
      {
        id: "organisation",
        title: "Ne l'ajoutez pas au dernier moment",
        body: [
          "La visite demande une organisation specifique. Pour une excursion en bateau d'une journée, il vaut mieux choisir à l'avance si la priorité est la grotte ou les baignades.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      { question: "Faut-il réserver la Grotte du Genovese ?", answer: "Oui, il faut vérifier les modalites de visite et réserver avec les services locaux." },
      { question: "Peut-on la voir pendant un tour en bateau ?", answer: "Pas toujours. Un tour centre sur la mer privilégie les criques ; la grotte demande du temps dédié." },
    ],
    relatedSlugs: ["que-voir-a-levanzo", "levanzo-en-une-journee", "comment-venir-depuis-trapani"],
  }),
  levanzoGuide({
    slug: "levanzo-en-une-journee",
    title: "Levanzo en une journée : que faire sans courir",
    shortTitle: "En une journée",
    metaTitle: "Levanzo en une journée depuis Trapani : itinéraire et bateau",
    metaDescription:
      "Comment visiter Levanzo en une journée : village, Cala Minnola, snorkeling, Grotta del Genovese et excursion en bateau depuis Trapani.",
    heroImage: levanzoHero,
    heroAlt: "Levanzo et son village vus depuis une excursion en bateau",
    intro:
      "Levanzo se visite mieux lentement. En une journée, l'objectif n'est pas de tout faire, mais de garder un rythme fluide entre village, baignade et panorama.",
    quickAnswer:
      "Pour Levanzo en une journée, combinez le village, une ou deux criques et une pause de snorkeling. Si vous partez de Trapani, l'excursion avec Favignana donne un programme plus complet.",
    primaryKeyword: "Levanzo en une journée",
    secondaryKeywords: ["Levanzo depuis Trapani", "itinéraire Levanzo", "excursion bateau Levanzo", "Cala Minnola"],
    quickFacts: commonFacts,
    itemListTitle: "Programme simple",
    itemList: [
      { name: "Village", description: "Promenade courte autour du port." },
      { name: "Baignade", description: "Crique protégée selon la mer." },
      { name: "Snorkeling", description: "Pause dans une zone claire et calme." },
    ],
    sections: [
      {
        id: "programme",
        title: "Une journée réussie reste legere",
        body: [
          "Levanzo perd son charme si l'on cherche à cocher trop d'étapes. Une halte village, une baignade et un moment de mer suffisent souvent.",
          "Avec Favignana, elle devient la partie plus calme et intime de la journée.",
        ],
        cta: "cigala",
      },
      {
        id: "grotte",
        title: "Ajouter la grotte seulement si c'est votre priorité",
        body: [
          "La Grotta del Genovese mérite une organisation dédiée. Sur une excursion de mer, elle peut rendre le programme trop serré.",
        ],
      },
    ],
    faqs: [
      { question: "Levanzo suffit-elle pour une journée entiere ?", answer: "Oui si vous aimez le calme, mais beaucoup de voyageurs la combinent avec Favignana." },
      { question: "Peut-on se déplacer à pied ?", answer: "Dans le village oui. Pour les criques et la côte, le bateau reste plus confortable." },
    ],
    relatedSlugs: ["que-voir-a-levanzo", "plages-criques-levanzo", "excursion-bateau-depuis-trapani"],
  }),
  levanzoGuide({
    slug: "comment-venir-depuis-trapani",
    title: "Comment venir à Levanzo depuis Trapani",
    shortTitle: "Venir depuis Trapani",
    metaTitle: "Comment aller à Levanzo depuis Trapani : ferry, bateau, excursion",
    metaDescription:
      "Toutes les options pour rejoindre Levanzo depuis Trapani : ligne régulière, horaires, excursion en bateau et conseils pour une journée aux îles Égades.",
    heroImage: levanzoHero,
    heroAlt: "Arrivee en bateau à Levanzo depuis Trapani",
    intro:
      "Levanzo est proche de Trapani, mais il faut choisir le format qui correspond à votre journée : transport simple ou expérience en mer.",
    quickAnswer:
      "On rejoint Levanzo depuis Trapani en hydroglisseur ou ferry selon les horaires. Pour profiter des criques sans organiser les déplacements, une excursion en bateau depuis Trapani est souvent plus pratique.",
    primaryKeyword: "comment aller à Levanzo depuis Trapani",
    secondaryKeywords: ["ferry Trapani Levanzo", "hydroglisseur Levanzo", "excursion bateau Levanzo", "îles Égades depuis Trapani"],
    quickFacts: [
      { label: "Départ", value: "port de Trapani" },
      { label: "Arrivee", value: "village de Levanzo" },
      { label: "Alternative", value: "excursion en bateau" },
    ],
    itemListTitle: "Options",
    itemList: [
      { name: "Ligne régulière", description: "Bonne option pour visiter le village librement." },
      { name: "Excursion", description: "Plus fluide pour baignade, criques et retour organisé." },
      { name: "Tour privé", description: "Idéal pour ajuster le rythme d'un groupe." },
    ],
    sections: [
      {
        id: "choisir",
        title: "Transport ou expérience en mer ?",
        body: [
          "Le ferry où l'hydroglisseur vous amenent au port. L'excursion vous fait vivre le trajet, avec baignades et arrêts choisis.",
          "Si vous voulez surtout nager et voir la côte, le bateau depuis Trapani est plus coherent.",
        ],
        cta: "compare",
      },
      {
        id: "marge",
        title: "Gardez une marge pour le retour",
        body: [
          "Les horaires et la météo peuvent influencer la journée. Evitez un programme trop serré, surtout en haute saison.",
        ],
      },
    ],
    faqs: [
      { question: "Levanzo est-elle proche de Trapani ?", answer: "Oui, c'est l'une des îles Égades les plus accessibles depuis Trapani." },
      { question: "Faut-il réserver le bateau ?", answer: "En haute saison, oui, il vaut mieux réserver à l'avance le transport où l'excursion." },
    ],
    relatedSlugs: ["levanzo-en-une-journee", "excursion-bateau-depuis-trapani", "que-voir-a-levanzo"],
  }),
  levanzoGuide({
    slug: "snorkeling-cala-minnola-calcara",
    title: "Snorkeling à Cala Minnola et Cala Calcara",
    shortTitle: "Snorkeling",
    metaTitle: "Snorkeling à Levanzo : Cala Minnola, Cala Calcara et bateau",
    metaDescription:
      "Conseils pour le snorkeling à Levanzo entre Cala Minnola, Cala Calcara et les criques protégées, avec départ en bateau depuis Trapani.",
    heroImage: calaCalcaraImage,
    heroAlt: "Cala Calcara à Levanzo avec mer bleue et côte rocheuse",
    intro:
      "Le snorkeling à Levanzo est simple et beau lorsque la mer est calme. Les fonds rocheux et les criques claires donnent une expérience douce, adaptée à une pause baignade.",
    quickAnswer:
      "Cala Minnola est la zone la plus connue pour le snorkeling à Levanzo ; Cala Calcara peut être intéressante avec mer favorable. Le bateau permet de choisir la zone la plus abritee du jour.",
    primaryKeyword: "snorkeling Levanzo",
    secondaryKeywords: ["Cala Minnola snorkeling", "Cala Calcara", "snorkeling îles Égades", "excursion bateau Levanzo"],
    quickFacts: [
      { label: "Spot connu", value: "Cala Minnola" },
      { label: "Condition", value: "mer calme" },
      { label: "Niveau", value: "debutant à intermediaire" },
    ],
    itemListTitle: "Zones utiles",
    itemList: [
      { name: "Cala Minnola", description: "Eau claire et fond rocheux accessible." },
      { name: "Cala Calcara", description: "Belle option quand elle est protégée du vent." },
      { name: "Criques secondaires", description: "À choisir selon les conditions réelles." },
    ],
    sections: [
      {
        id: "spots",
        title: "Le spot dépend de la protection",
        body: [
          "La transparence de l'eau change vite avec le vent. Une pause snorkeling réussie se décide souvent le jour même.",
          "L'equipage vous aide à entrer et sortir de l'eau dans les zones les plus confortables.",
        ],
        cta: "cigala",
      },
      {
        id: "respect",
        title: "Snorkeling leger, sans toucher les fonds",
        body: [
          "Aux Égades, l'observation doit rester douce. On garde ses distances, on évite de toucher les rochers et on respecte les consignes de sécurité.",
        ],
      },
    ],
    faqs: [
      { question: "Cala Minnola est-elle adaptée aux débutants ?", answer: "Oui lorsque la mer est calme et que l'arrêt est bien choisi." },
      { question: "Le snorkeling est-il garanti ?", answer: "Non. Il dépend toujours de la mer, de la visibilité et de la sécurité." },
    ],
    relatedSlugs: ["plages-criques-levanzo", "excursion-bateau-depuis-trapani", "que-voir-a-levanzo"],
  }),
  levanzoGuide({
    slug: "excursion-bateau-depuis-trapani",
    title: "Excursion en bateau à Levanzo depuis Trapani",
    shortTitle: "Bateau depuis Trapani",
    metaTitle: "Excursion en bateau Levanzo depuis Trapani : criques et snorkeling",
    metaDescription:
      "Choisir une excursion en bateau à Levanzo depuis Trapani : tour partagé ou privé, arrêts de baignade, snorkeling et combinaison avec Favignana.",
    heroImage: boatImage,
    heroAlt: "Excursion en bateau vers Levanzo depuis Trapani",
    eyebrow: "Excursion en bateau",
    intro:
      "Levanzo fonctionne très bien en bateau : l'arrivee par la mer met en valeur le village, les criques et la dimension plus calme de l'île.",
    quickAnswer:
      "Pour une excursion en bateau à Levanzo depuis Trapani, le format le plus complet combine souvent Favignana et Levanzo en 8 heures. Le tour partagé convient aux billets individuels ; le privé donne plus de flexibilité.",
    primaryKeyword: "excursion en bateau Levanzo depuis Trapani",
    secondaryKeywords: ["tour en bateau Levanzo", "Favignana et Levanzo depuis Trapani", "tour privé Levanzo", "snorkeling Levanzo"],
    quickFacts: [
      { label: "Durée ideale", value: "8 heures" },
      { label: "Formats", value: "partagé ou privé" },
      { label: "À voir", value: "village et criques" },
    ],
    itemListTitle: "Formats possibles",
    itemList: [
      { name: "Tour partagé", description: "Pour réserver une ou plusieurs places simplement." },
      { name: "Tour privé", description: "Pour adapter le rythme aux envies du groupe." },
      { name: "Expérience premium", description: "Avec plus de confort et déjeuner à bord sur Neel 47." },
    ],
    sections: [
      {
        id: "choix",
        title: "Levanzo se combine naturellement avec Favignana",
        body: [
          "Une journée de 8 heures permet d'alterner les paysages iconiques de Favignana et l'ambiance plus intime de Levanzo.",
          "Le choix partagé ou privé dépend surtout du niveau de flexibilité souhaite.",
        ],
        cta: "compare",
      },
      {
        id: "route",
        title: "Les arrêts exacts restent soumis à la mer",
        body: [
          "Un bon itinéraire ne force pas une crique exposee. La sécurité et le confort priment sur une liste rigide de stops.",
        ],
      },
    ],
    faqs: [
      { question: "Peut-on réserver une seule place ?", answer: "Oui, les experiences partagees permettent de réserver même un billet individuel." },
      { question: "Levanzo est-elle incluse dans tous les tours ?", answer: "Non, il faut choisir une expérience qui prevoit clairement Favignana et Levanzo." },
    ],
    relatedSlugs: ["levanzo-en-une-journee", "plages-criques-levanzo", "snorkeling-cala-minnola-calcara"],
  }),
];

export function isLevanzoGuideFrSlug(slug: string): slug is LevanzoGuideSlug {
  return levanzoGuidesFr.some((guide) => guide.slug === slug);
}

export const levanzoGuideLinksFr: Array<{
  slug: LevanzoGuideSlug;
  title: string;
  description: string;
}> = levanzoGuidesFr.map((guide) => ({
  slug: guide.slug,
  title: guide.shortTitle,
  description: guide.quickAnswer,
}));
