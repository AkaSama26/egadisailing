"use client";

import { useEffect, useRef } from "react";
import type { DayCellEnriched } from "@/app/admin/(dashboard)/calendario/enrich";
import { formatItDay } from "@/lib/dates";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_SOURCE_LABEL,
  AVAILABILITY_STATUS_LABEL,
  labelOrRaw,
} from "@/lib/admin/labels";

export interface DayActionsModalProps {
  boatId: string;
  boatName: string;
  day: DayCellEnriched;
  onClose: () => void;
}

export function DayActionsModal({ boatId, boatName, day, onClose }: DayActionsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // R29-calendar: Escape closes (WCAG 2.1.1).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Focus trap minimale: focus primo elemento interattivo on mount, ritorna
  // focus a cell id on unmount.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const firstInput = dialog.querySelector<HTMLElement>(
      "input, button:not([disabled]), a, [tabindex]:not([tabindex='-1'])",
    );
    firstInput?.focus();

    return () => {
      const cell = document.getElementById(`cell-${boatId}-${day.dateIso}`);
      cell?.focus();
    };
  }, [boatId, day.dateIso]);

  const statusLabel = labelOrRaw(AVAILABILITY_STATUS_LABEL, day.status);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-actions-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <header className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 id="day-actions-title" className="font-bold text-slate-900">
              {formatItDay(day.date)}
            </h2>
            <p className="text-xs text-slate-500">
              {boatName} · {statusLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-slate-100"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </header>
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-500">Modal in costruzione — task 3.2.</p>
        </div>
      </div>
    </div>
  );
}
