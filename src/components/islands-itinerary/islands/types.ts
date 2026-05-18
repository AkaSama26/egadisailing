export type IslandPoiDescriptionLocale = "it" | "en" | "es" | "fr" | "de";

export interface IslandPoi {
  description?: string;
  descriptions?: Partial<Record<IslandPoiDescriptionLocale, string>>;
  id: string;
  imageSrc?: string;
  label: string;
  x: number;
  y: number;
}

export type IslandId = "favignana" | "levanzo" | "marettimo";

export interface IslandMapData {
  aspectClassName: string;
  height: number;
  id: IslandId;
  imageSrc: string;
  label: string;
  pois: IslandPoi[];
  src: string;
  width: number;
  widthStyle: string;
}
