import type { ReactNode } from "react";

export type AdminAlertVariant = "info" | "success" | "warn" | "error";

export interface AdminAlertProps {
  children: ReactNode;
  variant?: AdminAlertVariant;
  /** `alert` per severity error/warn, `status` per info/success (a11y default sensato) */
  role?: "alert" | "status";
  className?: string;
}

const VARIANT_CLS: Record<AdminAlertVariant, string> = {
  info: "bg-sky-50 text-sky-800 border-sky-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warn: "bg-amber-50 text-amber-800 border-amber-200",
  error: "bg-red-50 text-red-800 border-red-200",
};

/**
 * Alert/status message unificato. Fix a11y: `role="status"` default
 * `aria-live="polite"` per info/success; `role="alert"` default
 * `aria-live="assertive"` per warn/error. Padding + border + color
 * uniforme vs 8+ inline `<div>` duplicati.
 */
export function AdminAlert({
  children,
  variant = "info",
  role,
  className = "",
}: AdminAlertProps) {
  const resolvedRole: "alert" | "status" = role ?? (variant === "error" || variant === "warn" ? "alert" : "status");
  const ariaLive = resolvedRole === "alert" ? "assertive" : "polite";
  return (
    <div
      role={resolvedRole}
      aria-live={ariaLive}
      className={`text-sm p-3 rounded border ${VARIANT_CLS[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
