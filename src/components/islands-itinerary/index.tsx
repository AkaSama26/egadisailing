"use client";

import { useState, useRef, useMemo } from "react";
import {
  useScroll,
  useMotionValueEvent,
  useReducedMotion,
  AnimatePresence,
  motion,
} from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { itineraries, type ItineraryStop } from "@/data/itineraries";
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

type MobileIslandKey = "egadi" | "trapani" | "favignana" | "levanzo" | "marettimo";

const mobileIslandShapes = {
  favignana: {
    name: "Favignana",
    src: "/images/islands/favignana.svg",
    width: 1371,
    height: 765,
    className: "w-[86%] rotate-[-4deg]",
  },
  levanzo: {
    name: "Levanzo",
    src: "/images/islands/levanzo.svg",
    width: 1185,
    height: 885,
    className: "w-[58%] rotate-[5deg]",
  },
  marettimo: {
    name: "Marettimo",
    src: "/images/islands/marettimo.svg",
    width: 1371,
    height: 765,
    className: "w-[72%] rotate-[-6deg]",
  },
} as const;

function getMobileIslandKey(stop: ItineraryStop): MobileIslandKey {
  const isTrapaniStop =
    !stop.hideTime &&
    (stop.noMapMarker || (stop.mapPosition.x <= 22 && stop.mapPosition.y >= 74));
  if (isTrapaniStop) return "trapani";
  if (stop.noMapMarker) return "egadi";
  if (stop.mapPosition.x >= 55 && stop.mapPosition.y <= 60) return "levanzo";
  if (stop.mapPosition.x <= 30 && stop.mapPosition.y <= 58) return "marettimo";
  return "favignana";
}

function MobileIslandVisual({ islandKey }: { islandKey: MobileIslandKey }) {
  if (islandKey === "trapani") {
    return (
      <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
        <Image
          src="/images/trapani.svg"
          alt=""
          width={709}
          height={551}
          className="max-h-[72%] w-[49%] max-w-[12.25rem] rotate-[-5deg] object-contain opacity-90 drop-shadow-[0_14px_28px_rgba(0,0,0,0.28)]"
        />
      </div>
    );
  }

  if (islandKey === "egadi") {
    return (
      <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
        <Image
          src="/images/islands/marettimo.svg"
          alt=""
          width={1371}
          height={765}
          className="absolute left-[-3%] top-[24%] h-auto w-[42%] rotate-[-8deg] opacity-50"
        />
        <Image
          src="/images/islands/favignana.svg"
          alt=""
          width={1371}
          height={765}
          className="absolute bottom-[14%] right-[5%] h-auto w-[64%] rotate-[4deg] opacity-70"
        />
        <Image
          src="/images/islands/levanzo.svg"
          alt=""
          width={1185}
          height={885}
          className="absolute right-[16%] top-[8%] h-auto w-[34%] rotate-[6deg] opacity-60"
        />
      </div>
    );
  }

  const island = mobileIslandShapes[islandKey];

  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
      <Image
        src={island.src}
        alt=""
        width={island.width}
        height={island.height}
        className={`h-auto object-contain drop-shadow-[0_20px_42px_rgba(0,0,0,0.32)] ${island.className}`}
      />
    </div>
  );
}

export function IslandsItinerary() {
  const t = useTranslations();
  const desktopSectionRef = useRef<HTMLElement>(null);
  const mobileSectionRef = useRef<HTMLElement>(null);
  const [activeBoatId, setActiveBoatId] = useState<(typeof boatOptions)[number]["id"]>(
    "trimarano",
  );
  const [activeTab, setActiveTab] = useState("EXCLUSIVE_EXPERIENCE");
  const [progress, setProgress] = useState(0);
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [mobileProgress, setMobileProgress] = useState(0);
  const [mobileActiveStopIndex, setMobileActiveStopIndex] = useState(0);
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
    setMobileActiveStopIndex(0);
  };

  const handleItineraryChange = (experienceType: string) => {
    setActiveTab(experienceType);
    setActiveStopIndex(0);
    setMobileActiveStopIndex(0);
  };

  const { scrollYProgress } = useScroll({
    target: desktopSectionRef,
    offset: ["start start", "end end"],
  });

  const { scrollYProgress: mobileScrollYProgress } = useScroll({
    target: mobileSectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setProgress(latest);
    const stops = currentItinerary.stops;
    setActiveStopIndex(
      Math.min(Math.floor(latest * stops.length), stops.length - 1)
    );
  });

  useMotionValueEvent(mobileScrollYProgress, "change", (latest) => {
    setMobileProgress(latest);
    const stops = currentItinerary.stops;
    setMobileActiveStopIndex(
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
  const mobileTextStopIndex = reducedMotion ? 0 : mobileActiveStopIndex;
  const mobileStop = currentItinerary.stops[mobileTextStopIndex] ?? currentItinerary.stops[0];
  const mobileIslandKey = getMobileIslandKey(mobileStop);
  return (
    <>
      <section
        ref={mobileSectionRef}
        className="lg:hidden"
        style={{
          background:
            "linear-gradient(180deg, #071934 0%, #0a2a4a 50%, #071934 100%)",
          height: `${sectionHeightStops * 92}svh`,
        }}
      >
        <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden px-4 pb-5 pt-24 text-white">
          <div className="shrink-0">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-gold)]">
              Itinerario Egadi
            </p>
            <h2 className="mt-2 font-heading text-4xl font-bold leading-none text-white">
              Scopri le Isole Egadi
            </h2>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] p-1">
            {boatOptions.map((boat) => {
              const isActive = activeBoatId === boat.id;

              return (
                <button
                  key={boat.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => handleBoatChange(boat.id)}
                  className={[
                    "min-h-14 rounded-md px-3 py-2 text-left transition",
                    isActive
                      ? "bg-white/[0.12] text-white"
                      : "text-white/55 hover:bg-white/[0.06] hover:text-white/80",
                  ].join(" ")}
                >
                  <span className="block text-sm font-semibold">{boat.label}</span>
                  <span className="mt-0.5 block text-[0.68rem] leading-snug text-current/70">
                    {boat.description}
                  </span>
                </button>
              );
            })}
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => handleItineraryChange(v as string)}
            className="mt-3 shrink-0"
          >
            <div className="overflow-x-auto pb-2">
              <TabsList className="bg-white/[0.06] border border-white/[0.1]">
                {availableItineraries.map((it) => (
                  <TabsTrigger
                    key={it.experienceType}
                    value={it.experienceType}
                    className="px-4 py-2 text-sm text-white/50 data-active:bg-white/[0.12] data-active:text-white"
                  >
                    {t(it.tabLabelKey)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>

          <div className="relative mt-2 min-h-0 flex-1">
            <div
              className="absolute inset-x-2 top-0 h-[48%] overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.035]"
            >
              <div
                className="absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.22)_0%,rgba(14,165,233,0.06)_44%,transparent_72%)] blur-2xl"
                aria-hidden="true"
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-${mobileIslandKey}`}
                  initial={{ opacity: 0, scale: 0.88, y: 24 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.08, y: -20 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <MobileIslandVisual islandKey={mobileIslandKey} />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="absolute inset-x-0 bottom-0 rounded-lg border border-white/[0.1] bg-[#071934]/72 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-md">
              <DestinationText
                stops={currentItinerary.stops}
                activeStopIndex={mobileTextStopIndex}
                totalStops={currentItinerary.stops.length}
              />
            </div>
          </div>

          <div className="mt-4 h-1.5 shrink-0 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-[var(--color-gold)] transition-[width] duration-200"
              style={{ width: `${Math.min(Math.max(mobileProgress, 0), 1) * 100}%` }}
            />
          </div>
        </div>
      </section>

      <section
        ref={desktopSectionRef}
        className="hidden lg:block"
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
    </>
  );
}
