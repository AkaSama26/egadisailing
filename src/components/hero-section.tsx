"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { BookingSearch } from "@/components/booking-search";

/* ------------------------------------------------------------------ */
/*  Seagull SVG variants — diverse styles                             */
/* ------------------------------------------------------------------ */

function Seagull1({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M2 18 Q10 2 20 8 Q25 10 28 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 12 Q35 10 40 8 Q50 2 58 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 12 Q30 14 32 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Seagull2({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 50 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M1 16 Q8 4 16 7 Q20 9 24 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 10 Q30 9 34 7 Q42 4 49 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Seagull3({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 70 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 22 Q12 3 24 10 Q30 13 34 14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 14 Q40 13 46 10 Q58 3 67 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M34 14 Q35 16 36 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Seagull4({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M1 14 Q7 3 14 6 Q18 8 21 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M23 9 Q26 8 30 6 Q37 3 43 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Seagull5({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 30" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M4 24 Q16 2 30 12 Q36 15 39 16" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M41 16 Q44 15 50 12 Q64 2 76 24" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M39 16 Q40 18 41 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

const SeagullComponents = [Seagull1, Seagull2, Seagull3, Seagull4, Seagull5];

/* ------------------------------------------------------------------ */
/*  Glow effect behind the trimaran                                   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Wave shapes at the bottom                                         */
/* ------------------------------------------------------------------ */

function WaveBottom() {
  return (
    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-20">
      <svg
        viewBox="0 0 1440 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        preserveAspectRatio="none"
      >
        <path
          d="M0 65 Q120 30 280 50 Q440 70 600 45 Q760 20 920 48 Q1080 76 1240 40 Q1360 20 1440 35"
          stroke="url(#gold1)"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M0 75 Q160 45 340 62 Q520 80 700 52 Q880 25 1060 55 Q1200 75 1440 50"
          stroke="url(#gold2)"
          strokeWidth="0.8"
          fill="none"
        />
        <path
          d="M0 85 Q200 60 400 72 Q600 85 800 58 Q1000 32 1200 60 Q1350 78 1440 65"
          stroke="url(#gold3)"
          strokeWidth="0.5"
          fill="none"
        />
        <defs>
          <linearGradient id="gold1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
            <stop offset="20%" stopColor="#d97706" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="80%" stopColor="#d97706" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gold2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.15" />
            <stop offset="60%" stopColor="#d97706" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gold3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
            <stop offset="40%" stopColor="#d97706" stopOpacity="0.1" />
            <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Seagull positions — varied sizes, rotations, z-layers             */
/* ------------------------------------------------------------------ */

const seagulls = [
  // Far back layer (behind trimaran) — z-20
  { id: 1, top: "10%", left: "58%", size: "w-10", speed: 18, z: "z-20", rotate: -8, opacity: "text-white/30", variant: 0 },
  { id: 2, top: "25%", left: "72%", size: "w-7", speed: 25, z: "z-20", rotate: 12, opacity: "text-white/25", variant: 3 },
  { id: 3, top: "6%", left: "80%", size: "w-12", speed: 15, z: "z-20", rotate: -15, opacity: "text-white/20", variant: 1 },
  { id: 4, top: "35%", left: "55%", size: "w-5", speed: 30, z: "z-20", rotate: 20, opacity: "text-white/20", variant: 3 },

  // Mid layer (same z as trimaran edges) — z-30
  { id: 5, top: "15%", left: "48%", size: "w-9", speed: 22, z: "z-30", rotate: -5, opacity: "text-white/40", variant: 2 },
  { id: 6, top: "5%", left: "65%", size: "w-14", speed: 12, z: "z-30", rotate: 6, opacity: "text-white/45", variant: 4 },

  // Front layer (in front of trimaran) — z-50
  { id: 7, top: "8%", left: "40%", size: "w-11", speed: 20, z: "z-[50]", rotate: -10, opacity: "text-white/60", variant: 0 },
  { id: 8, top: "20%", left: "90%", size: "w-8", speed: 28, z: "z-[50]", rotate: 18, opacity: "text-white/55", variant: 2 },
  { id: 9, top: "3%", left: "52%", size: "w-6", speed: 35, z: "z-[50]", rotate: -22, opacity: "text-white/50", variant: 1 },
  { id: 10, top: "28%", left: "85%", size: "w-13", speed: 16, z: "z-[50]", rotate: 3, opacity: "text-white/65", variant: 4 },

  // Very front — big, close, blurred feel — z-[60] (in front of text too)
  { id: 11, top: "12%", left: "30%", size: "w-16", speed: 10, z: "z-[55]", rotate: -3, opacity: "text-white/15", variant: 4 },
  { id: 12, top: "38%", left: "92%", size: "w-20", speed: 8, z: "z-[55]", rotate: 7, opacity: "text-white/10", variant: 2 },
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

      {/* ---- Seagulls — diverse, layered, parallax on mouse ---- */}
      {seagulls.map((g) => {
        const SeagullSvg = SeagullComponents[g.variant];
        return (
          <div
            key={g.id}
            className={`absolute ${g.z} pointer-events-none`}
            style={{
              top: g.top,
              left: g.left,
              transform: `translate(${mouse.x * g.speed}px, ${mouse.y * g.speed}px) rotate(${g.rotate}deg)`,
              willChange: "transform",
              transition: "transform 0.15s ease-out",
            }}
          >
            <SeagullSvg className={`${g.size} ${g.opacity}`} />
          </div>
        );
      })}

      {/* ---- Soft glow behind trimaran (z-25, no parallax) ---- */}
      <div
        className="absolute z-[25] pointer-events-none right-[2%] md:right-[6%] bottom-[8%] md:bottom-[12%] w-[380px] sm:w-[480px] md:w-[600px] lg:w-[720px] aspect-square rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(14,165,233,0.18) 0%, rgba(14,165,233,0.08) 40%, transparent 70%)",
        }}
      />

      {/* ---- Trimaran image (z-35, no parallax — stays fixed) ---- */}
      <div className="absolute z-[35] pointer-events-none right-[-12%] md:right-[-8%] bottom-[4%] md:bottom-[6%]">
        <Image
          src="/images/trimarano.webp"
          alt="Trimarano Egadisailing"
          width={2752}
          height={1536}
          className="w-[600px] sm:w-[800px] md:w-[1100px] lg:w-[1400px] h-auto drop-shadow-2xl"
          priority
        />
      </div>

      {/* ---- Hero text (z-40 — intersects between layers, overflows right) ---- */}
      <div className="absolute z-40 top-[50%] -translate-y-1/2 left-0 w-full px-6 md:px-12 lg:px-20">
        <div className="max-w-none">
          <h1 className="font-heading text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] text-white leading-[0.95] mb-8 tracking-tight drop-shadow-lg italic" style={{ maxWidth: "90vw" }}>
            {t("title")}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/50 max-w-lg mb-10 leading-relaxed font-light tracking-wide">
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
