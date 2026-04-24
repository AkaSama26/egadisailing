import type { ReactNode } from "react";

export interface AdminCardProps {
  children: ReactNode;
  /** Titolo header opzionale (render come h3) */
  title?: string;
  /** Padding interno: default "md" (p-5), "sm" (p-4), "lg" (p-6) */
  padding?: "sm" | "md" | "lg";
  /** Tono colorato per enfasi: warn (amber), alert (red), success (emerald) */
  tone?: "default" | "warn" | "alert" | "success";
  /** Classe extra opzionale */
  className?: string;
}

const PADDING = { sm: "p-4", md: "p-5", lg: "p-6" };
const TONE = {
  default: "border-slate-200",
  warn: "border-amber-200 bg-amber-50",
  alert: "border-red-200 bg-red-50",
  success: "border-emerald-200 bg-emerald-50",
};

/**
 * Card container standard admin. Unifica pattern `bg-white rounded-xl border`
 * duplicato in 30+ luoghi. `tone` colora bordo+sfondo per emphasis.
 */
export function AdminCard({
  children,
  title,
  padding = "md",
  tone = "default",
  className = "",
}: AdminCardProps) {
  const base = tone === "default" ? "bg-white" : "";
  return (
    <div className={`${base} rounded-xl border ${TONE[tone]} ${PADDING[padding]} ${className}`}>
      {title && <h3 className="font-semibold text-slate-900 mb-3">{title}</h3>}
      {children}
    </div>
  );
}
