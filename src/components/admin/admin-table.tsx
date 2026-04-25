import type { ReactNode } from "react";
import { EmptyState } from "./empty-state";

export interface AdminTableColumn<T> {
  /** Header label (also caption-friendly). */
  label: string;
  /** Render function — return td content (or full td if needed). */
  render: (row: T) => ReactNode;
  /** Optional column align */
  align?: "left" | "right" | "center";
  /** Optional CSS class for td */
  className?: string;
}

export interface AdminTableProps<T> {
  /** sr-only caption per accessibility (WCAG 1.3.1) */
  caption: string;
  columns: AdminTableColumn<T>[];
  rows: T[];
  /** Empty state message */
  emptyMessage: string;
  /** Optional row key extractor */
  rowKey?: (row: T) => string;
}

/**
 * Tabella admin con caption sr-only + scope="col" enforcement (WCAG 1.3.1).
 */
export function AdminTable<T>({ caption, columns, rows, emptyMessage, rowKey }: AdminTableProps<T>) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          {columns.map((col, i) => (
            <th
              key={i}
              scope="col"
              className={`px-3 py-2 font-medium text-slate-700 text-${col.align ?? "left"}`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <EmptyState message={emptyMessage} colSpan={columns.length} />
        ) : (
          rows.map((row, i) => (
            <tr key={rowKey ? rowKey(row) : i} className="border-b border-slate-100 hover:bg-slate-50">
              {columns.map((col, j) => (
                <td key={j} className={`px-3 py-2 text-${col.align ?? "left"} ${col.className ?? ""}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
