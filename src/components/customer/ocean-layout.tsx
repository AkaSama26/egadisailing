import type { ReactNode } from "react";

export interface OceanLayoutProps {
  children: ReactNode;
  /** Vertical padding: default "lg" (py-24), "md" (py-16), "sm" (py-8). */
  padding?: "sm" | "md" | "lg";
}

const PADDING_Y = { sm: "py-8", md: "py-16", lg: "py-24" } as const;

/**
 * Layout customer-facing standardizzato — gradient ocean (deep navy → ocean blue).
 * Usato in success page, recupera-prenotazione, b/sessione, prenota wizard root.
 *
 * NOTA: distinto da `AdminCard` parent (admin uses bg-slate-50). Customer
 * pages hanno theme dark gradient + light cards above.
 */
export function OceanLayout({ children, padding = "lg" }: OceanLayoutProps) {
  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-[#071934] to-[#0c3d5e] ${PADDING_Y[padding]} px-4`}
    >
      {children}
    </div>
  );
}
