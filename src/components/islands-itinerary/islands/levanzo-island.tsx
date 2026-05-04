import { islandMapData } from "./data";
import { IslandPoiStage } from "./island-poi-stage";
import type { IslandPoi } from "./types";

interface LevanzoIslandProps {
  onSelectPoi?: (poi: IslandPoi) => void;
  selectedPoiId?: string;
  showGrid?: boolean;
}

export function LevanzoIsland({
  onSelectPoi,
  selectedPoiId,
  showGrid = false,
}: LevanzoIslandProps) {
  const island = islandMapData.levanzo;

  return (
    <IslandPoiStage
      alt="Mappa SVG di Levanzo"
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
