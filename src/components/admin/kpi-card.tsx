import type { LucideIcon } from "lucide-react";

export interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "warn" | "alert";
}

/**
 * Card metrica per dashboard admin. `tone` colora il bordo/sfondo per
 * enfatizzare saldi pendenti / sync RED.
 */
export function KpiCard({ label, value, icon: Icon, hint, tone = "default" }: KpiCardProps) {
  const border =
    tone === "alert"
      ? "border-red-200"
      : tone === "warn"
        ? "border-amber-200"
        : "border-slate-200";
  return (
    <div className={`bg-white rounded-xl border ${border} p-5`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500">{label}</span>
        <Icon className="size-5 text-slate-400" />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
