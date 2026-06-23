import { type CSSProperties, type ReactNode } from "react";

type AnimationType = "fade-up" | "fade-left" | "fade-right" | "zoom" | "none";

interface ScrollSectionProps {
  children: ReactNode;
  animation?: AnimationType;
  delay?: number;
  className?: string;
}

export function ScrollSection({
  children,
  animation = "fade-up",
  delay = 0,
  className,
}: ScrollSectionProps) {
  const style = delay
    ? ({ "--scroll-section-delay": `${delay}s` } as CSSProperties)
    : undefined;

  return (
    <div className={className} data-scroll-animation={animation} style={style}>
      {children}
    </div>
  );
}
