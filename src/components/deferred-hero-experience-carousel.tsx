"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { HeroExperienceCard } from "@/components/hero-section";

const DeferredCarousel = dynamic(
  () =>
    import("@/components/hero-experience-carousel").then(
      (module) => module.HeroExperienceCarousel,
    ),
  { ssr: false },
);

const LOAD_DELAY_MS = 1200;

interface DeferredHeroExperienceCarouselProps {
  experiences: HeroExperienceCard[];
  bookLabel: string;
  cardsLabel: string;
}

function CarouselPlaceholder() {
  return (
    <section
      aria-hidden="true"
      className="relative min-h-[31rem] overflow-hidden bg-[#071934] md:min-h-[33rem]"
    />
  );
}

export function DeferredHeroExperienceCarousel({
  experiences,
  bookLabel,
  cardsLabel,
}: DeferredHeroExperienceCarouselProps) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (experiences.length === 0) return;

    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      setShouldLoad(true);
    };

    const timeoutId = window.setTimeout(load, LOAD_DELAY_MS);
    const options: AddEventListenerOptions = { once: true, passive: true };
    window.addEventListener("pointerdown", load, options);
    window.addEventListener("keydown", load, { once: true });
    window.addEventListener("scroll", load, options);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("pointerdown", load);
      window.removeEventListener("keydown", load);
      window.removeEventListener("scroll", load);
    };
  }, [experiences.length]);

  if (experiences.length === 0) return null;
  if (!shouldLoad) return <CarouselPlaceholder />;

  return (
    <DeferredCarousel
      experiences={experiences}
      bookLabel={bookLabel}
      cardsLabel={cardsLabel}
    />
  );
}
