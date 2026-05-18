"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
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

function getPoiDescription(poi: IslandPoi, islandLabel: string, locale: string) {
  const localizedDescription =
    poi.descriptions?.[locale as keyof NonNullable<IslandPoi["descriptions"]>];
  if (localizedDescription) return localizedDescription;
  if (locale === "it" && poi.description) return poi.description;

  const isEs = locale === "es";
  const isEn = locale === "en";
  const isFr = locale === "fr";
  const isDe = locale === "de";

  switch (getPoiType(poi.label)) {
    case "Grotta":
      if (isEs) return `${poi.label} es una cavidad natural en la costa de ${islandLabel}: una referencia ideal para leer la isla desde el mar.`;
      if (isFr) return `${poi.label} est une cavité naturelle sur la côte de ${islandLabel} : un repère idéal pour lire l'île depuis la mer.`;
      if (isDe) return `${poi.label} ist eine natürliche Höhle an der Küste von ${islandLabel}: ein idealer Orientierungspunkt, um die Insel vom Meer aus zu lesen.`;
      if (isEn) return `${poi.label} is a natural cave along the coastline of ${islandLabel}: an ideal reference point to read the island from the sea.`;
      return `${poi.label} è una cavità naturale lungo il profilo di ${islandLabel}: un riferimento ideale per leggere la costa dal mare.`;
    case "Costa":
      if (isEs) return `${poi.label} identifica una cala, un desembarcadero o un tramo costero de ${islandLabel}, útil para orientarse entre baños, paradas y pasos resguardados.`;
      if (isFr) return `${poi.label} désigne une crique, un débarcadère ou un tronçon côtier de ${islandLabel}, utile pour s'orienter entre baignades, arrêts et passages abrités.`;
      if (isDe) return `${poi.label} markiert eine Bucht, einen Anlegepunkt oder einen Küstenabschnitt von ${islandLabel}, nützlich für Badestopps und geschützte Passagen.`;
      if (isEn) return `${poi.label} marks a cove, landing point or coastal stretch of ${islandLabel}, useful for orienting swim stops and sheltered passages.`;
      return `${poi.label} identifica una cala, un approdo o un tratto costiero di ${islandLabel}, utile per orientarsi tra bagni, soste e passaggi riparati.`;
    case "Promontorio":
      if (isEs) return `${poi.label} marca un extremo o una referencia rocosa de la isla, perfecto para entender el dibujo de la costa.`;
      if (isFr) return `${poi.label} marque une extrémité ou un repère rocheux de l'île, parfait pour comprendre le dessin de la côte.`;
      if (isDe) return `${poi.label} markiert eine Spitze oder einen felsigen Bezugspunkt der Insel, ideal, um die Küstenform zu verstehen.`;
      if (isEn) return `${poi.label} marks an edge or rocky reference point of the island, perfect for understanding the shape of the coast.`;
      return `${poi.label} segna un'estremità o un riferimento roccioso dell'isola, perfetto per capire il disegno della costa.`;
    case "Sentiero":
      if (isEs) return `${poi.label} es una referencia interior de las rutas de ${islandLabel}, entre alturas, crestas y pasos panorámicos.`;
      if (isFr) return `${poi.label} est un repère intérieur des sentiers de ${islandLabel}, entre hauteurs, crêtes et passages panoramiques.`;
      if (isDe) return `${poi.label} ist ein Orientierungspunkt im Inselinneren auf den Wegen von ${islandLabel}, zwischen Höhen, Graten und Panoramapassagen.`;
      if (isEn) return `${poi.label} is an inland reference on ${islandLabel}'s trails, among heights, ridges and panoramic passages.`;
      return `${poi.label} è un riferimento interno dei percorsi di ${islandLabel}, tra quote, crinali e passaggi panoramici.`;
    case "Storia":
      if (isEs) return `${poi.label} cuenta la parte histórica y material de la isla, entre arquitectura, actividades marineras y memoria del territorio.`;
      if (isFr) return `${poi.label} raconte la partie historique et matérielle de l'île, entre architecture, activités maritimes et mémoire du territoire.`;
      if (isDe) return `${poi.label} erzählt die historische und materielle Seite der Insel, zwischen Architektur, maritimer Arbeit und lokaler Erinnerung.`;
      if (isEn) return `${poi.label} tells the historical and material side of the island, between architecture, seafaring work and local memory.`;
      return `${poi.label} racconta la parte storica e materiale dell'isola, tra architetture, attività marinare e memoria del territorio.`;
    case "Paese":
      if (isEs) return `${poi.label} es el núcleo habitado de la isla, el punto más inmediato para servicios, atraques y vida cotidiana.`;
      if (isFr) return `${poi.label} est le village de l'île, le point le plus immédiat pour les services, les débarcadères et la vie quotidienne.`;
      if (isDe) return `${poi.label} ist der bewohnte Ort der Insel, der direkteste Punkt für Services, Anlegestellen und Alltagsleben.`;
      if (isEn) return `${poi.label} is the island village, the most immediate point for services, landings and daily life.`;
      return `${poi.label} è il centro abitato dell'isola, il punto più immediato per servizi, approdi e vita quotidiana.`;
    default:
      if (isEs) return `${poi.label} es una de las referencias mapeadas en ${islandLabel}, útil para leer la isla con más precisión.`;
      if (isFr) return `${poi.label} est l'un des repères cartographiés sur ${islandLabel}, utile pour lire l'île avec plus de précision.`;
      if (isDe) return `${poi.label} ist einer der kartierten Bezugspunkte auf ${islandLabel}, hilfreich, um die Insel genauer zu verstehen.`;
      if (isEn) return `${poi.label} is one of the mapped reference points on ${islandLabel}, useful for reading the island more precisely.`;
      return `${poi.label} è uno dei riferimenti mappati su ${islandLabel}, utile per leggere l'isola con più precisione.`;
  }
}

export function IslandsItinerary() {
  const locale = useLocale();
  const isEs = locale === "es";
  const isEn = locale === "en";
  const isFr = locale === "fr";
  const isDe = locale === "de";
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

  function handleIslandChange(islandId: IslandId) {
    const nextIsland = islandMapData[islandId];
    setDetailImageFailed(false);
    setActiveIslandId(islandId);
    setSelectedPoiId(nextIsland.pois[0]?.id ?? "");
  }

  return (
    <section
      id="egadi-map"
      aria-label={
        isEs
          ? "Mapa interactivo de las Islas Egadi"
          : isFr
            ? "Carte interactive des îles Égades"
            : isDe
              ? "Interaktive Karte der Ägadischen Inseln"
              : isEn
                ? "Interactive map of the Egadi Islands"
                : "Mappa interattiva delle Isole Egadi"
      }
      className="egadi-water-reflection overflow-hidden bg-[#071934] px-4 py-24 text-white sm:px-8 lg:px-12 lg:py-28"
      style={{
        background:
          "linear-gradient(180deg, #071934 0%, #0a2a4a 48%, #071934 100%)",
      }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-gold)]">
            {isEs ? "Islas Egadi" : isFr ? "Îles Égades" : isDe ? "Ägadische Inseln" : isEn ? "Egadi Islands" : "Isole Egadi"}
          </p>
          <h1 className="mt-4 font-heading text-4xl font-bold leading-none sm:text-5xl lg:text-7xl">
            {isEs
              ? "El mapa de las Islas Egadi"
              : isFr
                ? "La carte des îles Égades"
                : isDe
                  ? "Die Karte der Ägadischen Inseln"
                  : isEn
                    ? "The map of the Egadi Islands"
                    : "La mappa delle Isole Egadi"}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
            {isEs
              ? "Calas, cuevas, desembarcaderos y senderos reunidos en un mapa visual para explorar Favignana, Levanzo y Marettimo con una mirada más precisa."
              : isFr
                ? "Criques, grottes, débarcadères et sentiers réunis dans une carte visuelle pour explorer Favignana, Levanzo et Marettimo avec un regard plus précis."
              : isDe
                ? "Buchten, Höhlen, Anlegepunkte und Wege in einer visuellen Karte, um Favignana, Levanzo und Marettimo mit genauerem Blick zu erkunden."
              : isEn
                ? "Coves, caves, landing points and trails gathered in a visual map to explore Favignana, Levanzo and Marettimo with a more precise view."
                : "Cale, grotte, approdi e sentieri raccolti in una mappa visuale per esplorare Favignana, Levanzo e Marettimo con uno sguardo più preciso."}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.88fr)] lg:items-stretch">
          <div className="flex h-[34rem] flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] sm:h-[40rem] lg:h-[42rem]">
            <div
              className="grid grid-cols-3 gap-2 border-b border-white/10 bg-white/[0.035] p-2"
              aria-label={
                isEs
                  ? "Selecciona isla"
                  : isFr
                    ? "Sélectionner une île"
                    : isDe
                      ? "Insel auswählen"
                      : isEn
                        ? "Select island"
                        : "Seleziona isola"
              }
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
                  alt={
                    isEs
                      ? `Mapa SVG de ${activeIsland.label}`
                      : isFr
                        ? `Carte SVG de ${activeIsland.label}`
                        : isDe
                          ? `SVG-Karte von ${activeIsland.label}`
                          : isEn
                            ? `SVG map of ${activeIsland.label}`
                            : `Mappa SVG di ${activeIsland.label}`
                  }
                  aspectClassName={activeIsland.aspectClassName}
                  height={activeIsland.height}
                  onSelectPoi={(poi) => {
                    setDetailImageFailed(false);
                    setSelectedPoiId(poi.id);
                  }}
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

                <div className="flex flex-1 flex-col overflow-y-auto p-6 sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-gold)]">
                    {activeIsland.label}
                  </p>
                  <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-white sm:text-4xl">
                    {selectedPoi.label}
                  </h2>
                  <p className="mt-4 text-base leading-7 text-white/68">
                    {getPoiDescription(selectedPoi, activeIsland.label, locale)}
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
