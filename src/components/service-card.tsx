"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Placeholder polaroid colors per service type                      */
/* ------------------------------------------------------------------ */

const servicePolaroids: Record<string, { caption: string; color: string }[]> = {
  SOCIAL_BOATING: [
    { caption: "Cala Rossa", color: "#87CEEB" },
    { caption: "Pranzo a bordo", color: "#F5DEB3" },
    { caption: "Snorkeling", color: "#90EE90" },
  ],
  EXCLUSIVE_EXPERIENCE: [
    { caption: "Chef a bordo", color: "#FFB6C1" },
    { caption: "Tramonto", color: "#FFDAB9" },
    { caption: "Luxury", color: "#DDA0DD" },
  ],
  CABIN_CHARTER: [
    { caption: "La cabina", color: "#ADD8E6" },
    { caption: "Marettimo", color: "#B2DFDB" },
    { caption: "Una settimana", color: "#C5CAE9" },
  ],
  BOAT_SHARED: [
    { caption: "Acque cristalline", color: "#B2EBF2" },
    { caption: "Grotta", color: "#87CEEB" },
    { caption: "Tuffo!", color: "#C8E6C9" },
  ],
  BOAT_EXCLUSIVE: [
    { caption: "Barca esclusiva", color: "#E1BEE7" },
    { caption: "Levanzo", color: "#BBDEFB" },
    { caption: "Relax", color: "#F8BBD0" },
  ],
};

/* Polaroid positions: [x, y, rotation] for each photo on hover */
const polaroidTransforms = [
  { x: -30, y: -90, rotate: -12 },
  { x: 60, y: -110, rotate: 6 },
  { x: 140, y: -80, rotate: 18 },
];

/* ------------------------------------------------------------------ */
/*  Service Card with Polaroid hover                                  */
/* ------------------------------------------------------------------ */

interface ServiceCardProps {
  title: string;
  description: string;
  priceFrom?: string;
  href: string;
  icon?: React.ReactNode;
  serviceType?: string;
}

export function ServiceCard({
  title,
  description,
  priceFrom,
  href,
  icon,
  serviceType,
}: ServiceCardProps) {
  const [hovered, setHovered] = useState(false);
  const polaroids = servicePolaroids[serviceType || "SOCIAL_BOATING"] || servicePolaroids.SOCIAL_BOATING;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Polaroid photos */}
      {polaroids.map((p, i) => {
        const t = polaroidTransforms[i];
        return (
          <div
            key={i}
            className="absolute z-30 pointer-events-none"
            style={{
              top: 0,
              right: 0,
              transform: hovered
                ? `translate(${t.x}px, ${t.y}px) rotate(${t.rotate}deg) scale(1)`
                : `translate(0px, 0px) rotate(0deg) scale(0.5)`,
              opacity: hovered ? 1 : 0,
              transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.08}s`,
            }}
          >
            <div className="bg-white p-2 pb-8 shadow-2xl" style={{ width: 120 }}>
              <div
                className="w-full h-20 rounded-sm"
                style={{ backgroundColor: p.color }}
              />
              <p className="text-[10px] text-gray-500 mt-2 text-center font-medium">
                {p.caption}
              </p>
            </div>
          </div>
        );
      })}

      {/* Main card */}
      <Link href={href}>
        <Card
          className={`relative h-full transition-all duration-300 border-none bg-white/80 backdrop-blur z-20 ${
            hovered ? "shadow-xl -translate-y-1" : ""
          }`}
        >
          <CardContent className="p-6 space-y-4">
            {icon && (
              <div className="text-[var(--color-turquoise)]">{icon}</div>
            )}
            <h3 className="font-heading text-xl font-bold">{title}</h3>
            <p className="text-muted-foreground text-sm">{description}</p>
            {priceFrom && (
              <p className="text-sm font-semibold text-[var(--color-gold)]">
                {priceFrom}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
