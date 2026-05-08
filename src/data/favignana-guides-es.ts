import type { FavignanaGuide, FavignanaGuideSlug } from "./favignana-guides";

const favignanaHero = "/images/islands/favignana/hero.webp";
const calaRossaImage = "/images/islands/favignana/poi/cala-rossa.webp";
const bueMarinoImage = "/images/islands/favignana/poi/bue-marino.webp";
const calaAzzurraImage = "/images/islands/favignana/poi/cala-azzurra.webp";
const tonnaraImage = "/images/islands/favignana/poi/tonnara.webp";
const boatImage = "/images/experience-polaroids/barca-8-ore-snorkeling.webp";

function favignanaGuide(guide: FavignanaGuide): FavignanaGuide {
  return guide;
}

export const favignanaGuidesEs: FavignanaGuide[] = [
  favignanaGuide({
    slug: "que-ver-en-favignana",
    title: "Qué ver en Favignana: 10 lugares imprescindibles",
    shortTitle: "Qué ver",
    metaTitle: "Qué ver en Favignana: playas, calas, historia y barco",
    metaDescription:
      "Guía para saber qué ver en Favignana: Cala Rossa, Bue Marino, Cala Azzurra, la tonnara Florio, canteras de toba y excursiones en barco desde Trapani.",
    heroImage: favignanaHero,
    heroAlt: "Favignana vista desde el mar con agua turquesa y costa rocosa",
    eyebrow: "Guía completa",
    intro:
      "Favignana es la isla más famosa de las Egadi, pero no se entiende solo con una lista de playas. Hay calas de roca clara, antiguas canteras de toba, memoria de la pesca del atún, un pueblo fácil de recorrer y una costa que cambia mucho según el viento.",
    quickAnswer:
      "Los lugares principales que ver en Favignana son Cala Rossa, Bue Marino, Cala Azzurra, Lido Burrone, el Ex Stabilimento Florio, Palazzo Florio, el Castillo de Santa Caterina, Scalo Cavallo, Grotta Perciata y Punta Sottile. Si tienes poco tiempo, una excursión en barco desde Trapani ayuda a ver más costa sin perder horas en desplazamientos.",
    primaryKeyword: "qué ver en Favignana",
    secondaryKeywords: [
      "Favignana qué hacer",
      "lugares imprescindibles Favignana",
      "Favignana en barco",
      "Islas Egadi",
    ],
    quickFacts: [
      { label: "Ideal para", value: "primera visita" },
      { label: "Tiempo mínimo", value: "1 día" },
      { label: "Mejor combinación", value: "Favignana y Levanzo en barco" },
    ],
    itemListTitle: "Los 10 lugares principales",
    itemList: [
      {
        name: "Cala Rossa",
        description:
          "La cala más icónica de Favignana, con agua turquesa, roca clara y antiguas canteras junto al mar.",
      },
      {
        name: "Bue Marino",
        description:
          "Un tramo mineral y escénico, con canteras de toba, agua más profunda y fondos rocosos.",
      },
      {
        name: "Cala Azzurra",
        description:
          "Una cala luminosa, de colores claros y entrada al agua más sencilla.",
      },
      {
        name: "Lido Burrone",
        description:
          "La playa de arena más cómoda de la isla, práctica para familias y para una parada fácil.",
      },
      {
        name: "Ex Stabilimento Florio",
        description:
          "La antigua tonnara, hoy museo, clave para entender la historia económica y marítima de Favignana.",
      },
      {
        name: "Palazzo Florio",
        description:
          "La residencia histórica de la familia Florio, muy cerca del puerto y del centro.",
      },
      {
        name: "Castillo de Santa Caterina",
        description:
          "El mirador más reconocible de la isla, útil para leer la forma de Favignana desde arriba.",
      },
      {
        name: "Scalo Cavallo",
        description:
          "Zona rocosa con huellas de cantera, interesante para fotos, geología y snorkel ligero.",
      },
      {
        name: "Grotta Perciata",
        description:
          "Arcos naturales y costa baja, bonita cuando el mar está limpio y entra bien la luz.",
      },
      {
        name: "Punta Sottile",
        description:
          "El faro y el lado de los atardeceres, más abierto y tranquilo que las calas más famosas.",
      },
    ],
    sections: [
      {
        id: "mar-calas",
        eyebrow: "Mar y calas",
        title: "Cala Rossa, Bue Marino y Cala Azzurra no son iguales",
        body: [
          "Cala Rossa es la imagen clásica de Favignana: roca clara, agua intensa y restos de cantera. Bue Marino tiene un carácter más vertical y mineral. Cala Azzurra es más suave, luminosa y fácil para un baño tranquilo.",
          "La elección no debe depender solo de la fama. En Favignana el viento decide mucho: una cala perfecta por la mañana puede resultar incómoda por la tarde. Por eso la isla funciona muy bien desde el mar, con una ruta flexible.",
        ],
        bullets: [
          "Cala Rossa para paisaje y color turquesa.",
          "Bue Marino para canteras de toba y fondos rocosos.",
          "Cala Azzurra para un baño más sencillo y relajado.",
        ],
        cta: "cigala",
      },
      {
        id: "historia",
        eyebrow: "Más allá de la playa",
        title: "La tonnara Florio y el lado histórico de la isla",
        body: [
          "El Ex Stabilimento Florio no es una visita secundaria. Explica cómo la isla creció alrededor de la pesca del atún, el trabajo en la tonnara y la influencia de la familia Florio.",
          "Palazzo Florio, el puerto y el Castillo de Santa Caterina completan la lectura de Favignana. Alternar mar e historia hace que la jornada sea más rica y menos repetitiva.",
        ],
        cards: [
          {
            title: "Ex Stabilimento Florio",
            text: "Museo, memoria de la tonnara y cultura marítima.",
            tag: "Historia",
            image: tonnaraImage,
          },
          {
            title: "Canteras de toba",
            text: "El paisaje claro de Favignana nace también del trabajo en la piedra.",
            tag: "Paisaje",
            image: bueMarinoImage,
          },
          {
            title: "Costa desde el mar",
            text: "La forma de la isla se entiende mejor navegando entre sus lados.",
            tag: "Barco",
            image: boatImage,
          },
        ],
        cta: "compare",
      },
      {
        id: "como-elegir",
        eyebrow: "Consejo práctico",
        title: "Si solo tienes un día, no intentes verlo todo",
        body: [
          "Favignana puede convertirse en una carrera si se intenta saltar de cala en cala por tierra. Conviene elegir un hilo conductor: mar y snorkel, pueblo e historia, o una excursión en barco con paradas seleccionadas.",
          "En barco se ve más costa y se adapta la ruta a las condiciones reales. Si una zona está expuesta, se busca una bahía más protegida sin perder el sentido de la jornada.",
        ],
        note:
          "Ninguna cala debería prometerse como garantizada: la mejor ruta es la que respeta meteorología, seguridad y comodidad.",
        cta: "neel",
      },
    ],
    faqs: [
      {
        question: "¿Cuál es el lugar más bonito de Favignana?",
        answer:
          "Cala Rossa es el lugar más icónico, pero Bue Marino, Cala Azzurra, la tonnara Florio y el Castillo de Santa Caterina hacen que la visita sea más completa.",
      },
      {
        question: "¿Se puede ver Favignana en un día?",
        answer:
          "Sí, un día basta para una primera impresión. Para no perder tiempo, conviene elegir pocas paradas o hacer una excursión en barco desde Trapani.",
      },
      {
        question: "¿Favignana es mejor por tierra o en barco?",
        answer:
          "Por tierra se disfruta el pueblo, la tonnara y algunas playas fáciles. En barco se entiende mejor la costa, las calas rocosas y el snorkel.",
      },
    ],
    relatedSlugs: [
      "mejores-playas-calas-favignana",
      "favignana-en-un-dia",
      "excursion-barco-favignana-levanzo",
    ],
  }),
  favignanaGuide({
    slug: "mejores-playas-calas-favignana",
    title: "Mejores playas y calas de Favignana: dónde bañarse",
    shortTitle: "Playas y calas",
    metaTitle: "Mejores playas y calas de Favignana para bañarse",
    metaDescription:
      "Las mejores playas y calas de Favignana: Cala Rossa, Cala Azzurra, Lido Burrone, Bue Marino, Grotta Perciata y consejos según viento y acceso.",
    heroImage: calaAzzurraImage,
    heroAlt: "Cala Azzurra en Favignana con agua clara y fondo luminoso",
    eyebrow: "Playas y mar",
    intro:
      "Las playas de Favignana no tienen todas el mismo carácter. Algunas son cómodas y arenosas; otras son calas rocosas muy fotogénicas, espectaculares desde el mar pero menos sencillas desde tierra.",
    quickAnswer:
      "Para un baño fácil, elige Cala Azzurra, Lido Burrone y Marasolo. Para paisaje y fotos, Cala Rossa, Bue Marino, Scalo Cavallo y Grotta Perciata. Con viento o mucha afluencia, una excursión en barco permite buscar la cala más protegida del día.",
    primaryKeyword: "mejores playas Favignana",
    secondaryKeywords: [
      "calas Favignana",
      "dónde bañarse en Favignana",
      "Cala Rossa Favignana",
      "Cala Azzurra Favignana",
    ],
    quickFacts: [
      { label: "Baño fácil", value: "Cala Azzurra y Lido Burrone" },
      { label: "Más escénicas", value: "Cala Rossa y Bue Marino" },
      { label: "Factor clave", value: "viento del día" },
    ],
    itemListTitle: "Zonas de baño recomendadas",
    itemList: [
      {
        name: "Cala Azzurra",
        description:
          "Agua clara, fondo luminoso y sensación más suave que las calas rocosas.",
      },
      {
        name: "Lido Burrone",
        description:
          "Playa de arena con servicios y acceso sencillo, cómoda para familias.",
      },
      {
        name: "Cala Rossa",
        description:
          "Muy escénica, rocosa y famosa por el contraste entre piedra clara y agua turquesa.",
      },
      {
        name: "Bue Marino",
        description:
          "Canteras, agua profunda y fondos interesantes con mar favorable.",
      },
      {
        name: "Scalo Cavallo",
        description:
          "Costa rocosa con puntos bonitos para nadar cuando las condiciones son adecuadas.",
      },
    ],
    sections: [
      {
        id: "faciles",
        eyebrow: "Acceso sencillo",
        title: "Cala Azzurra y Lido Burrone para un baño más cómodo",
        body: [
          "Cala Azzurra y Lido Burrone son las respuestas más simples cuando se busca una entrada al agua menos exigente. Son zonas más adecuadas para quien no quiere trepar por rocas o cargar demasiadas cosas.",
          "En temporada alta pueden llenarse rápido, así que conviene llegar temprano o mantener flexibilidad.",
        ],
        cta: "cigala",
      },
      {
        id: "rocosas",
        eyebrow: "Paisaje",
        title: "Cala Rossa y Bue Marino: más belleza, menos comodidad",
        body: [
          "Las calas más famosas de Favignana son también más rocosas. Funcionan muy bien para nadar, hacer fotos y mirar el paisaje, pero no siempre son las más cómodas para pasar muchas horas en tierra.",
          "Desde el barco se leen mejor: el patrón puede elegir distancia, punto de baño y momento según el mar.",
        ],
        cards: [
          {
            title: "Cala Rossa",
            text: "La postal más conocida de Favignana.",
            tag: "Icono",
            image: calaRossaImage,
          },
          {
            title: "Bue Marino",
            text: "Canteras de toba y agua más profunda.",
            tag: "Roca",
            image: bueMarinoImage,
          },
          {
            title: "Cala Azzurra",
            text: "Colores claros y baño más suave.",
            tag: "Baño",
            image: calaAzzurraImage,
          },
        ],
        cta: "compare",
      },
      {
        id: "viento",
        eyebrow: "Condiciones",
        title: "La mejor cala cambia con el viento",
        body: [
          "En las Islas Egadi no hay una respuesta fija para todos los días. La cala ideal depende de viento, oleaje, luz y afluencia.",
          "Una ruta en barco bien hecha no fuerza el plan: busca agua clara, seguridad y una experiencia cómoda.",
        ],
        note:
          "Para snorkel, prioriza siempre mar calmado y entrada al agua segura.",
      },
    ],
    faqs: [
      {
        question: "¿Cuál es la mejor playa de Favignana para familias?",
        answer:
          "Lido Burrone y Cala Azzurra suelen ser más fáciles por acceso y tipo de baño. En barco, la tripulación puede elegir una zona protegida.",
      },
      {
        question: "¿Cala Rossa es cómoda para bañarse?",
        answer:
          "Es preciosa, pero rocosa. Es mejor para paisaje, baño con cuidado y visitas desde el mar que para una jornada de playa clásica.",
      },
      {
        question: "¿Dónde hacer snorkel en Favignana?",
        answer:
          "Bue Marino, Scalo Cavallo y algunas zonas cerca de Cala Rossa pueden ser interesantes, siempre con mar tranquilo.",
      },
    ],
    relatedSlugs: ["cala-rossa", "bue-marino-canteras-toba", "snorkel-en-favignana"],
  }),
  favignanaGuide({
    slug: "favignana-en-un-dia",
    title: "Favignana en un día: itinerario práctico sin correr",
    shortTitle: "Favignana en un día",
    metaTitle: "Favignana en un día: itinerario, barco y consejos desde Trapani",
    metaDescription:
      "Cómo visitar Favignana en un día: qué ver, cómo moverse, mejores calas, opción en barco desde Trapani y consejos para evitar una jornada demasiado apretada.",
    heroImage: favignanaHero,
    heroAlt: "Costa de Favignana durante una excursión de un día en barco",
    eyebrow: "Itinerario",
    intro:
      "Favignana en un día funciona si se elige bien. La isla parece pequeña, pero los desplazamientos, las calas rocosas y el calor pueden convertir la visita en una carrera si se intenta abarcar demasiado.",
    quickAnswer:
      "Para Favignana en un día, elige entre dos enfoques: pueblo, tonnara y 2 o 3 calas por tierra, o excursión en barco desde Trapani para combinar Favignana y Levanzo con baños y snorkel. Evita prometerte todas las calas famosas en una sola jornada.",
    primaryKeyword: "Favignana en un día",
    secondaryKeywords: [
      "itinerario Favignana un día",
      "excursión Favignana desde Trapani",
      "Favignana y Levanzo en barco",
    ],
    quickFacts: [
      { label: "Mejor enfoque", value: "pocas paradas bien elegidas" },
      { label: "Por tierra", value: "pueblo, tonnara y 2 calas" },
      { label: "En barco", value: "más costa y menos logística" },
    ],
    itemListTitle: "Plan recomendado",
    itemList: [
      {
        name: "Mañana",
        description:
          "Llegada, pueblo, tonnara Florio o primera cala según la hora.",
      },
      {
        name: "Mediodía",
        description:
          "Baño en una zona protegida y pausa sin intentar cruzar toda la isla.",
      },
      {
        name: "Tarde",
        description:
          "Segunda cala o regreso panorámico si estás en barco.",
      },
      {
        name: "Alternativa",
        description:
          "Excursión en barco Favignana y Levanzo desde Trapani para reducir traslados.",
      },
    ],
    sections: [
      {
        id: "por-tierra",
        eyebrow: "Por tierra",
        title: "Un día por libre: elige una zona y no cambies cada hora",
        body: [
          "Si llegas en ferry, puedes dedicar parte de la mañana al pueblo y a la tonnara Florio, después moverte hacia Cala Azzurra o Lido Burrone para un baño más sencillo.",
          "Cala Rossa y Bue Marino merecen atención, pero conviene evaluar acceso, calor y viento. Ir de una punta a otra solo para marcar nombres puede dejar poco tiempo para disfrutar.",
        ],
        cta: "compare",
      },
      {
        id: "en-barco",
        eyebrow: "Desde Trapani",
        title: "La opción en barco: Favignana y Levanzo con menos logística",
        body: [
          "Una excursión en barco desde Trapani es la solución más fluida si quieres ver costa, bañarte y sumar Levanzo sin depender de varios transportes.",
          "La ruta se adapta a condiciones reales, por eso suele ser mejor hablar de experiencia y zonas posibles, no de una lista rígida de calas garantizadas.",
        ],
        cta: "cigala",
      },
      {
        id: "consejo",
        eyebrow: "Ritmo",
        title: "El error habitual: querer verlo todo",
        body: [
          "Favignana se disfruta más cuando se acepta que un día es una primera lectura. Elige mar, historia o navegación, y deja espacio para comer, nadar y volver sin estrés.",
        ],
        note:
          "En verano, reserva con antelación tanto ferries como excursiones en barco.",
      },
    ],
    faqs: [
      {
        question: "¿Merece la pena Favignana solo un día?",
        answer:
          "Sí, especialmente si organizas bien el ritmo. En un día puedes disfrutar el mar y una parte de la isla, pero no verlo todo.",
      },
      {
        question: "¿Es mejor ferry o excursión en barco?",
        answer:
          "El ferry sirve si quieres moverte por libre. La excursión en barco es mejor si buscas calas, snorkel y menos logística.",
      },
      {
        question: "¿Se puede combinar Favignana y Levanzo en un día?",
        answer:
          "Sí, es una de las combinaciones más buscadas en excursión en barco desde Trapani.",
      },
    ],
    relatedSlugs: [
      "que-ver-en-favignana",
      "excursion-barco-favignana-levanzo",
      "como-llegar-desde-trapani-y-moverse",
    ],
  }),
  favignanaGuide({
    slug: "cala-rossa",
    title: "Cala Rossa en Favignana: cómo verla y cuándo ir",
    shortTitle: "Cala Rossa",
    metaTitle: "Cala Rossa Favignana: consejos, acceso y visita en barco",
    metaDescription:
      "Guía de Cala Rossa en Favignana: por qué es famosa, cómo llegar, cuándo verla, baño, snorkel y por qué desde el barco se aprecia mejor.",
    heroImage: calaRossaImage,
    heroAlt: "Cala Rossa en Favignana con agua turquesa y roca clara",
    eyebrow: "Cala icónica",
    intro:
      "Cala Rossa es la postal más conocida de Favignana: agua turquesa, piedra clara y un paisaje marcado por antiguas canteras. Es espectacular, pero conviene entender que no es una playa cómoda en sentido clásico.",
    quickAnswer:
      "Cala Rossa merece la visita por color, paisaje y fotografía. El acceso por tierra es rocoso y puede estar lleno en temporada alta; desde el barco se aprecia mejor la forma de la cala y se puede elegir el baño solo si el mar es adecuado.",
    primaryKeyword: "Cala Rossa Favignana",
    secondaryKeywords: [
      "cómo llegar a Cala Rossa",
      "Cala Rossa en barco",
      "snorkel Cala Rossa",
    ],
    quickFacts: [
      { label: "Tipo", value: "cala rocosa" },
      { label: "Mejor para", value: "paisaje, fotos y baño con calma" },
      { label: "Atención", value: "acceso y afluencia" },
    ],
    itemListTitle: "Qué saber antes de ir",
    itemList: [
      {
        name: "No es una playa de arena",
        description:
          "El terreno es rocoso y requiere calzado cómodo y atención al entrar al agua.",
      },
      {
        name: "El color cambia con la luz",
        description:
          "Con sol alto y mar tranquilo, el agua muestra sus tonos más intensos.",
      },
      {
        name: "Desde el mar se entiende mejor",
        description:
          "La vista en barco permite leer las canteras, la forma de la cala y las zonas de baño.",
      },
    ],
    sections: [
      {
        id: "por-que",
        eyebrow: "Paisaje",
        title: "Por qué Cala Rossa es tan famosa",
        body: [
          "La belleza de Cala Rossa nace del contraste entre la roca clara, las antiguas excavaciones y el azul del agua. No es solo una cala bonita: es una imagen muy ligada a la historia de Favignana.",
          "Esa fama atrae mucha gente. Para disfrutarla mejor, hay que aceptar la flexibilidad: mirar el mar, elegir el momento y no forzar el baño si las condiciones no ayudan.",
        ],
        cta: "cigala",
      },
      {
        id: "acceso",
        eyebrow: "Acceso",
        title: "Por tierra o en barco",
        body: [
          "Por tierra se llega con bici, scooter o taxi, pero el último tramo es rocoso y en verano puede resultar incómodo.",
          "En barco, Cala Rossa se vive de forma más panorámica. La tripulación decide si acercarse, bañarse o continuar hacia una zona más protegida.",
        ],
        cta: "compare",
      },
      {
        id: "snorkel",
        eyebrow: "Snorkel",
        title: "Baño y snorkel solo con mar tranquilo",
        body: [
          "Cala Rossa puede ser interesante para nadar y observar el fondo, pero no debe tomarse como una piscina natural garantizada. Con oleaje, roca y afluencia, es mejor cambiar de punto.",
        ],
        note:
          "Lleva calzado cómodo, agua y protección solar si vas por tierra.",
      },
    ],
    faqs: [
      {
        question: "¿Cala Rossa tiene arena?",
        answer:
          "No, es principalmente rocosa. Por eso se disfruta mejor con calzado adecuado o desde el barco.",
      },
      {
        question: "¿Se puede ir a Cala Rossa en barco?",
        answer:
          "Sí, muchas excursiones la incluyen si el mar lo permite. La parada exacta depende de seguridad y condiciones.",
      },
      {
        question: "¿Cuándo es mejor ver Cala Rossa?",
        answer:
          "Con mar tranquilo y buena luz. En temporada alta, las horas de menor afluencia ayudan mucho.",
      },
    ],
    relatedSlugs: [
      "mejores-playas-calas-favignana",
      "bue-marino-canteras-toba",
      "snorkel-en-favignana",
    ],
  }),
  favignanaGuide({
    slug: "bue-marino-canteras-toba",
    title: "Bue Marino y las canteras de toba de Favignana",
    shortTitle: "Bue Marino",
    metaTitle: "Bue Marino Favignana: canteras de toba, baño y visita en barco",
    metaDescription:
      "Guía de Bue Marino en Favignana: canteras de toba, agua profunda, acceso, snorkel y consejos para verlo desde tierra o en barco.",
    heroImage: bueMarinoImage,
    heroAlt: "Bue Marino en Favignana con canteras de toba y mar azul profundo",
    eyebrow: "Toba y mar",
    intro:
      "Bue Marino es una de las zonas más particulares de Favignana. No seduce por una playa fácil, sino por sus paredes de toba, el color profundo del agua y la sensación de una costa tallada por trabajo y mar.",
    quickAnswer:
      "Bue Marino merece la visita si buscas paisaje mineral, fotos, agua clara y fondos rocosos. El acceso por tierra es menos cómodo que en una playa, y desde el barco se aprecia mejor la escala de las canteras.",
    primaryKeyword: "Bue Marino Favignana",
    secondaryKeywords: [
      "canteras de toba Favignana",
      "Bue Marino en barco",
      "snorkel Bue Marino",
    ],
    quickFacts: [
      { label: "Tipo", value: "costa rocosa y canteras" },
      { label: "Mejor para", value: "paisaje y snorkel con mar calmo" },
      { label: "Acceso", value: "más exigente por tierra" },
    ],
    itemListTitle: "Por qué ir",
    itemList: [
      {
        name: "Canteras de toba",
        description:
          "El corte de la piedra crea un paisaje único, muy diferente a una cala de arena.",
      },
      {
        name: "Agua profunda",
        description:
          "Los tonos azules son más intensos y el baño requiere más atención.",
      },
      {
        name: "Vista desde el mar",
        description:
          "La perspectiva en barco permite entender la escala de las paredes.",
      },
    ],
    sections: [
      {
        id: "paisaje",
        eyebrow: "Paisaje",
        title: "Una de las costas más minerales de Favignana",
        body: [
          "En Bue Marino la historia de las canteras se ve en la roca. Las formas rectas, las sombras y el contraste con el agua hacen que el lugar sea muy fotogénico.",
          "Es una parada más contemplativa que cómoda: funciona muy bien para navegar cerca, mirar, bañarse si el mar lo permite y seguir hacia otra cala.",
        ],
        cta: "cigala",
      },
      {
        id: "banio",
        eyebrow: "Baño",
        title: "No es una cala para todo el mundo",
        body: [
          "El agua puede ser maravillosa, pero la entrada desde tierra no es tan sencilla y el fondo es rocoso. Con niños o personas poco ágiles, conviene valorar alternativas más suaves.",
          "En barco el patrón puede elegir un punto de baño cercano y más cómodo, o cambiar zona si el oleaje entra mal.",
        ],
      },
      {
        id: "combinar",
        eyebrow: "Ruta",
        title: "Cómo combinar Bue Marino con Cala Rossa y Cala Azzurra",
        body: [
          "Bue Marino tiene sentido dentro de una ruta flexible por la costa de Favignana. Cala Rossa aporta icono visual, Cala Azzurra suavidad y Bue Marino carácter mineral.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "¿Bue Marino es una playa?",
        answer:
          "No en sentido clásico. Es una zona rocosa de canteras junto al mar, más escénica que cómoda.",
      },
      {
        question: "¿Se puede hacer snorkel en Bue Marino?",
        answer:
          "Sí, con mar tranquilo y buena visibilidad. La tripulación debe elegir una zona segura.",
      },
      {
        question: "¿Es mejor Bue Marino desde tierra o desde el mar?",
        answer:
          "Desde el mar se entiende mejor el paisaje y se evita parte de la incomodidad del acceso.",
      },
    ],
    relatedSlugs: ["cala-rossa", "mejores-playas-calas-favignana", "excursion-barco-favignana-levanzo"],
  }),
  favignanaGuide({
    slug: "snorkel-en-favignana",
    title: "Snorkel en Favignana: mejores zonas y consejos",
    shortTitle: "Snorkel",
    metaTitle: "Snorkel en Favignana: calas, fondos y excursiones en barco",
    metaDescription:
      "Dónde hacer snorkel en Favignana: Bue Marino, Scalo Cavallo, Cala Rossa, zonas protegidas y consejos para elegir según viento y mar.",
    heroImage: boatImage,
    heroAlt: "Snorkel durante una excursión en barco en Favignana",
    eyebrow: "Snorkel",
    intro:
      "El snorkel en Favignana depende menos de una cala concreta y más de las condiciones del día. Agua clara, poco viento, fondo interesante y una entrada segura son más importantes que perseguir el nombre más famoso.",
    quickAnswer:
      "Para hacer snorkel en Favignana, mira zonas como Bue Marino, Scalo Cavallo, Cala Rossa y tramos protegidos alrededor de la isla. En barco es más fácil elegir el punto adecuado según viento, oleaje y visibilidad.",
    primaryKeyword: "snorkel en Favignana",
    secondaryKeywords: [
      "snorkeling Favignana",
      "mejores zonas snorkel Favignana",
      "snorkel Islas Egadi",
    ],
    quickFacts: [
      { label: "Mejor condición", value: "mar calmo" },
      { label: "Fondos", value: "roca, praderas y agua clara" },
      { label: "Consejo", value: "ruta flexible en barco" },
    ],
    itemListTitle: "Zonas a considerar",
    itemList: [
      {
        name: "Bue Marino",
        description:
          "Interesante por roca, profundidad y paisaje de canteras.",
      },
      {
        name: "Scalo Cavallo",
        description:
          "Zona rocosa con fondos bonitos si la visibilidad acompaña.",
      },
      {
        name: "Cala Rossa",
        description:
          "Muy conocida, pero solo recomendable con mar tranquilo y poca afluencia.",
      },
      {
        name: "Calas protegidas del día",
        description:
          "A menudo la mejor parada no es la más famosa, sino la más resguardada.",
      },
    ],
    sections: [
      {
        id: "condiciones",
        eyebrow: "Seguridad",
        title: "La mejor zona de snorkel cambia cada día",
        body: [
          "El snorkel necesita agua limpia, poca corriente y un punto de entrada cómodo. Por eso no conviene prometer una cala fija como la mejor en cualquier fecha.",
          "Una tripulación local lee viento y oleaje y elige la zona donde el baño es más agradable y seguro.",
        ],
        cta: "cigala",
      },
      {
        id: "fondos",
        eyebrow: "Fondos",
        title: "Qué esperar bajo el agua",
        body: [
          "Favignana ofrece roca clara, cambios de profundidad, praderas marinas y zonas donde la luz crea colores intensos. No es una experiencia de coral tropical: su belleza es mediterránea, limpia y mineral.",
        ],
        bullets: [
          "Usa máscara cómoda y protección solar compatible con el mar.",
          "No toques fondos, plantas ni fauna.",
          "Sigue siempre las indicaciones del patrón.",
        ],
      },
      {
        id: "barco",
        eyebrow: "En barco",
        title: "Por qué el barco ayuda al snorkel",
        body: [
          "Desde tierra dependes del punto donde llegas. En barco puedes cambiar costa, buscar una bahía más tranquila y combinar snorkel con navegación panorámica.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "¿Cuál es la mejor zona para snorkel en Favignana?",
        answer:
          "Bue Marino, Scalo Cavallo y Cala Rossa pueden ser buenas, pero la mejor elección depende del mar del día.",
      },
      {
        question: "¿Hace falta experiencia?",
        answer:
          "Para snorkel básico no, pero hay que saber nadar y seguir las indicaciones de seguridad.",
      },
      {
        question: "¿El snorkel está incluido en los tours?",
        answer:
          "Las paradas de baño y snorkel forman parte de muchas excursiones, siempre según condiciones y formato elegido.",
      },
    ],
    relatedSlugs: ["mejores-playas-calas-favignana", "bue-marino-canteras-toba", "excursion-barco-favignana-levanzo"],
  }),
  favignanaGuide({
    slug: "como-llegar-desde-trapani-y-moverse",
    title: "Cómo llegar a Favignana desde Trapani y moverse por la isla",
    shortTitle: "Cómo llegar",
    metaTitle: "Cómo llegar a Favignana desde Trapani: ferry, barco y movilidad",
    metaDescription:
      "Cómo llegar a Favignana desde Trapani: ferry, hidroala, excursión en barco, bici, scooter y consejos para organizar una visita sin perder tiempo.",
    heroImage: "/images/islands/favignana/poi/porto.webp",
    heroAlt: "Puerto de Favignana con barcos y casas cerca del mar",
    eyebrow: "Logística",
    intro:
      "Llegar a Favignana desde Trapani es sencillo, pero la diferencia está en cómo quieres vivir el día: desembarcar por libre y moverte por tierra, o salir ya en barco con una ruta de mar organizada.",
    quickAnswer:
      "Para llegar a Favignana desde Trapani puedes tomar ferry o hidroala, o reservar una excursión en barco. En la isla te mueves a pie por el pueblo, en bici, scooter, taxi o con servicios locales. Si el objetivo son calas y snorkel, el barco reduce mucha logística.",
    primaryKeyword: "cómo llegar a Favignana desde Trapani",
    secondaryKeywords: [
      "ferry Trapani Favignana",
      "moverse en Favignana",
      "excursión barco Trapani Favignana",
    ],
    quickFacts: [
      { label: "Desde Trapani", value: "ferry, hidroala o excursión" },
      { label: "En la isla", value: "bici, scooter, taxi" },
      { label: "Para calas", value: "mejor ruta en barco" },
    ],
    itemListTitle: "Opciones principales",
    itemList: [
      {
        name: "Ferry o hidroala",
        description:
          "Buena opción si quieres caminar por el pueblo y decidir por libre.",
      },
      {
        name: "Excursión en barco",
        description:
          "Ideal si buscas mar, baños, snorkel y posible combinación con Levanzo.",
      },
      {
        name: "Bici o scooter",
        description:
          "Útiles para moverte por tierra, teniendo en cuenta calor, distancias y accesos rocosos.",
      },
    ],
    sections: [
      {
        id: "ferry",
        eyebrow: "Por libre",
        title: "Ferry e hidroala: flexibilidad en tierra",
        body: [
          "El ferry o hidroala desde Trapani te deja en el puerto de Favignana, junto al pueblo. Es una buena solución si quieres visitar la tonnara, caminar por el centro y alquilar una bici o scooter.",
          "El límite aparece cuando el objetivo son muchas calas: entre alquiler, accesos, calor y horarios de vuelta, el día puede fragmentarse.",
        ],
      },
      {
        id: "barco",
        eyebrow: "Mar",
        title: "Excursión en barco: menos traslados y más costa",
        body: [
          "Salir directamente en barco desde Trapani permite dedicar el día al mar. La tripulación decide las paradas según viento y condiciones, y suele ser más fácil combinar Favignana con Levanzo.",
        ],
        cta: "cigala",
      },
      {
        id: "moverse",
        eyebrow: "En la isla",
        title: "Bici, scooter y distancias reales",
        body: [
          "Favignana se presta a bici y scooter, pero en verano el calor pesa. Lleva agua, no subestimes los accesos rocosos y revisa siempre el horario de regreso.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "¿Desde dónde salen los barcos a Favignana?",
        answer:
          "La mayoría de ferries, hidroalas y excursiones salen desde Trapani. Comprueba siempre puerto, hora y punto de encuentro.",
      },
      {
        question: "¿Necesito coche en Favignana?",
        answer:
          "No suele ser necesario para una visita turística. Bici, scooter, taxi o barco cubren la mayoría de necesidades.",
      },
      {
        question: "¿Qué conviene reservar antes?",
        answer:
          "En temporada alta, ferries, excursiones en barco y alquileres se agotan con facilidad.",
      },
    ],
    relatedSlugs: ["favignana-en-un-dia", "excursion-barco-favignana-levanzo", "que-ver-en-favignana"],
  }),
  favignanaGuide({
    slug: "excursion-barco-favignana-levanzo",
    title: "Excursión en barco a Favignana y Levanzo desde Trapani",
    shortTitle: "Favignana y Levanzo",
    metaTitle: "Excursión en barco Favignana y Levanzo desde Trapani",
    metaDescription:
      "Guía para elegir una excursión en barco a Favignana y Levanzo desde Trapani: ruta, duración, calas, snorkel, comida a bordo y tour privado o compartido.",
    heroImage: boatImage,
    heroAlt: "Excursión en barco entre Favignana y Levanzo desde Trapani",
    eyebrow: "Excursión en barco",
    intro:
      "Favignana y Levanzo son la combinación más buscada para una excursión en barco desde Trapani. En un día bien organizado se alternan navegación, calas, baños, snorkel y vistas de dos islas con carácter distinto.",
    quickAnswer:
      "Una excursión en barco a Favignana y Levanzo desde Trapani es ideal si quieres ver más costa sin organizar ferries, alquileres y traslados. Puede ser compartida, privada o premium con comida a bordo en el Neel 47, según presupuesto y ritmo deseado.",
    primaryKeyword: "excursión en barco Favignana Levanzo",
    secondaryKeywords: [
      "Favignana y Levanzo desde Trapani",
      "tour privado Islas Egadi",
      "excursión compartida Egadi",
      "comida a bordo Favignana",
    ],
    quickFacts: [
      { label: "Salida", value: "Trapani" },
      { label: "Duración típica", value: "4 u 8 horas" },
      { label: "Formatos", value: "compartido, privado o premium" },
    ],
    itemListTitle: "Qué puede incluir",
    itemList: [
      {
        name: "Favignana",
        description:
          "Cala Rossa, Bue Marino, Cala Azzurra u otras zonas según viento y mar.",
      },
      {
        name: "Levanzo",
        description:
          "Cala Fredda, Cala Minnola, Faraglione o costa protegida del día.",
      },
      {
        name: "Snorkel",
        description:
          "Paradas de baño donde la visibilidad y la seguridad sean adecuadas.",
      },
      {
        name: "Comida a bordo",
        description:
          "Disponible en las experiencias premium, con ritmo más lento y mayor confort.",
      },
    ],
    sections: [
      {
        id: "formatos",
        eyebrow: "Elegir experiencia",
        title: "Compartida, privada o premium",
        body: [
          "La opción compartida es adecuada para quien viaja solo, en pareja o con un grupo pequeño y quiere una experiencia accesible. El tour privado reserva la Cigala & Bertinetti para tu grupo.",
          "La experiencia premium en Neel 47 añade espacio, trimarán, chef y comida a bordo: es una forma más lenta y cómoda de vivir las Egadi.",
        ],
        cta: "compare",
      },
      {
        id: "ruta",
        eyebrow: "Ruta real",
        title: "La ruta no debe ser rígida",
        body: [
          "Favignana y Levanzo ofrecen muchas posibilidades, pero el patrón debe adaptar el recorrido al viento, oleaje y tráfico marítimo. La promesa correcta no es una cala garantizada, sino el mejor día posible con seguridad.",
        ],
        cta: "cigala",
      },
      {
        id: "duracion",
        eyebrow: "Duración",
        title: "Cuatro horas o día completo",
        body: [
          "Cuatro horas sirven para una experiencia compacta y exclusiva. Ocho horas permiten más baños, más margen entre islas y un ritmo más relajado.",
        ],
        note:
          "Para quien quiere comida a bordo y máximo confort, el Neel 47 tiene un posicionamiento más premium.",
        cta: "neel",
      },
    ],
    faqs: [
      {
        question: "¿La excursión visita siempre Favignana y Levanzo?",
        answer:
          "La intención puede ser esa, pero la ruta final depende de condiciones de mar, seguridad y duración elegida.",
      },
      {
        question: "¿Puedo reservar solo un billete?",
        answer:
          "Sí, en las experiencias compartidas puedes reservar también una plaza individual.",
      },
      {
        question: "¿Qué diferencia hay entre tour privado y premium?",
        answer:
          "El privado se centra en un barco ágil para tu grupo; el premium en Neel 47 prioriza espacio, comodidad y comida a bordo.",
      },
    ],
    relatedSlugs: ["favignana-en-un-dia", "snorkel-en-favignana", "mejores-playas-calas-favignana"],
  }),
];

export const favignanaGuideLinksEs: Array<{
  slug: FavignanaGuideSlug;
  title: string;
  description: string;
}> = favignanaGuidesEs.map((guide) => ({
  slug: guide.slug,
  title: guide.shortTitle,
  description: guide.quickAnswer,
}));
