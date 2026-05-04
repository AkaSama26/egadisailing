"use client";

import Image from "next/image";
import {
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { IslandPoi } from "./types";

const gridLines = Array.from({ length: 11 }, (_, index) => index * 10);

interface IslandPoiStageProps {
  alt: string;
  aspectClassName: string;
  draftPois?: IslandPoi[];
  height: number;
  onSelectPoi?: (poi: IslandPoi) => void;
  onRecordPoint?: (point: { x: number; y: number }) => void;
  pois: IslandPoi[];
  recording?: boolean;
  selectedPoiId?: string;
  showGrid?: boolean;
  src: string;
  width: number;
  widthStyle: string;
}

export function IslandPoiStage({
  alt,
  aspectClassName,
  draftPois = [],
  height,
  onSelectPoi,
  onRecordPoint,
  pois,
  recording = false,
  selectedPoiId,
  showGrid = false,
  src,
  width,
  widthStyle,
}: IslandPoiStageProps) {
  const [pointerPosition, setPointerPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  function getPointFromEvent(
    event: MouseEvent<HTMLDivElement> | PointerEvent<HTMLDivElement>,
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    return {
      x: Math.min(100, Math.max(0, Number(x.toFixed(1)))),
      y: Math.min(100, Math.max(0, Number(y.toFixed(1)))),
    };
  }

  function updatePointerPosition(event: PointerEvent<HTMLDivElement>) {
    setPointerPosition(getPointFromEvent(event));
  }

  function handleStageClick(event: MouseEvent<HTMLDivElement>) {
    if (!recording || !onRecordPoint) return;
    if ((event.target as HTMLElement).closest("[data-poi-marker='true']")) return;

    onRecordPoint(getPointFromEvent(event));
  }

  function renderPoi(poi: IslandPoi, variant: "saved" | "draft") {
    const isSelected = selectedPoiId === poi.id;
    const markerClassName =
      isSelected
        ? "border-white bg-white shadow-[0_0_0_3px_rgba(251,191,36,0.42),0_0_0_7px_rgba(251,191,36,0.14),0_8px_18px_rgba(0,0,0,0.26)] sm:shadow-[0_0_0_5px_rgba(251,191,36,0.42),0_0_0_10px_rgba(251,191,36,0.16),0_10px_22px_rgba(0,0,0,0.28)]"
        : variant === "draft"
        ? "border-white bg-cyan-300 shadow-[0_0_0_3px_rgba(34,211,238,0.16),0_8px_18px_rgba(0,0,0,0.26)] sm:shadow-[0_0_0_5px_rgba(34,211,238,0.18),0_10px_22px_rgba(0,0,0,0.28)]"
        : "border-white bg-[var(--color-gold)] shadow-[0_0_0_3px_rgba(251,191,36,0.14),0_8px_18px_rgba(0,0,0,0.26)] sm:shadow-[0_0_0_5px_rgba(251,191,36,0.16),0_10px_22px_rgba(0,0,0,0.28)]";

    return (
      <button
        key={`${variant}-${poi.id}`}
        type="button"
        aria-label={poi.label}
        aria-pressed={isSelected}
        className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 hover:z-[80] focus-visible:z-[80]"
        data-poi-marker="true"
        onClick={(event) => {
          event.stopPropagation();
          onSelectPoi?.(poi);
        }}
        style={{ left: `${poi.x}%`, top: `${poi.y}%` }}
      >
        <span
          className={`block size-2.5 rounded-full border-2 transition group-hover:scale-125 group-focus-visible:scale-125 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-white sm:size-3.5 ${markerClassName}`}
        />
        <span className="pointer-events-none absolute left-1/2 top-5 z-[90] hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-white/70 bg-[#071934] px-2.5 py-1.5 text-xs font-semibold text-white shadow-[0_14px_32px_rgba(0,0,0,0.34)] group-hover:block group-focus-visible:block">
          {poi.label}
        </span>
      </button>
    );
  }

  return (
    <div
      className={`relative mx-auto max-w-full shrink-0 ${recording ? "cursor-crosshair" : ""} ${aspectClassName}`}
      onClick={handleStageClick}
      onPointerLeave={() => setPointerPosition(null)}
      onPointerMove={updatePointerPosition}
      style={{ width: widthStyle }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="(max-width: 768px) 92vw, 78vw"
        className="object-contain drop-shadow-[0_30px_70px_rgba(0,0,0,0.28)]"
      />

      {showGrid ? (
        <div
          className="pointer-events-none absolute inset-0 z-[5] border border-white/25"
          aria-hidden="true"
        >
          {gridLines.map((line) => (
            <span
              key={`x-${line}`}
              className="absolute top-0 h-full border-l border-white/15"
              style={{ left: `${line}%` }}
            >
              <span className="absolute left-1 top-1 rounded bg-[#071934]/80 px-1 text-[0.6rem] font-semibold leading-none text-white/80">
                {line}
              </span>
            </span>
          ))}

          {gridLines.map((line) => (
            <span
              key={`y-${line}`}
              className="absolute left-0 w-full border-t border-white/15"
              style={{ top: `${line}%` }}
            >
              <span className="absolute left-1 top-1 rounded bg-[#071934]/80 px-1 text-[0.6rem] font-semibold leading-none text-white/80">
                {line}
              </span>
            </span>
          ))}

          {pointerPosition ? (
            <>
              <span
                className="absolute top-0 h-full border-l border-[var(--color-gold)]/75"
                style={{ left: `${pointerPosition.x}%` }}
              />
              <span
                className="absolute left-0 w-full border-t border-[var(--color-gold)]/75"
                style={{ top: `${pointerPosition.y}%` }}
              />
              <span
                className="absolute rounded bg-white px-2 py-1 text-xs font-bold leading-none text-[#071934] shadow-lg"
                style={{
                  left: `min(${pointerPosition.x}% + 0.5rem, calc(100% - 6.25rem))`,
                  top: `min(${pointerPosition.y}% + 0.5rem, calc(100% - 1.75rem))`,
                }}
              >
                x {pointerPosition.x} · y {pointerPosition.y}
              </span>
            </>
          ) : null}
        </div>
      ) : null}

      {pois.map((poi) => renderPoi(poi, "saved"))}
      {draftPois.map((poi) => renderPoi(poi, "draft"))}

      <span className="sr-only">
        Dimensione sorgente SVG: {width} x {height}px.
      </span>
    </div>
  );
}
