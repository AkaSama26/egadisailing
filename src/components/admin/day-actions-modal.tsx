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
          {day.isAdminBlock && day.adminBlockInfo && (
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded text-sm">
              <div className="font-semibold text-indigo-900">Blocco manuale admin</div>
              {day.adminBlockInfo.reason ? (
                <div className="text-slate-700 mt-1">Motivo: {day.adminBlockInfo.reason}</div>
              ) : (
                <div className="text-slate-500 mt-1 italic">
                  Motivo non disponibile (rimosso per retention)
                </div>
              )}
              <div className="text-xs text-slate-500 mt-1">
                Bloccato il {formatItDay(new Date(day.adminBlockInfo.blockedAt))}
              </div>
            </div>
          )}

          {day.bookings.length === 0 && !day.isAdminBlock && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-sm text-emerald-800">
              ✓ Nessuna prenotazione su questa data
            </div>
          )}

          {day.bookings.length > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded text-sm">
              <div className="font-semibold text-amber-900 mb-2">
                {day.bookings.length}{" "}
                {day.bookings.length === 1 ? "prenotazione" : "prenotazioni"} su questa data
              </div>
              <ul className="space-y-1">
                {day.bookings.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded bg-white font-mono">
                      {labelOrRaw(BOOKING_SOURCE_LABEL, b.source)}
                    </span>
                    <a
                      href={`/admin/prenotazioni/${b.id}`}
                      className="font-mono font-semibold text-blue-700 underline hover:no-underline"
                    >
                      {b.confirmationCode}
                    </a>
                    <span className="text-slate-600">
                      · {b.serviceName} · {b.customerName} ·{" "}
                      {labelOrRaw(BOOKING_STATUS_LABEL, b.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
