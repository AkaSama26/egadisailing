"use client";

import { useEffect } from "react";

/**
 * Error boundary admin dashboard — mostra un messaggio user-friendly invece
 * del 500 generico Next.js. Log client-side per correlazione.
 * Round 10 UX-C3.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] page error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md bg-white border border-red-200 rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-red-800">
          Si è verificato un errore
        </h2>
        <p className="text-sm text-slate-700">
          L'operazione non è andata a buon fine. Se il problema persiste,
          contatta il team tech indicando l'ID di correlazione.
        </p>
        {/* R26-A1-M2: NON mostrare `error.message` raw — Prisma errors
            leak schema interno (es. "Unique constraint failed on stripePaymentIntentId").
            Solo digest per correlazione log lato admin support. */}
        {error.digest && (
          <div className="rounded bg-slate-50 border text-xs font-mono p-3">
            <p className="text-slate-500">
              <strong>ID correlazione:</strong> {error.digest}
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => reset()}
            className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            Riprova
          </button>
          <a
            href="/admin"
            className="bg-white border rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Torna alla dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
