"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

type AnimationType = "fade-up" | "fade-left" | "fade-right" | "zoom" | "none";

interface ScrollSectionProps {
  children: ReactNode;
  animation?: AnimationType;
  delay?: number;
  className?: string;
}

const animations: Record<
  AnimationType,
  { initial: Record<string, number>; whileInView: Record<string, number> }
> = {
  "fade-up": {
    initial: { opacity: 0, y: 60 },
    whileInView: { opacity: 1, y: 0 },
  },
  "fade-left": {
    initial: { opacity: 0, x: -60 },
    whileInView: { opacity: 1, x: 0 },
  },
  "fade-right": {
    initial: { opacity: 0, x: 60 },
    whileInView: { opacity: 1, x: 0 },
  },
  zoom: {
    initial: { opacity: 0, scale: 0.9 },
    whileInView: { opacity: 1, scale: 1 },
  },
  none: {
    initial: {},
    whileInView: {},
  },
};

export function ScrollSection({
  children,
  animation = "fade-up",
  delay = 0,
  className,
}: ScrollSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const selectedAnimation = animations[animation];

  return (
    <motion.div
      initial={shouldReduceMotion ? false : selectedAnimation.initial}
      whileInView={shouldReduceMotion ? undefined : selectedAnimation.whileInView}
      viewport={{ once: true, margin: "-100px" }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
