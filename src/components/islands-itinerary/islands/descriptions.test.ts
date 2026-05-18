import { describe, expect, it } from "vitest";
import { favignanaPois, levanzoPois, marettimoPois } from "./data";
import { islandPoiDescriptions } from "./descriptions";
import type { IslandId, IslandPoi } from "./types";

const poisByIsland: Record<IslandId, IslandPoi[]> = {
  favignana: favignanaPois,
  levanzo: levanzoPois,
  marettimo: marettimoPois,
};

describe("island POI descriptions", () => {
  it("covers every interactive map point with detailed Italian SEO copy", () => {
    for (const [islandId, pois] of Object.entries(poisByIsland) as [
      IslandId,
      IslandPoi[],
    ][]) {
      for (const poi of pois) {
        const description = islandPoiDescriptions[islandId][poi.id];

        expect(description, `${islandId}:${poi.id}`).toBeDefined();
        expect(description.length, `${islandId}:${poi.id}`).toBeGreaterThanOrEqual(90);
        expect(description, `${islandId}:${poi.id}`).not.toMatch(/[<>]/);
      }
    }
  });
});
