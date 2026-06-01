"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import { HERO_VIDEO_SRC } from "@/lib/public-assets";

const HERO_VIDEO_POSTER_IMAGE_SRC = "/videos/hero-poster.webp";
const HERO_VIDEO_DELAY_MS = 4500;

export interface HeroExperienceCard {
  key: string;
  title: string;
  subtitle: string;
  priceLabel?: string | null;
  images: Array<{ src: string; alt: string }>;
  pills: string[];
  bookingHref: string;
}

/* ------------------------------------------------------------------ */
/*  Gold waves divider — exported for use between sections            */
/* ------------------------------------------------------------------ */

export function GoldWavesDivider() {
  return (
    <div className="relative w-full z-30 pointer-events-none" style={{ height: 0, marginTop: "-1px" }}>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 1440 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        preserveAspectRatio="none"
      >
        {/* Wave 1 — thick, prominent */}
        <path
          d="M0 60 Q100 10 240 40 Q380 70 520 30 Q660 -10 800 40 Q940 90 1080 30 Q1220 -20 1440 35"
          stroke="url(#gw1)"
          strokeWidth="2.5"
          fill="none"
        />
        {/* Wave 2 */}
        <path
          d="M0 100 Q140 40 300 70 Q460 100 620 55 Q780 10 940 60 Q1100 110 1260 50 Q1380 20 1440 55"
          stroke="url(#gw2)"
          strokeWidth="2"
          fill="none"
        />
        {/* Wave 3 */}
        <path
          d="M0 140 Q180 80 360 110 Q540 140 720 95 Q900 50 1080 100 Q1260 150 1440 95"
          stroke="url(#gw3)"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Wave 4 */}
        <path
          d="M0 180 Q120 120 280 150 Q440 180 600 130 Q760 80 920 135 Q1080 185 1240 125 Q1360 85 1440 130"
          stroke="url(#gw4)"
          strokeWidth="1.2"
          fill="none"
        />
        {/* Wave 5 */}
        <path
          d="M0 215 Q200 155 400 185 Q600 215 800 165 Q1000 115 1200 170 Q1360 210 1440 165"
          stroke="url(#gw5)"
          strokeWidth="1"
          fill="none"
        />
        {/* Wave 6 */}
        <path
          d="M0 250 Q160 195 340 225 Q500 250 680 200 Q860 150 1040 205 Q1200 255 1440 195"
          stroke="url(#gw6)"
          strokeWidth="0.8"
          fill="none"
        />
        {/* Wave 7 — extra */}
        <path
          d="M0 280 Q200 230 400 255 Q600 280 800 235 Q1000 190 1200 240 Q1360 275 1440 230"
          stroke="url(#gw5)"
          strokeWidth="0.6"
          fill="none"
        />
        {/* Wave 8 — extra fine */}
        <path
          d="M0 80 Q160 30 340 55 Q500 80 680 35 Q860 -5 1040 45 Q1200 85 1440 30"
          stroke="url(#gw4)"
          strokeWidth="0.8"
          fill="none"
        />
        <defs>
          <linearGradient id="gw1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
            <stop offset="15%" stopColor="#d97706" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.7" />
            <stop offset="85%" stopColor="#d97706" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gw2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="20%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="55%" stopColor="#d97706" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gw3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
            <stop offset="25%" stopColor="#d97706" stopOpacity="0.3" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gw4" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#d97706" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gw5" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
            <stop offset="40%" stopColor="#d97706" stopOpacity="0.15" />
            <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gw6" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="10%" stopColor="#d97706" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="90%" stopColor="#d97706" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero Section                                                      */
/* ------------------------------------------------------------------ */

export function HeroSection({ experiences }: { experiences: HeroExperienceCard[] }) {
  const t = useTranslations("hero");
  const locale = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
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
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [hoveredExperienceKey, setHoveredExperienceKey] = useState<string | null>(null);
  const [hoverImageIndex, setHoverImageIndex] = useState(0);
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const copy = {
    book: isEs
      ? "Reservar ahora"
      : isFr
        ? "Réserver"
        : isDe
          ? "Jetzt buchen"
          : isEn
            ? "Book now"
            : "Prenota ora",
    cardsLabel: isEs
      ? "Tours en barco por las Islas Egadi destacados"
      : isFr
        ? "Tours en bateau aux îles Égades en vedette"
        : isDe
          ? "Ausgewählte Bootstouren zu den Ägadischen Inseln"
          : isEn
            ? "Featured Egadi Islands boat tours"
            : "Tour in barca alle Egadi in evidenza",
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    const effectiveType = connection.connection?.effectiveType ?? "";
    const slowConnection = effectiveType === "slow-2g" || effectiveType === "2g";

    const canUseBackgroundVideo = window.matchMedia("(min-width: 768px)").matches;

    if (
      !canUseBackgroundVideo ||
      prefersReducedMotion ||
      connection.connection?.saveData ||
      slowConnection
    ) {
      return;
    }

    let hasRequestedVideo = false;
    const requestVideo = () => {
      if (hasRequestedVideo) return;
      hasRequestedVideo = true;
      setShouldLoadVideo(true);
    };

    const timeout = globalThis.setTimeout(requestVideo, HERO_VIDEO_DELAY_MS);
    const interactionEvents = ["pointerdown", "keydown", "scroll"] as const;

    for (const eventName of interactionEvents) {
      window.addEventListener(eventName, requestVideo, { once: true, passive: true });
    }

    return () => {
      globalThis.clearTimeout(timeout);
      for (const eventName of interactionEvents) {
        window.removeEventListener(eventName, requestVideo);
      }
    };
  }, []);

  useEffect(() => {
    if (!shouldLoadVideo) return;
    const video = videoRef.current;
    if (!video) return;

    const playVideo = () => {
      video.play().catch(() => {
        // Retry after user interaction
        const handleInteraction = () => {
          video.play();
          document.removeEventListener("click", handleInteraction);
          document.removeEventListener("scroll", handleInteraction);
        };
        document.addEventListener("click", handleInteraction);
        document.addEventListener("scroll", handleInteraction);
      });
    };

    video.load();
    if (video.readyState >= 2) {
      playVideo();
    } else {
      video.addEventListener("loadeddata", playVideo, { once: true });
    }
  }, [shouldLoadVideo]);

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

  function startCardsDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
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

  return (
    <section
      aria-labelledby="home-hero-title"
      className="egadi-water-reflection relative w-full min-h-[860px] overflow-hidden bg-[#071934] select-none md:min-h-[820px]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_38%,rgba(14,165,233,0.24),transparent_42%),linear-gradient(180deg,#071934_0%,#0a2a4a_56%,#071934_100%)]"
      />

      <Image
        src={HERO_VIDEO_POSTER_IMAGE_SRC}
        alt=""
        aria-hidden="true"
        fill
        loading="eager"
        sizes="100vw"
        quality={80}
        fetchPriority="high"
        className={`absolute inset-0 z-0 h-full w-full scale-105 object-cover object-[72%_center] transition-opacity duration-700 md:object-center ${
          videoReady ? "opacity-0" : "opacity-100"
        }`}
        style={{ filter: "blur(1px)" }}
      />

      {/* ---- Background video (decorative) ---- */}
      {/* R19-A11y 1.1.1: aria-hidden + tabIndex=-1 perche' decorativo (muted
          loop). No captions richieste. */}
      <video
        ref={videoRef}
        aria-hidden="true"
        tabIndex={-1}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        onCanPlay={() => setVideoReady(true)}
        className={`absolute inset-0 z-0 h-full w-full scale-105 object-cover object-[72%_center] transition-opacity duration-700 md:object-center ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
        style={{ filter: "blur(1px)" }}
      >
        {shouldLoadVideo && <source src={HERO_VIDEO_SRC} type="video/mp4" />}
      </video>

      {/* ---- Subtle overlay — bottom darkens to blend with next section ---- */}
      <div className="absolute inset-0 z-[1]" style={{
        background: "linear-gradient(to bottom, rgba(7,25,52,0.4) 0%, transparent 30%, transparent 60%, rgba(7,25,52,0.85) 90%, #071934 100%)"
      }} />

      {/* ---- Hero content ---- */}
      <div className="relative z-40 flex min-h-[860px] w-full flex-col justify-center px-4 pb-20 pt-28 md:min-h-[820px] md:px-8 lg:px-12">
        <div className="max-w-6xl">
          <h1
            id="home-hero-title"
            className="max-w-5xl font-heading text-4xl font-extrabold leading-[0.98] text-white drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
          >
            {t("seoTitle")}
          </h1>

          <p className="mt-5 max-w-3xl text-lg font-medium leading-relaxed text-white drop-shadow-md sm:text-xl md:text-2xl">
            {t("seoSubtitle")}
          </p>
        </div>

        {experiences.length > 0 && (
          <div className="mt-8 w-full max-w-[1120px] md:mt-10">
            <h2 id="home-hero-experiences-title" className="sr-only">
              {copy.cardsLabel}
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
                        preload={!isDuplicate && experience.key === experiences[0]?.key}
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
                          {experience.priceLabel && (
                            <p className="mt-3 text-sm font-extrabold uppercase tracking-[0.08em] text-[var(--color-gold)] [text-shadow:0_3px_16px_rgba(0,0,0,0.95),0_1px_3px_rgba(0,0,0,0.95)]">
                              {experience.priceLabel}
                            </p>
                          )}
                          <Link
                            href={experience.bookingHref}
                            tabIndex={isDuplicate ? -1 : undefined}
                            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-gold)] px-4 text-sm font-bold text-[#06233a] transition hover:bg-[#f2b84b]"
                          >
                            <CalendarDays className="size-4" aria-hidden="true" />
                            {copy.book}
                          </Link>
                        </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
