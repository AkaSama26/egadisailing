import { DeferredHeroExperienceCarousel } from "@/components/deferred-hero-experience-carousel";
import { HeroBackgroundVideo } from "@/components/hero-background-video";
import { HERO_VIDEO_DESKTOP_POSTER_SRC, HERO_VIDEO_MOBILE_POSTER_SRC } from "@/lib/public-assets";

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

interface HeroSectionProps {
  experiences: HeroExperienceCard[];
  locale: string;
  title: string;
  subtitle: string;
}

function heroCarouselCopy(locale: string) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";

  return {
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
}

export function HeroSection({ experiences, locale, title, subtitle }: HeroSectionProps) {
  const copy = heroCarouselCopy(locale);

  return (
    <>
      <section
        aria-labelledby="home-hero-title"
        className="relative w-full min-h-[100svh] overflow-hidden bg-[#071934] select-none"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_38%,rgba(14,165,233,0.24),transparent_42%),linear-gradient(180deg,#071934_0%,#0a2a4a_56%,#071934_100%)]"
        />

        <picture
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full opacity-100 transition-opacity duration-700"
        >
          <source media="(max-width: 767px)" srcSet={HERO_VIDEO_MOBILE_POSTER_SRC} />
          <img
            src={HERO_VIDEO_DESKTOP_POSTER_SRC}
            alt=""
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover object-[72%_center] md:object-center"
          />
        </picture>

        <HeroBackgroundVideo />

        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(7,25,52,0.32) 0%, transparent 42%, transparent 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-[-1px] z-[2] h-32 bg-gradient-to-b from-transparent via-[#071934]/40 to-[#071934] backdrop-blur-[1px] md:h-40"
        />

        <div className="relative z-40 flex min-h-[100svh] w-full flex-col justify-center px-4 pb-24 pt-28 md:px-8 lg:px-12">
          <div className="max-w-6xl md:-translate-y-16 lg:-translate-y-24">
            <h1
              id="home-hero-title"
              className="max-w-5xl font-heading text-6xl font-extrabold leading-[0.92] text-white [text-shadow:0_4px_24px_rgba(0,0,0,0.72),0_1px_3px_rgba(0,0,0,0.92)] sm:text-7xl md:text-7xl lg:text-8xl xl:text-8xl"
            >
              {title}
            </h1>

            <p className="mt-6 max-w-3xl text-2xl font-medium leading-9 text-white [text-shadow:0_3px_18px_rgba(0,0,0,0.7),0_1px_2px_rgba(0,0,0,0.9)] sm:text-3xl sm:leading-10 md:text-3xl">
              {subtitle}
            </p>
          </div>
        </div>
      </section>
      <DeferredHeroExperienceCarousel
        experiences={experiences}
        bookLabel={copy.book}
        cardsLabel={copy.cardsLabel}
      />
    </>
  );
}
