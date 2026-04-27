"use client";

import { Printer } from "lucide-react";

export function PrintTicketButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      Stampa
    </button>
  );
}
