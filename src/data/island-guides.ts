export const islandSlugs = ["favignana", "levanzo", "marettimo"] as const;
export type IslandGuideSlug = (typeof islandSlugs)[number];

export type IslandGuideCopy = {
  eyebrow: string;
  h1: string;
  intro: string[];
  sections: Array<{ title: string; body: string[] }>;
  highlightsTitle: string;
  faqTitle: string;
  faqs: Array<{ question: string; answer: string }>;
  ctaTitle: string;
  ctaText: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
};

type LocaleGuideMap = Record<IslandGuideSlug, IslandGuideCopy>;

const it: LocaleGuideMap = {
  favignana: {
    eyebrow: "Guida locale",
    h1: "Cosa vedere a Favignana in barca",
    intro: [
      "Favignana in barca è il modo più naturale per leggere la costa dell'isola: Cala Rossa, Bue Marino, Cala Azzurra, Scalo Cavallo e le cave di tufo cambiano volto secondo vento, luce e affollamento.",
      "Da Trapani si può costruire una giornata equilibrata tra bagno, snorkeling, passaggi panoramici e tempo lento a bordo. La rotta migliore non è una lista fissa di tappe: lo skipper sceglie il lato più riparato e sicuro dell'isola.",
    ],
    sections: [
      {
        title: "Cale e spiagge da vedere dal mare",
        body: [
          "Cala Rossa è la cartolina più cercata, ma non va vissuta come promessa assoluta: con Maestrale o traffico intenso può essere più intelligente osservarla dal punto giusto e spostarsi verso acque più tranquille.",
          "Bue Marino, Cala Azzurra, Lido Burrone e Grotta Perciata completano la lettura di Favignana: roccia, sabbia chiara, fondali facili e punti più profondi per chi ama nuotare.",
        ],
      },
      {
        title: "Quando scegliere la barca da Trapani",
        body: [
          "La barca evita parcheggi, discese su roccia e spostamenti spezzati tra una cala e l'altra. Per chi ha una sola giornata, partire da Trapani con una rotta già pensata è spesso più efficiente del fai da te via aliscafo più mezzi sull'isola.",
          "Le esperienze Favignana e Levanzo sono adatte a chi cerca mare, soste bagno e comfort. Per un ritmo più privato conviene una barca riservata, mentre il tour condiviso è la scelta più semplice per vivere le Egadi in giornata.",
        ],
      },
      {
        title: "Storia, tonnara e paesaggio",
        body: [
          "Favignana non è solo spiagge: l'Ex Stabilimento Florio, Palazzo Florio e le cave raccontano il legame tra tonnara, tufo e vita marinara. Anche dal mare questi segni aiutano a capire perché l'isola è così diversa da Levanzo e Marettimo.",
        ],
      },
    ],
    highlightsTitle: "Punti chiave per organizzare la visita",
    faqTitle: "Domande frequenti su Favignana in barca",
    faqs: [
      { question: "Quali cale di Favignana si vedono in barca?", answer: "Le più richieste sono Cala Rossa, Bue Marino, Cala Azzurra, Scalo Cavallo, Lido Burrone e Grotta Perciata. La selezione reale dipende da vento, mare e sicurezza." },
      { question: "Meglio Favignana o Levanzo?", answer: "Favignana è più ampia e varia; Levanzo è più raccolta e silenziosa. Quando il meteo lo consente, abbinarle nella stessa uscita dà una visione più completa delle Egadi." },
      { question: "Si parte direttamente da Trapani?", answer: "Sì, le esperienze Egadisailing partono da Trapani e raggiungono le isole via mare, senza dover organizzare aliscafo e mezzi a terra." },
      { question: "Cala Rossa è sempre garantita?", answer: "No. Cala Rossa è una tappa iconica, ma lo skipper può modificarla se vento, onda o affollamento rendono migliore un'altra sosta." },
    ],
    ctaTitle: "Vuoi vedere Favignana dal mare?",
    ctaText: "Scegli un'esperienza Favignana e Levanzo da Trapani: condivisa, privata o premium in trimarano.",
    primaryCtaLabel: "Vedi tour Favignana",
    secondaryCtaLabel: "Contattaci",
  },
  levanzo: {
    eyebrow: "Guida locale",
    h1: "Levanzo in barca da Trapani",
    intro: [
      "Levanzo in barca da Trapani è una scelta perfetta per chi cerca una costa più silenziosa, acqua trasparente e soste meno scenografiche ma spesso più intime rispetto alle cale più famose di Favignana.",
      "Cala Fredda, Cala Minnola, il Faraglione e la Grotta del Genovese raccontano un'isola piccola, essenziale e molto legata al ritmo del mare. La barca permette di vedere Levanzo senza forzare spostamenti a terra o promesse non realistiche.",
    ],
    sections: [
      {
        title: "Cosa vedere a Levanzo dal mare",
        body: [
          "Cala Fredda è una delle soste più leggibili dal mare: acqua chiara, costa bassa e fondale che invita a un bagno lento. Cala Minnola aggiunge un carattere più archeologico e naturale, con pineta, fondale e memoria delle antiche rotte.",
          "La Grotta del Genovese è il riferimento culturale più forte dell'isola. Non sempre entra in una giornata in barca, perché visita e accessi dipendono da logistica e disponibilità, ma resta un'entità importante per capire Levanzo.",
        ],
      },
      {
        title: "Perché abbinarla a Favignana",
        body: [
          "Levanzo da sola è raccolta; abbinata a Favignana crea un contrasto molto efficace. Favignana dà ampiezza, cave e cale iconiche, mentre Levanzo porta silenzio, acqua più raccolta e un profilo di paese bianco sul mare.",
          "Per questo molte esperienze Egadisailing collegano le due isole nella stessa rotta, adattando soste e tempi in base a Maestrale, Scirocco, affollamento e comfort degli ospiti.",
        ],
      },
      {
        title: "Consigli pratici",
        body: [
          "Porta essenziale, protezione solare e scarpe comode se prevedi qualche tratto a terra. In barca contano soprattutto vento e sicurezza: una rotta più riparata vale più di una tappa famosa vissuta male.",
        ],
      },
    ],
    highlightsTitle: "Punti chiave per Levanzo",
    faqTitle: "Domande frequenti su Levanzo in barca",
    faqs: [
      { question: "Levanzo è adatta a un tour in giornata?", answer: "Sì, soprattutto se abbinata a Favignana. Da Trapani la giornata permette di alternare soste bagno, passaggi panoramici e una rotta flessibile." },
      { question: "Quali sono le cale principali di Levanzo?", answer: "Le più citate sono Cala Fredda, Cala Minnola e il tratto del Faraglione. La scelta dipende da meteo, mare e traffico nautico." },
      { question: "La Grotta del Genovese è inclusa nel tour?", answer: "Non va considerata automaticamente inclusa: accesso e visita hanno logiche proprie. La pagina la cita come luogo identitario dell'isola, non come promessa operativa." },
      { question: "Levanzo è meglio di Favignana?", answer: "Non è meglio o peggio: è diversa. Levanzo è più piccola e quieta, Favignana più varia e riconoscibile. Insieme funzionano molto bene." },
    ],
    ctaTitle: "Vuoi includere Levanzo nella rotta?",
    ctaText: "Guarda i tour Favignana e Levanzo da Trapani e scegli la formula più adatta al tuo gruppo.",
    primaryCtaLabel: "Vedi esperienze Egadi",
    secondaryCtaLabel: "Chiedi consiglio",
  },
  marettimo: {
    eyebrow: "Guida locale",
    h1: "Marettimo in barca: guida alle grotte e alla costa",
    intro: [
      "Marettimo in barca è la parte più selvaggia e verticale delle Egadi: grotte marine, Cala Bianca, Punta Troia e costa alta chiedono più tempo, più attenzione al meteo e una pianificazione diversa rispetto a Favignana e Levanzo.",
      "Questa pagina è una guida informativa: Egadisailing non promette un day tour standard alle grotte di Marettimo. L'isola è più coerente con charter, programmi su più giorni o rotte costruite solo quando condizioni e tempi sono davvero adeguati.",
    ],
    sections: [
      {
        title: "Cosa vedere a Marettimo dal mare",
        body: [
          "Le grotte marine sono il tratto più famoso: Grotta del Cammello, Grotta del Tuono, Grotta della Pipa e gli archi naturali mostrano un'isola montuosa che scende direttamente in acqua.",
          "Cala Bianca e Punta Troia sono nomi chiave per orientarsi: la prima richiama acqua chiara e roccia luminosa, la seconda unisce paesaggio, storia e la sagoma del castello sul promontorio.",
        ],
      },
      {
        title: "Quando ha senso inserirla in rotta",
        body: [
          "Marettimo è più lontana da Trapani e più sensibile a vento e onda. Per questo non va venduta come promessa facile: richiede tempo, margine e una barca adatta al programma.",
          "Nei charter di più giorni può diventare una tappa memorabile, soprattutto quando si vuole uscire dalla logica della singola giornata e vivere l'arcipelago con più respiro.",
        ],
      },
      {
        title: "Come usarla per pianificare le Egadi",
        body: [
          "Se hai un solo giorno, Favignana e Levanzo sono spesso più efficienti. Se hai più giorni, Marettimo aggiunge natura, grotte e una sensazione di distanza che rende il viaggio più completo.",
        ],
      },
    ],
    highlightsTitle: "Punti chiave per Marettimo",
    faqTitle: "Domande frequenti su Marettimo in barca",
    faqs: [
      { question: "Egadisailing fa tour giornalieri alle grotte di Marettimo?", answer: "La pagina è informativa e non promette un day tour standard. Marettimo è più adatta a charter o programmi su più giorni quando meteo e tempi lo permettono." },
      { question: "Quali sono i luoghi più famosi di Marettimo?", answer: "Grotte marine, Cala Bianca, Punta Troia, Scalo Maestro e il profilo montuoso dell'isola sono i riferimenti principali." },
      { question: "Marettimo è più lontana di Favignana e Levanzo?", answer: "Sì. La distanza incide su tempi, comfort e fattibilità della rotta, quindi va pianificata con più margine." },
      { question: "Quando conviene scegliere Marettimo?", answer: "Quando hai più giorni o vuoi un charter con una componente più selvaggia e naturalistica, non solo una giornata di bagno." },
    ],
    ctaTitle: "Marettimo richiede una rotta su misura",
    ctaText: "Per programmi di più giorni guarda il charter in trimarano o chiedi una valutazione in base a date, meteo e gruppo.",
    primaryCtaLabel: "Vedi charter Egadi",
    secondaryCtaLabel: "Contattaci",
  },
};

const en: LocaleGuideMap = {
  favignana: {
    h1: 'Favignana by boat',
    eyebrow: 'Egadi Islands guide',
    intro: [
      'Favignana is the easiest island to reach from Trapani and the one that rewards a boat day the most: low cliffs, clear water, small coves and swimming stops that change character with wind and light.',
      'A private boat tour lets you move between Cala Rossa, Bue Marino, Cala Azzurra and quieter corners without depending on crowded land routes or fixed ferry times.',
      'Our skippers plan the route around sea conditions, guest pace and the kind of day you want: relaxed swims, scenic cruising, snorkelling, photography, lunch on board or more time ashore.'
    ],
    sections: [
      {
        title: 'Why choose a boat tour in Favignana',
        body: [
          'Many of Favignana’s most memorable places are coastal. From land, the famous coves can be busy and exposed; from the water, you can approach them at the right hour, choose safer anchorages and move when the wind changes.',
          'The island is compact, so a well-planned itinerary can combine iconic stops with calmer bays. This makes Favignana ideal for first-time visitors, couples, families and groups who want a full Egadi experience in one day.'
        ]
      },
      {
        title: 'Best stops around Favignana',
        body: [
          'Cala Rossa is known for its bright limestone and intense blue water, while Bue Marino has a more dramatic quarry landscape. Cala Azzurra is often gentler and easier for relaxed swimming when the sea allows it.',
          'Depending on the forecast, the skipper may add Grotta degli Innamorati, Preveto, Scalo Cavallo or smaller swimming spots. The goal is not to tick names mechanically, but to build the best route for that specific day.'
        ]
      },
      {
        title: 'When to visit and how to prepare',
        body: [
          'May, June, September and early October are excellent for softer light, clearer anchorages and a slower rhythm. July and August are lively and beautiful, but early departures and flexible routing become more important.',
          'Bring swimwear, reef-safe sunscreen, sunglasses, a hat and a light layer for the return. If you are prone to seasickness, tell us before departure: itinerary, boat choice and timing can make the day much easier.'
        ]
      }
    ],
    highlightsTitle: 'Favignana highlights',
    faqTitle: 'Favignana boat tour FAQ',
    faqs: [
      {
        question: 'Can we visit Cala Rossa on every tour?',
        answer: 'Cala Rossa is one of the most requested stops, but the final decision depends on wind, swell and safety. When conditions are not ideal, the skipper chooses better protected coves so the experience stays comfortable.'
      },
      {
        question: 'Is Favignana suitable for families?',
        answer: 'Yes. Favignana is one of the best Egadi choices for families because distances are short and the itinerary can be adapted with frequent swim stops, shaded breaks and calm-water alternatives.'
      },
      {
        question: 'How long does a Favignana tour last?',
        answer: 'Most private experiences are planned as half-day or full-day tours. A full day gives more freedom to combine Favignana with Levanzo or to slow down around the best coves.'
      },
      {
        question: 'Do we depart from Trapani or Favignana?',
        answer: 'The main departure is usually Trapani, with options depending on boat, season and availability. The booking page and team confirm the exact pier and meeting time before departure.'
      }
    ],
    ctaTitle: 'Plan your Favignana boat day',
    ctaText: 'Choose a private tour from Trapani or combine Favignana with Levanzo for a complete Egadi itinerary.',
    primaryCtaLabel: 'Book a boat tour',
    secondaryCtaLabel: 'See boats'
  },
  levanzo: {
    h1: 'Levanzo by boat',
    eyebrow: 'Egadi Islands guide',
    intro: [
      'Levanzo is the quietest and most intimate of the Egadi Islands: white houses, a tiny harbour, turquoise water and a coastline that feels made for slow navigation.',
      'A boat tour is the best way to understand Levanzo because the island’s beauty is concentrated in coves, caves and viewpoints that reveal themselves from the sea.',
      'It is perfect as a relaxed private day, as a romantic route, or as a combined itinerary with Favignana when sea conditions allow both islands in one experience.'
    ],
    sections: [
      {
        title: 'Why Levanzo works so well by sea',
        body: [
          'Levanzo has a small village and limited roads, so the coast is the real itinerary. By boat you can enjoy Cala Fredda, Cala Minnola, sea caves and quiet anchorages without rushing between land transfers.',
          'The island suits guests who prefer transparent water, peaceful swimming and a slower atmosphere. It is less about covering distance and more about choosing the right places at the right moment.'
        ]
      },
      {
        title: 'Cala Minnola, Cala Fredda and caves',
        body: [
          'Cala Minnola is one of Levanzo’s most loved stops, with bright water and a sheltered feel in suitable conditions. Cala Fredda is close to the village and often works well for a first swim or final stop.',
          'The skipper may include coastal caves and panoramic passages, always depending on sea state. Some areas are best enjoyed from the boat, while others invite a longer swim or snorkelling break.'
        ]
      },
      {
        title: 'Combining Levanzo and Favignana',
        body: [
          'Levanzo and Favignana are close enough to combine on many full-day tours from Trapani. This route offers a strong contrast: Favignana’s iconic cliffs and Levanzo’s quieter, village-like charm.',
          'When the forecast is mixed, the skipper may prioritize the island with better shelter. Flexibility is part of a good Egadi itinerary and often makes the difference between an average day and a beautiful one.'
        ]
      }
    ],
    highlightsTitle: 'Levanzo highlights',
    faqTitle: 'Levanzo boat tour FAQ',
    faqs: [
      {
        question: 'Is Levanzo less crowded than Favignana?',
        answer: 'Usually yes, especially outside peak August days. It is smaller and quieter, so it is a good choice for guests looking for a more peaceful Egadi experience.'
      },
      {
        question: 'Can we stop in the village?',
        answer: 'A village stop may be possible depending on itinerary, mooring conditions and timing. On private tours the skipper can advise whether it fits the day without sacrificing the best swimming stops.'
      },
      {
        question: 'Can Levanzo be visited in half a day?',
        answer: 'Yes, Levanzo can work well for a half-day route from Trapani. A full day gives more room for swimming, caves and a possible combination with Favignana.'
      },
      {
        question: 'Is snorkelling good in Levanzo?',
        answer: 'Yes. The clear water and rocky seabed make Levanzo a good snorkelling island, especially around sheltered coves chosen according to wind and visibility.'
      }
    ],
    ctaTitle: 'Create a quiet Levanzo itinerary',
    ctaText: 'Choose Levanzo alone for a slower day or combine it with Favignana on a full-day private tour.',
    primaryCtaLabel: 'Book a private tour',
    secondaryCtaLabel: 'Compare boats'
  },
  marettimo: {
    h1: 'Marettimo by boat',
    eyebrow: 'Egadi Islands guide',
    intro: [
      'Marettimo is the wildest Egadi island: higher, more remote and more dramatic than Favignana or Levanzo, with caves, cliffs and deep blue water.',
      'Because the island is farther from Trapani, a Marettimo boat day needs careful planning, the right boat and good sea conditions. When everything aligns, it is one of the most memorable experiences in western Sicily.',
      'The route is ideal for guests who want nature, scenery and a sense of distance rather than a quick swim-and-return itinerary.'
    ],
    sections: [
      {
        title: 'A wilder Egadi itinerary',
        body: [
          'Marettimo feels different from the rest of the archipelago. The coast is steeper, the water often deeper and the navigation more scenic. It rewards travellers who enjoy a full day at sea and a more adventurous rhythm.',
          'Private planning matters here: departure time, forecast, boat comfort and guest expectations all shape the route. The skipper decides whether to attempt the full island circuit or focus on the best sheltered side.'
        ]
      },
      {
        title: 'Caves, cliffs and swimming stops',
        body: [
          'Marettimo is famous for sea caves and dramatic rock formations. Some caves can only be approached in calm conditions, and the exact sequence changes with wind, swell and traffic.',
          'Swimming stops are usually chosen for water quality and shelter rather than proximity to beaches. This makes the experience feel more natural and less crowded than many classic summer routes.'
        ]
      },
      {
        title: 'Who should choose Marettimo',
        body: [
          'Marettimo is best for guests who are comfortable spending more time navigating and who want a premium, nature-led day. It is excellent for couples, small groups and travellers who have already seen Favignana.',
          'For families with small children or guests sensitive to waves, Favignana and Levanzo may be easier. We will always suggest the island that makes the most sense for the actual forecast.'
        ]
      }
    ],
    highlightsTitle: 'Marettimo highlights',
    faqTitle: 'Marettimo boat tour FAQ',
    faqs: [
      {
        question: 'Is Marettimo always reachable?',
        answer: 'No. Marettimo depends more on weather and sea state because it is farther from Trapani. If conditions are not suitable, we recommend a safer and more comfortable Egadi route.'
      },
      {
        question: 'Is Marettimo good for a first Egadi visit?',
        answer: 'It can be, but many first-time guests prefer Favignana and Levanzo because they are closer and easier. Marettimo is ideal when you want a wilder full-day experience.'
      },
      {
        question: 'Can we visit the sea caves?',
        answer: 'The caves are one of Marettimo’s highlights, but access depends on the sea. The skipper chooses only safe approaches and may adapt the itinerary during the day.'
      },
      {
        question: 'What boat should we choose for Marettimo?',
        answer: 'A comfortable private boat with good cruising range is recommended. The team can suggest the best option based on group size, season and desired level of comfort.'
      }
    ],
    ctaTitle: 'Plan a wild Marettimo day',
    ctaText: 'Ask us for the right boat and weather window for the most remote Egadi island.',
    primaryCtaLabel: 'Request availability',
    secondaryCtaLabel: 'View the fleet'
  }
};

const es: LocaleGuideMap = {
  favignana: {
    h1: 'Favignana en barco',
    eyebrow: 'Guía de las Islas Egadi',
    intro: [
      'Favignana es la isla más fácil de alcanzar desde Trapani y una de las mejores para vivir desde el mar: calas claras, roca clara, aguas turquesas y paradas de baño muy diferentes entre sí.',
      'Un tour privado en barco permite moverse entre Cala Rossa, Bue Marino, Cala Azzurra y zonas más tranquilas sin depender de carreteras llenas ni horarios rígidos.',
      'El patrón adapta la ruta al viento, al estado del mar y al ritmo del grupo, combinando baños, snorkel, navegación panorámica, fotos, almuerzo a bordo o tiempo en tierra.'
    ],
    sections: [
      {
        title: 'Por qué elegir Favignana en barco',
        body: [
          'Muchas de las calas más famosas de Favignana se disfrutan mejor desde el mar. Desde tierra pueden estar llenas o ser incómodas con viento; en barco se puede llegar a la hora adecuada y cambiar de zona si hace falta.',
          'La isla es compacta, por eso un itinerario bien planificado combina paradas icónicas y bahías más protegidas. Es una opción ideal para parejas, familias y grupos que quieren una experiencia completa en un día.'
        ]
      },
      {
        title: 'Las mejores paradas de Favignana',
        body: [
          'Cala Rossa destaca por la roca clara y el color intenso del agua, mientras Bue Marino ofrece un paisaje más dramático. Cala Azzurra suele ser una parada más suave para nadar cuando el mar lo permite.',
          'Según la previsión, el patrón puede añadir Grotta degli Innamorati, Preveto, Scalo Cavallo u otras calas menores. La ruta no se decide por lista fija, sino por la mejor experiencia de ese día.'
        ]
      },
      {
        title: 'Cuándo ir y qué llevar',
        body: [
          'Mayo, junio, septiembre y principios de octubre ofrecen luz agradable, menos tráfico y un ritmo más relajado. Julio y agosto son preciosos, pero conviene salir temprano y mantener una ruta flexible.',
          'Lleva bañador, protector solar respetuoso con el mar, gafas de sol, gorra y una prenda ligera para el regreso. Si te mareas, avísanos antes: el barco, la hora y la ruta pueden ayudar mucho.'
        ]
      }
    ],
    highlightsTitle: 'Lo mejor de Favignana',
    faqTitle: 'Preguntas frecuentes sobre Favignana en barco',
    faqs: [
      { question: '¿Se visita siempre Cala Rossa?', answer: 'Cala Rossa es una parada muy solicitada, pero depende del viento, del oleaje y de la seguridad. Si no es la mejor opción, el patrón elige calas más cómodas y protegidas.' },
      { question: '¿Favignana es adecuada para familias?', answer: 'Sí. Las distancias son cortas y la ruta puede adaptarse con baños frecuentes, pausas a la sombra y alternativas de agua tranquila.' },
      { question: '¿Cuánto dura el tour?', answer: 'Hay experiencias de medio día y de día completo. El día completo permite ir con más calma o combinar Favignana con Levanzo.' },
      { question: '¿La salida es desde Trapani?', answer: 'Normalmente sí, aunque puede variar según barco, temporada y disponibilidad. Confirmamos muelle y horario antes de la salida.' }
    ],
    ctaTitle: 'Organiza tu día en Favignana',
    ctaText: 'Elige un tour privado desde Trapani o combina Favignana y Levanzo en una ruta completa por las Egadi.',
    primaryCtaLabel: 'Reservar tour en barco',
    secondaryCtaLabel: 'Ver barcos'
  },
  levanzo: {
    h1: 'Levanzo en barco',
    eyebrow: 'Guía de las Islas Egadi',
    intro: [
      'Levanzo es la isla más íntima y tranquila de las Egadi: casas blancas, un pequeño puerto, agua transparente y una costa perfecta para navegar despacio.',
      'El barco es la mejor forma de descubrirla, porque sus calas, cuevas y puntos panorámicos se entienden realmente desde el mar.',
      'Es ideal para un día relajado, una ruta romántica o una combinación con Favignana cuando el mar permite visitar ambas islas.'
    ],
    sections: [
      { title: 'Por qué Levanzo funciona tan bien por mar', body: ['Levanzo tiene un pueblo pequeño y pocas carreteras, así que la costa es el verdadero itinerario. En barco se llega a Cala Fredda, Cala Minnola, cuevas y fondeaderos tranquilos sin prisas.', 'La isla gusta a quienes buscan agua clara, baños pausados y una atmósfera menos concurrida. Aquí no se trata de hacer kilómetros, sino de elegir las paradas adecuadas.'] },
      { title: 'Cala Minnola, Cala Fredda y cuevas', body: ['Cala Minnola es una de las paradas más queridas, con agua luminosa y un ambiente protegido en buenas condiciones. Cala Fredda está cerca del pueblo y suele funcionar para el primer o último baño.', 'El patrón puede incluir cuevas y pasos panorámicos según el mar. Algunas zonas se disfrutan desde el barco y otras invitan a nadar o hacer snorkel.'] },
      { title: 'Combinar Levanzo y Favignana', body: ['Levanzo y Favignana están lo bastante cerca para combinarse en muchos tours de día completo desde Trapani. La ruta mezcla los paisajes icónicos de Favignana con el encanto tranquilo de Levanzo.', 'Si la previsión cambia, el patrón prioriza la zona más protegida. Esa flexibilidad suele marcar la diferencia en las Egadi.'] }
    ],
    highlightsTitle: 'Lo mejor de Levanzo',
    faqTitle: 'Preguntas frecuentes sobre Levanzo en barco',
    faqs: [
      { question: '¿Levanzo es más tranquila que Favignana?', answer: 'Normalmente sí, sobre todo fuera de agosto. Es una buena opción para una experiencia más relajada.' },
      { question: '¿Podemos parar en el pueblo?', answer: 'Puede ser posible según amarres, ruta y horarios. En un tour privado se valora sin perder las mejores paradas de baño.' },
      { question: '¿Se puede visitar Levanzo en medio día?', answer: 'Sí, funciona bien en medio día desde Trapani. Un día completo permite más baños, cuevas y una posible combinación con Favignana.' },
      { question: '¿Es buena para snorkel?', answer: 'Sí. El agua clara y el fondo rocoso hacen de Levanzo una buena isla para snorkel en calas protegidas.' }
    ],
    ctaTitle: 'Crea una ruta tranquila en Levanzo',
    ctaText: 'Elige Levanzo para un día pausado o combínala con Favignana en un tour privado de día completo.',
    primaryCtaLabel: 'Reservar tour privado',
    secondaryCtaLabel: 'Comparar barcos'
  },
  marettimo: {
    h1: 'Marettimo en barco',
    eyebrow: 'Guía de las Islas Egadi',
    intro: [
      'Marettimo es la isla más salvaje de las Egadi: más alta, remota y dramática, con cuevas, acantilados y agua azul profunda.',
      'Al estar más lejos de Trapani, requiere buena planificación, el barco adecuado y condiciones marinas favorables. Cuando todo encaja, es una experiencia inolvidable.',
      'Es perfecta para quienes buscan naturaleza, paisaje y sensación de aventura más que una ruta rápida de baño y regreso.'
    ],
    sections: [
      { title: 'Una ruta Egadi más salvaje', body: ['Marettimo tiene una costa más vertical, aguas más profundas y una navegación más escénica. Recompensa a quienes disfrutan un día completo en el mar.', 'La planificación privada es esencial: horario, previsión, comodidad del barco y expectativas del grupo definen la ruta.'] },
      { title: 'Cuevas, acantilados y baños', body: ['La isla es famosa por sus cuevas marinas y formaciones rocosas. Algunas solo se acercan con mar tranquilo, por eso la secuencia cambia cada día.', 'Las paradas se eligen por calidad del agua y abrigo, no solo por cercanía a playas. La experiencia se siente más natural y menos concurrida.'] },
      { title: 'Para quién es Marettimo', body: ['Es ideal para viajeros cómodos con más navegación y que desean un día premium centrado en naturaleza. Funciona muy bien para parejas y grupos pequeños.', 'Para niños pequeños o personas sensibles al oleaje, Favignana y Levanzo pueden ser más fáciles. Siempre recomendamos la opción más sensata para la previsión real.'] }
    ],
    highlightsTitle: 'Lo mejor de Marettimo',
    faqTitle: 'Preguntas frecuentes sobre Marettimo en barco',
    faqs: [
      { question: '¿Marettimo siempre es alcanzable?', answer: 'No. Al estar más lejos, depende más del viento y del estado del mar. Si no conviene, proponemos una ruta Egadi más segura.' },
      { question: '¿Es buena para una primera visita?', answer: 'Puede serlo, pero muchos visitantes empiezan por Favignana y Levanzo. Marettimo es ideal para una experiencia más salvaje.' },
      { question: '¿Se visitan las cuevas?', answer: 'Las cuevas son un atractivo principal, pero el acceso depende del mar. El patrón solo se acerca cuando es seguro.' },
      { question: '¿Qué barco conviene?', answer: 'Recomendamos un barco privado cómodo y con buena autonomía. El equipo ayuda a elegir según grupo, temporada y confort deseado.' }
    ],
    ctaTitle: 'Planifica un día salvaje en Marettimo',
    ctaText: 'Consúltanos el barco y la ventana meteorológica adecuados para la isla más remota de las Egadi.',
    primaryCtaLabel: 'Solicitar disponibilidad',
    secondaryCtaLabel: 'Ver flota'
  }
};

const fr: LocaleGuideMap = {
  favignana: {
    h1: 'Favignana en bateau',
    eyebrow: 'Guide des îles Égades',
    intro: [
      'Favignana est l’île la plus facile à rejoindre depuis Trapani et l’une des plus belles à découvrir depuis la mer : criques lumineuses, roche claire, eau turquoise et arrêts baignade très variés.',
      'Une excursion privée en bateau permet de passer de Cala Rossa à Bue Marino, Cala Azzurra et des zones plus calmes sans dépendre des routes fréquentées ni des horaires fixes.',
      'Le skipper adapte l’itinéraire au vent, à la mer et au rythme du groupe, avec baignades, snorkeling, navigation panoramique, photos, déjeuner à bord ou temps à terre.'
    ],
    sections: [
      { title: 'Pourquoi choisir Favignana en bateau', body: ['Les lieux les plus connus de Favignana sont côtiers. Depuis la terre, ils peuvent être bondés ou exposés au vent; depuis le bateau, on choisit le bon moment et les mouillages les plus confortables.', 'L’île est compacte, donc un bon itinéraire peut combiner les sites iconiques et des criques plus protégées. C’est un excellent choix pour couples, familles et groupes.'] },
      { title: 'Les meilleurs arrêts autour de Favignana', body: ['Cala Rossa est célèbre pour sa roche claire et son bleu intense, tandis que Bue Marino offre un paysage plus spectaculaire. Cala Azzurra est souvent plus douce pour une baignade détendue.', 'Selon la météo, le skipper peut ajouter Grotta degli Innamorati, Preveto, Scalo Cavallo ou de petites criques. L’objectif est de créer le meilleur parcours du jour, pas de suivre une liste rigide.'] },
      { title: 'Quand partir et quoi prévoir', body: ['Mai, juin, septembre et début octobre offrent une lumière plus douce, moins de trafic et un rythme paisible. En juillet et août, les départs matinaux et la flexibilité sont essentiels.', 'Prévoyez maillot, protection solaire respectueuse de la mer, lunettes, chapeau et une couche légère pour le retour. Si vous êtes sensible au mal de mer, dites-le avant le départ.'] }
    ],
    highlightsTitle: 'Temps forts de Favignana',
    faqTitle: 'FAQ excursion bateau Favignana',
    faqs: [
      { question: 'Visite-t-on toujours Cala Rossa ?', answer: 'Cala Rossa est très demandée, mais tout dépend du vent, de la houle et de la sécurité. Le skipper choisit les criques les plus adaptées le jour même.' },
      { question: 'Favignana convient-elle aux familles ?', answer: 'Oui. Les distances sont courtes et l’itinéraire peut être adapté avec des pauses fréquentes, de l’ombre et des zones calmes.' },
      { question: 'Combien de temps dure l’excursion ?', answer: 'Il existe des formules demi-journée et journée complète. La journée complète permet de ralentir ou de combiner Favignana avec Levanzo.' },
      { question: 'Le départ se fait-il de Trapani ?', answer: 'Généralement oui, selon le bateau, la saison et les disponibilités. Le quai et l’heure sont confirmés avant le départ.' }
    ],
    ctaTitle: 'Organisez votre journée à Favignana',
    ctaText: 'Choisissez une excursion privée depuis Trapani ou combinez Favignana et Levanzo dans un itinéraire complet.',
    primaryCtaLabel: 'Réserver une excursion',
    secondaryCtaLabel: 'Voir les bateaux'
  },
  levanzo: {
    h1: 'Levanzo en bateau',
    eyebrow: 'Guide des îles Égades',
    intro: [
      'Levanzo est l’île la plus intime et tranquille des Égades : maisons blanches, petit port, eau transparente et côte parfaite pour naviguer lentement.',
      'Le bateau est la meilleure façon de la comprendre, car ses criques, grottes et points de vue se révèlent vraiment depuis la mer.',
      'Elle convient à une journée détendue, à une sortie romantique ou à une combinaison avec Favignana lorsque les conditions le permettent.'
    ],
    sections: [
      { title: 'Pourquoi Levanzo se découvre par la mer', body: ['Levanzo possède un petit village et peu de routes: la côte devient donc l’itinéraire principal. En bateau, on rejoint Cala Fredda, Cala Minnola, des grottes et des mouillages tranquilles.', 'L’île plaît aux voyageurs qui cherchent eau claire, baignades calmes et ambiance moins fréquentée. Ici, il s’agit de choisir le bon endroit au bon moment.'] },
      { title: 'Cala Minnola, Cala Fredda et grottes', body: ['Cala Minnola est l’un des arrêts les plus appréciés, avec une eau lumineuse et une atmosphère protégée. Cala Fredda, proche du village, fonctionne souvent pour une première ou dernière baignade.', 'Le skipper peut inclure des grottes et passages panoramiques selon la mer. Certains endroits se contemplent depuis le bateau, d’autres invitent au snorkeling.'] },
      { title: 'Combiner Levanzo et Favignana', body: ['Levanzo et Favignana sont assez proches pour être combinées lors de nombreuses journées complètes depuis Trapani. Le contraste entre les deux îles rend l’itinéraire très riche.', 'Si la météo change, le skipper privilégie la zone la plus abritée. Cette souplesse fait partie d’une bonne journée aux Égades.'] }
    ],
    highlightsTitle: 'Temps forts de Levanzo',
    faqTitle: 'FAQ excursion bateau Levanzo',
    faqs: [
      { question: 'Levanzo est-elle plus calme que Favignana ?', answer: 'Souvent oui, surtout hors août. C’est une bonne option pour une expérience plus paisible.' },
      { question: 'Peut-on s’arrêter au village ?', answer: 'C’est parfois possible selon les amarres, le timing et l’itinéraire. En privé, le skipper conseille la meilleure option.' },
      { question: 'Levanzo se visite-t-elle en demi-journée ?', answer: 'Oui, une demi-journée peut bien fonctionner depuis Trapani. Une journée complète laisse plus de temps pour les grottes et Favignana.' },
      { question: 'Le snorkeling est-il intéressant ?', answer: 'Oui. L’eau claire et les fonds rocheux rendent Levanzo agréable pour le snorkeling dans les criques abritées.' }
    ],
    ctaTitle: 'Créez un itinéraire tranquille à Levanzo',
    ctaText: 'Choisissez Levanzo pour une journée lente ou combinez-la avec Favignana en excursion privée.',
    primaryCtaLabel: 'Réserver en privé',
    secondaryCtaLabel: 'Comparer les bateaux'
  },
  marettimo: {
    h1: 'Marettimo en bateau',
    eyebrow: 'Guide des îles Égades',
    intro: [
      'Marettimo est l’île la plus sauvage des Égades : plus haute, plus lointaine et plus spectaculaire, avec grottes, falaises et eau bleu profond.',
      'Comme elle est plus éloignée de Trapani, elle demande une bonne planification, le bateau adapté et des conditions favorables. Quand tout s’aligne, l’expérience est exceptionnelle.',
      'C’est l’île idéale pour ceux qui recherchent nature, paysages et sensation d’aventure plutôt qu’un simple aller-retour baignade.'
    ],
    sections: [
      { title: 'Un itinéraire Égades plus sauvage', body: ['Marettimo a une côte plus verticale, une eau souvent plus profonde et une navigation très panoramique. Elle récompense les voyageurs qui aiment passer une vraie journée en mer.', 'La planification privée est essentielle: horaire, météo, confort du bateau et attentes du groupe déterminent le parcours.'] },
      { title: 'Grottes, falaises et baignades', body: ['L’île est connue pour ses grottes marines et ses formations rocheuses. Certaines approches ne sont possibles que par mer calme, donc l’ordre des arrêts change.', 'Les pauses baignade sont choisies pour la qualité de l’eau et l’abri. L’expérience paraît plus naturelle et moins fréquentée.'] },
      { title: 'À qui s’adresse Marettimo', body: ['Marettimo convient aux voyageurs à l’aise avec plus de navigation et qui veulent une journée premium centrée sur la nature. Elle est parfaite pour couples et petits groupes.', 'Pour les jeunes enfants ou les personnes sensibles à la houle, Favignana et Levanzo peuvent être plus simples. Nous recommandons toujours la route la plus adaptée à la météo réelle.'] }
    ],
    highlightsTitle: 'Temps forts de Marettimo',
    faqTitle: 'FAQ excursion bateau Marettimo',
    faqs: [
      { question: 'Marettimo est-elle toujours accessible ?', answer: 'Non. Sa distance rend la météo plus importante. Si les conditions ne sont pas bonnes, nous proposons une route plus sûre.' },
      { question: 'Est-ce un bon premier choix aux Égades ?', answer: 'Possible, mais beaucoup commencent par Favignana et Levanzo. Marettimo est idéale pour une journée plus sauvage.' },
      { question: 'Peut-on visiter les grottes ?', answer: 'Les grottes sont un point fort, mais l’accès dépend de la mer. Le skipper s’approche uniquement quand c’est sûr.' },
      { question: 'Quel bateau choisir ?', answer: 'Un bateau privé confortable avec bonne autonomie est recommandé. L’équipe conseille selon groupe, saison et confort souhaité.' }
    ],
    ctaTitle: 'Planifiez une journée sauvage à Marettimo',
    ctaText: 'Demandez-nous le bateau et la fenêtre météo adaptés à l’île la plus lointaine des Égades.',
    primaryCtaLabel: 'Demander disponibilité',
    secondaryCtaLabel: 'Voir la flotte'
  }
};

const de: LocaleGuideMap = {
  favignana: {
    h1: 'Favignana mit dem Boot',
    eyebrow: 'Reiseführer Egadische Inseln',
    intro: [
      'Favignana ist von Trapani aus am einfachsten zu erreichen und vom Meer aus besonders eindrucksvoll: helle Felsen, türkisfarbenes Wasser und Buchten mit sehr unterschiedlichem Charakter.',
      'Eine private Bootstour verbindet Cala Rossa, Bue Marino, Cala Azzurra und ruhigere Küstenabschnitte ohne volle Straßen oder starre Fährzeiten.',
      'Der Skipper plant die Route nach Wind, Seegang und Tempo der Gäste: Baden, Schnorcheln, Panoramafahrt, Fotos, Mittagessen an Bord oder Zeit an Land.'
    ],
    sections: [
      { title: 'Warum Favignana mit dem Boot erleben', body: ['Viele der bekanntesten Orte Favignanas liegen direkt an der Küste. Von Land aus sind sie oft voll oder windanfällig; vom Boot aus erreicht man sie zur passenden Zeit und kann flexibel wechseln.', 'Die Insel ist kompakt, daher kombiniert eine gute Route berühmte Stopps und geschütztere Buchten. Ideal für Paare, Familien und Gruppen, die an einem Tag viel Egadi erleben möchten.'] },
      { title: 'Die besten Stopps rund um Favignana', body: ['Cala Rossa ist für hellen Kalkstein und intensives Blau bekannt, Bue Marino für die dramatische Steinbruchlandschaft. Cala Azzurra ist oft sanfter und eignet sich gut zum entspannten Schwimmen.', 'Je nach Wetter ergänzt der Skipper Grotta degli Innamorati, Preveto, Scalo Cavallo oder kleinere Buchten. Entscheidend ist die beste Route für den jeweiligen Tag.'] },
      { title: 'Beste Reisezeit und Vorbereitung', body: ['Mai, Juni, September und Anfang Oktober bieten weicheres Licht, weniger Verkehr und ruhigere Ankerplätze. Im Juli und August sind frühe Abfahrten und flexible Routen besonders wichtig.', 'Mitbringen: Badebekleidung, meeresfreundliche Sonnencreme, Sonnenbrille, Hut und eine leichte Schicht für die Rückfahrt. Bei Seekrankheit bitte vorher Bescheid sagen.'] }
    ],
    highlightsTitle: 'Highlights von Favignana',
    faqTitle: 'FAQ Bootstour Favignana',
    faqs: [
      { question: 'Besuchen wir immer Cala Rossa?', answer: 'Cala Rossa ist sehr gefragt, hängt aber von Wind, Welle und Sicherheit ab. Der Skipper wählt am Tag selbst die komfortabelsten Buchten.' },
      { question: 'Ist Favignana für Familien geeignet?', answer: 'Ja. Die Distanzen sind kurz und die Route kann mit häufigen Badestopps, Schattenpausen und ruhigen Alternativen angepasst werden.' },
      { question: 'Wie lange dauert die Tour?', answer: 'Es gibt Halb- und Ganztagestouren. Ein ganzer Tag erlaubt mehr Ruhe oder eine Kombination mit Levanzo.' },
      { question: 'Startet die Tour in Trapani?', answer: 'Meistens ja, abhängig von Boot, Saison und Verfügbarkeit. Treffpunkt und Uhrzeit werden vor Abfahrt bestätigt.' }
    ],
    ctaTitle: 'Plane deinen Bootstag auf Favignana',
    ctaText: 'Wähle eine private Tour ab Trapani oder kombiniere Favignana und Levanzo zu einer kompletten Egadi-Route.',
    primaryCtaLabel: 'Bootstour buchen',
    secondaryCtaLabel: 'Boote ansehen'
  },
  levanzo: {
    h1: 'Levanzo mit dem Boot',
    eyebrow: 'Reiseführer Egadische Inseln',
    intro: [
      'Levanzo ist die ruhigste und intimste der Egadischen Inseln: weiße Häuser, ein kleiner Hafen, klares Wasser und eine Küste wie gemacht für langsames Navigieren.',
      'Vom Boot aus versteht man die Insel am besten, denn Buchten, Höhlen und Ausblicke zeigen sich wirklich vom Meer.',
      'Sie eignet sich für entspannte private Tage, romantische Routen oder eine Kombination mit Favignana bei passenden Bedingungen.'
    ],
    sections: [
      { title: 'Warum Levanzo vom Meer aus funktioniert', body: ['Levanzo hat ein kleines Dorf und wenige Straßen, deshalb ist die Küste die eigentliche Route. Mit dem Boot erreicht man Cala Fredda, Cala Minnola, Höhlen und ruhige Ankerplätze.', 'Die Insel passt zu Gästen, die klares Wasser, ruhiges Baden und weniger Trubel suchen. Es geht weniger um Strecke als um den richtigen Ort zur richtigen Zeit.'] },
      { title: 'Cala Minnola, Cala Fredda und Höhlen', body: ['Cala Minnola ist einer der beliebtesten Stopps mit leuchtendem Wasser und geschützter Atmosphäre. Cala Fredda liegt nah am Dorf und eignet sich oft für den ersten oder letzten Badestopp.', 'Der Skipper kann Höhlen und Panoramapassagen einbauen, abhängig vom Meer. Manche Zonen genießt man vom Boot, andere laden zum Schnorcheln ein.'] },
      { title: 'Levanzo und Favignana kombinieren', body: ['Levanzo und Favignana liegen nah genug, um sie auf vielen Ganztagestouren ab Trapani zu kombinieren. Der Kontrast zwischen den Inseln macht die Route besonders abwechslungsreich.', 'Bei wechselnder Wetterlage priorisiert der Skipper die geschütztere Seite. Diese Flexibilität ist ein wichtiger Teil einer gelungenen Egadi-Tour.'] }
    ],
    highlightsTitle: 'Highlights von Levanzo',
    faqTitle: 'FAQ Bootstour Levanzo',
    faqs: [
      { question: 'Ist Levanzo ruhiger als Favignana?', answer: 'Meist ja, besonders außerhalb des Augusts. Es ist eine gute Wahl für eine entspanntere Egadi-Erfahrung.' },
      { question: 'Können wir im Dorf anhalten?', answer: 'Das kann je nach Liegeplatz, Zeitplan und Route möglich sein. Bei privaten Touren berät der Skipper, ob es sinnvoll passt.' },
      { question: 'Geht Levanzo auch als Halbtagestour?', answer: 'Ja, Levanzo eignet sich gut für einen halben Tag ab Trapani. Ein ganzer Tag bietet mehr Zeit für Höhlen und Favignana.' },
      { question: 'Ist Schnorcheln gut?', answer: 'Ja. Klares Wasser und felsiger Grund machen Levanzo in geschützten Buchten angenehm zum Schnorcheln.' }
    ],
    ctaTitle: 'Erstelle eine ruhige Levanzo-Route',
    ctaText: 'Wähle Levanzo für einen langsamen Tag oder kombiniere die Insel mit Favignana auf einer privaten Ganztagestour.',
    primaryCtaLabel: 'Private Tour buchen',
    secondaryCtaLabel: 'Boote vergleichen'
  },
  marettimo: {
    h1: 'Marettimo mit dem Boot',
    eyebrow: 'Reiseführer Egadische Inseln',
    intro: [
      'Marettimo ist die wildeste Egadische Insel: höher, abgelegener und dramatischer als Favignana oder Levanzo, mit Höhlen, Klippen und tiefblauem Wasser.',
      'Da die Insel weiter von Trapani entfernt liegt, braucht sie gute Planung, das passende Boot und geeignete Bedingungen. Wenn alles passt, ist sie unvergesslich.',
      'Die Route ist ideal für Gäste, die Natur, Landschaft und Abenteuergefühl suchen statt einer kurzen Badefahrt.'
    ],
    sections: [
      { title: 'Eine wildere Egadi-Route', body: ['Marettimos Küste ist steiler, das Wasser oft tiefer und die Navigation sehr landschaftlich. Die Insel belohnt Reisende, die einen vollen Tag auf See genießen.', 'Private Planung ist hier besonders wichtig: Abfahrtszeit, Wetter, Bootskomfort und Erwartungen der Gäste formen die Route.'] },
      { title: 'Höhlen, Klippen und Badestopps', body: ['Marettimo ist für Meereshöhlen und Felsformationen bekannt. Manche Höhlen sind nur bei ruhiger See erreichbar, deshalb ändert sich die Reihenfolge der Stopps.', 'Badestopps werden nach Wasserqualität und Schutz gewählt. Dadurch fühlt sich die Erfahrung natürlicher und weniger überlaufen an.'] },
      { title: 'Für wen Marettimo passt', body: ['Marettimo passt zu Gästen, die mehr Navigation mögen und einen hochwertigen Naturtag suchen. Besonders schön ist sie für Paare und kleine Gruppen.', 'Für kleine Kinder oder wellenempfindliche Gäste sind Favignana und Levanzo oft einfacher. Wir empfehlen immer die sinnvollste Route für die echte Vorhersage.'] }
    ],
    highlightsTitle: 'Highlights von Marettimo',
    faqTitle: 'FAQ Bootstour Marettimo',
    faqs: [
      { question: 'Ist Marettimo immer erreichbar?', answer: 'Nein. Wegen der Entfernung hängt Marettimo stärker von Wind und Seegang ab. Bei ungeeigneten Bedingungen empfehlen wir eine sicherere Egadi-Route.' },
      { question: 'Ist Marettimo gut für den ersten Egadi-Besuch?', answer: 'Möglich, aber viele starten mit Favignana und Levanzo. Marettimo ist ideal für eine wildere Ganztagestour.' },
      { question: 'Kann man die Höhlen besuchen?', answer: 'Die Höhlen sind ein Höhepunkt, aber der Zugang hängt vom Meer ab. Der Skipper nähert sich nur, wenn es sicher ist.' },
      { question: 'Welches Boot eignet sich?', answer: 'Empfohlen ist ein komfortables privates Boot mit guter Reichweite. Das Team berät nach Gruppengröße, Saison und gewünschtem Komfort.' }
    ],
    ctaTitle: 'Plane einen wilden Marettimo-Tag',
    ctaText: 'Frag uns nach dem passenden Boot und Wetterfenster für die abgelegenste Egadi-Insel.',
    primaryCtaLabel: 'Verfügbarkeit anfragen',
    secondaryCtaLabel: 'Flotte ansehen'
  }
};

const guides: Record<string, LocaleGuideMap> = { it, en, es, fr, de };

export function getIslandGuideCopy(slug: IslandGuideSlug, locale: string): IslandGuideCopy {
  return guides[locale]?.[slug] ?? guides.it[slug];
}
