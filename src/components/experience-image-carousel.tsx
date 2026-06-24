"use client";

import type { KeyboardEvent } from "react";
import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ExperienceImageCarouselItem {
  src: string;
  alt: string;
  caption?: string;
}

interface ExperienceImageCarouselProps {
  title: string;
  items: ExperienceImageCarouselItem[];
  previousLabel?: string;
  nextLabel?: string;
  openImageLabel?: string;
  closeLabel?: string;
}

const GALLERY_CARD_SIZES = "(max-width: 640px) 210px, (max-width: 1024px) 230px, 240px";
const GALLERY_DIALOG_SIZES = "(max-width: 1024px) 100vw, 1120px";

export function ExperienceImageCarousel({
  title,
  items,
  previousLabel = "Foto precedenti",
  nextLabel = "Foto successive",
  openImageLabel = "Apri foto",
  closeLabel = "Chiudi foto",
}: ExperienceImageCarouselProps) {
  const slides = items;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const programmaticScrollRef = useRef<{ index: number; left: number } | null>(null);
  const programmaticScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (slides.length === 0) return null;

  const selectedImage = selectedIndex === null ? null : slides[selectedIndex];

  function getSlideLeft(item: HTMLElement) {
    const firstItem = itemRefs.current[0];
    return item.offsetLeft - (firstItem?.offsetLeft ?? 0);
  }

  function getMaxScrollLeft(scroller: HTMLDivElement) {
    return Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  }

  function clearProgrammaticScroll() {
    if (programmaticScrollTimerRef.current) {
      clearTimeout(programmaticScrollTimerRef.current);
      programmaticScrollTimerRef.current = null;
    }
    programmaticScrollRef.current = null;
  }

  function scrollToIndex(index: number) {
    const scroller = scrollerRef.current;
    const nextIndex = (index + slides.length) % slides.length;
    const nextItem = itemRefs.current[nextIndex];

    if (scroller && nextItem) {
      const nextLeft = Math.min(getSlideLeft(nextItem), getMaxScrollLeft(scroller));
      clearProgrammaticScroll();
      programmaticScrollRef.current = { index: nextIndex, left: nextLeft };
      scroller.scrollTo({
        left: nextLeft,
        behavior: "smooth",
      });
      programmaticScrollTimerRef.current = setTimeout(() => {
        programmaticScrollRef.current = null;
        setActiveIndex(nextIndex);
      }, 650);
    }

    setActiveIndex(nextIndex);
  }

  function openImage(index: number) {
    setSelectedIndex(index);
    setActiveIndex(index);
  }

  function moveSelectedImage(direction: -1 | 1) {
    setSelectedIndex((current) => {
      if (current === null) return current;
      const nextIndex = (current + direction + slides.length) % slides.length;
      setActiveIndex(nextIndex);
      return nextIndex;
    });
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelectedImage(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveSelectedImage(1);
    }
  }

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const programmaticScroll = programmaticScrollRef.current;
    if (programmaticScroll) {
      if (Math.abs(scroller.scrollLeft - programmaticScroll.left) <= 2) {
        clearProgrammaticScroll();
        setActiveIndex(programmaticScroll.index);
      }
      return;
    }

    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    itemRefs.current.forEach((item, index) => {
      if (!item) return;
      const distance = Math.abs(getSlideLeft(item) - scroller.scrollLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  }

  return (
    <>
      <section id="gallery" className="relative scroll-mt-28 px-4 py-12 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <h2 className="sr-only">{title}</h2>

          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex min-w-max snap-x snap-mandatory gap-5 md:gap-6 lg:mx-auto">
              {slides.map((item, index) => (
                <figure
                  key={`${item.src}-${index}`}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  className="relative h-[220px] w-[210px] shrink-0 snap-start overflow-hidden rounded-[1.35rem] bg-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.18)] sm:h-[240px] sm:w-[230px] lg:h-[220px] lg:w-[210px] xl:h-[240px] xl:w-[240px]"
                >
                  <button
                    type="button"
                    onClick={() => openImage(index)}
                    aria-label={`${openImageLabel}: ${item.caption ?? item.alt}`}
                    className="group relative block h-full w-full cursor-zoom-in overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:ring-offset-2 focus:ring-offset-[#071934]"
                  >
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      sizes={GALLERY_CARD_SIZES}
                      loading="lazy"
                      className="object-cover transition duration-500 group-hover:scale-[1.035]"
                    />
                    <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                  </button>
                  {item.caption ? <figcaption className="sr-only">{item.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          </div>

          {slides.length > 1 && (
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-3 gap-y-4">
              <button
                type="button"
                onClick={() => scrollToIndex(activeIndex - 1)}
                aria-label={previousLabel}
                className="order-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:ring-offset-2 focus:ring-offset-[#071934] sm:order-1"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="order-1 flex w-full min-w-0 flex-wrap items-center justify-center gap-1.5 sm:order-2 sm:w-auto sm:gap-2">
                {slides.map((item, index) => (
                  <button
                    key={`${item.src}-dot-${index}`}
                    type="button"
                    onClick={() => scrollToIndex(index)}
                    aria-label={`${title} ${index + 1}`}
                    aria-current={activeIndex === index ? "true" : undefined}
                    className={
                      activeIndex === index
                        ? "h-2 w-6 rounded-full bg-[var(--color-gold)] transition sm:w-8"
                        : "h-2 w-2 rounded-full bg-white transition hover:bg-[var(--color-gold)]"
                    }
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => scrollToIndex(activeIndex + 1)}
                aria-label={nextLabel}
                className="order-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:ring-offset-2 focus:ring-offset-[#071934]"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </section>

      <Dialog.Root
        open={selectedIndex !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedIndex(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-[330] bg-[#031225]/78 backdrop-blur-md transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Dialog.Popup
            onKeyDown={handleDialogKeyDown}
            className="fixed left-1/2 top-1/2 z-[331] flex h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[76rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-white/14 bg-[#071934] text-white shadow-2xl shadow-black/40 outline-none transition duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 md:h-[calc(100vh-3rem)]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <Dialog.Title className="font-heading text-lg font-semibold leading-tight text-white sm:text-xl md:text-2xl">
                  {selectedImage?.caption ?? title}
                </Dialog.Title>
                <Dialog.Description className="mt-1 line-clamp-1 text-sm text-white/68">
                  {selectedImage?.alt ?? title}
                </Dialog.Description>
              </div>
              <Dialog.Close
                render={
                  <button
                    type="button"
                    aria-label={closeLabel}
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/8 text-white transition hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
                  />
                }
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Dialog.Close>
            </div>

            <div className="relative min-h-0 flex-1 bg-black/12">
              {selectedImage && (
                <Image
                  key={selectedImage.src}
                  src={selectedImage.src}
                  alt={selectedImage.alt}
                  fill
                  sizes={GALLERY_DIALOG_SIZES}
                  loading="eager"
                  className="object-contain"
                />
              )}

              {slides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => moveSelectedImage(-1)}
                    aria-label={previousLabel}
                    className="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-[#071934]/70 text-white backdrop-blur transition hover:bg-[#071934]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] sm:left-5 sm:size-12"
                  >
                    <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSelectedImage(1)}
                    aria-label={nextLabel}
                    className="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-[#071934]/70 text-white backdrop-blur transition hover:bg-[#071934]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] sm:right-5 sm:size-12"
                  >
                    <ChevronRight className="h-6 w-6" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>

            {slides.length > 1 && (
              <div className="flex max-h-[4.75rem] flex-wrap items-center justify-center gap-2 overflow-y-auto border-t border-white/10 px-4 py-3">
                {slides.map((item, index) => (
                  <button
                    key={`${item.src}-dialog-dot-${index}`}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    aria-label={`${title} ${index + 1}`}
                    aria-current={selectedIndex === index ? "true" : undefined}
                    className={
                      selectedIndex === index
                        ? "h-2.5 w-8 rounded-full bg-[var(--color-gold)] transition"
                        : "h-2.5 w-2.5 rounded-full bg-white/35 transition hover:bg-white/70"
                    }
                  />
                ))}
              </div>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
