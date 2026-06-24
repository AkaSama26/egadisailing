"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

export interface HomePhotoStackImage {
  src: string;
  alt: string;
  caption?: string;
}

type HomePhotoStackVariant = "wide" | "duo";
type HomePhotoStackEnterFrom = "left" | "right";

export interface HomePhotoStackLabels {
  galleryTitle: string;
  galleryDescription: string;
  openImage: string;
  close: string;
  previous: string;
  next: string;
}

interface HomePhotoStackProps {
  images: HomePhotoStackImage[];
  labels: HomePhotoStackLabels;
  variant?: HomePhotoStackVariant;
  enterFrom?: HomePhotoStackEnterFrom;
  className?: string;
}

const wideLayouts = [
  {
    left: "8%",
    top: "7%",
    width: "42%",
    rotate: -6.5,
    zIndex: 20,
    fromY: 46,
  },
  {
    left: "46%",
    top: "5%",
    width: "42%",
    rotate: 4.5,
    zIndex: 30,
    fromY: 34,
  },
  {
    left: "18%",
    top: "39%",
    width: "42%",
    rotate: -2.5,
    zIndex: 40,
    fromY: 68,
  },
  {
    left: "54%",
    top: "34%",
    width: "38%",
    rotate: 6,
    zIndex: 50,
    fromY: 58,
  },
] as const;

const duoLayouts = [
  {
    left: "20%",
    top: "8%",
    width: "54%",
    rotate: -6,
    zIndex: 20,
    fromY: 42,
  },
  {
    left: "34%",
    top: "29%",
    width: "54%",
    rotate: 5,
    zIndex: 30,
    fromY: 58,
  },
] as const;

function getLayouts(variant: HomePhotoStackVariant) {
  return variant === "duo" ? duoLayouts : wideLayouts;
}

function getImageCaption(image: HomePhotoStackImage) {
  return image.caption ?? image.alt;
}

export function HomePhotoStack({
  images,
  labels,
  variant = images.length <= 2 ? "duo" : "wide",
  enterFrom = "right",
  className = "",
}: HomePhotoStackProps) {
  const stackRef = useRef<HTMLDivElement>(null);
  const layouts = getLayouts(variant);
  const entryX = enterFrom === "left" ? "-34vw" : "34vw";
  const stackImages = images.slice(0, layouts.length);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isStackInView, setIsStackInView] = useState(false);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);

  const activeImage = selectedIndex === null ? null : stackImages[selectedIndex];

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      const shouldReduce = mediaQuery.matches;
      setShouldReduceMotion(shouldReduce);
      if (shouldReduce) setIsStackInView(true);
    };

    const frameId = window.requestAnimationFrame(updateMotionPreference);
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => {
      window.cancelAnimationFrame(frameId);
      mediaQuery.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (shouldReduceMotion) {
      const frameId = window.requestAnimationFrame(() => setIsStackInView(true));
      return () => window.cancelAnimationFrame(frameId);
    }

    const stack = stackRef.current;
    if (!stack) return;

    if (typeof IntersectionObserver === "undefined") {
      const frameId = window.requestAnimationFrame(() => setIsStackInView(true));
      return () => window.cancelAnimationFrame(frameId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsStackInView(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -120px 0px", threshold: 0.1 },
    );

    observer.observe(stack);
    return () => observer.disconnect();
  }, [shouldReduceMotion]);

  function moveDialogImage(direction: -1 | 1) {
    setSelectedIndex((current) => {
      if (current === null || stackImages.length === 0) return current;
      return (current + direction + stackImages.length) % stackImages.length;
    });
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveDialogImage(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveDialogImage(1);
    }
  }

  function getHoverOffset(index: number) {
    if (hoveredIndex === null) return { x: 0, y: 0, scale: 1 };
    if (hoveredIndex === index) return { x: 0, y: -18, scale: 1.055 };
    const direction = index < hoveredIndex ? -1 : 1;
    return {
      x: direction * 18,
      y: 16 + Math.abs(index - hoveredIndex) * 4,
      scale: 0.965,
    };
  }

  return (
    <>
      <div
        ref={stackRef}
        className={`relative isolate min-h-[27rem] overflow-visible sm:min-h-[34rem] lg:min-h-[36rem] ${className}`}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {stackImages.map((image, index) => {
          const layout = layouts[index] ?? layouts[0];
          const hoverOffset = getHoverOffset(index);
          const zIndex = hoveredIndex === index ? 80 : layout.zIndex;
          const caption = getImageCaption(image);
          const cardStyle = {
            left: layout.left,
            top: layout.top,
            width: layout.width,
            zIndex,
            "--stack-enter-x": entryX,
            "--stack-enter-y": `${layout.fromY}px`,
            "--stack-rotate": `${layout.rotate}deg`,
            "--stack-hidden-rotate": `${layout.rotate * 0.4}deg`,
            "--stack-delay": `${0.18 + index * 0.28}s`,
          } as CSSProperties;
          const buttonStyle = {
            "--stack-hover-x": `${hoverOffset.x}px`,
            "--stack-hover-y": `${hoverOffset.y}px`,
            "--stack-hover-scale": String(hoverOffset.scale),
          } as CSSProperties;

          return (
            <figure
              key={image.src}
              className={`home-photo-stack-card absolute aspect-[0.86/1] overflow-visible will-change-transform ${
                isStackInView || shouldReduceMotion ? "is-visible" : ""
              }`}
              style={cardStyle}
            >
              <button
                type="button"
                aria-label={`${labels.openImage}: ${image.alt}`}
                onClick={() => setSelectedIndex(index)}
                onMouseEnter={() => setHoveredIndex(index)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
                style={buttonStyle}
                className="home-photo-stack-button group relative flex h-full w-full cursor-zoom-in flex-col overflow-hidden rounded-md border border-white bg-[#f8f3e9] p-[4.7%] pb-[14.5%] text-left shadow-[0_32px_90px_rgba(0,0,0,0.3)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071934]"
              >
                <span className="relative block min-h-0 w-full flex-1 overflow-hidden rounded-[0.18rem] bg-[#d8e7ec]">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes={
                      variant === "duo"
                        ? "(min-width: 1280px) 18vw, (min-width: 1024px) 24vw, (min-width: 640px) 30vw, 48vw"
                        : "(min-width: 1280px) 14vw, (min-width: 1024px) 18vw, (min-width: 640px) 24vw, 40vw"
                    }
                    quality={74}
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                  />
                </span>
                <span
                  className="pointer-events-none absolute inset-x-[6%] bottom-[4.5%] block truncate text-center text-lg font-semibold text-slate-700 md:text-xl lg:text-2xl"
                  style={{ fontFamily: "var(--font-handwriting), cursive" }}
                >
                  {caption}
                </span>
              </button>
            </figure>
          );
        })}
      </div>

      {selectedIndex !== null && (
        <Dialog.Root
          open
          onOpenChange={(open) => {
            if (!open) setSelectedIndex(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-[330] bg-[#031225]/75 backdrop-blur-md transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
            <Dialog.Popup
            onKeyDown={handleDialogKeyDown}
            className="fixed left-1/2 top-1/2 z-[331] flex h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[74rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-white/14 bg-[#071934] text-white shadow-2xl shadow-black/40 outline-none transition duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 md:h-[calc(100vh-3rem)]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <Dialog.Title className="font-heading text-xl font-semibold leading-tight md:text-2xl">
                  {labels.galleryTitle}
                </Dialog.Title>
                <Dialog.Description className="mt-1 line-clamp-1 text-sm text-white/68">
                  {activeImage?.alt ?? labels.galleryDescription}
                </Dialog.Description>
              </div>
              <Dialog.Close
                render={
                  <button
                    type="button"
                    aria-label={labels.close}
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/8 text-white transition hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
                  />
                }
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Dialog.Close>
            </div>

            <div className="relative min-h-0 flex-1">
              {activeImage && (
                <Image
                  key={activeImage.src}
                  src={activeImage.src}
                  alt={activeImage.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 74rem"
                  className="object-contain"
                />
              )}
              {stackImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => moveDialogImage(-1)}
                    aria-label={labels.previous}
                    className="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-[#071934]/70 text-white backdrop-blur transition hover:bg-[#071934]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] sm:left-5 sm:size-12"
                  >
                    <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDialogImage(1)}
                    aria-label={labels.next}
                    className="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-[#071934]/70 text-white backdrop-blur transition hover:bg-[#071934]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] sm:right-5 sm:size-12"
                  >
                    <ChevronRight className="h-6 w-6" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>

            {stackImages.length > 1 && (
              <div className="flex items-center justify-center gap-2 border-t border-white/10 px-4 py-3">
                {stackImages.map((image, index) => (
                  <button
                    key={image.src}
                    type="button"
                    aria-label={`${labels.openImage}: ${image.alt}`}
                    aria-current={selectedIndex === index ? "true" : undefined}
                    onClick={() => setSelectedIndex(index)}
                    className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] ${
                      selectedIndex === index
                        ? "w-8 bg-[var(--color-gold)]"
                        : "w-2.5 bg-white/32 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            )}
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );
}
