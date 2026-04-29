"use client";

import { useState } from "react";
import Image from "next/image";
import type { ItineraryStop } from "@/data/itineraries";
import { mapPositionToSvg } from "./utils";

const islandShapes = [
  {
    name: "Favignana",
    src: "/images/islands/favignana.svg",
    width: 1371,
    height: 765,
    className: "left-[-2%] top-[30%] w-[82%]",
  },
  {
    name: "Levanzo",
    src: "/images/islands/levanzo.svg",
    width: 1185,
    height: 885,
    className: "left-[28%] top-[4%] w-[43.2%]",
  },
  {
    name: "Marettimo",
    src: "/images/islands/marettimo.svg",
    width: 1371,
    height: 765,
    className: "left-[-38%] top-[12%] w-[61.2%]",
  },
];

interface RouteMapProps {
  stops: ItineraryStop[];
  progress: number;
  activeStopIndex: number;
}

export function RouteMap({ stops, progress, activeStopIndex }: RouteMapProps) {
  const [hoveredIsland, setHoveredIsland] = useState<string | null>(null);

  return (
    <div className="relative w-full h-full overflow-visible">
      <div
        className={[
          "fixed inset-0 z-20 bg-black/55 transition-opacity duration-300",
          hoveredIsland ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden="true"
      />

      {/* ── Glow behind island shapes ── */}
      <div
        className="absolute inset-[-10%] flex items-center justify-center pointer-events-none z-0"
        aria-hidden="true"
      >
        <div
          className="w-[80%] aspect-[16/9] rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(14,165,233,0.2) 0%, rgba(14,165,233,0.08) 40%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* ── Individual island SVGs ── */}
      <div className="absolute inset-[-18%] z-30 translate-x-[10%] translate-y-[6%] pointer-events-none">
        {islandShapes.map((island) => {
          const isMarettimo = island.name === "Marettimo";
          const isLevanzo = island.name === "Levanzo";
          const isFavignana = island.name === "Favignana";

          return (
            <button
              key={island.name}
              type="button"
              aria-label={island.name}
              onBlur={() => setHoveredIsland(null)}
              onFocus={() => setHoveredIsland(island.name)}
              onMouseEnter={() => setHoveredIsland(island.name)}
              onMouseLeave={() => setHoveredIsland(null)}
              className={`group absolute pointer-events-auto cursor-default focus-visible:outline-none ${island.className}`}
            >
              <Image
                src={island.src}
                alt=""
                width={island.width}
                height={island.height}
                className="relative h-auto w-full scale-[0.8] object-contain opacity-95 transition-[opacity,transform] duration-300 ease-out group-hover:scale-[0.82] group-hover:opacity-100 group-focus-visible:scale-[0.82] group-focus-visible:opacity-100"
              />

              {isMarettimo ? (
                <>
                  <svg
                    viewBox="0 0 176 96"
                    className="pointer-events-none absolute left-[62%] top-[36%] h-24 w-44 opacity-0 drop-shadow-[0_8px_22px_rgba(0,0,0,0.5)] transition duration-300 group-hover:opacity-90 group-focus-visible:opacity-90"
                    aria-hidden="true"
                  >
                    <path
                      d="M160 14 C120 8 88 24 55 54 C41 67 29 74 14 78"
                      fill="none"
                      stroke="rgba(255,255,255,0.92)"
                      strokeLinecap="round"
                      strokeWidth="2.2"
                    />
                    <path
                      d="M14 78 L31 79 M14 78 L23 63"
                      fill="none"
                      stroke="rgba(255,255,255,0.92)"
                      strokeLinecap="round"
                      strokeWidth="2.2"
                    />
                  </svg>
                  <span
                    className="pointer-events-none absolute left-[90%] top-[32%] -translate-y-1/2 whitespace-nowrap text-4xl text-white opacity-0 drop-shadow-[0_8px_28px_rgba(0,0,0,0.55)] transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 md:text-5xl"
                    style={{ fontFamily: "var(--font-handwriting), cursive" }}
                  >
                    {island.name}
                  </span>
                </>
              ) : isLevanzo ? (
                <>
                  <svg
                    viewBox="0 0 176 96"
                    className="pointer-events-none absolute right-[78%] top-[35%] h-24 w-44 opacity-0 drop-shadow-[0_8px_22px_rgba(0,0,0,0.5)] transition duration-300 group-hover:opacity-90 group-focus-visible:opacity-90"
                    aria-hidden="true"
                  >
                    <path
                      d="M16 18 C56 8 92 24 123 53 C137 66 149 73 162 77"
                      fill="none"
                      stroke="rgba(255,255,255,0.92)"
                      strokeLinecap="round"
                      strokeWidth="2.2"
                    />
                    <path
                      d="M162 77 L146 80 M162 77 L152 62"
                      fill="none"
                      stroke="rgba(255,255,255,0.92)"
                      strokeLinecap="round"
                      strokeWidth="2.2"
                    />
                  </svg>
                  <span
                    className="pointer-events-none absolute right-[116%] top-[38%] -translate-y-1/2 whitespace-nowrap text-4xl text-white opacity-0 drop-shadow-[0_8px_28px_rgba(0,0,0,0.55)] transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 md:text-5xl"
                    style={{ fontFamily: "var(--font-handwriting), cursive" }}
                  >
                    {island.name}
                  </span>
                </>
              ) : isFavignana ? (
                <>
                  <svg
                    viewBox="0 0 176 180"
                    className="pointer-events-none absolute right-[68%] top-[-21%] h-44 w-44 opacity-0 drop-shadow-[0_8px_22px_rgba(0,0,0,0.5)] transition duration-300 group-hover:opacity-90 group-focus-visible:opacity-90"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 18 C30 56 52 90 88 119 C111 138 133 154 158 168"
                      fill="none"
                      stroke="rgba(255,255,255,0.92)"
                      strokeLinecap="round"
                      strokeWidth="2.2"
                    />
                    <path
                      d="M158 168 L141 162 M158 168 L151 151"
                      fill="none"
                      stroke="rgba(255,255,255,0.92)"
                      strokeLinecap="round"
                      strokeWidth="2.2"
                    />
                  </svg>
                  <span
                    className="pointer-events-none absolute right-[72%] top-[-24%] -translate-y-1/2 whitespace-nowrap text-4xl text-white opacity-0 drop-shadow-[0_8px_28px_rgba(0,0,0,0.55)] transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 md:text-5xl"
                    style={{ fontFamily: "var(--font-handwriting), cursive" }}
                  >
                    {island.name}
                  </span>
                </>
              ) : (
                <span
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-4xl text-white opacity-0 drop-shadow-[0_8px_28px_rgba(0,0,0,0.55)] transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 md:text-5xl"
                  style={{ fontFamily: "var(--font-handwriting), cursive" }}
                >
                  {island.name}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Dot markers overlay ── */}
      <svg
        viewBox="0 0 400 400"
        width="100%"
        height="100%"
        className={[
          "pointer-events-none relative z-40 transition-opacity duration-300 ease-out",
          hoveredIsland ? "opacity-0" : "opacity-100",
        ].join(" ")}
        aria-label="Route map"
        role="img"
      >
        {stops.map((stop, index) => {
          if (index !== activeStopIndex || stop.noMapMarker) return null;

          const pt = mapPositionToSvg(stop.mapPosition, 400, 400);

          return (
            <g key={`${stop.nameKey}-${index}`}>
              <circle cx={pt.x} cy={pt.y} r="12" fill="#fbbf24" opacity="0.15">
                <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.03;0.2" dur="2s" repeatCount="indefinite" />
              </circle>

              <circle cx={pt.x} cy={pt.y} r="8" fill="#fbbf24" opacity="0.3">
                <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
              </circle>

              <circle
                cx={pt.x}
                cy={pt.y}
                r="5"
                fill="#fbbf24"
                opacity="1"
              />

            </g>
          );
        })}
      </svg>
    </div>
  );
}
