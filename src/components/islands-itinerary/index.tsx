"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { islandMapData, islandOrder } from "./islands/data";
import { IslandPoiStage } from "./islands/island-poi-stage";
import type { IslandId, IslandPoi } from "./islands/types";

function getPoiType(label: string) {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes("grotta")) return "Grotta";
  if (
    normalizedLabel.includes("cala") ||
    normalizedLabel.includes("praia") ||
    normalizedLabel.includes("scalo") ||
    normalizedLabel.includes("porto") ||
    normalizedLabel.includes("spalmatore") ||
    normalizedLabel.includes("bagno")
  ) {
    return "Costa";
  }
  if (
    normalizedLabel.includes("punta") ||
    normalizedLabel.includes("capo") ||
    normalizedLabel.includes("faraglione") ||
    normalizedLabel.includes("isola") ||
    normalizedLabel.includes("galeotta")
  ) {
    return "Promontorio";
  }
  if (
    normalizedLabel.includes("pizzo") ||
    normalizedLabel.includes("portella") ||
    normalizedLabel.includes("mira")
  ) {
    return "Sentiero";
  }
  if (
    normalizedLabel.includes("castello") ||
    normalizedLabel.includes("palazzo") ||
    normalizedLabel.includes("tonnara") ||
    normalizedLabel.includes("faro") ||
    normalizedLabel.includes("cave")
  ) {
    return "Storia";
  }
  if (normalizedLabel.includes("paese")) return "Paese";

  return "Punto";
}

function getPoiDescription(poi: IslandPoi, islandLabel: string) {
  if (poi.description) return poi.description;

  switch (getPoiType(poi.label)) {
    case "Grotta":
      return `${poi.label} e' una cavita' naturale lungo il profilo di ${islandLabel}: un riferimento ideale per leggere la costa dal mare.`;
    case "Costa":
      return `${poi.label} identifica una cala, un approdo o un tratto costiero di ${islandLabel}, utile per orientarsi tra bagni, soste e passaggi riparati.`;
    case "Promontorio":
      return `${poi.label} segna un'estremita' o un riferimento roccioso dell'isola, perfetto per capire il disegno della costa.`;
    case "Sentiero":
      return `${poi.label} e' un riferimento interno dei percorsi di ${islandLabel}, tra quote, crinali e passaggi panoramici.`;
    case "Storia":
      return `${poi.label} racconta la parte storica e materiale dell'isola, tra architetture, attivita' marinare e memoria del territorio.`;
    case "Paese":
      return `${poi.label} e' il centro abitato dell'isola, il punto piu' immediato per servizi, approdi e vita quotidiana.`;
    default:
      return `${poi.label} e' uno dei riferimenti mappati su ${islandLabel}, utile per leggere l'isola con piu' precisione.`;
  }
}

export function IslandsItinerary() {
  const [activeIslandId, setActiveIslandId] = useState<IslandId>("favignana");
  const [selectedPoiId, setSelectedPoiId] = useState<string>(
    islandMapData.favignana.pois[0]?.id ?? "",
  );
  const [detailImageFailed, setDetailImageFailed] = useState(false);
  const activeIsland = islandMapData[activeIslandId];
  const selectedPoi = useMemo(
    () =>
      activeIsland.pois.find((poi) => poi.id === selectedPoiId) ??
      activeIsland.pois[0],
    [activeIsland, selectedPoiId],
  );
  const detailImageSrc = selectedPoi
    ? detailImageFailed
      ? activeIsland.imageSrc
      : selectedPoi.imageSrc ?? `/images/islands/${activeIsland.id}/poi/${selectedPoi.id}.webp`
    : activeIsland.imageSrc;

  useEffect(() => {
    setDetailImageFailed(false);
  }, [activeIslandId, selectedPoiId]);

  function handleIslandChange(islandId: IslandId) {
    const nextIsland = islandMapData[islandId];
    setActiveIslandId(islandId);
    setSelectedPoiId(nextIsland.pois[0]?.id ?? "");
  }

  return (
    <section
      id="egadi-map"
      aria-label="Mappa interattiva delle Isole Egadi"
      className="egadi-water-reflection overflow-hidden bg-[#071934] px-4 py-24 text-white sm:px-8 lg:px-12 lg:py-28"
      style={{
        background:
          "linear-gradient(180deg, #071934 0%, #0a2a4a 48%, #071934 100%)",
      }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-gold)]">
            Isole Egadi
          </p>
          <h1 className="mt-4 font-heading text-4xl font-bold leading-none sm:text-5xl lg:text-7xl">
            La mappa delle Isole Egadi
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
            Cale, grotte, approdi e sentieri raccolti in una mappa visuale per esplorare
            Favignana, Levanzo e Marettimo con uno sguardo piu' preciso.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.88fr)] lg:items-stretch">
          <div className="flex h-[34rem] flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] sm:h-[40rem] lg:h-[42rem]">
            <div
              className="grid grid-cols-3 gap-2 border-b border-white/10 bg-white/[0.035] p-2"
              aria-label="Seleziona isola"
              role="tablist"
            >
              {islandOrder.map((islandId) => {
                const island = islandMapData[islandId];
                const isActive = islandId === activeIslandId;

                return (
                  <button
                    key={island.id}
                    type="button"
                    aria-selected={isActive}
                    role="tab"
                    onClick={() => handleIslandChange(islandId)}
                    className={[
                      "min-h-11 rounded-md px-3 text-sm font-semibold transition",
                      isActive
                        ? "bg-white text-[#071934]"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    {island.label}
                  </button>
                );
              })}
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-5 sm:px-5 sm:py-6">
              <div className="flex h-full w-full items-center justify-center">
                <IslandPoiStage
                  alt={`Mappa SVG di ${activeIsland.label}`}
                  aspectClassName={activeIsland.aspectClassName}
                  height={activeIsland.height}
                  onSelectPoi={(poi) => setSelectedPoiId(poi.id)}
                  pois={activeIsland.pois}
                  selectedPoiId={selectedPoi?.id}
                  src={activeIsland.src}
                  width={activeIsland.width}
                  widthStyle={activeIsland.widthStyle}
                />
              </div>
            </div>
          </div>

          <aside className="h-[34rem] overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] sm:h-[40rem] lg:h-[42rem]">
            {selectedPoi ? (
              <div className="flex h-full flex-col">
                <div className="relative h-56 shrink-0 overflow-hidden sm:h-72 lg:h-80">
                  <Image
                    src={detailImageSrc}
                    alt={selectedPoi.label}
                    fill
                    onError={() => setDetailImageFailed(true)}
                    sizes="(max-width: 1024px) 100vw, 36vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071934] via-[#071934]/12 to-transparent" />
                </div>

                <div className="flex flex-1 flex-col p-6 sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-gold)]">
                    {activeIsland.label}
                  </p>
                  <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-white sm:text-4xl">
                    {selectedPoi.label}
                  </h2>
                  <p className="mt-4 text-base leading-7 text-white/68">
                    {getPoiDescription(selectedPoi, activeIsland.label)}
                  </p>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}
