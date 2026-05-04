"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FavignanaIsland,
  LevanzoIsland,
  MarettimoIsland,
} from "./islands";
import type { IslandPoi } from "./islands/types";

const MARETTIMO_DRAFT_STORAGE_KEY = "egadi:marettimo-poi-draft:v1";

const islands = [
  {
    id: "favignana",
    label: "Favignana",
  },
  {
    id: "levanzo",
    label: "Levanzo",
  },
  {
    id: "marettimo",
    label: "Marettimo",
  },
] as const;

type IslandId = (typeof islands)[number]["id"];

function loadMarettimoDraftPois() {
  try {
    const rawValue = window.localStorage.getItem(MARETTIMO_DRAFT_STORAGE_KEY);
    if (!rawValue) return [];

    const parsedValue: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) return [];

    return parsedValue.filter(
      (poi): poi is IslandPoi =>
        typeof poi === "object" &&
        poi !== null &&
        typeof (poi as IslandPoi).id === "string" &&
        typeof (poi as IslandPoi).label === "string" &&
        typeof (poi as IslandPoi).x === "number" &&
        typeof (poi as IslandPoi).y === "number",
    );
  } catch {
    return [];
  }
}

function saveMarettimoDraftPois(pois: IslandPoi[]) {
  window.localStorage.setItem(MARETTIMO_DRAFT_STORAGE_KEY, JSON.stringify(pois));
}

function toPoiId(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniquePoiId(baseId: string, pois: IslandPoi[]) {
  const usedIds = new Set(pois.map((poi) => poi.id));
  if (!usedIds.has(baseId)) return baseId;

  let suffix = 2;
  while (usedIds.has(`${baseId}-${suffix}`)) suffix += 1;
  return `${baseId}-${suffix}`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function escapeTsString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function toTsArray(pois: IslandPoi[]) {
  const rows = pois.map(
    (poi) =>
      `  { id: "${escapeTsString(poi.id)}", label: "${escapeTsString(poi.label)}", x: ${formatNumber(poi.x)}, y: ${formatNumber(poi.y)} },`,
  );

  return [`const marettimoPois: IslandPoi[] = [`, ...rows, `];`].join("\n");
}

export function IslandPoiLab() {
  const [activeIslandId, setActiveIslandId] = useState<IslandId>("marettimo");
  const [marettimoDraftLoaded, setMarettimoDraftLoaded] = useState(false);
  const [marettimoDraftPois, setMarettimoDraftPois] = useState<IslandPoi[]>([]);
  const [marettimoPoiName, setMarettimoPoiName] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const activeIsland = islands.find((island) => island.id === activeIslandId) ?? islands[0];
  const marettimoDraftCode = useMemo(
    () => toTsArray(marettimoDraftPois),
    [marettimoDraftPois],
  );

  useEffect(() => {
    setMarettimoDraftPois(loadMarettimoDraftPois());
    setMarettimoDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (!marettimoDraftLoaded) return;
    saveMarettimoDraftPois(marettimoDraftPois);
  }, [marettimoDraftLoaded, marettimoDraftPois]);

  function recordMarettimoPoint(point: { x: number; y: number }) {
    const label = marettimoPoiName.trim() || `Punto ${marettimoDraftPois.length + 1}`;

    setMarettimoDraftPois((currentPois) => {
      const baseId = toPoiId(label) || `punto-${currentPois.length + 1}`;
      const nextPoi = {
        id: uniquePoiId(baseId, currentPois),
        label,
        x: point.x,
        y: point.y,
      };

      return [...currentPois, nextPoi];
    });
    setMarettimoPoiName("");
    setCopyStatus("idle");
  }

  function undoMarettimoPoint() {
    setMarettimoDraftPois((currentPois) => currentPois.slice(0, -1));
    setCopyStatus("idle");
  }

  function clearMarettimoPoints() {
    setMarettimoDraftPois([]);
    setCopyStatus("idle");
  }

  async function copyMarettimoDraftCode() {
    await navigator.clipboard.writeText(marettimoDraftCode);
    setCopyStatus("copied");
  }

  return (
    <section className="min-h-[100svh] overflow-x-hidden bg-[#071934] px-4 pb-10 pt-28 text-white sm:px-8 sm:pt-32 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100svh-10rem)] w-full max-w-7xl flex-col">
        <header className="shrink-0 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-gold)]">
            Lab temporaneo
          </p>
          <h1 className="mt-3 font-heading text-4xl font-bold leading-none sm:text-5xl lg:text-6xl">
            Punti di interesse Egadi
          </h1>
        </header>

        <div
          className="mx-auto mt-7 grid w-full max-w-xl grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/5 p-1"
          aria-label="Seleziona isola"
          role="tablist"
        >
          {islands.map((island) => {
            const isActive = island.id === activeIslandId;

            return (
              <button
                key={island.id}
                type="button"
                aria-selected={isActive}
                role="tab"
                onClick={() => setActiveIslandId(island.id)}
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

        {activeIsland.id === "marettimo" ? (
          <div className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-left text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              Nome punto
              <input
                value={marettimoPoiName}
                onChange={(event) => setMarettimoPoiName(event.target.value)}
                placeholder={`Punto ${marettimoDraftPois.length + 1}`}
                className="h-11 rounded-md border border-white/15 bg-[#071934]/80 px-3 text-sm font-semibold normal-case tracking-normal text-white outline-none transition placeholder:text-white/35 focus:border-[var(--color-gold)]"
              />
            </label>

            <div className="grid grid-cols-3 gap-2 sm:w-[24rem]">
              <button
                type="button"
                onClick={undoMarettimoPoint}
                disabled={marettimoDraftPois.length === 0}
                className="h-11 rounded-md bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={clearMarettimoPoints}
                disabled={marettimoDraftPois.length === 0}
                className="h-11 rounded-md bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Svuota
              </button>
              <button
                type="button"
                onClick={copyMarettimoDraftCode}
                disabled={marettimoDraftPois.length === 0}
                className="h-11 rounded-md bg-white px-3 text-sm font-semibold text-[#071934] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {copyStatus === "copied" ? "Copiato" : "Copia TS"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 items-center justify-center py-8">
          {activeIsland.id === "favignana" ? <FavignanaIsland showGrid /> : null}
          {activeIsland.id === "levanzo" ? <LevanzoIsland showGrid /> : null}
          {activeIsland.id === "marettimo" ? (
            <MarettimoIsland
              draftPois={marettimoDraftPois}
              onRecordPoint={recordMarettimoPoint}
              recording
              showGrid
            />
          ) : null}
        </div>

        {activeIsland.id === "marettimo" ? (
          <div className="mx-auto grid w-full max-w-5xl gap-4 pb-4 lg:grid-cols-2">
            <div className="min-h-32 rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">
                  Registrati ({marettimoDraftPois.length})
                </h2>
              </div>

              <ol className="mt-3 max-h-52 space-y-1 overflow-auto pr-2 text-sm text-white/75">
                {marettimoDraftPois.map((poi) => (
                  <li
                    key={poi.id}
                    className="flex items-center justify-between gap-3 rounded bg-white/[0.04] px-2 py-1"
                  >
                    <span className="truncate">{poi.label}</span>
                    <span className="shrink-0 font-mono text-xs text-white/55">
                      {formatNumber(poi.x)}, {formatNumber(poi.y)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <label className="flex min-h-32 flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm font-semibold text-white">
              Output TS
              <textarea
                readOnly
                value={marettimoDraftCode}
                className="min-h-44 flex-1 resize-y rounded-md border border-white/10 bg-[#020b18] p-3 font-mono text-xs font-normal leading-relaxed text-white/75 outline-none"
              />
            </label>
          </div>
        ) : null}
      </div>
    </section>
  );
}
