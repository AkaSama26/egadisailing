import type { MarettimoGuide, MarettimoGuideSlug } from "./marettimo-guides";

const marettimoHero = "/images/islands/marettimo/hero.webp";
const charterImage = "/images/experience-polaroids/charter-trimarano-egadi.webp";
const boatImage = "/images/experience-polaroids/barca-8-ore-snorkeling.webp";

function marettimoGuide(guide: MarettimoGuide): MarettimoGuide {
  return guide;
}

export const marettimoGuidesEs: MarettimoGuide[] = [
  marettimoGuide({
    slug: "que-ver-en-marettimo",
    title: "Qué ver en Marettimo: cuevas, Cala Bianca, Punta Troia y senderos",
    shortTitle: "Qué ver",
    metaTitle: "Qué ver en Marettimo: cuevas marinas, Cala Bianca y senderos",
    metaDescription:
      "Guía para saber qué ver en Marettimo: cuevas marinas, Cala Bianca, Castillo de Punta Troia, Case Romane, Monte Falcone y charter por las Egadi.",
    heroImage: marettimoHero,
    heroAlt: "Marettimo vista desde el mar con costa alta y agua azul profunda",
    eyebrow: "Guía completa",
    intro:
      "Marettimo es la isla más salvaje y vertical de las Egadi. Está más lejos que Favignana, es más montañosa que Levanzo y combina cuevas marinas, senderos, calas de piedra y un pueblo pequeño que conserva un ritmo remoto.",
    quickAnswer:
      "En Marettimo conviene ver el pueblo, Scalo Vecchio y Scalo Nuovo, el Castillo de Punta Troia, Case Romane, Cala Bianca, las cuevas marinas, Punta Libeccio y los senderos hacia Monte Falcone. Para una primera visita, elige entre ruta en barco, senderismo o una mezcla ligera.",
    primaryKeyword: "qué ver en Marettimo",
    secondaryKeywords: [
      "Marettimo qué hacer",
      "cuevas marinas Marettimo",
      "Cala Bianca Marettimo",
      "charter Islas Egadi",
    ],
    quickFacts: [
      { label: "Carácter", value: "salvaje y vertical" },
      { label: "No perderse", value: "cuevas marinas" },
      { label: "Icono", value: "Punta Troia" },
      { label: "Mejor para", value: "charter y senderismo" },
    ],
    itemListTitle: "Lugares principales",
    itemList: [
      {
        name: "Cuevas marinas",
        description:
          "Grotta del Cammello, Grotta del Tuono, Grotta della Pipa y otras cavidades muestran la costa más escénica.",
      },
      {
        name: "Castillo de Punta Troia",
        description:
          "Fortaleza sobre el mar y una de las vistas más reconocibles de Marettimo.",
      },
      {
        name: "Cala Bianca",
        description:
          "Una de las calas más buscadas, con agua clara y entorno salvaje.",
      },
      {
        name: "Case Romane",
        description:
          "Área arqueológica y panorámica en el interior de la isla.",
      },
      {
        name: "Monte Falcone",
        description:
          "El punto más alto y exigente, recomendable fuera de las horas de calor.",
      },
    ],
    sections: [
      {
        id: "mar",
        eyebrow: "Por mar",
        title: "Cuevas, acantilados y agua profunda",
        body: [
          "Marettimo se entiende muy rápido desde el mar. La costa alterna paredes altas, entradas de cuevas, cortes de roca y pequeñas calas difíciles de leer solo desde tierra.",
          "La ruta de cuevas es uno de los motivos principales para visitar la isla, pero debe contarse con honestidad: no todas las cuevas son accesibles cada día.",
        ],
        bullets: [
          "Grotta del Cammello y Grotta del Tuono para paisaje.",
          "Cala Bianca para agua clara y entorno salvaje.",
          "Punta Troia para historia y perfil icónico.",
          "Ruta siempre condicionada por viento y oleaje.",
        ],
        cta: "charter",
      },
      {
        id: "tierra",
        eyebrow: "A pie",
        title: "Punta Troia, Case Romane y senderos",
        body: [
          "Marettimo no es solo mar. Desde el pueblo salen senderos hacia Case Romane, Punta Troia y Monte Falcone, con vistas amplias y un carácter más montañero que el resto de las Egadi.",
          "En primavera y otoño el senderismo gana protagonismo; en pleno verano conviene evitar las horas centrales.",
        ],
      },
      {
        id: "elegir",
        eyebrow: "Planificación",
        title: "Marettimo no debe forzarse como parada automática",
        body: [
          "Al estar más lejos, Marettimo necesita mejores condiciones y más margen. Por eso encaja muy bien en un charter de varios días, mientras que una visita diaria debe valorarse con la tripulación.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "¿Qué ver en Marettimo en una primera visita?",
        answer:
          "Pueblo, Punta Troia, Case Romane, Cala Bianca y cuevas marinas. Si tienes poco tiempo, elige mar o senderos, no todo a la vez.",
      },
      {
        question: "¿Marettimo es mejor en barco o a pie?",
        answer:
          "En barco se disfrutan cuevas y costa; a pie se aprecian vistas, historia y naturaleza interior.",
      },
      {
        question: "¿Se puede visitar Marettimo en un día desde Trapani?",
        answer:
          "Sí, pero depende de horarios y mar. Para menos prisa, un charter por las Egadi es más natural.",
      },
    ],
    relatedSlugs: ["cuevas-marinas", "cala-bianca", "excursion-barco-charter-egadi"],
  }),
  marettimoGuide({
    slug: "cuevas-marinas",
    title: "Cuevas marinas de Marettimo: Cammello, Tuono, Presepe y Pipa",
    shortTitle: "Cuevas marinas",
    metaTitle: "Cuevas marinas de Marettimo: Cammello, Tuono, Presepe y Pipa",
    metaDescription:
      "Guía de las cuevas marinas de Marettimo: Grotta del Cammello, del Tuono, della Pipa, del Presepe y consejos para visitarlas en barco.",
    heroImage: marettimoHero,
    heroAlt: "Costa rocosa de Marettimo con cuevas marinas y agua azul",
    eyebrow: "Cuevas y costa",
    intro:
      "Las cuevas marinas son la gran razón por la que muchos viajeros buscan Marettimo. Son luz, reflejos, entradas estrechas, agua profunda y paredes calizas que cambian con el mar.",
    quickAnswer:
      "Las cuevas más conocidas de Marettimo incluyen Grotta del Cammello, Grotta del Tuono, Grotta della Pipa, Grotta del Presepe, Grotta Perciata y Grotta degli Innamorati. Se visitan desde el mar, pero entrada y baños dependen siempre de condiciones.",
    primaryKeyword: "cuevas marinas Marettimo",
    secondaryKeywords: [
      "Grotta del Cammello Marettimo",
      "Grotta del Tuono",
      "tour cuevas Marettimo",
      "cuevas Islas Egadi",
    ],
    quickFacts: [
      { label: "Experiencia", value: "desde el mar" },
      { label: "Mejor con", value: "agua calma" },
      { label: "Importante", value: "ruta variable" },
      { label: "Formato ideal", value: "charter" },
    ],
    itemListTitle: "Cuevas que conocer",
    itemList: [
      {
        name: "Grotta del Cammello",
        description:
          "Una de las más conocidas por su forma y entrada escénica.",
      },
      {
        name: "Grotta del Tuono",
        description:
          "Su nombre recuerda la fuerza del mar cuando las olas resuenan dentro.",
      },
      {
        name: "Grotta della Pipa",
        description:
          "Cueva costera incluida cuando la navegación es segura.",
      },
      {
        name: "Grotta del Presepe",
        description:
          "Apreciada por sus formas y atmósfera con la luz adecuada.",
      },
      {
        name: "Grotta Perciata",
        description:
          "Abertura marina que muestra el carácter geológico de la isla.",
      },
    ],
    sections: [
      {
        id: "visita",
        eyebrow: "Ruta en barco",
        title: "Cómo visitar bien las cuevas",
        body: [
          "Las cuevas se visitan en barco siguiendo el lado más seguro y bonito del día. Con mar tranquilo puede haber pasos cercanos, fotos y baños en zonas próximas.",
          "Una tripulación seria no promete entrar en todas las cuevas siempre. Con oleaje, viento o poca visibilidad, algunas entradas se saltan y la jornada sigue siendo buena buscando agua protegida.",
        ],
        cta: "charter",
      },
      {
        id: "destacadas",
        eyebrow: "Destacadas",
        title: "Las cuevas más buscadas",
        body: [
          "Grotta del Cammello y Grotta del Tuono suelen ser los nombres más pedidos. Grotta della Pipa, Grotta del Presepe y Grotta Perciata añaden variedad.",
          "La calidad de la visita depende menos de marcar todos los nombres y más de mar, luz y lectura de la costa.",
        ],
        bullets: [
          "La luz de la mañana puede mejorar algunos colores.",
          "El viento de la tarde puede cerrar ciertos lados.",
          "El snorkel solo tiene sentido con mar seguro.",
        ],
      },
      {
        id: "charter",
        eyebrow: "Planificar",
        title: "Por qué el charter da más margen",
        body: [
          "Marettimo está más lejos de Trapani que Favignana y Levanzo. En un plan de un día, la ruta de cuevas es más sensible al tiempo.",
          "Con un charter puedes esperar la ventana adecuada y pasar más tiempo alrededor de la isla cuando las condiciones son buenas.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "¿Se puede nadar dentro de las cuevas de Marettimo?",
        answer:
          "Solo cuando condiciones y normas lo permiten. A menudo se ven desde el barco y se nada en puntos cercanos más protegidos.",
      },
      {
        question: "¿Se visitan todas las cuevas siempre?",
        answer:
          "No. Viento, oleaje y seguridad determinan la ruta real.",
      },
      {
        question: "¿Cuál es la mejor forma de verlas?",
        answer:
          "En barco, con patrón local y margen suficiente para adaptar la ruta.",
      },
    ],
    relatedSlugs: ["que-ver-en-marettimo", "cala-bianca", "excursion-barco-charter-egadi"],
  }),
  marettimoGuide({
    slug: "playas-calas-marettimo",
    title: "Playas y calas de Marettimo: dónde bañarse",
    shortTitle: "Playas y calas",
    metaTitle: "Playas y calas de Marettimo: Cala Bianca, Praia Nacchi y Scalo",
    metaDescription:
      "Guía de playas y calas de Marettimo: Cala Bianca, Praia Nacchi, Scalo Vecchio, Scalo Nuovo, zonas de baño y consejos según mar.",
    heroImage: marettimoHero,
    heroAlt: "Calas rocosas de Marettimo con mar azul",
    eyebrow: "Mar y calas",
    intro:
      "Marettimo no es una isla de playas fáciles. Sus baños se viven entre rocas, pequeñas calas, escalas del pueblo y paradas desde el mar.",
    quickAnswer:
      "Para bañarte en Marettimo, mira Cala Bianca, Praia Nacchi, Scalo Vecchio, Scalo Nuovo y pequeñas zonas protegidas elegidas según el mar. Desde el barco se accede mejor a calas que por tierra pueden resultar exigentes.",
    primaryKeyword: "playas de Marettimo",
    secondaryKeywords: [
      "calas Marettimo",
      "Cala Bianca Marettimo",
      "dónde bañarse en Marettimo",
    ],
    quickFacts: [
      { label: "Tipo", value: "roca y calas pequeñas" },
      { label: "Más buscada", value: "Cala Bianca" },
      { label: "Fácil", value: "zonas junto al pueblo" },
    ],
    itemListTitle: "Zonas de baño",
    itemList: [
      {
        name: "Cala Bianca",
        description:
          "La cala más famosa, salvaje y dependiente de buenas condiciones.",
      },
      {
        name: "Praia Nacchi",
        description:
          "Zona de baño apreciada cerca de la costa accesible.",
      },
      {
        name: "Scalo Vecchio y Scalo Nuovo",
        description:
          "Puntos del pueblo para baños sencillos sin alejarse demasiado.",
      },
      {
        name: "Calas desde el barco",
        description:
          "Pequeños puntos elegidos por el patrón según viento y seguridad.",
      },
    ],
    sections: [
      {
        id: "caracter",
        eyebrow: "Carácter",
        title: "Marettimo no es playa clásica",
        body: [
          "Quien busca arena amplia puede preferir otras islas. Marettimo ofrece una belleza más salvaje: agua profunda, roca, silencio y calas que no siempre son cómodas.",
        ],
      },
      {
        id: "barco",
        eyebrow: "Desde el mar",
        title: "El barco abre más posibilidades",
        body: [
          "Muchas calas se entienden mejor navegando. El patrón elige el lado protegido y evita accesos por tierra demasiado exigentes.",
        ],
        cta: "charter",
      },
      {
        id: "seguridad",
        eyebrow: "Consejo",
        title: "Elegir según condiciones",
        body: [
          "En Marettimo es especialmente importante no forzar paradas expuestas. Una cala bonita con mar incómodo deja de ser una buena experiencia.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "¿Marettimo tiene playas de arena?",
        answer:
          "No es su punto fuerte. Predominan roca, calas pequeñas y zonas de baño desde el pueblo o el barco.",
      },
      {
        question: "¿Cuál es la cala más famosa?",
        answer:
          "Cala Bianca es una de las más buscadas, pero depende mucho del mar.",
      },
      {
        question: "¿Es apta para niños?",
        answer:
          "Sí, si se eligen zonas sencillas y mar tranquilo. Algunas calas son exigentes.",
      },
    ],
    relatedSlugs: ["cala-bianca", "cuevas-marinas", "excursion-barco-charter-egadi"],
  }),
  marettimoGuide({
    slug: "cala-bianca",
    title: "Cala Bianca en Marettimo: cómo verla y cuándo ir",
    shortTitle: "Cala Bianca",
    metaTitle: "Cala Bianca Marettimo: visita en barco, baño y consejos",
    metaDescription:
      "Guía de Cala Bianca en Marettimo: por qué es famosa, cómo verla en barco, cuándo bañarse y qué saber sobre mar, viento y acceso.",
    heroImage: marettimoHero,
    heroAlt: "Cala Bianca en Marettimo con agua clara y costa salvaje",
    eyebrow: "Cala icónica",
    intro:
      "Cala Bianca es una de las imágenes más deseadas de Marettimo. Su belleza está en el contraste entre agua clara, roca y sensación de aislamiento.",
    quickAnswer:
      "Cala Bianca merece la visita cuando el mar permite acercarse y bañarse con seguridad. Desde el barco se aprecia mejor, pero no debe prometerse como parada garantizada todos los días.",
    primaryKeyword: "Cala Bianca Marettimo",
    secondaryKeywords: [
      "Cala Bianca en barco",
      "bañarse en Cala Bianca",
      "calas Marettimo",
    ],
    quickFacts: [
      { label: "Tipo", value: "cala salvaje" },
      { label: "Mejor para", value: "agua clara y paisaje" },
      { label: "Depende de", value: "mar y viento" },
    ],
    itemListTitle: "Qué saber",
    itemList: [
      {
        name: "No siempre accesible",
        description:
          "La seguridad decide si se puede acercar o parar.",
      },
      {
        name: "Mejor desde el mar",
        description:
          "La perspectiva en barco muestra la cala en su contexto.",
      },
      {
        name: "Sin prisas",
        description:
          "Es una parada para disfrutar con calma, no para marcar una foto rápida.",
      },
    ],
    sections: [
      {
        id: "por-que",
        eyebrow: "Paisaje",
        title: "Por qué Cala Bianca atrae tanto",
        body: [
          "La cala concentra el carácter de Marettimo: agua limpia, costa salvaje y una sensación de distancia que pocas zonas de las Egadi transmiten igual.",
          "Su fama es merecida, pero la experiencia depende totalmente de las condiciones del día.",
        ],
        cta: "charter",
      },
      {
        id: "condiciones",
        eyebrow: "Realidad",
        title: "No es una promesa fija",
        body: [
          "Si el mar no permite acercarse con comodidad, el patrón debe elegir otra zona. En Marettimo eso no es un fracaso: es navegar con criterio.",
        ],
        cta: "compare",
      },
      {
        id: "combinar",
        eyebrow: "Ruta",
        title: "Combinarla con cuevas y Punta Troia",
        body: [
          "Cuando el día acompaña, Cala Bianca puede formar parte de una ruta con cuevas marinas y vistas hacia Punta Troia.",
        ],
      },
    ],
    faqs: [
      {
        question: "¿Se puede llegar a Cala Bianca por tierra?",
        answer:
          "Hay accesos exigentes y no siempre cómodos. Para la mayoría de visitantes, el barco es la opción más natural.",
      },
      {
        question: "¿Cala Bianca está siempre incluida en los tours?",
        answer:
          "No debería prometerse siempre. Depende de mar, viento y seguridad.",
      },
      {
        question: "¿Es buena para snorkel?",
        answer:
          "Puede serlo con agua clara y calma, siguiendo las indicaciones del patrón.",
      },
    ],
    relatedSlugs: ["playas-calas-marettimo", "cuevas-marinas", "que-ver-en-marettimo"],
  }),
  marettimoGuide({
    slug: "marettimo-en-un-dia",
    title: "Marettimo en un día: barco, senderos o pueblo",
    shortTitle: "Marettimo en un día",
    metaTitle: "Marettimo en un día: qué ver, cuevas y excursión desde Trapani",
    metaDescription:
      "Cómo visitar Marettimo en un día: cuevas marinas, pueblo, Punta Troia, senderos, ferry o charter por las Islas Egadi.",
    heroImage: marettimoHero,
    heroAlt: "Marettimo durante una excursión de un día por mar",
    eyebrow: "Itinerario",
    intro:
      "Marettimo en un día es posible, pero exige elegir. La isla está más lejos y tiene un carácter más exigente: querer hacer cuevas, senderos y pueblo en pocas horas puede ser demasiado.",
    quickAnswer:
      "Para Marettimo en un día, elige una prioridad: ruta de cuevas en barco, paseo por el pueblo y baños cercanos, o senderismo hacia Punta Troia o Case Romane. Para más flexibilidad, un charter de varios días por las Egadi funciona mejor.",
    primaryKeyword: "Marettimo en un día",
    secondaryKeywords: [
      "excursión Marettimo desde Trapani",
      "itinerario Marettimo",
      "Marettimo cuevas en un día",
    ],
    quickFacts: [
      { label: "Regla", value: "elegir una prioridad" },
      { label: "Por mar", value: "cuevas y calas" },
      { label: "A pie", value: "Punta Troia o Case Romane" },
    ],
    itemListTitle: "Tres formas de vivir el día",
    itemList: [
      {
        name: "Ruta en barco",
        description:
          "Cuevas, costa y baños según condiciones.",
      },
      {
        name: "Pueblo y baño",
        description:
          "Plan sencillo si llegas en ferry y no quieres correr.",
      },
      {
        name: "Senderismo",
        description:
          "Punta Troia o Case Romane, evitando horas de calor.",
      },
    ],
    sections: [
      {
        id: "barco",
        eyebrow: "Por mar",
        title: "La opción de cuevas",
        body: [
          "Si eliges el mar, acepta una ruta flexible. Las cuevas son el gran atractivo, pero el patrón debe adaptarlas a la meteorología.",
        ],
        cta: "charter",
      },
      {
        id: "tierra",
        eyebrow: "Por tierra",
        title: "Pueblo y senderos",
        body: [
          "Si quieres caminar, dedica el día a menos puntos y lleva agua, calzado adecuado y protección solar.",
        ],
      },
      {
        id: "sin-prisa",
        eyebrow: "Consejo",
        title: "Para Marettimo, más días son mejores",
        body: [
          "Un día ofrece una primera impresión. Con varios días puedes esperar el mar adecuado, caminar sin calor extremo y vivir la isla de forma más completa.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "¿Merece la pena Marettimo en un día?",
        answer:
          "Sí, si eliges bien el enfoque. Para una experiencia completa, mejor varios días o charter.",
      },
      {
        question: "¿Qué es mejor en un día: cuevas o senderos?",
        answer:
          "Depende de temporada y mar. En verano suele pesar más el barco; en primavera y otoño, senderos.",
      },
      {
        question: "¿Se puede combinar con Favignana?",
        answer:
          "En un solo día puede ser demasiado. Marettimo merece más margen.",
      },
    ],
    relatedSlugs: ["que-ver-en-marettimo", "cuevas-marinas", "excursion-barco-charter-egadi"],
  }),
  marettimoGuide({
    slug: "como-llegar-desde-trapani",
    title: "Cómo llegar a Marettimo desde Trapani",
    shortTitle: "Cómo llegar",
    metaTitle: "Cómo llegar a Marettimo desde Trapani: ferry, barco y charter",
    metaDescription:
      "Cómo llegar a Marettimo desde Trapani: ferry, hidroala, excursión en barco, charter por las Egadi y consejos para organizar la visita.",
    heroImage: marettimoHero,
    heroAlt: "Costa de Marettimo vista desde un barco",
    eyebrow: "Logística",
    intro:
      "Llegar a Marettimo requiere más planificación que Favignana o Levanzo. La distancia, el mar y los horarios influyen mucho en el tipo de experiencia.",
    quickAnswer:
      "Para llegar a Marettimo desde Trapani puedes usar ferry o hidroala, o planificar una experiencia en barco o charter. Si quieres cuevas y calas con menos prisa, el charter ofrece más flexibilidad que una ida y vuelta rígida.",
    primaryKeyword: "cómo llegar a Marettimo desde Trapani",
    secondaryKeywords: [
      "ferry Trapani Marettimo",
      "barco a Marettimo",
      "charter Marettimo",
    ],
    quickFacts: [
      { label: "Desde", value: "Trapani" },
      { label: "Opciones", value: "ferry, hidroala o charter" },
      { label: "Clave", value: "margen y meteorología" },
    ],
    itemListTitle: "Opciones",
    itemList: [
      {
        name: "Ferry o hidroala",
        description:
          "Para una visita por libre, revisando bien los horarios.",
      },
      {
        name: "Excursión o barco privado",
        description:
          "Adecuado solo con condiciones y tiempos suficientes.",
      },
      {
        name: "Charter",
        description:
          "La opción más flexible para esperar la ventana de mar adecuada.",
      },
    ],
    sections: [
      {
        id: "ferry",
        eyebrow: "Por libre",
        title: "Ferry e hidroala",
        body: [
          "El ferry te permite llegar al pueblo y organizar caminatas o baños cercanos. Es importante comprobar horarios de ida y vuelta, sobre todo fuera de temporada.",
        ],
      },
      {
        id: "charter",
        eyebrow: "Por mar",
        title: "Charter por las Egadi",
        body: [
          "Marettimo encaja muy bien en un charter porque permite adaptar el programa al mar. No se fuerza la isla: se espera el momento adecuado.",
        ],
        cta: "charter",
      },
      {
        id: "elegir",
        eyebrow: "Consejo",
        title: "No subestimes la distancia",
        body: [
          "Comparada con Favignana y Levanzo, Marettimo pide más navegación. Si el objetivo son cuevas y comodidad, necesitas margen.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "¿Hay ferries a Marettimo desde Trapani?",
        answer:
          "Sí, pero horarios y frecuencia deben comprobarse para la fecha exacta.",
      },
      {
        question: "¿Marettimo es adecuada para una excursión rápida?",
        answer:
          "Puede serlo, pero conviene valorar mar, duración y objetivo. Es una isla que agradece más tiempo.",
      },
      {
        question: "¿Por qué elegir charter?",
        answer:
          "Porque permite adaptar ruta y tiempos, especialmente para cuevas y calas que dependen del mar.",
      },
    ],
    relatedSlugs: ["marettimo-en-un-dia", "excursion-barco-charter-egadi", "que-ver-en-marettimo"],
  }),
  marettimoGuide({
    slug: "senderismo-rutas",
    title: "Senderismo en Marettimo: rutas, Punta Troia y Monte Falcone",
    shortTitle: "Senderismo",
    metaTitle: "Senderismo en Marettimo: rutas, Punta Troia y Monte Falcone",
    metaDescription:
      "Guía de senderismo en Marettimo: rutas hacia Punta Troia, Case Romane, Monte Falcone, consejos de temporada y cómo combinar mar y caminos.",
    heroImage: marettimoHero,
    heroAlt: "Senderos de Marettimo sobre el mar",
    eyebrow: "Senderos",
    intro:
      "Marettimo es la isla más montañosa de las Egadi y su red de senderos es una parte esencial de la experiencia, especialmente fuera del calor intenso del verano.",
    quickAnswer:
      "Las rutas más buscadas de Marettimo llevan a Punta Troia, Case Romane, Monte Falcone y miradores sobre el mar. Requieren calzado adecuado, agua y atención a calor, viento y tiempos de regreso.",
    primaryKeyword: "senderismo Marettimo",
    secondaryKeywords: [
      "rutas Marettimo",
      "Punta Troia Marettimo",
      "Monte Falcone Marettimo",
    ],
    quickFacts: [
      { label: "Mejor temporada", value: "primavera y otoño" },
      { label: "Llevar", value: "agua y calzado" },
      { label: "Rutas clave", value: "Punta Troia, Case Romane" },
    ],
    itemListTitle: "Rutas principales",
    itemList: [
      {
        name: "Punta Troia",
        description:
          "Ruta panorámica hacia el castillo, con vistas fuertes sobre la costa.",
      },
      {
        name: "Case Romane",
        description:
          "Camino histórico y panorámico más accesible que las rutas altas.",
      },
      {
        name: "Monte Falcone",
        description:
          "La opción más exigente, para caminantes preparados.",
      },
    ],
    sections: [
      {
        id: "temporada",
        eyebrow: "Temporada",
        title: "Cuándo caminar en Marettimo",
        body: [
          "Primavera y otoño son los mejores momentos para senderismo. En verano, el calor puede hacer que una ruta bonita se vuelva pesada o insegura.",
        ],
      },
      {
        id: "rutas",
        eyebrow: "Rutas",
        title: "Punta Troia, Case Romane y Monte Falcone",
        body: [
          "Punta Troia combina historia y paisaje; Case Romane ofrece una lectura arqueológica; Monte Falcone es más exigente y requiere preparación.",
        ],
        cta: "compare",
      },
      {
        id: "mar",
        eyebrow: "Combinar",
        title: "Senderos y mar, pero sin sobrecargar el día",
        body: [
          "Es tentador hacer caminata y cuevas el mismo día. Funciona mejor con más margen, o eligiendo una ruta corta y una salida en barco relajada.",
        ],
        cta: "charter",
      },
    ],
    faqs: [
      {
        question: "¿Hace falta experiencia para caminar en Marettimo?",
        answer:
          "Depende de la ruta. Case Romane es más accesible; Monte Falcone requiere mejor forma física.",
      },
      {
        question: "¿Se puede caminar en verano?",
        answer:
          "Sí, pero evita las horas centrales, lleva agua y elige rutas acordes al calor.",
      },
      {
        question: "¿Qué ruta tiene mejores vistas?",
        answer:
          "Punta Troia y Monte Falcone ofrecen panoramas muy fuertes, con niveles de esfuerzo distintos.",
      },
    ],
    relatedSlugs: ["que-ver-en-marettimo", "marettimo-en-un-dia", "excursion-barco-charter-egadi"],
  }),
  marettimoGuide({
    slug: "excursion-barco-charter-egadi",
    title: "Excursión en barco y charter a Marettimo en las Islas Egadi",
    shortTitle: "Barco y charter",
    metaTitle: "Excursión en barco a Marettimo y charter por las Islas Egadi",
    metaDescription:
      "Cómo elegir una excursión en barco o charter a Marettimo: cuevas, Cala Bianca, Favignana, Levanzo, ruta flexible y experiencia premium en Neel 47.",
    heroImage: charterImage,
    heroAlt: "Trimarán navegando en charter por las Islas Egadi hacia Marettimo",
    eyebrow: "Charter Egadi",
    intro:
      "Marettimo es la isla que mejor explica el valor de un charter: más distancia, más condiciones que leer y más recompensa cuando se encuentra la ventana adecuada.",
    quickAnswer:
      "Para visitar Marettimo en barco, el charter por las Islas Egadi ofrece más flexibilidad que una excursión rígida. Permite combinar Favignana, Levanzo y Marettimo, adaptar la ruta al mar y dedicar más tiempo a cuevas, Cala Bianca y navegación lenta.",
    primaryKeyword: "charter Islas Egadi Marettimo",
    secondaryKeywords: [
      "excursión en barco Marettimo",
      "tour privado Marettimo",
      "Neel 47 Egadi",
      "cuevas Marettimo en barco",
    ],
    quickFacts: [
      { label: "Ideal para", value: "varios días" },
      { label: "Islas", value: "Favignana, Levanzo, Marettimo" },
      { label: "Barco premium", value: "Neel 47" },
    ],
    itemListTitle: "Qué permite el charter",
    itemList: [
      {
        name: "Esperar el mar adecuado",
        description:
          "No forzar Marettimo cuando las condiciones no acompañan.",
      },
      {
        name: "Dormir cerca de la ruta",
        description:
          "Más tiempo real en el archipiélago y menos sensación de ida y vuelta.",
      },
      {
        name: "Combinar islas",
        description:
          "Favignana, Levanzo y Marettimo según viento, ritmo y duración.",
      },
    ],
    sections: [
      {
        id: "por-que",
        eyebrow: "Flexibilidad",
        title: "Marettimo premia el margen",
        body: [
          "Una salida de pocas horas puede funcionar, pero Marettimo tiene más sentido cuando se puede adaptar el programa. El charter permite elegir el mejor momento para cuevas, Cala Bianca y navegación alrededor de la isla.",
        ],
        cta: "charter",
      },
      {
        id: "neel",
        eyebrow: "Neel 47",
        title: "El lado premium del charter",
        body: [
          "El trimarán Neel 47 ofrece espacio, estabilidad, camarotes y zonas comunes amplias. Es una experiencia más lenta, cómoda y adecuada para varios días.",
        ],
        cta: "private",
      },
      {
        id: "ruta",
        eyebrow: "Ruta",
        title: "Favignana, Levanzo y Marettimo sin una lista rígida",
        body: [
          "La ruta ideal se construye con el patrón. A veces Marettimo será protagonista; otras, una ruta más protegida por Favignana y Levanzo será la decisión correcta.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "¿Cuántos días convienen para un charter por las Egadi?",
        answer:
          "De 3 a 7 días permiten ajustar la ruta y aumentar las posibilidades de incluir Marettimo con buenas condiciones.",
      },
      {
        question: "¿Marettimo está garantizada?",
        answer:
          "No debería prometerse como garantía absoluta. Depende del mar y de la seguridad.",
      },
      {
        question: "¿Qué diferencia hay entre tour privado y charter?",
        answer:
          "El tour privado es una salida de jornada o media jornada; el charter es una experiencia de varios días con vida a bordo.",
      },
    ],
    relatedSlugs: ["que-ver-en-marettimo", "cuevas-marinas", "marettimo-en-un-dia"],
  }),
];

export const marettimoGuideLinksEs: Array<{
  slug: MarettimoGuideSlug;
  title: string;
  description: string;
}> = marettimoGuidesEs.map((guide) => ({
  slug: guide.slug,
  title: guide.shortTitle,
  description: guide.quickAnswer,
}));
