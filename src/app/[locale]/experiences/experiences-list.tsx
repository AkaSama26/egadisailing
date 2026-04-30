"use client";

import Link from "next/link";
import { ScrollSection } from "@/components/scroll-section";
import { ImageStack } from "@/components/image-stack";
import { ArrowRight, Clock, Ship, Ticket } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface ExperiencePackage {
  key: string;
  title: string;
  subtitle: string;
  durationLabel: string;
  detailLabel: string;
  priceLabel: string | null;
  priceUnitLabel: string;
  primaryHref: string;
  primaryCtaLabel: string;
  media: Array<{ caption: string; alt: string; color: string; src?: string }>;
  variants: Array<{
    label: string;
    description: string;
    href: string;
  }>;
}

type MotifShape = "spark" | "wave" | "sun" | "shell";

interface DecorativeMotif {
  shape: MotifShape;
  className: string;
}

const motifLayouts: DecorativeMotif[][] = [
  [
    { shape: "sun", className: "left-[3%] top-[9%] h-16 w-16 -rotate-12 opacity-25" },
    { shape: "wave", className: "right-[1%] top-[18%] h-24 w-24 rotate-6 opacity-20" },
    { shape: "spark", className: "left-[12%] bottom-[18%] h-10 w-10 rotate-12 opacity-30" },
    { shape: "shell", className: "right-[12%] bottom-[5%] h-14 w-14 -rotate-6 opacity-20" },
  ],
  [
    { shape: "wave", className: "left-[1%] top-[21%] h-24 w-24 -rotate-6 opacity-20" },
    { shape: "shell", className: "right-[6%] top-[8%] h-16 w-16 rotate-12 opacity-25" },
    { shape: "spark", className: "right-[16%] bottom-[18%] h-11 w-11 -rotate-12 opacity-30" },
    { shape: "sun", className: "left-[15%] bottom-[3%] h-14 w-14 rotate-6 opacity-20" },
  ],
  [
    { shape: "spark", className: "left-[7%] top-[7%] h-12 w-12 rotate-6 opacity-30" },
    { shape: "shell", className: "right-[2%] top-[24%] h-14 w-14 -rotate-12 opacity-20" },
    { shape: "wave", className: "left-[4%] bottom-[9%] h-24 w-24 rotate-12 opacity-20" },
    { shape: "sun", className: "right-[17%] bottom-[12%] h-16 w-16 -rotate-6 opacity-25" },
  ],
  [
    { shape: "shell", className: "left-[4%] top-[18%] h-16 w-16 rotate-12 opacity-20" },
    { shape: "sun", className: "right-[5%] top-[6%] h-14 w-14 -rotate-12 opacity-25" },
    { shape: "wave", className: "right-[2%] bottom-[14%] h-24 w-24 -rotate-6 opacity-20" },
    { shape: "spark", className: "left-[18%] bottom-[8%] h-10 w-10 rotate-6 opacity-30" },
  ],
];

function MotifSvg({ shape }: { shape: MotifShape }) {
  if (shape === "wave") {
    return (
      <svg viewBox="0 0 96 96" className="h-full w-full" fill="none">
        <path
          d="M10 36c10-12 22-12 32 0s22 12 32 0 22-12 32 0"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M4 56c10-12 22-12 32 0s22 12 32 0 22-12 32 0"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (shape === "shell") {
    return (
      <svg viewBox="0 0 96 96" className="h-full w-full" fill="none">
        <path
          d="M24 66c0-24 18-42 40-42 9 0 16 5 16 13 0 17-18 35-43 35-8 0-13-2-13-6Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M64 24c-13 8-22 18-27 31M78 36c-15 1-29 8-41 19M72 54c-12-4-24-4-36 1"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M53 39c7 0 12 4 12 10 0 8-8 14-17 14-7 0-12-4-12-9 0-7 7-15 17-15Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M53 48c3 0 5 2 5 4 0 3-3 6-7 6-3 0-5-2-5-4 0-3 3-6 7-6Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M18 72c16 4 37 4 56-2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (shape === "sun") {
    return (
      <svg viewBox="0 0 96 96" className="h-full w-full" fill="none">
        <circle cx="48" cy="48" r="15" stroke="currentColor" strokeWidth="3" />
        <path
          d="M48 10v14M48 72v14M10 48h14M72 48h14M21 21l10 10M65 65l10 10M75 21 65 31M31 65 21 75"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" fill="none">
      <path
        d="M48 8c4 22 18 36 40 40-22 4-36 18-40 40-4-22-18-36-40-40 22-4 36-18 40-40Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M48 27v42M27 48h42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function PolaroidMotifs({ index }: { index: number }) {
  const motifs = motifLayouts[index % motifLayouts.length];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 hidden text-[var(--color-gold)] sm:block"
    >
      {motifs.map((motif, motifIndex) => (
        <div
          key={`${motif.shape}-${motifIndex}`}
          className={`absolute ${motif.className} drop-shadow-[0_0_18px_rgba(212,175,55,0.18)]`}
        >
          <MotifSvg shape={motif.shape} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ExperiencesList({
  packages,
  locale,
}: {
  packages: ExperiencePackage[];
  locale: string;
}) {
  const localizedHref = (href: string) => `/${locale}${href}`;

  return (
    <section className="pb-32 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto space-y-32">
        {packages.map((experience, i) => {
          const isEven = i % 2 === 0;

          return (
            <div
              key={experience.key}
              id={experience.key}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
            >
              {/* Text column */}
              <ScrollSection
                animation={isEven ? "fade-left" : "fade-right"}
                className={`space-y-6 ${isEven ? "lg:order-1" : "lg:order-2"}`}
              >
                <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                  {experience.title}
                </h2>

                <p className="text-white/70 text-lg leading-relaxed max-w-lg">
                  {experience.subtitle}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-white/50 text-sm">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {experience.durationLabel}
                  </span>
                  <span className="flex items-center gap-2">
                    <Ship className="h-4 w-4" />
                    {experience.detailLabel}
                  </span>
                </div>

                {experience.priceLabel && (
                  <p className="text-2xl font-semibold text-[var(--color-gold)]">
                    {experience.priceLabel}{" "}
                    <span className="text-base font-medium text-white/55">
                      {experience.priceUnitLabel}
                    </span>
                  </p>
                )}

                {experience.variants.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {experience.variants.map((variant) => (
                      <Link
                        key={variant.href}
                        href={localizedHref(variant.href)}
                        className="group rounded-lg border border-white/15 bg-white/5 p-4 transition hover:border-white/35 hover:bg-white/10"
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold text-white">
                          <Ticket className="h-4 w-4 text-[var(--color-gold)]" />
                          {variant.label}
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-white/55">
                          {variant.description}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                <Link
                  href={localizedHref(experience.primaryHref)}
                  className="inline-flex items-center gap-2 text-white font-semibold text-lg hover:gap-3 transition-all"
                >
                  {experience.primaryCtaLabel} <ArrowRight className="h-5 w-5" />
                </Link>
              </ScrollSection>

              {/* Image stack column */}
              <ScrollSection
                animation={isEven ? "fade-right" : "fade-left"}
                className={`flex justify-center ${isEven ? "lg:order-2" : "lg:order-1"}`}
              >
                <div className="relative flex min-h-[26rem] w-full items-center justify-center overflow-visible py-8 md:min-h-[34rem] lg:min-h-[38rem]">
                  <PolaroidMotifs index={i} />
                  <ImageStack
                    images={experience.media}
                    className="relative z-10 w-full max-w-[22rem] h-[24rem] md:max-w-[28rem] md:h-[32rem] lg:max-w-[32rem] lg:h-[36rem]"
                  />
                </div>
              </ScrollSection>
            </div>
          );
        })}
      </div>
    </section>
  );
}
