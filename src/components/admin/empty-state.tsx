import type { ReactNode } from "react";

export interface EmptyStateProps {
  message: string;
  /** Per uso dentro tabelle: usa <td colSpan={N}> */
  colSpan?: number;
  icon?: ReactNode;
}

/**
 * Empty state messaggio "Nessuna X trovata" condiviso. Due rendering:
 * - Default: <p> centrato per liste/sections
 * - Con `colSpan`: <td colSpan> per usare dentro <table><tbody>
 */
export function EmptyState({ message, colSpan, icon }: EmptyStateProps) {
  if (typeof colSpan === "number") {
    return (
      <tr>
        <td colSpan={colSpan} className="p-8 text-center text-sm text-slate-500">
          {icon && <span className="mr-2">{icon}</span>}
          {message}
        </td>
      </tr>
    );
  }
  return (
    <p className="text-sm text-slate-500 text-center py-4">
      {icon && <span className="mr-2">{icon}</span>}
      {message}
    </p>
  );
}
