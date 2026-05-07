"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Anchor, MapPin, Waves } from "lucide-react";
import { islandMapData } from "@/components/islands-itinerary/islands/data";
import { IslandPoiStage } from "@/components/islands-itinerary/islands/island-poi-stage";
import type { IslandPoi } from "@/components/islands-itinerary/islands/types";

interface PoiDetail {
  bestFor: string;
  description: string;
  imageSrc?: string;
}

const poiDetails: Record<string, PoiDetail> = {
  "cala-rossa": {
    bestFor: "Icona di Favignana",
    description:
      "Cala Rossa è una delle immagini più forti dell'isola: acqua chiarissima, roccia calcarea e pareti segnate dalle antiche cave. In barca è una tappa da leggere con il meteo giusto, perché il colore del mare cambia molto con vento e luce.",
    imageSrc: "/images/islands/favignana/poi/cala-rossa.webp",
  },
  "bue-marino": {
    bestFor: "Tufo e snorkeling",
    description:
      "Bue Marino unisce mare profondo, tagli di tufo e fondali intensi. È una zona scenografica, perfetta per chi vuole vedere il lato più minerale di Favignana e fare una sosta in acqua quando le condizioni sono favorevoli.",
    imageSrc: "/images/islands/favignana/poi/bue-marino.webp",
  },
  "cala-azzurra": {
    bestFor: "Acqua bassa e sabbia",
    description:
      "Cala Azzurra è amata per i colori luminosi e il fondale chiaro. È una delle soste più morbide dell'isola, adatta a bagni lunghi, famiglie e ospiti che cercano un ingresso in acqua più semplice.",
    imageSrc: "/images/islands/favignana/poi/cala-azzurra.webp",
  },
  "lido-burrone": {
    bestFor: "Sosta facile",
    description:
      "Lido Burrone è la spiaggia più comoda e balneare di Favignana, con fondale basso e sabbioso. Dal mare aiuta a capire il lato più accessibile dell'isola, diverso dalle cale rocciose e dalle vecchie cave.",
  },
  "grotta-perciata": {
    bestFor: "Archi naturali",
    description:
      "Grotta Perciata è un tratto costiero riconoscibile per gli archi di roccia e per l'acqua che entra tra le forme naturali della scogliera. È una tappa interessante per fotografie, snorkeling leggero e navigazione lenta.",
  },
  marasolo: {
    bestFor: "Bagno tranquillo",
    description:
      "Marasolo si trova sul versante meridionale, in una zona dal carattere più disteso. È utile quando si cerca una sosta riparata, con acqua bassa e un ritmo meno esposto rispetto alle cale più celebri.",
  },
  "punta-longa": {
    bestFor: "Borgo marinaro",
    description:
      "Punta Longa conserva un piccolo carattere da borgo di pescatori e introduce il versante sud-occidentale dell'isola. Dal mare è un passaggio piacevole per cambiare ritmo tra bagni, costa bassa e panorami aperti.",
  },
  "cala-rotonda": {
    bestFor: "Ponente e tramonto",
    description:
      "Cala Rotonda è una baia tondeggiante del lato occidentale, famosa per l'arco naturale e per il mare limpido. È una zona suggestiva soprattutto quando la luce scende e il ponente diventa più morbido.",
  },
  "punta-sottile": {
    bestFor: "Faro e orizzonte",
    description:
      "Punta Sottile guarda verso il mare aperto e il tramonto. Il faro e le piccole insenature rendono questo lato dell'isola ideale per raccontare Favignana oltre le cale più frequentate.",
  },
  tonnara: {
    bestFor: "Memoria marinara",
    description:
      "La Tonnara e l'Ex Stabilimento Florio raccontano il rapporto storico tra Favignana e la pesca del tonno. Non è solo un luogo da vedere: è il cuore industriale e umano che ha segnato l'identità dell'isola.",
    imageSrc: "/images/islands/favignana/poi/tonnara.webp",
  },
  "palazzo-florio": {
    bestFor: "Storia Florio",
    description:
      "Palazzo Florio accoglie chi arriva in paese con l'eleganza della stagione in cui la famiglia Florio trasformò Favignana in un riferimento economico e culturale del Mediterraneo.",
    imageSrc: "/images/islands/favignana/poi/palazzo-florio.webp",
  },
  "castello-s-caterina": {
    bestFor: "Vista sull'isola",
    description:
      "Il Castello di Santa Caterina domina Favignana dall'alto e permette di leggere la forma dell'isola, il paese, le cave e i due versanti costieri. È il riferimento panoramico più evidente del profilo isolano.",
    imageSrc: "/images/islands/favignana/poi/castello-s-caterina.webp",
  },
  "scalo-cavallo": {
    bestFor: "Geologia costiera",
    description:
      "Scalo Cavallo è una scogliera in cui rocce, vecchi moli e tracce delle cave aiutano a capire la geologia di Favignana. In acqua diventa una sosta interessante per chi ama fondali più rocciosi.",
    imageSrc: "/images/islands/favignana/poi/scalo-cavallo.webp",
  },
  "cala-graziosa": {
    bestFor: "Cava e trasparenze",
    description:
      "Cala Graziosa è incastonata in una vecchia cava di tufo e ha un fondale che rende l'acqua molto trasparente. È una tappa meno urlata ma preziosa per chi cerca sfumature più tranquille.",
    imageSrc: "/images/islands/favignana/poi/cala-graziosa.webp",
  },
  "cala-del-pozzo": {
    bestFor: "Costa nord",
    description:
      "Cala del Pozzo è una baia del versante settentrionale, più selvatica e stagionale. Cambia molto con maree, luce e vento, ed è utile per capire il carattere meno balneare della costa nord.",
    imageSrc: "/images/islands/favignana/poi/cala-del-pozzo.webp",
  },
  "punta-faraglione": {
    bestFor: "Faraglioni",
    description:
      "Punta Faraglione introduce una costa più ruvida, fatta di scogli, ciottoli e accessi meno immediati. Dal mare è una zona da guardare lentamente, soprattutto quando il vento lascia acqua pulita.",
    imageSrc: "/images/islands/favignana/poi/punta-faraglione.webp",
  },
  "cave-florio": {
    bestFor: "Cave di tufo",
    description:
      "Le Cave Florio mostrano quanto l'estrazione del tufo abbia disegnato Favignana, non solo nell'entroterra ma anche lungo la costa. Sono uno dei segni più riconoscibili dell'isola.",
    imageSrc: "/images/islands/favignana/poi/cave-florio.webp",
  },
};

const featuredPoiIds = [
  "cala-rossa",
  "bue-marino",
  "cala-azzurra",
  "lido-burrone",
  "grotta-perciata",
  "cala-rotonda",
  "tonnara",
  "palazzo-florio",
  "castello-s-caterina",
];

function fallbackDetail(poi: IslandPoi): PoiDetail {
  const label = poi.label.toLowerCase();

  if (label.includes("cala") || label.includes("lido") || label.includes("marasolo")) {
    return {
      bestFor: "Cala di Favignana",
      description: `${poi.label} è uno dei riferimenti costieri di Favignana: una tappa utile per leggere esposizione, colori del fondale e possibilità di sosta in base al vento del giorno.`,
    };
  }

  if (label.includes("punta") || label.includes("isola") || label.includes("galeotta")) {
    return {
      bestFor: "Punto panoramico",
      description: `${poi.label} aiuta a orientarsi lungo il profilo dell'isola, tra cambi di versante, panorami aperti e passaggi che in barca rendono Favignana più leggibile.`,
    };
  }

  return {
    bestFor: "Punto di interesse",
    description: `${poi.label} è uno dei luoghi mappati su Favignana, utile per collegare mare, storia e orientamento durante la visita dell'isola.`,
  };
}

export function FavignanaPoiExplorer() {
  const island = islandMapData.favignana;
  const [selectedPoiId, setSelectedPoiId] = useState("cala-rossa");
  const [imageFailed, setImageFailed] = useState(false);

  const selectedPoi = useMemo(
    () => island.pois.find((poi) => poi.id === selectedPoiId) ?? island.pois[0],
    [island.pois, selectedPoiId],
  );
  const selectedDetail = selectedPoi
    ? poiDetails[selectedPoi.id] ?? fallbackDetail(selectedPoi)
    : null;
  const selectedImageSrc =
    selectedPoi && selectedDetail && !imageFailed
      ? selectedDetail.imageSrc ?? `/images/islands/favignana/poi/${selectedPoi.id}.webp`
      : island.imageSrc;
  const featuredPois = featuredPoiIds
    .map((id) => island.pois.find((poi) => poi.id === id))
    .filter((poi): poi is IslandPoi => Boolean(poi));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)] lg:items-stretch">
      <div className="flex min-h-[32rem] flex-col overflow-hidden rounded-lg border border-[#b58a27]/25 bg-[#071934] shadow-[0_24px_70px_rgba(7,25,52,0.16)] sm:min-h-[38rem] lg:min-h-[44rem]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-gold)]">
              Mappa interattiva
            </p>
            <h2 className="mt-1 font-heading text-2xl font-bold leading-tight">
              Cale e punti di interesse
            </h2>
          </div>
          <MapPin className="h-5 w-5 shrink-0 text-[var(--color-gold)]" aria-hidden="true" />
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-6 sm:px-6 lg:px-7">
          <IslandPoiStage
            alt="Mappa SVG interattiva di Favignana con cale e punti di interesse"
            aspectClassName={island.aspectClassName}
            height={island.height}
            onSelectPoi={(poi) => {
              setImageFailed(false);
              setSelectedPoiId(poi.id);
            }}
            pois={island.pois}
            selectedPoiId={selectedPoi?.id}
            src={island.src}
            width={island.width}
            widthStyle="min(100%, calc(128% * 1371 / 765), 70rem)"
          />
        </div>
      </div>

      <aside className="flex min-h-[32rem] flex-col overflow-hidden rounded-lg border border-[#d9c79d] bg-white shadow-[0_18px_54px_rgba(10,38,55,0.12)] sm:min-h-[38rem] lg:min-h-[44rem]">
        {selectedPoi && selectedDetail ? (
          <>
            <div className="relative h-64 shrink-0 overflow-hidden sm:h-80">
              <Image
                src={selectedImageSrc}
                alt={selectedPoi.label}
                fill
                onError={() => setImageFailed(true)}
                sizes="(max-width: 1024px) 100vw, 34vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071934]/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4 text-white">
                <span className="rounded-md border border-white/30 bg-[#071934]/75 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] backdrop-blur">
                  {selectedDetail.bestFor}
                </span>
                <Waves className="h-5 w-5 text-[var(--color-gold)]" aria-hidden="true" />
              </div>
            </div>

            <div className="flex flex-1 flex-col p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b58a27]">
                Favignana
              </p>
              <h3 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337]">
                {selectedPoi.label}
              </h3>
              <p className="mt-4 text-base leading-7 text-[#425f6f]">
                {selectedDetail.description}
              </p>

              <div className="mt-6 border-t border-[#eadfca] pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a8b93]">
                  Selezioni rapide
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {featuredPois.map((poi) => {
                    const isActive = poi.id === selectedPoi.id;

                    return (
                      <button
                        key={poi.id}
                        type="button"
                        onClick={() => {
                          setImageFailed(false);
                          setSelectedPoiId(poi.id);
                        }}
                        className={[
                          "rounded-md border px-3 py-2 text-xs font-semibold transition",
                          isActive
                            ? "border-[#b58a27] bg-[#b58a27] text-white"
                            : "border-[#d9c79d] bg-[#f8f2e6] text-[#294657] hover:border-[#b58a27] hover:bg-[#f2e5c9]",
                        ].join(" ")}
                      >
                        {poi.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-auto flex items-center gap-3 pt-6 text-sm font-semibold text-[#294657]">
                <Anchor className="h-4 w-4 text-[#b58a27]" aria-hidden="true" />
                <span>La rotta reale dipende sempre da vento, mare e sicurezza.</span>
              </div>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}
