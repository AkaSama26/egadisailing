"use client";

import Image from "next/image";

const islandShapes = [
  {
    name: "Favignana",
    src: "/images/islands/favignana.svg",
    width: 1371,
    height: 765,
    className: "left-[8%] top-[56%] h-[34%] w-[84%] sm:left-[13%] sm:top-[52%] sm:h-[38%] sm:w-[74%] lg:left-[18%] lg:top-[48%] lg:h-[40%] lg:w-[64%]",
  },
  {
    name: "Levanzo",
    src: "/images/islands/levanzo.svg",
    width: 1185,
    height: 885,
    className: "left-[58%] top-[4%] h-[34%] w-[39%] sm:left-[61%] sm:top-[3%] sm:h-[35%] sm:w-[36%] lg:left-[65%] lg:top-[2%] lg:h-[36%] lg:w-[31%]",
  },
  {
    name: "Marettimo",
    src: "/images/islands/marettimo.svg",
    width: 1371,
    height: 765,
    className: "left-[3%] top-[12%] h-[32%] w-[42%] sm:left-[5%] sm:top-[10%] sm:h-[34%] sm:w-[38%] lg:left-[7%] lg:top-[8%] lg:h-[36%] lg:w-[34%]",
  },
];

export function RouteMap() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* ── Glow behind island shapes ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          className="aspect-[16/9] w-[80%] rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(14,165,233,0.2) 0%, rgba(14,165,233,0.08) 40%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* ── Individual island SVGs ── */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {islandShapes.map((island) => (
          <div key={island.name} className={`absolute ${island.className}`} aria-hidden="true">
            <Image
              src={island.src}
              alt=""
              width={island.width}
              height={island.height}
              className="h-full w-full object-contain opacity-95 drop-shadow-[0_20px_42px_rgba(0,0,0,0.22)]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
