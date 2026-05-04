import { islandMapData } from "./data";
import { IslandPoiStage } from "./island-poi-stage";
import type { IslandPoi } from "./types";

interface FavignanaIslandProps {
  onSelectPoi?: (poi: IslandPoi) => void;
  selectedPoiId?: string;
  showGrid?: boolean;
}

export function FavignanaIsland({
  onSelectPoi,
  selectedPoiId,
  showGrid = false,
}: FavignanaIslandProps) {
  const island = islandMapData.favignana;

  return (
    <IslandPoiStage
      alt="Mappa SVG di Favignana"
      aspectClassName={island.aspectClassName}
      height={island.height}
      onSelectPoi={onSelectPoi}
      pois={island.pois}
      selectedPoiId={selectedPoiId}
      showGrid={showGrid}
      src={island.src}
      width={island.width}
      widthStyle={island.widthStyle}
    />
  );
}
