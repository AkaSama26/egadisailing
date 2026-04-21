"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  CalendarX,
  CalendarDays,
  CheckCircle2,
  Info,
  Lock,
  ExternalLink,
  AlertTriangle,
  X,
} from "lucide-react";
import type { DayCellEnriched } from "@/app/admin/(dashboard)/calendario/enrich";
import {
  manualBlockRange,
  manualReleaseRange,
} from "@/app/admin/(dashboard)/calendario/actions";
import { formatItDay } from "@/lib/dates";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_SOURCE_LABEL,
  AVAILABILITY_STATUS_LABEL,
  labelOrRaw,
} from "@/lib/admin/labels";
import { computeActionState, type ActionState } from "./day-actions-state";

// Re-export for convenience (test helper lives in `day-actions-state.ts` —
// keep split to avoid pulling Next server-actions into vitest transitive graph).
export { computeActionState, type ActionState };

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
  const statusBadgeClass =
    day.status === "BLOCKED"
      ? "bg-red-100 text-red-800 border-red-200"
      : day.status === "PARTIALLY_BOOKED"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-emerald-100 text-emerald-800 border-emerald-200";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-actions-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-200"
      >
        {/* Header con data grande + status badge */}
        <header className="flex items-start justify-between gap-4 p-6 border-b bg-gradient-to-b from-slate-50 to-white">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              <CalendarDays className="size-4" aria-hidden="true" />
              {boatName}
            </div>
            <h2
              id="day-actions-title"
              className="text-2xl font-bold text-slate-900 leading-tight"
            >
              {formatItDay(day.date)}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadgeClass}`}
              >
                {statusLabel}
              </span>
              {day.bookings.length > 0 && (
                <span className="text-xs text-slate-500">
                  {day.bookings.length}{" "}
                  {day.bookings.length === 1 ? "prenotazione" : "prenotazioni"}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Chiudi"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        {/* Body: info full-width top + azioni in grid 2-col */}
        <div className="p-6 space-y-6">
          <InfoSection day={day} />
          <ActionSection boatId={boatId} day={day} />
        </div>

        {/* Footer con close button secondary */}
        <footer className="px-6 py-4 border-t bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
          >
            Chiudi
          </button>
        </footer>
      </div>
    </div>
  );
}

function InfoSection({ day }: { day: DayCellEnriched }) {
  // Admin-block info (indigo) — priorita' alta se presente
  if (day.isAdminBlock && day.adminBlockInfo) {
    return (
      <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 size-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Lock className="size-5 text-indigo-700" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-indigo-900">Blocco manuale admin</h3>
            {day.adminBlockInfo.reason ? (
              <p className="text-sm text-slate-700 mt-1">
                <span className="font-medium">Motivo:</span>{" "}
                {day.adminBlockInfo.reason}
              </p>
            ) : (
              <p className="text-sm text-slate-500 italic mt-1">
                Motivo non disponibile (rimosso per retention)
              </p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Bloccato il {formatItDay(new Date(day.adminBlockInfo.blockedAt))}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Nessuna prenotazione + nessun blocco admin (giorno libero)
  if (day.bookings.length === 0) {
    return (
      <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 size-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="size-5 text-emerald-700" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-900">Giorno libero</h3>
            <p className="text-sm text-emerald-800 mt-0.5">
              Nessuna prenotazione su questa data.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Lista prenotazioni (amber)
  return (
    <section className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-amber-200 bg-amber-100/50">
        <div className="flex-shrink-0 size-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <Info className="size-5 text-amber-700" aria-hidden="true" />
        </div>
        <h3 className="font-semibold text-amber-900">
          {day.bookings.length}{" "}
          {day.bookings.length === 1 ? "prenotazione" : "prenotazioni"} su questa data
        </h3>
      </div>
      <ul className="divide-y divide-amber-200">
        {day.bookings.map((b) => (
          <li key={b.id} className="px-4 py-3 hover:bg-amber-100/30 transition-colors">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-white text-xs font-mono font-semibold border border-amber-200">
                    {labelOrRaw(BOOKING_SOURCE_LABEL, b.source)}
                  </span>
                  <a
                    href={`/admin/prenotazioni/${b.id}`}
                    className="inline-flex items-center gap-1 text-sm font-mono font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    {b.confirmationCode}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                </div>
                <p className="text-sm text-slate-700">
                  {b.serviceName} · {b.customerName}
                </p>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                {labelOrRaw(BOOKING_STATUS_LABEL, b.status)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Sezione azioni: Blocca + Rilascia in grid 2-col side-by-side (lg+) o
 * stacked su mobile. Quick-pick date (oggi, domani, weekend, +7gg) per
 * velocizzare compilazione range.
 */
function ActionSection({ boatId, day }: { boatId: string; day: DayCellEnriched }) {
  const state = computeActionState(day);
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Azioni
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BlockForm boatId={boatId} day={day} state={state} />
        <ReleaseForm boatId={boatId} day={day} state={state} />
      </div>
    </div>
  );
}

/** Quick-pick buttons che aggiornano startDate/endDate via ref all'input.
 *  Usa `data-name-ref` come selector (non `name=` HTML perche' entrambi i
 *  form Blocca/Rilascia usano `name="startDate"` standard per FormData). */
function QuickDatePicks({
  startRef,
  endRef,
  baseDateIso,
  disabled,
}: {
  startRef: string;
  endRef: string;
  baseDateIso: string;
  disabled?: boolean;
}) {
  const setRange = (from: string, to: string) => {
    const fromInput = document.querySelector<HTMLInputElement>(
      `input[data-name-ref="${startRef}"]`,
    );
    const toInput = document.querySelector<HTMLInputElement>(
      `input[data-name-ref="${endRef}"]`,
    );
    if (fromInput) fromInput.value = from;
    if (toInput) toInput.value = to;
  };

  const base = new Date(baseDateIso + "T00:00:00Z");
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => {
    const copy = new Date(d);
    copy.setUTCDate(copy.getUTCDate() + n);
    return copy;
  };

  // Weekend piu' vicino (Sab + Dom). Se base e' lun-ven, prende sabato
  // prossimo. Se base e' sabato o domenica, usa il weekend corrente.
  const dayOfWeek = base.getUTCDay(); // 0=Dom, 6=Sab
  const daysToSaturday = dayOfWeek === 6 ? 0 : dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
  const saturday = addDays(base, daysToSaturday);
  const sunday = addDays(saturday, 1);

  const picks = [
    { label: "Oggi", from: baseDateIso, to: baseDateIso },
    {
      label: "Domani",
      from: toIso(addDays(base, 1)),
      to: toIso(addDays(base, 1)),
    },
    { label: "Weekend", from: toIso(saturday), to: toIso(sunday) },
    {
      label: "Prossimi 7gg",
      from: baseDateIso,
      to: toIso(addDays(base, 6)),
    },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {picks.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => setRange(p.from, p.to)}
          disabled={disabled}
          className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function BlockForm({
  boatId,
  day,
  state,
}: {
  boatId: string;
  day: DayCellEnriched;
  state: ActionState;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await manualBlockRange(
            boatId,
            String(fd.get("startDate")),
            String(fd.get("endDate")),
            String(fd.get("reason") ?? ""),
          );
        } finally {
          setPending(false);
        }
      }}
      className={`rounded-xl border p-5 transition-opacity ${
        state.canBlock
          ? "bg-gradient-to-br from-red-50 to-white border-red-200"
          : "bg-slate-50 border-slate-200 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="size-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
          <CalendarX className="size-5 text-red-700" aria-hidden="true" />
        </div>
        <div>
          <h4 className="font-semibold text-red-900">Blocca range di date</h4>
          <p className="text-xs text-red-700/80">
            Rende lo slot non prenotabile su tutti i canali
          </p>
        </div>
      </div>

      {state.canBlock && (
        <div className="mb-4">
          <div className="text-xs font-medium text-slate-500 mb-2">
            Seleziona rapida:
          </div>
          <QuickDatePicks
            startRef="block-startDate"
            endRef="block-endDate"
            baseDateIso={day.dateIso}
            disabled={!state.canBlock}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Da</span>
          <input
            name="startDate"
            data-name-ref="block-startDate"
            defaultValue={day.dateIso}
            type="date"
            className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-slate-100"
            required
            disabled={!state.canBlock}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">A</span>
          <input
            name="endDate"
            data-name-ref="block-endDate"
            defaultValue={day.dateIso}
            type="date"
            className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-slate-100"
            required
            disabled={!state.canBlock}
          />
        </label>
      </div>

      <label className="block mb-3">
        <span className="text-sm font-medium text-slate-700">Motivo</span>
        <input
          name="reason"
          placeholder="es. manutenzione, ferie, evento privato..."
          maxLength={500}
          className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-slate-100"
          disabled={!state.canBlock}
        />
      </label>

      {state.blockWarning && (
        <div className="flex items-start gap-2 p-3 mb-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertTriangle className="size-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{state.blockWarning}</span>
        </div>
      )}
      {state.blockDisabledReason && !state.canBlock && (
        <div className="flex items-start gap-2 p-3 mb-3 rounded-lg bg-slate-100 text-sm text-slate-600">
          <Info className="size-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{state.blockDisabledReason}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!state.canBlock || pending}
        className="w-full inline-flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
      >
        <CalendarX className="size-4" aria-hidden="true" />
        {pending ? "Blocco in corso..." : "Blocca"}
      </button>
    </form>
  );
}

function ReleaseForm({
  boatId,
  day,
  state,
}: {
  boatId: string;
  day: DayCellEnriched;
  state: ActionState;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await manualReleaseRange(
            boatId,
            String(fd.get("startDate")),
            String(fd.get("endDate")),
          );
        } finally {
          setPending(false);
        }
      }}
      className={`rounded-xl border p-5 transition-opacity ${
        state.canRelease
          ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-200"
          : "bg-slate-50 border-slate-200 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="size-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <CalendarCheck className="size-5 text-emerald-700" aria-hidden="true" />
        </div>
        <div>
          <h4 className="font-semibold text-emerald-900">Rilascia range</h4>
          <p className="text-xs text-emerald-700/80">
            Rende le date di nuovo disponibili su tutti i canali
          </p>
        </div>
      </div>

      {state.canRelease && (
        <div className="mb-4">
          <div className="text-xs font-medium text-slate-500 mb-2">
            Seleziona rapida:
          </div>
          <QuickDatePicks
            startRef="release-startDate"
            endRef="release-endDate"
            baseDateIso={day.dateIso}
            disabled={!state.canRelease}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Da</span>
          <input
            name="startDate"
            data-name-ref="release-startDate"
            defaultValue={day.dateIso}
            type="date"
            className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
            required
            disabled={!state.canRelease}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">A</span>
          <input
            name="endDate"
            data-name-ref="release-endDate"
            defaultValue={day.dateIso}
            type="date"
            className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
            required
            disabled={!state.canRelease}
          />
        </label>
      </div>

      {state.releaseDisabledReason && !state.canRelease && (
        <div className="flex items-start gap-2 p-3 mb-3 rounded-lg bg-slate-100 text-sm text-slate-600">
          <Info className="size-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{state.releaseDisabledReason}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!state.canRelease || pending}
        className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
      >
        <CalendarCheck className="size-4" aria-hidden="true" />
        {pending ? "Rilascio in corso..." : "Rilascia"}
      </button>
    </form>
  );
}
