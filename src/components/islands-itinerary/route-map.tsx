"use client";

import { useState } from "react";
import Image from "next/image";
import type { ItineraryStop } from "@/data/itineraries";
import { mapPositionToSvg } from "./utils";

const archipelagoImage = "/images/islands/arcipelago.webp";

interface RouteMapProps {
  stops: ItineraryStop[];
  progress: number;
  activeStopIndex: number;
}

export function RouteMap({ stops, progress, activeStopIndex }: RouteMapProps) {
  return (
    <div className="relative w-full h-full overflow-visible">
      {/* ── Glow behind archipelago ── */}
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

      {/* ── Archipelago image ── */}
      <div
        className="absolute inset-[-30%] flex items-center justify-center pointer-events-none z-[1]"
        style={{ transform: "translateX(-20%) translateY(-8%)" }}
        aria-hidden="true"
      >
        <Image
          src={archipelagoImage}
          alt=""
          width={1600}
          height={900}
          className="w-full h-auto object-contain opacity-90"
        />
      </div>

      {/* ── Dot markers overlay ── */}
      <svg
        viewBox="0 0 400 400"
        width="100%"
        height="100%"
        className="relative z-10"
        aria-label="Route map"
        role="img"
      >
        {stops.map((stop, index) => {
          if (stop.noMapMarker) return null;

          const pt = mapPositionToSvg(stop.mapPosition, 400, 400);
          const isActive = index === activeStopIndex;
          const isRevealed = index <= activeStopIndex;

          return (
            <g key={stop.nameKey}>
              {/* Outer pulse — only active */}
              {isActive && (
                <circle cx={pt.x} cy={pt.y} r="12" fill="#fbbf24" opacity="0.15">
                  <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.2;0.03;0.2" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Middle glow — revealed */}
              {isRevealed && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isActive ? 8 : 6}
                  fill="#fbbf24"
                  opacity={isActive ? 0.3 : 0.15}
                >
                  {isActive && (
                    <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
                  )}
                </circle>
              )}

              {/* Core dot */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isActive ? 5 : isRevealed ? 3.5 : 0}
                fill="#fbbf24"
                opacity={isActive ? 1 : isRevealed ? 0.7 : 0}
                style={{ transition: "r 0.4s ease, opacity 0.4s ease" }}
              />

              {/* Label */}
              <text
                x={pt.x}
                y={pt.y + (isActive ? 22 : 18)}
                textAnchor="middle"
                fontSize="8"
                fill={isActive ? "#fbbf24" : isRevealed ? "rgba(251,191,36,0.6)" : "transparent"}
                fontFamily="sans-serif"
                fontWeight={isActive ? "600" : "400"}
                style={{ transition: "fill 0.4s ease" }}
              >
                {stop.time}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
