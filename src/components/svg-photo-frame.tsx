import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SvgPhotoFrameProps {
  children: ReactNode;
  className?: string;
  frameClassName?: string;
  imageClassName?: string;
}

export function SvgPhotoFrame({
  children,
  className,
  frameClassName,
  imageClassName,
}: SvgPhotoFrameProps) {
  return (
    <div className={cn("relative isolate max-w-full", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg bg-white/90 p-3 shadow-xl",
          frameClassName,
        )}
      >
        <div className={cn("relative aspect-[4/3] overflow-hidden rounded-md", imageClassName)}>
          {children}
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 400 300"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <path
            d="M29 29 C92 21 150 27 206 22 C268 17 320 20 371 29 L376 270 C314 279 252 274 196 278 C132 283 78 276 29 270 Z"
            fill="none"
            stroke="rgba(212,175,55,0.74)"
            strokeLinejoin="round"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M35 48 L35 29 L58 29 M342 29 L371 29 L371 53 M371 247 L371 271 L343 271 M58 271 L29 271 L29 247"
            fill="none"
            stroke="rgba(212,175,55,0.9)"
            strokeLinecap="round"
            strokeWidth="5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}
