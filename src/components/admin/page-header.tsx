import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export interface PageHeaderProps {
  /** h1 main title */
  title: string;
  /** Subtitle small text under title */
  subtitle?: string;
  /** Breadcrumb back-link (e.g., /admin/clienti). Render as ChevronLeft + label */
  backHref?: string;
  backLabel?: string;
  /** Right-aligned actions (buttons, links) */
  actions?: ReactNode;
}

/**
 * Page header standardizzato per admin pages. Include breadcrumb opzionale +
 * actions. h1 ha id="main" via skip-link convention (a11y).
 */
export function PageHeader({ title, subtitle, backHref, backLabel, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-2"
          >
            <ChevronLeft className="size-4" />
            {backLabel ?? "Indietro"}
          </Link>
        )}
        <h1 id="main" className="text-3xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
