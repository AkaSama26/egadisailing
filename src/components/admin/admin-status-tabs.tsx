import Link from "next/link";

export interface AdminStatusTab {
  value: string;
  label: string;
  /** Optional count badge (es. "23") */
  count?: number;
}

export interface AdminStatusTabsProps {
  /** Base href, e.g., "/admin/override-requests" — aggiunge `?status=value` */
  baseHref?: string;
  /** Nome del query param (default "status") */
  paramName?: string;
  tabs: AdminStatusTab[];
  active: string;
}

/**
 * Tabs di filtro per liste admin — links SSR-driven con query param.
 * Visual border-bottom pattern (stile "tabs" classico). Per pattern "pills"
 * vedi `<AdminFilterChip>` (non ancora estratto).
 *
 * A11y: `aria-current="page"` su tab attivo (non usa role="tab" perche'
 * SSR link non e' un vero tablist WAI-ARIA).
 */
export function AdminStatusTabs({
  baseHref = "",
  paramName = "status",
  tabs,
  active,
}: AdminStatusTabsProps) {
  return (
    <nav className="flex gap-4 border-b border-slate-200" aria-label="Filtri stato">
      {tabs.map((t) => {
        const isActive = t.value === active;
        const href = baseHref ? `${baseHref}?${paramName}=${t.value}` : `?${paramName}=${t.value}`;
        return (
          <Link
            key={t.value}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`pb-2 px-2 text-sm ${
              isActive
                ? "border-b-2 border-sky-600 text-sky-700 font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className="ml-1.5 text-xs text-slate-500">({t.count})</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
