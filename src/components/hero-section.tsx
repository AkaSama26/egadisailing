"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { BookingSearch } from "@/components/booking-search";

/* ------------------------------------------------------------------ */
/*  Rotating words animation                                          */
/* ------------------------------------------------------------------ */

const islands = ["Favignana", "Levanzo", "Marettimo"];

function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % islands.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-block relative h-[1.1em] overflow-hidden align-bottom">
      <AnimatePresence mode="wait">
        <motion.span
          key={islands[index]}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="inline-block text-white"
        >
          {islands[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Wave shapes at the bottom                                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Gold waves divider — exported for use between sections            */
/* ------------------------------------------------------------------ */

export function GoldWavesDivider() {
  return (
    <div className="relative w-full z-30 pointer-events-none" style={{ height: 0, marginTop: "-1px" }}>
      <svg
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

export function HeroSection() {
  const t = useTranslations("hero");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
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

    if (video.readyState >= 2) {
      playVideo();
    } else {
      video.addEventListener("loadeddata", playVideo, { once: true });
    }
  }, []);

  return (
    <section className="relative w-full h-screen min-h-[600px] overflow-hidden bg-[#071934] select-none">
      {/* ---- Background video ---- */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/videos/hero-poster.webp"
        className="absolute inset-0 w-full h-full object-cover z-0 scale-105"
        style={{ filter: "blur(1px)" }}
        src="/videos/hero.mp4"
      />

      {/* ---- Subtle overlay — bottom darkens to blend with next section ---- */}
      <div className="absolute inset-0 z-[1]" style={{
        background: "linear-gradient(to bottom, rgba(7,25,52,0.4) 0%, transparent 30%, transparent 60%, rgba(7,25,52,0.85) 90%, #071934 100%)"
      }} />

      {/* ---- Hero content ---- */}
      <div className="absolute z-40 top-[50%] -translate-y-1/2 left-0 w-full px-6 md:px-12 lg:px-20">
        <div className="max-w-4xl">
          {/* H1 with rotating island name */}
          <h1 className="font-heading text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[12rem] font-extrabold text-white leading-[1] mb-8 tracking-tight drop-shadow-lg">
            <RotatingWord />
          </h1>

          <p className="text-xl sm:text-2xl md:text-3xl text-white max-w-2xl mb-12 leading-relaxed font-medium drop-shadow-md">
            {t("subtitle")}
          </p>

          {/* ---- Booking form ---- */}
          <div className="relative z-[60]">
            <BookingSearch />
          </div>
        </div>
      </div>
    </section>
  );
}
