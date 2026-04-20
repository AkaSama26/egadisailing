"use client";

import { useEffect } from "react";

/**
 * Error boundary pubblico — mostra messaggio user-friendly IT invece del
 * 500 default Next.js (inglese, pagina nera). Log client-side per
 * correlazione. R21-A2-MEDIA-3.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[public] page error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-12">
      <div className="max-w-lg bg-white border border-red-200 rounded-2xl p-8 space-y-4 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">
          Qualcosa e' andato storto
        </h2>
        <p className="text-sm text-slate-700">
          Si e' verificato un problema tecnico momentaneo. Riprova tra qualche
          istante oppure scrivici a{" "}
          <a
            href="mailto:info@egadisailing.com"
            className="text-[#d97706] underline"
          >
            info@egadisailing.com
          </a>{" "}
          indicando l&apos;ID di correlazione qui sotto.
        </p>
        {error.digest && (
          <div className="rounded bg-slate-50 border text-xs font-mono p-3">
            <span className="text-slate-500">ID errore:</span>{" "}
            <strong className="text-slate-800">{error.digest}</strong>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => reset()}
            className="bg-[#d97706] text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-[#b45309]"
          >
            Riprova
          </button>
          <a
            href="/"
            className="bg-white border border-slate-300 text-slate-900 rounded-full px-5 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
