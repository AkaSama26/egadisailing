"use client";

import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export interface TestimonialColumnItem {
  text: string;
  image?: string;
  name: string;
  role: string;
  rating?: number;
}

interface TestimonialsColumnProps {
  className?: string;
  testimonials: TestimonialColumnItem[];
  duration?: number;
}

export function TestimonialsColumn({
  className,
  testimonials,
  duration = 10,
}: TestimonialsColumnProps) {
  const initialsFor = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const starsFor = (rating: number) =>
    Array.from({ length: Math.max(0, Math.min(5, Math.round(rating))) });

  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {Array.from({ length: 2 }).map((_, columnPass) => (
          <React.Fragment key={columnPass}>
            {testimonials.map(({ text, image, name, role, rating }, index) => (
              <article
                className="w-full max-w-xs rounded-lg border border-white/10 bg-white/[0.06] p-8 text-white shadow-lg shadow-black/10 backdrop-blur"
                key={`${columnPass}-${name}-${index}`}
              >
                <div className="flex items-center gap-3">
                  {image ? (
                    <img
                      width={40}
                      height={40}
                      src={image}
                      alt={`Foto profilo di ${name}`}
                      className="h-10 w-10 rounded-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-gold)]/90 text-xs font-bold text-[#06233a]">
                      {initialsFor(name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold leading-5 text-white">
                      {name}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-white/45">
                      {typeof rating === "number" ? (
                        <span
                          className="flex items-center gap-0.5"
                          aria-label={`Valutazione ${rating} su 5`}
                        >
                          {starsFor(rating).map((_, starIndex) => (
                            <Star
                              key={starIndex}
                              className="h-3.5 w-3.5 fill-[var(--color-gold)] text-[var(--color-gold)]"
                              aria-hidden="true"
                            />
                          ))}
                        </span>
                      ) : null}
                      <span>{role}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-relaxed text-white/70">
                  &ldquo;{text}&rdquo;
                </p>
              </article>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}
