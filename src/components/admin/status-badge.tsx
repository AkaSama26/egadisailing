import { Check, X, Clock, AlertTriangle, AlertCircle, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type StatusKind = "booking" | "override" | "availability" | "sync" | "payment";

export interface StatusBadgeProps {
  status: string;
  kind: StatusKind;
}

interface BadgeStyle {
  label: string;
  bg: string;
  text: string;
  icon: LucideIcon;
}

const STYLES: Record<StatusKind, Record<string, BadgeStyle>> = {
  booking: {
    PENDING: { label: "In attesa", bg: "bg-amber-100", text: "text-amber-900", icon: Clock },
    CONFIRMED: { label: "Confermata", bg: "bg-emerald-100", text: "text-emerald-900", icon: Check },
    CANCELLED: { label: "Cancellata", bg: "bg-red-100", text: "text-red-900", icon: X },
    REFUNDED: { label: "Rimborsata", bg: "bg-slate-100", text: "text-slate-700", icon: X },
  },
  override: {
    PENDING: { label: "In attesa", bg: "bg-amber-100", text: "text-amber-900", icon: Clock },
    APPROVED: { label: "Approvata", bg: "bg-emerald-100", text: "text-emerald-900", icon: Check },
    REJECTED: { label: "Rifiutata", bg: "bg-red-100", text: "text-red-900", icon: X },
    EXPIRED: { label: "Scaduta", bg: "bg-slate-100", text: "text-slate-700", icon: Clock },
    PENDING_RECONCILE_FAILED: { label: "Reconcile failed", bg: "bg-red-100", text: "text-red-900", icon: AlertCircle },
  },
  availability: {
    AVAILABLE: { label: "Libera", bg: "bg-emerald-100", text: "text-emerald-900", icon: Check },
    BLOCKED: { label: "Bloccata", bg: "bg-red-100", text: "text-red-900", icon: X },
    PARTIALLY_BOOKED: { label: "Parziale", bg: "bg-amber-100", text: "text-amber-900", icon: Loader2 },
  },
  sync: {
    GREEN: { label: "OK", bg: "bg-emerald-100", text: "text-emerald-900", icon: Check },
    YELLOW: { label: "Warning", bg: "bg-amber-100", text: "text-amber-900", icon: AlertTriangle },
    RED: { label: "Errore", bg: "bg-red-100", text: "text-red-900", icon: AlertCircle },
  },
  payment: {
    PENDING: { label: "In attesa", bg: "bg-amber-100", text: "text-amber-900", icon: Clock },
    SUCCEEDED: { label: "Successo", bg: "bg-emerald-100", text: "text-emerald-900", icon: Check },
    FAILED: { label: "Fallito", bg: "bg-red-100", text: "text-red-900", icon: AlertCircle },
    REFUNDED: { label: "Rimborsato", bg: "bg-slate-100", text: "text-slate-700", icon: X },
  },
};

/**
 * Status badge unificato con icona Lucide (WCAG 1.4.1 — non solo colore).
 * Drop-in replacement per inline ternary blocks.
 */
export function StatusBadge({ status, kind }: StatusBadgeProps) {
  const style = STYLES[kind][status] ?? {
    label: status,
    bg: "bg-slate-100",
    text: "text-slate-700",
    icon: AlertCircle,
  };
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span>{style.label}</span>
    </span>
  );
}
