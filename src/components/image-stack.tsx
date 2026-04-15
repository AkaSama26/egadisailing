"use client";

import { useState, useRef } from "react";
import { motion, type PanInfo } from "framer-motion";

interface Card {
  id: number;
  color: string;
  caption: string;
  zIndex: number;
}

interface ImageStackProps {
  images: { color: string; caption: string }[];
  className?: string;
}

export function ImageStack({ images, className }: ImageStackProps) {
  const [cards, setCards] = useState<Card[]>(
    images.map((img, index) => ({
      id: index,
      color: img.color,
      caption: img.caption,
      zIndex: 50 - index * 10,
    }))
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const minDragDistance = 50;

  const getCardStyles = (index: number) => ({
    x: index * -12,
    y: index * -8,
    rotate: index === 0 ? 0 : -(2 + index * 3),
    scale: 1,
    transition: { duration: 0.5 },
  });

  const handleDragStart = (_: unknown, info: PanInfo) => {
    dragStartPos.current = { x: info.point.x, y: info.point.y };
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const dragDistance = Math.sqrt(
      Math.pow(info.point.x - dragStartPos.current.x, 2) +
        Math.pow(info.point.y - dragStartPos.current.y, 2)
    );

    if (isAnimating || dragDistance < minDragDistance) return;

    setIsAnimating(true);
    setCards((prev) => {
      const next = [...prev];
      const card = next.shift()!;
      next.push(card);
      return next.map((c, i) => ({ ...c, zIndex: 50 - i * 10 }));
    });

    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className={`relative flex items-center justify-center ${className || "w-80 h-96"}`}>
      {cards.map((card, index) => {
        const isTop = index === 0;
        const styles = getCardStyles(index);

        return (
          <motion.div
            key={card.id}
            className="absolute w-[75%] origin-bottom-center overflow-hidden rounded-xl shadow-xl bg-white cursor-grab active:cursor-grabbing border border-gray-100"
            style={{ zIndex: card.zIndex, aspectRatio: "1/1" }}
            animate={styles}
            drag={isTop && !isAnimating}
            dragElastic={0.2}
            dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
            dragSnapToOrigin
            dragTransition={{ bounceStiffness: 600, bounceDamping: 10 }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            whileHover={isTop ? { scale: 1.05, transition: { duration: 0.2 } } : {}}
            whileDrag={{
              scale: 1.1,
              rotate: 0,
              zIndex: 100,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              transition: { duration: 0.1 },
            }}
          >
            {/* Placeholder color — replace with Image when photos are ready */}
            <div
              className="w-full h-full"
              style={{ backgroundColor: card.color }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-white px-4 py-3">
              <p
                className="text-sm md:text-base text-gray-600 text-center"
                style={{ fontFamily: "var(--font-handwriting), cursive" }}
              >
                {card.caption}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
