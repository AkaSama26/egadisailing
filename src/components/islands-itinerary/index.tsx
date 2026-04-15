"use client";

import { useState, useRef, useMemo } from "react";
import {
  useScroll,
  useMotionValueEvent,
  useReducedMotion,
  AnimatePresence,
  motion,
} from "framer-motion";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { itineraries } from "@/data/itineraries";
import { RouteMap } from "./route-map";
import { DestinationText } from "./destination-text";

export function IslandsItinerary() {
  const t = useTranslations();
  const sectionRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState("SOCIAL_BOATING");
  const [progress, setProgress] = useState(0);
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  const currentItinerary = useMemo(
    () =>
      itineraries.find((it) => it.experienceType === activeTab) ??
      itineraries[0],
    [activeTab]
  );

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setProgress(latest);
    const stops = currentItinerary.stops;
    setActiveStopIndex(
      Math.min(Math.floor(latest * stops.length), stops.length - 1)
    );
  });

  const effectiveProgress = reducedMotion ? 1 : progress;
  const mapStopIndex = reducedMotion
    ? currentItinerary.stops.length - 1
    : activeStopIndex;
  const textStopIndex = reducedMotion ? 0 : activeStopIndex;

  return (
    <section
      ref={sectionRef}
      style={{
        background:
          "linear-gradient(180deg, #071934 0%, #0a2a4a 50%, #071934 100%)",
        height: `${currentItinerary.stops.length * 60}vh`,
      }}
    >
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col">
        {/* Section title */}
        <div className="text-center pt-28 pb-4 shrink-0">
          <h2 className="font-heading text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-white">
            Scopri le Isole Egadi
          </h2>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as string)}
          className="shrink-0"
        >
          <div className="flex justify-center py-5 overflow-x-auto">
            <TabsList className="bg-white/[0.06] border border-white/[0.1]">
              {itineraries.map((it) => (
                <TabsTrigger
                  key={it.experienceType}
                  value={it.experienceType}
                  className="text-white/50 data-active:bg-white/[0.12] data-active:text-white text-sm px-4 py-2"
                >
                  {t(it.tabLabelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        {/* Gold separator */}
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent mx-auto shrink-0" />

        {/* Two-column content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col lg:flex-row flex-1 min-h-0"
          >
            {/* Left: DestinationText */}
            <div className="flex-1 flex items-center px-6 md:px-12 lg:px-20">
              <DestinationText
                stops={currentItinerary.stops}
                activeStopIndex={textStopIndex}
                totalStops={currentItinerary.stops.length}
              />
            </div>

            {/* Right: RouteMap */}
            <div className="flex-1 h-[250px] lg:h-full px-4 lg:px-8 py-4">
              <RouteMap
                stops={currentItinerary.stops}
                progress={effectiveProgress}
                activeStopIndex={mapStopIndex}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
