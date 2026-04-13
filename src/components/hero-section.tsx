"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { BookingSearch } from "@/components/booking-search";

/* ------------------------------------------------------------------ */
/*  Inline SVG silhouettes                                            */
/* ------------------------------------------------------------------ */

function CatamaranSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left hull */}
      <path
        d="M60 160 Q60 180 80 185 L180 190 Q200 190 200 175 L200 160 Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Right hull */}
      <path
        d="M200 160 L200 175 Q200 190 220 190 L320 185 Q340 180 340 160 Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Deck / bridge between hulls */}
      <rect x="100" y="140" width="200" height="22" rx="4" fill="currentColor" opacity="0.85" />
      {/* Cabin */}
      <rect x="155" y="110" width="90" height="32" rx="6" fill="currentColor" opacity="0.8" />
      {/* Cabin windows */}
      <rect x="165" y="118" width="12" height="8" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="185" y="118" width="12" height="8" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="205" y="118" width="12" height="8" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="225" y="118" width="12" height="8" rx="2" fill="currentColor" opacity="0.3" />
      {/* Mast */}
      <line x1="200" y1="110" x2="200" y2="20" stroke="currentColor" strokeWidth="3" opacity="0.9" />
      {/* Mainsail */}
      <path
        d="M203 25 L203 105 L310 105 Z"
        fill="currentColor"
        opacity="0.5"
      />
      {/* Jib / foresail */}
      <path
        d="M197 25 L197 95 L120 95 Z"
        fill="currentColor"
        opacity="0.4"
      />
      {/* Boom */}
      <line x1="200" y1="105" x2="310" y2="105" stroke="currentColor" strokeWidth="2" opacity="0.7" />
    </svg>
  );
}

function SeagullSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left wing */}
      <path
        d="M2 18 Q10 2 20 8 Q25 10 28 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right wing */}
      <path
        d="M32 12 Q35 10 40 8 Q50 2 58 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Body hint */}
      <path
        d="M28 12 Q30 14 32 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Wave shapes at the bottom                                         */
/* ------------------------------------------------------------------ */

function WaveBottom() {
  return (
    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-20">
      <svg
        viewBox="0 0 1440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        preserveAspectRatio="none"
      >
        <path
          d="M0 80 Q180 20 360 60 T720 50 T1080 70 T1440 40 L1440 120 L0 120 Z"
          fill="white"
          opacity="0.08"
        />
        <path
          d="M0 90 Q240 40 480 75 T960 60 T1440 80 L1440 120 L0 120 Z"
          fill="white"
          opacity="0.05"
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Seagull positions & parallax config                               */
/* ------------------------------------------------------------------ */

const seagulls = [
  // Back layer (z-20)
  { id: 1, top: "12%", left: "62%", size: "w-14", speed: 25, z: "z-20", rotate: -12 },
  { id: 2, top: "22%", left: "78%", size: "w-10", speed: 30, z: "z-20", rotate: 8 },
  // Front layer (z-50)
  { id: 3, top: "8%", left: "45%", size: "w-12", speed: 22, z: "z-[50]", rotate: -5 },
  { id: 4, top: "30%", left: "88%", size: "w-8", speed: 28, z: "z-[50]", rotate: 15 },
  { id: 5, top: "18%", left: "35%", size: "w-6", speed: 35, z: "z-20", rotate: -20 },
];

/* ------------------------------------------------------------------ */
/*  Hero Section                                                      */
/* ------------------------------------------------------------------ */

export function HeroSection() {
  const t = useTranslations("hero");
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    setMouse({ x, y });
  }, []);

  const parallaxStyle = (speed: number): React.CSSProperties => ({
    transform: `translate(${mouse.x * speed}px, ${mouse.y * speed}px)`,
    willChange: "transform",
    transition: "transform 0.15s ease-out",
  });

  return (
    <section
      onMouseMove={handleMouseMove}
      className="relative w-full h-screen min-h-[600px] overflow-hidden bg-gradient-to-b from-[#071934] via-[#0a2448] to-[#0c3156] select-none"
    >
      {/* ---- Wave bottom decoration ---- */}
      <WaveBottom />

      {/* ---- Seagulls (back layer z-20 and front layer z-50) ---- */}
      {seagulls.map((g) => (
        <div
          key={g.id}
          className={`absolute ${g.z} pointer-events-none`}
          style={{
            top: g.top,
            left: g.left,
            ...parallaxStyle(g.speed),
          }}
        >
          <SeagullSilhouette
            className={`${g.size} text-white/60`}
            /* rotation is baked into the wrapper via inline style */
          />
        </div>
      ))}

      {/* ---- Catamaran (z-30) ---- */}
      <div
        className="absolute z-30 pointer-events-none right-[5%] md:right-[8%] bottom-[18%] md:bottom-[22%]"
        style={parallaxStyle(10)}
      >
        <CatamaranSilhouette className="w-[280px] sm:w-[360px] md:w-[440px] lg:w-[520px] text-white/70" />
      </div>

      {/* ---- Hero text (z-40 — between catamaran and front seagulls) ---- */}
      <div
        className="absolute z-40 top-1/2 -translate-y-1/2 left-0 w-full px-6 md:px-12 lg:px-20"
        style={parallaxStyle(5)}
      >
        <div className="max-w-4xl">
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6 drop-shadow-lg">
            {t("title")}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/70 max-w-xl mb-10 leading-relaxed">
            {t("subtitle")}
          </p>

          {/* ---- Booking form (z-60) ---- */}
          <div className="relative z-[60]">
            <BookingSearch />
          </div>
        </div>
      </div>
    </section>
  );
}
