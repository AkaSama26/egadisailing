import { islandMapData } from "./data";
import { IslandPoiStage } from "./island-poi-stage";
import type { IslandPoi } from "./types";

interface MarettimoIslandProps {
  draftPois?: IslandPoi[];
  onRecordPoint?: (point: { x: number; y: number }) => void;
  onSelectPoi?: (poi: IslandPoi) => void;
  recording?: boolean;
  selectedPoiId?: string;
  showGrid?: boolean;
}

export function MarettimoIsland({
  draftPois,
  onRecordPoint,
  onSelectPoi,
  recording = false,
  selectedPoiId,
  showGrid = false,
}: MarettimoIslandProps) {
  const island = islandMapData.marettimo;

  return (
    <IslandPoiStage
      alt="Mappa SVG di Marettimo"
      aspectClassName={island.aspectClassName}
      draftPois={draftPois}
      height={island.height}
      onRecordPoint={onRecordPoint}
      onSelectPoi={onSelectPoi}
      pois={island.pois}
      recording={recording}
      selectedPoiId={selectedPoiId}
      showGrid={showGrid}
      src={island.src}
      width={island.width}
      widthStyle={island.widthStyle}
    />
  );
}
