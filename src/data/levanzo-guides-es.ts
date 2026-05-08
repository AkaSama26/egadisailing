import type { LevanzoGuide, LevanzoGuideSlug } from "./levanzo-guides";

const levanzoHero = "/images/islands/levanzo/hero.webp";
const boatImage = "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp";
const snorkelingImage = "/images/experience-polaroids/barca-8-ore-snorkeling.webp";

function levanzoGuide(guide: LevanzoGuide): LevanzoGuide {
  return guide;
}

export const levanzoGuidesEs: LevanzoGuide[] = [
  levanzoGuide({
    slug: "que-ver-en-levanzo",
    title: "Qué ver en Levanzo: calas, pueblo y Grotta del Genovese",
    shortTitle: "Qué ver",
    metaTitle: "Qué ver en Levanzo: calas, pueblo y Grotta del Genovese",
    metaDescription:
      "Guía para saber qué ver en Levanzo: Cala Dogana, Cala Fredda, Cala Minnola, Faraglione, Grotta del Genovese y excursiones en barco desde Trapani.",
    heroImage: levanzoHero,
    heroAlt: "Levanzo vista desde el mar con casas blancas y agua clara",
    eyebrow: "Guía completa",
    intro:
      "Levanzo es la isla más pequeña y silenciosa de las Egadi. Tiene un pueblo mínimo, calas claras, senderos sencillos y una de las cuevas prehistóricas más importantes del Mediterráneo.",
    quickAnswer:
      "En Levanzo conviene ver Cala Dogana, Cala Fredda, Cala Minnola, el Faraglione, Cala Tramontana, Cala Calcara y la Grotta del Genovese. Desde Trapani, puedes elegir una visita lenta por tierra o una excursión en barco para ver más costa y bañarte con menos logística.",
    primaryKeyword: "qué ver en Levanzo",
    secondaryKeywords: [
      "Levanzo qué hacer",
      "Grotta del Genovese",
      "calas Levanzo",
      "Levanzo en barco",
    ],
    quickFacts: [
      { label: "Carácter", value: "pequeña y tranquila" },
      { label: "No perderse", value: "Grotta del Genovese" },
      { label: "Baño fácil", value: "Cala Fredda" },
      { label: "Desde Trapani", value: "excursión de un día" },
    ],
    itemListTitle: "Lugares principales",
    itemList: [
      {
        name: "Cala Dogana",
        description:
          "El pequeño puerto del pueblo, con casas blancas, barcas y agua transparente.",
      },
      {
        name: "Cala Fredda",
        description:
          "Una de las calas más inmediatas para un baño sencillo cerca del pueblo.",
      },
      {
        name: "Cala Minnola",
        description:
          "Cala luminosa al sureste, conocida por el fondo marino y su memoria arqueológica.",
      },
      {
        name: "Grotta del Genovese",
        description:
          "Sitio prehistórico con grabados y pinturas, visitable con reserva y guía autorizada.",
      },
      {
        name: "Faraglione",
        description:
          "Uno de los perfiles más reconocibles de Levanzo, especialmente bonito desde el mar.",
      },
    ],
    sections: [
      {
        id: "pueblo-calas",
        eyebrow: "Primera visita",
        title: "Pueblo blanco, calas pequeñas y agua limpia",
        body: [
          "La llegada a Cala Dogana resume Levanzo: pocas casas blancas, barcas de pesca y una escala de azules muy clara. Es una isla para bajar el ritmo.",
          "Cala Fredda y Cala Minnola son las paradas más habituales. La primera es más fácil; la segunda requiere algo más de tiempo, pero ofrece un entorno más amplio y fondos interesantes.",
        ],
        bullets: [
          "Cala Dogana para entender el pueblo.",
          "Cala Fredda para un baño fácil.",
          "Cala Minnola para snorkel y paisaje.",
          "Faraglione para una vista icónica desde el barco.",
        ],
        cta: "cigala",
      },
      {
        id: "genovese",
        eyebrow: "Historia",
        title: "La Grotta del Genovese cambia el sentido de la visita",
        body: [
          "La Grotta del Genovese conserva pinturas y grabados prehistóricos. No es una parada improvisada: requiere organización, reserva y una visita guiada.",
          "Si te interesa la cueva, conviene decidirlo antes de llegar. Si buscas mar y calas, una excursión en barco puede completar la experiencia sin mezclar demasiados objetivos en pocas horas.",
        ],
        note:
          "Egadisailing no sustituye la visita oficial a la cueva: la ruta en barco completa el día con costa, baño y vistas.",
      },
      {
        id: "barco",
        eyebrow: "Desde el mar",
        title: "Por qué Levanzo funciona tan bien en barco",
        body: [
          "Levanzo es pequeña, pero no todas sus calas son igual de cómodas por tierra. En barco se puede leer mejor la costa y elegir el lado más protegido según viento y mar.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "¿Qué se puede ver en Levanzo en pocas horas?",
        answer:
          "Cala Dogana, el pueblo, Cala Fredda y, si el tiempo lo permite, Cala Minnola o el Faraglione desde el mar.",
      },
      {
        question: "¿Levanzo es mejor a pie o en barco?",
        answer:
          "A pie se disfruta el pueblo y las calas cercanas. En barco se ve más costa y se eligen mejor las zonas protegidas.",
      },
      {
        question: "¿Se puede combinar Levanzo y Favignana en un día?",
        answer:
          "Sí, es una de las rutas más buscadas en excursión en barco desde Trapani.",
      },
    ],
    relatedSlugs: ["playas-calas-levanzo", "gruta-del-genovese", "excursion-barco-desde-trapani"],
  }),
  levanzoGuide({
    slug: "playas-calas-levanzo",
    title: "Playas y calas de Levanzo: Cala Fredda, Minnola y Dogana",
    shortTitle: "Playas y calas",
    metaTitle: "Playas y calas de Levanzo: Cala Fredda, Minnola y Dogana",
    metaDescription:
      "Guía de playas y calas de Levanzo: Cala Dogana, Cala Fredda, Cala Minnola, Cala Faraglione, Cala Tramontana, Cala Calcara y consejos en barco.",
    heroImage: levanzoHero,
    heroAlt: "Costa clara de Levanzo con mar transparente",
    eyebrow: "Mar y calas",
    intro:
      "Las playas de Levanzo son pequeñas calas, piedras, desembarcaderos y agua clara. No esperes largas playas de arena: el encanto está en la escala mínima y en la luz.",
    quickAnswer:
      "Las calas principales de Levanzo son Cala Dogana, Cala Fredda, Cala Minnola, Cala Faraglione, Cala Tramontana y Cala Calcara. Cala Fredda y Dogana son las más inmediatas; Minnola es una de las más interesantes para baño y fondos.",
    primaryKeyword: "playas de Levanzo",
    secondaryKeywords: [
      "calas Levanzo",
      "Cala Fredda Levanzo",
      "Cala Minnola",
      "dónde bañarse en Levanzo",
    ],
    quickFacts: [
      { label: "Baño fácil", value: "Cala Fredda" },
      { label: "Más conocida", value: "Cala Minnola" },
      { label: "Junto al pueblo", value: "Cala Dogana" },
      { label: "Importante", value: "viento y mar" },
    ],
    itemListTitle: "Calas que conocer",
    itemList: [
      {
        name: "Cala Dogana",
        description:
          "La cala del pueblo, cómoda y escénica, junto al pequeño puerto.",
      },
      {
        name: "Cala Fredda",
        description:
          "Pequeña, clara y relativamente accesible para un baño sencillo.",
      },
      {
        name: "Cala Minnola",
        description:
          "Muy interesante por colores, fondos y memoria arqueológica submarina.",
      },
      {
        name: "Cala Tramontana",
        description:
          "Lado más salvaje y rocoso, solo recomendable con condiciones favorables.",
      },
      {
        name: "Cala Calcara",
        description:
          "Paisaje más apartado y fondos atractivos para quien busca algo menos inmediato.",
      },
    ],
    sections: [
      {
        id: "faciles",
        eyebrow: "Acceso fácil",
        title: "Cala Dogana y Cala Fredda",
        body: [
          "Cala Dogana es el corazón del pueblo y el primer contacto con la isla. Cala Fredda es la opción más práctica para un baño sin complicar demasiado la jornada.",
          "Ambas son buenas para una visita corta, pero en temporada alta conviene llegar temprano.",
        ],
        cta: "cigala",
      },
      {
        id: "minnola",
        eyebrow: "Fondos",
        title: "Cala Minnola: mar, pinos e historia bajo el agua",
        body: [
          "Cala Minnola combina paisaje y fondos interesantes. Es una de las zonas más bonitas de Levanzo cuando el agua está tranquila y la luz acompaña.",
          "El área está ligada a restos arqueológicos submarinos, por lo que se debe nadar con respeto y sin tocar nada.",
        ],
        cards: [
          {
            title: "Mar claro",
            text: "Los colores destacan con sol y agua calma.",
            tag: "Baño",
            image: levanzoHero,
          },
          {
            title: "Snorkel",
            text: "Fondos atractivos con ritmo lento y atención.",
            tag: "Mar",
            image: snorkelingImage,
          },
          {
            title: "En barco",
            text: "Más fácil elegir el punto protegido del día.",
            tag: "Ruta",
            image: boatImage,
          },
        ],
        cta: "compare",
      },
      {
        id: "viento",
        eyebrow: "Condiciones",
        title: "Tramontana y Calcara no son para cualquier día",
        body: [
          "Las calas más apartadas pueden ser preciosas, pero dependen mucho del viento. Con mar incómodo, es mejor quedarse en lados más protegidos.",
        ],
      },
    ],
    faqs: [
      {
        question: "¿Levanzo tiene playas de arena?",
        answer:
          "No como destino de playa clásica. Predominan calas pequeñas, piedra y agua clara.",
      },
      {
        question: "¿Dónde bañarse fácilmente en Levanzo?",
        answer:
          "Cala Fredda y Cala Dogana son las opciones más inmediatas cerca del pueblo.",
      },
      {
        question: "¿Cala Minnola merece la pena?",
        answer:
          "Sí, sobre todo con mar tranquilo y buena luz. Es una de las zonas más interesantes para nadar y hacer snorkel ligero.",
      },
    ],
    relatedSlugs: ["snorkel-cala-minnola-calcara", "que-ver-en-levanzo", "excursion-barco-desde-trapani"],
  }),
  levanzoGuide({
    slug: "gruta-del-genovese",
    title: "Grotta del Genovese en Levanzo: visita, reserva y contexto",
    shortTitle: "Grotta del Genovese",
    metaTitle: "Grotta del Genovese Levanzo: cómo visitarla y qué ver",
    metaDescription:
      "Guía de la Grotta del Genovese en Levanzo: pinturas y grabados prehistóricos, reserva, visita guiada y cómo combinarla con el mar.",
    heroImage: levanzoHero,
    heroAlt: "Costa de Levanzo cerca de la Grotta del Genovese",
    eyebrow: "Historia prehistórica",
    intro:
      "La Grotta del Genovese es el gran sitio cultural de Levanzo. Sus grabados y pinturas prehistóricas cuentan una historia mucho más antigua que el turismo y las rutas modernas.",
    quickAnswer:
      "La Grotta del Genovese se visita con reserva y guía autorizada. Si quieres verla, organízala antes; si tu prioridad es el mar, puedes combinar Levanzo con una excursión en barco y dejar la cueva para una visita dedicada.",
    primaryKeyword: "Grotta del Genovese Levanzo",
    secondaryKeywords: [
      "gruta del Genovese",
      "Levanzo prehistoria",
      "visitar Grotta del Genovese",
    ],
    quickFacts: [
      { label: "Tipo", value: "sitio prehistórico" },
      { label: "Visita", value: "con reserva y guía" },
      { label: "Combina con", value: "pueblo o barco" },
    ],
    itemListTitle: "Qué tener claro",
    itemList: [
      {
        name: "Reserva previa",
        description:
          "No debe improvisarse como una parada rápida sin comprobar disponibilidad.",
      },
      {
        name: "Guía autorizada",
        description:
          "La visita requiere acompañamiento y respeto por el sitio.",
      },
      {
        name: "Tiempo de jornada",
        description:
          "Conviene decidir si el día será cultural, marítimo o una mezcla ligera.",
      },
    ],
    sections: [
      {
        id: "importancia",
        eyebrow: "Contexto",
        title: "Por qué es tan importante",
        body: [
          "La cueva conserva señales de presencia humana prehistórica y convierte a Levanzo en algo más que una isla de calas. Es una visita para mirar despacio.",
          "La experiencia cambia el tono del día: después de verla, el paisaje de Levanzo se percibe con más profundidad.",
        ],
      },
      {
        id: "organizar",
        eyebrow: "Organización",
        title: "Cómo encajarla en una visita",
        body: [
          "Si viajas solo unas horas, mezclar cueva, pueblo, varias calas y barco puede ser demasiado. Es mejor elegir prioridades.",
          "Una excursión en barco puede completar el día con mar y vistas, pero no reemplaza la visita oficial a la cueva.",
        ],
        cta: "compare",
      },
      {
        id: "respeto",
        eyebrow: "Respeto",
        title: "Un lugar delicado",
        body: [
          "Como cualquier sitio arqueológico, debe visitarse sin tocar, sin improvisar accesos y siguiendo las indicaciones de los guías.",
        ],
      },
    ],
    faqs: [
      {
        question: "¿Se puede visitar la Grotta del Genovese sin reserva?",
        answer:
          "No es recomendable contarlo así. Comprueba siempre reserva, horarios y modalidad de visita autorizada.",
      },
      {
        question: "¿Está incluida en una excursión en barco?",
        answer:
          "Normalmente no. Una excursión en barco muestra la costa; la cueva requiere visita específica.",
      },
      {
        question: "¿Merece la pena?",
        answer:
          "Sí, si te interesa historia, arqueología y una lectura más profunda de Levanzo.",
      },
    ],
    relatedSlugs: ["que-ver-en-levanzo", "levanzo-en-un-dia", "excursion-barco-desde-trapani"],
  }),
  levanzoGuide({
    slug: "levanzo-en-un-dia",
    title: "Levanzo en un día: itinerario entre pueblo, calas y barco",
    shortTitle: "Levanzo en un día",
    metaTitle: "Levanzo en un día: qué ver, calas y excursión desde Trapani",
    metaDescription:
      "Cómo visitar Levanzo en un día: pueblo, Cala Fredda, Cala Minnola, Grotta del Genovese, barco desde Trapani y combinación con Favignana.",
    heroImage: levanzoHero,
    heroAlt: "Levanzo en un día con pueblo blanco y mar claro",
    eyebrow: "Itinerario",
    intro:
      "Levanzo en un día pide una decisión clara: jornada lenta por tierra, visita cultural con Grotta del Genovese, o excursión en barco para ver más costa y calas.",
    quickAnswer:
      "En un día en Levanzo puedes ver el pueblo, Cala Dogana, Cala Fredda y Cala Minnola. Si quieres añadir Grotta del Genovese, reserva y reduce otras paradas. Si prefieres mar, una excursión desde Trapani puede combinar Levanzo y Favignana.",
    primaryKeyword: "Levanzo en un día",
    secondaryKeywords: [
      "itinerario Levanzo",
      "excursión Levanzo desde Trapani",
      "Levanzo y Favignana en barco",
    ],
    quickFacts: [
      { label: "Ritmo", value: "lento y selectivo" },
      { label: "A pie", value: "pueblo y calas cercanas" },
      { label: "En barco", value: "más costa y menos esperas" },
    ],
    itemListTitle: "Plan simple",
    itemList: [
      {
        name: "Pueblo y Cala Dogana",
        description:
          "Primer contacto con la isla y punto más cómodo para empezar.",
      },
      {
        name: "Cala Fredda",
        description:
          "Baño fácil y cercano.",
      },
      {
        name: "Cala Minnola",
        description:
          "Parada más amplia, ideal si el día va dedicado al mar.",
      },
      {
        name: "Grotta del Genovese",
        description:
          "Solo si está reservada y tienes tiempo suficiente.",
      },
    ],
    sections: [
      {
        id: "a-pie",
        eyebrow: "Por libre",
        title: "Un día lento a pie",
        body: [
          "Si llegas en ferry, no hace falta complicar demasiado el plan. El pueblo, Cala Dogana, Cala Fredda y una caminata hacia Cala Minnola ya llenan bien la jornada.",
          "Añadir la cueva exige más organización y menos improvisación.",
        ],
      },
      {
        id: "barco",
        eyebrow: "Desde Trapani",
        title: "Un día en barco con Favignana y Levanzo",
        body: [
          "Si tu prioridad es el mar, la opción en barco evita cuadrar ferries, caminatas y taxis acuáticos. La ruta puede combinar dos islas si las condiciones lo permiten.",
        ],
        cta: "cigala",
      },
      {
        id: "ritmo",
        eyebrow: "Consejo",
        title: "No llenes el día de objetivos",
        body: [
          "Levanzo se disfruta por escala pequeña. Elige menos paradas, deja tiempo para mirar y evita convertirla en una lista.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "¿Levanzo merece una excursión de un día?",
        answer:
          "Sí, sobre todo si buscas una isla tranquila, calas claras y un ritmo menos masivo.",
      },
      {
        question: "¿Cuánto tiempo hace falta en Levanzo?",
        answer:
          "Unas horas bastan para el pueblo y un baño; un día permite añadir Cala Minnola o una visita cultural.",
      },
      {
        question: "¿Se puede hacer Levanzo y Favignana juntas?",
        answer:
          "Sí, en excursión en barco es una combinación muy natural desde Trapani.",
      },
    ],
    relatedSlugs: ["que-ver-en-levanzo", "playas-calas-levanzo", "excursion-barco-desde-trapani"],
  }),
  levanzoGuide({
    slug: "como-llegar-desde-trapani",
    title: "Cómo llegar a Levanzo desde Trapani",
    shortTitle: "Cómo llegar",
    metaTitle: "Cómo llegar a Levanzo desde Trapani: ferry y barco",
    metaDescription:
      "Cómo llegar a Levanzo desde Trapani: ferry, hidroala, excursión en barco, tiempos, organización y consejos para moverse por la isla.",
    heroImage: levanzoHero,
    heroAlt: "Barcos cerca del pueblo de Levanzo",
    eyebrow: "Logística",
    intro:
      "Levanzo está cerca de Trapani y se alcanza fácilmente, pero la elección entre ferry y excursión en barco cambia completamente el tipo de día.",
    quickAnswer:
      "Para llegar a Levanzo desde Trapani puedes usar ferry o hidroala, o reservar una excursión en barco. El ferry sirve para visitar el pueblo y las calas cercanas; el barco es mejor si quieres ver costa, bañarte y combinar Levanzo con Favignana.",
    primaryKeyword: "cómo llegar a Levanzo desde Trapani",
    secondaryKeywords: [
      "ferry Trapani Levanzo",
      "excursión Levanzo desde Trapani",
      "Levanzo en barco",
    ],
    quickFacts: [
      { label: "Desde", value: "Trapani" },
      { label: "Opciones", value: "ferry, hidroala o barco" },
      { label: "Moverse", value: "a pie y por mar" },
    ],
    itemListTitle: "Opciones",
    itemList: [
      {
        name: "Ferry o hidroala",
        description:
          "Para llegar al pueblo y organizar una visita por libre.",
      },
      {
        name: "Excursión en barco",
        description:
          "Para dedicar el día a calas, snorkel y navegación.",
      },
      {
        name: "A pie",
        description:
          "En Levanzo se camina mucho: es parte del ritmo de la isla.",
      },
    ],
    sections: [
      {
        id: "ferry",
        eyebrow: "Por libre",
        title: "Ferry e hidroala",
        body: [
          "El ferry te deja en Cala Dogana, junto al pueblo. Desde allí puedes caminar, bañarte cerca o seguir hacia Cala Fredda y Cala Minnola.",
          "Revisa siempre los horarios de regreso, especialmente fuera de temporada o si quieres visitar la Grotta del Genovese.",
        ],
      },
      {
        id: "barco",
        eyebrow: "Excursión",
        title: "Barco desde Trapani",
        body: [
          "La excursión en barco es la opción más cómoda para quien busca mar y costa. Evita combinar varios medios y permite ajustar las paradas al viento.",
        ],
        cta: "cigala",
      },
      {
        id: "elegir",
        eyebrow: "Elegir",
        title: "Qué opción conviene",
        body: [
          "Si quieres pueblo, paseo y cueva, ferry. Si quieres baños, snorkel y Favignana en la misma jornada, barco.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "¿Hay coches en Levanzo?",
        answer:
          "Levanzo es muy pequeña y se vive principalmente a pie y por mar.",
      },
      {
        question: "¿Cuánto se tarda desde Trapani?",
        answer:
          "Depende del servicio y del mar. Comprueba siempre horarios actualizados antes de organizar el día.",
      },
      {
        question: "¿Conviene reservar?",
        answer:
          "Sí, en temporada alta conviene reservar ferries y excursiones con antelación.",
      },
    ],
    relatedSlugs: ["levanzo-en-un-dia", "excursion-barco-desde-trapani", "que-ver-en-levanzo"],
  }),
  levanzoGuide({
    slug: "snorkel-cala-minnola-calcara",
    title: "Snorkel en Levanzo: Cala Minnola, Calcara y zonas protegidas",
    shortTitle: "Snorkel",
    metaTitle: "Snorkel en Levanzo: Cala Minnola, Calcara y excursiones",
    metaDescription:
      "Dónde hacer snorkel en Levanzo: Cala Minnola, Cala Calcara, zonas protegidas, fondos marinos y consejos para elegir según viento y mar.",
    heroImage: snorkelingImage,
    heroAlt: "Snorkel en aguas claras durante una excursión por Levanzo",
    eyebrow: "Snorkel",
    intro:
      "Levanzo es una isla excelente para snorkel tranquilo cuando el mar está calmo. La clave es elegir una zona protegida y no forzar puntos expuestos.",
    quickAnswer:
      "Para snorkel en Levanzo, Cala Minnola es la referencia principal por fondos y memoria arqueológica. Cala Calcara y otras zonas pueden ser interesantes con condiciones adecuadas. En barco es más fácil escoger el punto más seguro del día.",
    primaryKeyword: "snorkel Levanzo",
    secondaryKeywords: [
      "Cala Minnola snorkel",
      "Cala Calcara Levanzo",
      "snorkel Islas Egadi",
    ],
    quickFacts: [
      { label: "Zona clave", value: "Cala Minnola" },
      { label: "Mejor con", value: "agua calma" },
      { label: "Regla", value: "no tocar fondos ni restos" },
    ],
    itemListTitle: "Zonas de snorkel",
    itemList: [
      {
        name: "Cala Minnola",
        description:
          "La zona más conocida por fondos claros e interés histórico.",
      },
      {
        name: "Cala Calcara",
        description:
          "Interesante con mar favorable y buena visibilidad.",
      },
      {
        name: "Calas protegidas",
        description:
          "La mejor opción puede cambiar según viento, oleaje y luz.",
      },
    ],
    sections: [
      {
        id: "minnola",
        eyebrow: "Cala Minnola",
        title: "El punto más buscado",
        body: [
          "Cala Minnola reúne agua clara, paisaje y un fondo ligado a la historia de la navegación mediterránea. Es ideal para un snorkel lento y respetuoso.",
          "Como siempre, la experiencia depende de visibilidad, corriente y seguridad.",
        ],
        cta: "cigala",
      },
      {
        id: "calcara",
        eyebrow: "Alternativas",
        title: "Calcara y otras zonas",
        body: [
          "Cala Calcara y los tramos menos inmediatos pueden ser muy bonitos, pero no deben forzarse con viento. El patrón elegirá si tienen sentido ese día.",
        ],
      },
      {
        id: "respeto",
        eyebrow: "Buenas prácticas",
        title: "Snorkel sin impacto",
        body: [
          "Nada con distancia, no apoyes los pies sobre fondos sensibles y no recojas nada. El Mediterráneo se disfruta más cuando se deja intacto.",
        ],
        cta: "compare",
      },
    ],
    faqs: [
      {
        question: "¿Dónde hacer snorkel en Levanzo?",
        answer:
          "Cala Minnola es la zona más conocida; otras paradas dependen del estado del mar.",
      },
      {
        question: "¿Es necesario llevar equipo?",
        answer:
          "Conviene consultar qué incluye cada experiencia. Una máscara cómoda siempre ayuda.",
      },
      {
        question: "¿Es apto para principiantes?",
        answer:
          "Sí, si sabes nadar y las condiciones son tranquilas.",
      },
    ],
    relatedSlugs: ["playas-calas-levanzo", "que-ver-en-levanzo", "excursion-barco-desde-trapani"],
  }),
  levanzoGuide({
    slug: "excursion-barco-desde-trapani",
    title: "Excursión en barco a Levanzo desde Trapani",
    shortTitle: "Barco desde Trapani",
    metaTitle: "Excursión en barco a Levanzo desde Trapani | Islas Egadi",
    metaDescription:
      "Cómo elegir una excursión en barco a Levanzo desde Trapani: calas, snorkel, combinación con Favignana, tour privado o compartido y consejos.",
    heroImage: boatImage,
    heroAlt: "Barco navegando hacia Levanzo desde Trapani",
    eyebrow: "Excursión en barco",
    intro:
      "Una excursión en barco a Levanzo desde Trapani es una forma sencilla de disfrutar la isla sin depender de horarios, taxis acuáticos y caminatas entre calas.",
    quickAnswer:
      "La excursión en barco a Levanzo puede centrarse en Cala Fredda, Cala Minnola, Faraglione y zonas protegidas. A menudo se combina con Favignana en tours de día completo, compartidos o privados.",
    primaryKeyword: "excursión en barco Levanzo desde Trapani",
    secondaryKeywords: [
      "Levanzo en barco",
      "Favignana Levanzo desde Trapani",
      "tour privado Egadi",
      "snorkel Levanzo",
    ],
    quickFacts: [
      { label: "Salida", value: "Trapani" },
      { label: "Formato", value: "compartido o privado" },
      { label: "Combina con", value: "Favignana" },
    ],
    itemListTitle: "Qué esperar",
    itemList: [
      {
        name: "Costa de Levanzo",
        description:
          "Cala Fredda, Cala Minnola, Faraglione u otras zonas según condiciones.",
      },
      {
        name: "Baño y snorkel",
        description:
          "Paradas donde el mar esté protegido y claro.",
      },
      {
        name: "Favignana",
        description:
          "En día completo puede combinarse con la isla vecina.",
      },
    ],
    sections: [
      {
        id: "por-que",
        eyebrow: "Ventaja",
        title: "Menos logística, más mar",
        body: [
          "El barco reduce los cambios de medio de transporte. Sales de Trapani, navegas, paras donde el mar lo permite y vuelves sin encajar demasiados horarios.",
        ],
        cta: "cigala",
      },
      {
        id: "formatos",
        eyebrow: "Formatos",
        title: "Compartido, privado o premium",
        body: [
          "El tour compartido es ideal para reservar plazas individuales. El privado reserva un barco para tu grupo. La experiencia premium en Neel 47 añade espacio, comodidad y comida a bordo.",
        ],
        cta: "compare",
      },
      {
        id: "ruta",
        eyebrow: "Ruta",
        title: "Levanzo no debe venderse como una ruta fija",
        body: [
          "Viento y mar deciden mucho. Una buena excursión promete criterio local, seguridad y una ruta adaptada, no una lista rígida de calas.",
        ],
        cta: "neel",
      },
    ],
    faqs: [
      {
        question: "¿La excursión a Levanzo incluye Favignana?",
        answer:
          "En muchas salidas de día completo sí, pero depende de duración, formato y condiciones del mar.",
      },
      {
        question: "¿Puedo reservar una sola plaza?",
        answer:
          "Sí, en las experiencias compartidas se puede reservar también una plaza individual.",
      },
      {
        question: "¿Qué llevar a bordo?",
        answer:
          "Bañador, toalla, protección solar, gafas de sol y una bolsa blanda fácil de guardar.",
      },
    ],
    relatedSlugs: ["levanzo-en-un-dia", "snorkel-cala-minnola-calcara", "que-ver-en-levanzo"],
  }),
];

export const levanzoGuideLinksEs: Array<{
  slug: LevanzoGuideSlug;
  title: string;
  description: string;
}> = levanzoGuidesEs.map((guide) => ({
  slug: guide.slug,
  title: guide.shortTitle,
  description: guide.quickAnswer,
}));
