"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { ItineraryStop } from "@/data/itineraries";

interface DestinationTextProps {
  stops: ItineraryStop[];
  activeStopIndex: number;
  totalStops: number;
}

export function DestinationText({
  stops,
  activeStopIndex,
  totalStops,
}: DestinationTextProps) {
  const t = useTranslations();
  const stop = stops[activeStopIndex];

  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStopIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {!stop.hideTime && (
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
              <span className="text-amber-500 text-xs font-semibold tracking-[2px] uppercase">
                {stop.time}
              </span>
            </div>
          )}

          {/* Destination name */}
          <h3 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold italic text-white leading-[1.05] tracking-tight mb-2">
            {t(stop.nameKey)}
          </h3>

          {/* Island subtitle */}
          {stop.islandKey && (
            <p className="text-white/30 text-lg font-light tracking-wide mb-5">
              {t(stop.islandKey)}
            </p>
          )}

          {/* Description */}
          <p className="text-white/65 text-base font-light leading-relaxed max-w-md">
            {t(stop.descriptionKey)}
          </p>
        </motion.div>
      </AnimatePresence>

      {totalStops > 1 && (
        <div className="flex gap-2.5 mt-8" aria-hidden="true">
          {Array.from({ length: totalStops }).map((_, i) => (
            <div
              key={i}
              className={[
                "w-5 h-[3px] rounded-full transition-all duration-300",
                i === activeStopIndex
                  ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.3)]"
                  : i < activeStopIndex
                    ? "bg-amber-500/25"
                    : "bg-white/5",
              ].join(" ")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
