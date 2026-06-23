"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { HeroExperienceCard } from "@/components/hero-section";

interface HeroExperienceCarouselProps {
  experiences: HeroExperienceCard[];
  bookLabel: string;
  cardsLabel: string;
}

export function HeroExperienceCarousel({
  experiences,
  bookLabel,
  cardsLabel,
}: HeroExperienceCarouselProps) {
  const cardsTrackRef = useRef<HTMLDivElement>(null);
  const carouselPositionRef = useRef(0);
  const carouselResetPointRef = useRef(0);
  const cardsAutoplayPausedRef = useRef(false);
  const cardsAutoplayResumeTimeoutRef = useRef<number | null>(null);
  const cardsDragStartXRef = useRef(0);
  const cardsDragStartPositionRef = useRef(0);
  const isDraggingCardsRef = useRef(false);
  const hasDraggedCardsRef = useRef(false);
  const suppressCardClickRef = useRef(false);
  const [hoveredExperienceKey, setHoveredExperienceKey] = useState<string | null>(null);
  const [hoverImageIndex, setHoverImageIndex] = useState(0);

  const carouselItems = useMemo(() => {
    const items: Array<{
      experience: HeroExperienceCard;
      isDuplicate: boolean;
      repeatIndex: number;
    }> = [];
    const repeatCount = experiences.length > 1 ? 2 : 1;

    for (let repeatIndex = 0; repeatIndex < repeatCount; repeatIndex += 1) {
      for (const experience of experiences) {
        items.push({ experience, isDuplicate: repeatIndex > 0, repeatIndex });
      }
    }

    return items;
  }, [experiences]);

  const updateCarouselResetPoint = useCallback((track = cardsTrackRef.current) => {
    if (!track || experiences.length < 2) {
      carouselResetPointRef.current = 0;
      return;
    }

    const duplicateStart = track.children.item(experiences.length) as HTMLElement | null;
    carouselResetPointRef.current = duplicateStart?.offsetLeft ?? 0;
  }, [experiences.length]);

  const applyCarouselTransform = useCallback(() => {
    const track = cardsTrackRef.current;
    if (!track) return;
    const resetPoint = carouselResetPointRef.current;

    if (resetPoint > 0) {
      while (carouselPositionRef.current >= resetPoint) {
        carouselPositionRef.current -= resetPoint;
      }
      while (carouselPositionRef.current < 0) {
        carouselPositionRef.current += resetPoint;
      }
    }

    track.style.transform = `translate3d(${-carouselPositionRef.current}px, 0, 0)`;
  }, []);

  useEffect(() => {
    const track = cardsTrackRef.current;
    if (!track) return;

    let frameId = window.requestAnimationFrame(() => updateCarouselResetPoint(track));
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => updateCarouselResetPoint(track));
    };

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", scheduleUpdate, { passive: true });
      return () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", scheduleUpdate);
      };
    }

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(track);
    for (let index = 0; index < track.children.length; index += 1) {
      resizeObserver.observe(track.children.item(index) as Element);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [experiences.length, updateCarouselResetPoint]);

  useEffect(() => {
    const track = cardsTrackRef.current;
    if (!track || experiences.length < 2) return;
    updateCarouselResetPoint(track);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let frameId: number;
    let previousTime = performance.now();
    const speedPxPerSecond = 38;

    const tick = (time: number) => {
      const elapsedSeconds = Math.min((time - previousTime) / 1000, 0.08);
      previousTime = time;

      if (!cardsAutoplayPausedRef.current) {
        carouselPositionRef.current += speedPxPerSecond * elapsedSeconds;
        applyCarouselTransform();
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [applyCarouselTransform, experiences.length, updateCarouselResetPoint]);

  useEffect(() => {
    return () => {
      if (cardsAutoplayResumeTimeoutRef.current) {
        window.clearTimeout(cardsAutoplayResumeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const hoveredExperience = experiences.find(
      (experience) => experience.key === hoveredExperienceKey,
    );
    if (!hoveredExperience || hoveredExperience.images.length < 2) return;

    const intervalId = window.setInterval(() => {
      setHoverImageIndex((index) => (index + 1) % hoveredExperience.images.length);
    }, 850);

    return () => window.clearInterval(intervalId);
  }, [experiences, hoveredExperienceKey]);

  function holdCardsAutoplay() {
    cardsAutoplayPausedRef.current = true;
    if (cardsAutoplayResumeTimeoutRef.current) {
      window.clearTimeout(cardsAutoplayResumeTimeoutRef.current);
      cardsAutoplayResumeTimeoutRef.current = null;
    }
  }

  function resumeCardsAutoplay() {
    if (cardsAutoplayResumeTimeoutRef.current) {
      window.clearTimeout(cardsAutoplayResumeTimeoutRef.current);
      cardsAutoplayResumeTimeoutRef.current = null;
    }
    cardsAutoplayPausedRef.current = false;
  }

  function pauseCardsAutoplay(durationMs = 1800) {
    holdCardsAutoplay();
    cardsAutoplayResumeTimeoutRef.current = window.setTimeout(() => {
      cardsAutoplayPausedRef.current = false;
    }, durationMs);
  }

  function showExperiencePreview(experienceKey: string) {
    holdCardsAutoplay();
    setHoveredExperienceKey(experienceKey);
    setHoverImageIndex(0);
  }

  function hideExperiencePreview() {
    setHoveredExperienceKey(null);
    setHoverImageIndex(0);
    resumeCardsAutoplay();
  }

  function isInteractiveCardTarget(target: EventTarget | null) {
    return target instanceof Element
      ? Boolean(target.closest("a,button,input,select,textarea,summary,[role=button]"))
      : false;
  }

  function startCardsDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isInteractiveCardTarget(event.target)) return;
    holdCardsAutoplay();
    cardsDragStartXRef.current = event.clientX;
    cardsDragStartPositionRef.current = carouselPositionRef.current;
    isDraggingCardsRef.current = true;
    hasDraggedCardsRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveCardsDrag(event: PointerEvent<HTMLDivElement>) {
    if (!isDraggingCardsRef.current) return;
    const deltaX = event.clientX - cardsDragStartXRef.current;
    if (Math.abs(deltaX) > 6) {
      hasDraggedCardsRef.current = true;
      event.preventDefault();
    }
    carouselPositionRef.current = cardsDragStartPositionRef.current - deltaX;
    applyCarouselTransform();
  }

  function endCardsDrag(event: PointerEvent<HTMLDivElement>) {
    if (!isDraggingCardsRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    isDraggingCardsRef.current = false;
    if (hasDraggedCardsRef.current) {
      suppressCardClickRef.current = true;
    }
    if (hoveredExperienceKey) {
      holdCardsAutoplay();
    } else {
      pauseCardsAutoplay(2200);
    }
  }

  function cancelCardsDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    isDraggingCardsRef.current = false;
    hasDraggedCardsRef.current = false;
    if (!hoveredExperienceKey) resumeCardsAutoplay();
  }

  function preventDraggedCardClick(event: MouseEvent<HTMLDivElement>) {
    if (!suppressCardClickRef.current) return;
    suppressCardClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  if (experiences.length === 0) return null;

  return (
    <section
      aria-labelledby="home-hero-experiences-title"
      className="relative overflow-hidden bg-[#071934] px-2 py-14 text-white md:px-4 md:py-16 lg:px-6"
    >
      <div className="mx-auto w-full max-w-[1500px]">
        <h2 id="home-hero-experiences-title" className="sr-only">
          {cardsLabel}
        </h2>
        <div
          role="region"
          aria-labelledby="home-hero-experiences-title"
          onFocus={() => {
            holdCardsAutoplay();
          }}
          onBlur={(event) => {
            const nextTarget = event.relatedTarget;
            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
              resumeCardsAutoplay();
            }
          }}
          onPointerDown={startCardsDrag}
          onPointerMove={moveCardsDrag}
          onPointerUp={endCardsDrag}
          onPointerCancel={cancelCardsDrag}
          onClickCapture={preventDraggedCardClick}
          className="relative cursor-grab overflow-hidden pb-3 touch-pan-y active:cursor-grabbing"
        >
          <div ref={cardsTrackRef} className="flex w-max gap-4 will-change-transform">
            {carouselItems.map(({ experience, isDuplicate, repeatIndex }) => {
              const activeImage =
                hoveredExperienceKey === experience.key && experience.images.length > 1
                  ? experience.images[hoverImageIndex % experience.images.length]
                  : experience.images[0];

              return (
                <article
                  key={`${repeatIndex}-${experience.key}`}
                  data-hero-experience-card
                  aria-hidden={isDuplicate ? true : undefined}
                  onMouseEnter={() => showExperiencePreview(experience.key)}
                  onMouseLeave={hideExperiencePreview}
                  onFocus={() => showExperiencePreview(experience.key)}
                  onBlur={(event) => {
                    const nextTarget = event.relatedTarget;
                    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                      hideExperiencePreview();
                    }
                  }}
                  className="hero-experience-card relative h-[370px] shrink-0 overflow-hidden rounded-lg border border-white/15 bg-slate-950/35 lg:h-[400px]"
                >
                  <Image
                    key={activeImage.src}
                    src={activeImage.src}
                    alt={isDuplicate ? "" : activeImage.alt}
                    fill
                    sizes="(min-width: 1024px) 22rem, (min-width: 640px) 22rem, 82vw"
                    quality={80}
                    className="object-cover transition-opacity duration-500"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,24,0.08)_0%,rgba(3,10,24,0.14)_45%,rgba(3,10,24,0.66)_100%)]" />

                  <div className="absolute left-3 right-3 top-3 flex flex-wrap gap-2">
                    {experience.pills.map((pill) => (
                      <span
                        key={pill}
                        className="rounded-full border border-white/45 bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_8px_22px_rgba(0,0,0,0.24)] backdrop-blur-md [text-shadow:0_2px_8px_rgba(0,0,0,0.85)]"
                      >
                        {pill}
                      </span>
                    ))}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    {isDuplicate ? (
                      <p className="text-xl font-bold leading-tight [text-shadow:0_3px_18px_rgba(0,0,0,0.95),0_1px_3px_rgba(0,0,0,0.95)]">
                        {experience.title}
                      </p>
                    ) : (
                      <h3 className="text-xl font-bold leading-tight [text-shadow:0_3px_18px_rgba(0,0,0,0.95),0_1px_3px_rgba(0,0,0,0.95)]">
                        {experience.title}
                      </h3>
                    )}
                    <p className="mt-2 h-12 overflow-hidden text-sm font-medium leading-6 text-white [text-shadow:0_3px_16px_rgba(0,0,0,0.96),0_1px_3px_rgba(0,0,0,0.96)]">
                      {experience.subtitle}
                    </p>
                    {experience.priceLabel ? (
                      <small className="mt-3 block text-xs font-semibold leading-5 text-white/80 [text-shadow:0_2px_12px_rgba(0,0,0,0.92),0_1px_2px_rgba(0,0,0,0.92)]">
                        {experience.priceLabel}
                      </small>
                    ) : null}
                    <Link
                      href={experience.bookingHref}
                      tabIndex={isDuplicate ? -1 : undefined}
                      className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-gold)] px-4 text-sm font-bold text-[#06233a] transition hover:bg-[#f2b84b]"
                    >
                      <CalendarDays className="size-4" aria-hidden="true" />
                      {bookLabel}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
