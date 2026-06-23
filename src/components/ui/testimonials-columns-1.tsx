import { type CSSProperties, Fragment } from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export interface TestimonialColumnItem {
  text: string;
  image?: string;
  name: string;
  role: string;
  rating?: number;
}

interface TestimonialsMarqueeProps {
  className?: string;
  testimonials: TestimonialColumnItem[];
  duration?: number;
  locale?: string;
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function starsFor(rating: number) {
  return Array.from({ length: Math.max(0, Math.min(5, Math.round(rating))) });
}

function profileAlt(name: string, locale: string) {
  return locale === "de"
    ? `Profilfoto von ${name}`
    : locale === "fr"
      ? `Photo de profil de ${name}`
      : locale === "es"
        ? `Foto de perfil de ${name}`
        : locale === "en"
          ? `Profile photo of ${name}`
          : `Foto profilo di ${name}`;
}

function ratingLabel(rating: number, locale: string) {
  return locale === "de"
    ? `Bewertung ${rating} von 5`
    : locale === "fr"
      ? `Note ${rating} sur 5`
      : locale === "es"
        ? `Valoracion ${rating} de 5`
        : locale === "en"
          ? `Rating ${rating} out of 5`
          : `Valutazione ${rating} su 5`;
}

function TestimonialCard({
  text,
  image,
  name,
  role,
  rating,
  locale,
  className,
}: TestimonialColumnItem & { locale: string; className?: string }) {
  return (
    <article
      className={cn(
        "rounded-lg border border-white/10 bg-white/[0.06] p-8 text-white shadow-lg shadow-black/10 backdrop-blur",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {image ? (
          <div
            role="img"
            aria-label={profileAlt(name, locale)}
            className="h-10 w-10 rounded-full"
            style={{
              backgroundImage: `url(${image})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
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
                role="img"
                aria-label={ratingLabel(rating, locale)}
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
  );
}

export function TestimonialsRow({
  className,
  testimonials,
  duration = 44,
  locale = "it",
}: TestimonialsMarqueeProps) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <div
        className="testimonial-marquee-track flex w-max gap-5 py-2 md:gap-6"
        style={{ "--testimonial-duration": `${duration}s` } as CSSProperties}
      >
        {Array.from({ length: 2 }).map((_, rowPass) => (
          <Fragment key={rowPass}>
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                {...testimonial}
                locale={locale}
                className="h-[22rem] w-[82vw] max-w-[23rem] shrink-0 overflow-hidden p-6 sm:w-[21rem] md:h-[21rem] md:w-[23rem] md:p-7 lg:w-[24rem]"
                key={`${rowPass}-${testimonial.name}-${index}`}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
