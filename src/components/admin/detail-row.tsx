import type { ReactNode } from "react";

export interface DetailRowProps {
  label: string;
  value: ReactNode;
  /** Inline = label e value sulla stessa riga (default) */
  variant?: "inline" | "stacked";
}

/**
 * Row label:value per admin detail pages. Unifica pattern
 * `<div><strong>X:</strong> Y</div>` duplicato in clienti/prenotazioni/override.
 *
 * TODO: applicare anche a `admin/clienti/[id]` e `admin/prenotazioni/[id]`
 * (non toccati in questa extraction per scope control).
 */
export function DetailRow({ label, value, variant = "inline" }: DetailRowProps) {
  if (variant === "stacked") {
    return (
      <div>
        <dt className="text-xs font-medium text-slate-500">{label}</dt>
        <dd className="text-sm text-slate-900 mt-0.5">{value}</dd>
      </div>
    );
  }
  return (
    <div className="text-sm">
      <span className="font-medium text-slate-700">{label}:</span>{" "}
      <span className="text-slate-900">{value}</span>
    </div>
  );
}
