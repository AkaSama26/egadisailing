"use client";

import { useRef, useState } from "react";
import { useScroll, useMotionValueEvent, motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

const islands = [
  {
    key: "favignana",
    name: "Favignana",
    subtitle: "L'Isola Farfalla",
    image: "/images/islands/favignana.webp",
    description: "La più grande delle Egadi, famosa per Cala Rossa e le sue acque turchesi. Conosciuta come la \"Farfalla sul mare\" per la sua forma caratteristica.",
    seoLinks: [
      { label: "Cosa Vedere a Favignana", href: "favignana/cosa-vedere" },
      { label: "Le 5 Calette Più Belle", href: "favignana/calette" },
      { label: "Ex Stabilimento Florio", href: "favignana/stabilimento-florio" },
    ],
    highlights: ["Cala Rossa", "Cala Azzurra", "Lido Burrone", "Ex Stabilimento Florio"],
  },
  {
    key: "levanzo",
    name: "Levanzo",
    subtitle: "L'Isola Selvaggia",
    image: "/images/islands/levanzo.webp",
    description: "La più piccola e selvaggia delle Egadi. Con appena 200 abitanti, Levanzo è un gioiello incontaminato dove il tempo sembra essersi fermato.",
    seoLinks: [
      { label: "Cosa Non Perdersi a Levanzo", href: "levanzo/cosa-vedere" },
      { label: "Grotta del Genovese", href: "levanzo/grotta-del-genovese" },
      { label: "I Fondali per Snorkeling", href: "levanzo/snorkeling" },
    ],
    highlights: ["Grotta del Genovese", "Cala Fredda", "Cala Minnola", "Faraglione"],
  },
  {
    key: "marettimo",
    name: "Marettimo",
    subtitle: "La Perla Incontaminata",
    image: "/images/islands/marettimo.webp",
    description: "La più lontana e incontaminata. Paradiso per trekking e snorkeling, grotte marine spettacolari e natura selvaggia intatta.",
    seoLinks: [
      { label: "Cosa Fare a Marettimo", href: "marettimo/cosa-fare" },
      { label: "Le Grotte Marine", href: "marettimo/grotte" },
      { label: "Trekking e Sentieri", href: "marettimo/trekking" },
    ],
    highlights: ["Grotta del Cammello", "Punta Troia", "Cala Bianca", "Scalo Maestro"],
  },
];

export function IslandsScrollSection({ locale }: { locale: string }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const idx = Math.min(
      Math.floor(latest * islands.length),
      islands.length - 1
    );
    setActiveIndex(idx);
  });

  const active = islands[activeIndex];

  return (
    <div
      ref={sectionRef}
      style={{ height: `${islands.length * 100}vh` }}
    >
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col">
        {/* H1 — top area */}
        <div className="text-center pt-24 pb-6 shrink-0">
          <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold text-white">
            Le Isole Egadi
          </h1>
        </div>

        {/* Two columns */}
        <div className="flex flex-1 min-h-0">
          {/* Left: Image — no card, just the image */}
          <div className="hidden lg:flex w-[50%] items-center justify-center px-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.key}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-3xl aspect-[4/3]"
              >
                <Image
                  src={active.image}
                  alt={active.name}
                  fill
                  className="object-contain mix-blend-lighten"
                  sizes="40vw"
                  priority
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: Content */}
          <div className="w-full lg:w-[50%] flex items-center px-6 md:px-10 lg:px-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-5 max-w-lg"
              >
                <p className="text-[var(--color-gold)] text-xs font-semibold tracking-[3px] uppercase">
                  {active.subtitle}
                </p>

                <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white">
                  {active.name}
                </h2>

                <p className="text-white/60 text-base leading-relaxed">
                  {active.description}
                </p>

                {/* Highlights */}
                <div className="flex flex-wrap gap-3">
                  {active.highlights.map((h) => (
                    <span key={h} className="flex items-center gap-1.5 text-white/40 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-[var(--color-gold)]" />
                      {h}
                    </span>
                  ))}
                </div>

                {/* SEO Links */}
                <div className="space-y-2 pt-2">
                  <p className="text-white/30 text-xs font-semibold uppercase tracking-[3px]">
                    Scopri di più
                  </p>
                  {active.seoLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={`/${locale}/islands/${link.href}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors group"
                    >
                      <span className="text-white text-sm font-medium">{link.label}</span>
                      <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-[var(--color-gold)] transition-colors" />
                    </Link>
                  ))}
                </div>

                {/* CTA */}
                <Link
                  href={`/${locale}/experiences`}
                  className="inline-flex items-center gap-2 text-[var(--color-gold)] font-semibold hover:gap-3 transition-all pt-2"
                >
                  Visita {active.name} con noi <ArrowRight className="h-5 w-5" />
                </Link>

                {/* Scroll indicator */}
                <div className="flex gap-2 pt-4">
                  {islands.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-500 ${
                        i === activeIndex
                          ? "w-8 bg-[var(--color-gold)]"
                          : "w-2 bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
