"use client";

import { useRef, useEffect, useState } from "react";
import type { ItineraryStop } from "@/data/itineraries";
import {
  catmullRomToSvgPath,
  mapPositionToSvg,
  getPathLength,
} from "./utils";

interface RouteMapProps {
  stops: ItineraryStop[];
  progress: number; // 0 to 1, from scroll
  activeStopIndex: number;
}

/** Extract a short label from a nameKey like "itinerary.socialBoating.stop1.name" */
function shortLabel(nameKey: string, time: string): string {
  // Use time as the primary label — it's already concise and meaningful
  return time;
}

export function RouteMap({ stops, progress, activeStopIndex }: RouteMapProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [totalLength, setTotalLength] = useState(0);
  const [pulseDot, setPulseDot] = useState<{ x: number; y: number } | null>(
    null
  );

  const svgPoints = stops.map((stop) =>
    mapPositionToSvg(stop.mapPosition, 400, 400)
  );
  const pathD = catmullRomToSvgPath(svgPoints);

  // Get total path length on mount / when stops change
  useEffect(() => {
    const length = getPathLength(pathRef.current);
    if (length > 0) setTotalLength(length);
  }, [pathD]);

  // Update pulse dot position whenever progress or totalLength changes
  useEffect(() => {
    if (!pathRef.current || totalLength === 0) return;
    try {
      const pt = pathRef.current.getPointAtLength(
        Math.min(progress, 1) * totalLength
      );
      setPulseDot({ x: pt.x, y: pt.y });
    } catch {
      // getPointAtLength may throw in some envs before layout
    }
  }, [progress, totalLength]);

  const dashOffset = totalLength * (1 - Math.min(progress, 1));

  return (
    <div
      className="relative w-full border border-white/[0.04] rounded-2xl overflow-hidden"
      style={{ aspectRatio: "1 / 1" }}
    >
      {/* Subtle radial ocean-blue background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 60% 40%, rgba(12,42,80,0.55) 0%, rgba(4,18,38,0.85) 100%)",
        }}
        aria-hidden="true"
      />

      <svg
        viewBox="0 0 400 400"
        width="100%"
        height="100%"
        className="relative z-10"
        aria-label="Route map"
        role="img"
      >
        <defs>
          {/* Gold gradient for the active line */}
          <linearGradient id="goldRoute" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          {/* Gold radial gradient for markers */}
          <radialGradient id="goldMarker" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>

          {/* Brighter gold for active marker */}
          <radialGradient id="goldMarkerActive" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#d97706" />
          </radialGradient>

          {/* Drop shadow filter for markers */}
          <filter id="markerShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="3"
              floodColor="#fbbf24"
              floodOpacity="0.4"
            />
          </filter>

          {/* Stronger drop shadow for active marker */}
          <filter
            id="markerShadowActive"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="6"
              floodColor="#fbbf24"
              floodOpacity="0.7"
            />
          </filter>
        </defs>

        {/* ── Ghost line (full path, very faint) ── */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* ── Desktop-only glow layer ── */}
        <g className="hidden lg:block" aria-hidden="true">
          {pathD && totalLength > 0 && (
            <path
              d={pathD}
              fill="none"
              stroke="url(#goldRoute)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.12"
              style={{ filter: "blur(4px)" }}
              strokeDasharray={totalLength}
              strokeDashoffset={dashOffset}
            />
          )}
        </g>

        {/* ── Active (progressive) line ── */}
        {pathD && (
          <path
            ref={pathRef}
            d={pathD}
            fill="none"
            stroke={totalLength > 0 ? "url(#goldRoute)" : "transparent"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={totalLength > 0 ? totalLength : undefined}
            strokeDashoffset={totalLength > 0 ? dashOffset : undefined}
            style={{ transition: "stroke-dashoffset 0.05s linear" }}
          />
        )}

        {/* ── Pulse dot at head of drawn line ── */}
        {pulseDot && totalLength > 0 && progress > 0 && (
          <g aria-hidden="true">
            {/* outer pulse ring */}
            <circle
              cx={pulseDot.x}
              cy={pulseDot.y}
              r="7"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1"
              opacity="0.5"
            >
              <animate
                attributeName="r"
                values="5;11;5"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.6;0;0.6"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            {/* inner solid dot */}
            <circle cx={pulseDot.x} cy={pulseDot.y} r="3.5" fill="#fbbf24" />
          </g>
        )}

        {/* ── Stop markers ── */}
        {svgPoints.map((pt, index) => {
          const stop = stops[index];
          const isActive = index === activeStopIndex;
          const isRevealed = index < activeStopIndex;
          const isFuture = !isActive && !isRevealed;

          const markerR = isActive ? 17 : 14; // radius of marker circle
          const label = shortLabel(stop.nameKey, stop.time);

          return (
            <g
              key={stop.nameKey}
              aria-label={`Stop ${index + 1}: ${stop.time}`}
              role="img"
            >
              {/* Future: dashed ghost circle */}
              {isFuture && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={markerR}
                  fill="none"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity={0.12}
                />
              )}

              {/* Revealed (past stops): solid gold gradient circle */}
              {isRevealed && (
                <>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={markerR}
                    fill="url(#goldMarker)"
                    filter="url(#markerShadow)"
                  />
                  {/* White center dot */}
                  <circle cx={pt.x} cy={pt.y} r="3.5" fill="white" />
                </>
              )}

              {/* Active stop: brighter gold, larger, pulse ring */}
              {isActive && (
                <>
                  {/* Animated pulse ring */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={markerR + 4}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1.5"
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      values={`${markerR + 2};${markerR + 10};${markerR + 2}`}
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.5;0;0.5"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={markerR}
                    fill="url(#goldMarkerActive)"
                    filter="url(#markerShadowActive)"
                  />
                  {/* White center dot */}
                  <circle cx={pt.x} cy={pt.y} r="4" fill="white" />
                </>
              )}

              {/* Label below marker */}
              <text
                x={pt.x}
                y={pt.y + markerR + 10}
                textAnchor="middle"
                fontSize="8"
                fill={
                  isActive
                    ? "#fbbf24"
                    : isRevealed
                    ? "rgba(251,191,36,0.75)"
                    : "rgba(255,255,255,0.25)"
                }
                fontFamily="sans-serif"
                fontWeight={isActive ? "600" : "400"}
                letterSpacing="0.02em"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
