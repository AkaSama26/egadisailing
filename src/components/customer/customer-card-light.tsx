import type { ReactNode } from "react";

export interface CustomerCardLightProps {
  children: ReactNode;
  /** Padding internal: default "lg" (p-10), "md" (p-8), "sm" (p-6). */
  padding?: "sm" | "md" | "lg";
  /** Allineamento testo: default "center". */
  align?: "center" | "left";
  className?: string;
}

const PADDING = { sm: "p-6", md: "p-8", lg: "p-10" } as const;
const ALIGN = { center: "text-center", left: "text-left" } as const;

/**
 * Card bianca su gradient ocean — customer-facing standard.
 * Usata in success/[code], recupera-prenotazione, b/sessione, wizard root.
 *
 * Distinta da `AdminCard` (admin theme): shadow piu' profonda, padding piu'
 * grande, no border, rounded-2xl invece di rounded-xl.
 */
export function CustomerCardLight({
  children,
  padding = "lg",
  align = "center",
  className = "",
}: CustomerCardLightProps) {
  return (
    <div
      className={`max-w-md mx-auto bg-white rounded-2xl shadow-2xl ${PADDING[padding]} ${ALIGN[align]} space-y-5 ${className}`}
    >
      {children}
    </div>
  );
}
