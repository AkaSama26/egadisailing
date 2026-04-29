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

const boatOptions = [
  {
    id: "trimarano",
    label: "Trimarano",
    description: "Chef, charter e giornate premium",
  },
  {
    id: "boat",
    label: "Barca",
    description: "Tour condivisi e privati",
  },
] as const;

export function IslandsItinerary() {
  const t = useTranslations();
  const sectionRef = useRef<HTMLElement>(null);
  const [activeBoatId, setActiveBoatId] = useState<(typeof boatOptions)[number]["id"]>(
    "trimarano",
  );
  const [activeTab, setActiveTab] = useState("EXCLUSIVE_EXPERIENCE");
  const [progress, setProgress] = useState(0);
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  const availableItineraries = useMemo(
    () => itineraries.filter((itinerary) => itinerary.boatId === activeBoatId),
    [activeBoatId],
  );

  const currentItinerary = useMemo(
    () =>
      availableItineraries.find((it) => it.experienceType === activeTab) ??
      availableItineraries[0] ??
      itineraries[0],
    [activeTab, availableItineraries],
  );

  const handleBoatChange = (boatId: (typeof boatOptions)[number]["id"]) => {
    const nextItinerary = itineraries.find((itinerary) => itinerary.boatId === boatId);
    setActiveBoatId(boatId);
    if (nextItinerary) setActiveTab(nextItinerary.experienceType);
    setActiveStopIndex(0);
  };

  const handleItineraryChange = (experienceType: string) => {
    setActiveTab(experienceType);
    setActiveStopIndex(0);
  };

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
  const rawMapStopIndex = reducedMotion
    ? currentItinerary.stops.length - 1
    : activeStopIndex;
  const nextMapStopIndex = currentItinerary.stops.findIndex(
    (stop, index) => index > rawMapStopIndex && !stop.noMapMarker,
  );
  const mapStopIndex =
    currentItinerary.stops[rawMapStopIndex]?.noMapMarker && nextMapStopIndex >= 0
      ? nextMapStopIndex
      : rawMapStopIndex;
  const textStopIndex = reducedMotion ? 0 : activeStopIndex;
  const sectionHeightStops = Math.max(currentItinerary.stops.length, 2);

  return (
    <section
      ref={sectionRef}
      style={{
        background:
          "linear-gradient(180deg, #071934 0%, #0a2a4a 50%, #071934 100%)",
        height: `${sectionHeightStops * 60}vh`,
      }}
    >
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col">
        {/* Section title */}
        <div className="text-center pt-28 pb-8 shrink-0">
          <h2 className="font-heading text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-white">
            Scopri le Isole Egadi
          </h2>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 min-h-0 flex-col"
          >
            {/* Two-column content */}
            <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
              {/* Left: DestinationText */}
              <div className="flex-1 flex items-center px-6 md:px-12 lg:px-20">
                <div className="flex h-[30rem] w-full max-w-xl flex-col lg:w-[34rem]">
                  <div className="mb-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[2.5px] text-white/65">
                      Scegli la barca
                    </p>
                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] p-1">
                      {boatOptions.map((boat) => {
                        const isActive = activeBoatId === boat.id;

                        return (
                          <button
                            key={boat.id}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => handleBoatChange(boat.id)}
                            className={[
                              "min-h-16 rounded-md px-3 py-2 text-left transition",
                              isActive
                                ? "bg-white/[0.12] text-white"
                                : "text-white/55 hover:bg-white/[0.06] hover:text-white/80",
                            ].join(" ")}
                          >
                            <span className="block text-sm font-semibold">{boat.label}</span>
                            <span className="mt-1 block text-xs font-light leading-snug text-current/70">
                              {boat.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="mb-3 text-xs font-semibold uppercase tracking-[2.5px] text-white/65">
                    Scopri gli itinerari in barca alle Isole Egadi dei nostri pacchetti
                  </p>

                  <Tabs
                    value={activeTab}
                    onValueChange={(v) => handleItineraryChange(v as string)}
                    className="mb-6"
                  >
                    <div className="overflow-x-auto pb-2">
                      <TabsList className="bg-white/[0.06] border border-white/[0.1]">
                        {availableItineraries.map((it) => (
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

                  <DestinationText
                    stops={currentItinerary.stops}
                    activeStopIndex={textStopIndex}
                    totalStops={currentItinerary.stops.length}
                  />
                </div>
              </div>

              {/* Right: RouteMap */}
              <div className="flex-1 h-[250px] lg:h-full px-4 lg:px-8 py-4">
                <RouteMap
                  stops={currentItinerary.stops}
                  progress={effectiveProgress}
                  activeStopIndex={mapStopIndex}
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
