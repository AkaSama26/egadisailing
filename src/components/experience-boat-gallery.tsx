"use client";

import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExperienceBoatGalleryItem {
  src: string;
  alt: string;
  caption: string;
}

interface ExperienceBoatGalleryProps {
  title: string;
  description: string;
  eyebrow: string;
  items: ExperienceBoatGalleryItem[];
}

export function ExperienceBoatGallery({
  title,
  items,
}: ExperienceBoatGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    dragged: false,
    startX: 0,
    scrollLeft: 0,
  });
  const clickWasDragRef = useRef(false);
  const selectedItem = items[selectedIndex] ?? items[0];

  if (!selectedItem) return null;

  function scrollThumbnails(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({
      left: direction * 180,
      behavior: "smooth",
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    dragRef.current = {
      active: true,
      dragged: false,
      startX: event.clientX,
      scrollLeft: scroller.scrollLeft,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    const drag = dragRef.current;
    if (!drag.active || !scroller) return;

    const deltaX = event.clientX - drag.startX;
    if (Math.abs(deltaX) > 10) {
      drag.dragged = true;
    }

    if (drag.dragged) {
      event.preventDefault();
      scroller.scrollLeft = drag.scrollLeft - deltaX;
    }
  }

  function handlePointerEnd() {
    const wasDragged = dragRef.current.dragged;
    dragRef.current.active = false;

    if (wasDragged) {
      clickWasDragRef.current = true;
      window.setTimeout(() => {
        clickWasDragRef.current = false;
      }, 120);
    }
  }

  function handleScrollerClick(event: MouseEvent<HTMLDivElement>) {
    if (!clickWasDragRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    clickWasDragRef.current = false;
  }

  return (
    <section className="min-w-0" aria-label={title}>
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="relative aspect-[16/10] bg-slate-100">
          <Image
            key={selectedItem.src}
            src={selectedItem.src}
            alt={selectedItem.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 760px"
            className="object-contain"
          />
        </div>

        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2 p-3 sm:p-4">
          <button
            type="button"
            onClick={() => scrollThumbnails(-1)}
            aria-label="Foto precedenti"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-[var(--color-ocean)] shadow-sm transition hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:ring-offset-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={scrollerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onClickCapture={handleScrollerClick}
            className="min-w-0 cursor-grab select-none overflow-x-auto pb-1 active:cursor-grabbing [scrollbar-width:thin]"
          >
            <div className="flex min-w-max gap-3">
              {items.map((item, index) => {
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={item.src}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    aria-label={item.caption}
                    aria-current={isSelected ? "true" : undefined}
                    className={cn(
                      "relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2 sm:h-20 sm:w-32",
                      isSelected
                        ? "border-[var(--color-gold)] opacity-100"
                        : "border-transparent opacity-72 hover:opacity-100",
                    )}
                  >
                    <Image src={item.src} alt="" fill sizes="128px" className="object-cover" />
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => scrollThumbnails(1)}
            aria-label="Foto successive"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-[var(--color-ocean)] shadow-sm transition hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:ring-offset-2"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
