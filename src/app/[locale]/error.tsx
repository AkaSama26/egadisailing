"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { PUBLIC_CONTACT_EMAIL, getEmailHref } from "@/lib/public-contact";
import { localizedStaticPath } from "@/lib/i18n/static-paths";

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
  const locale = useLocale();
  const copy =
    locale === "es"
      ? {
          title: "Algo ha salido mal",
          body:
            "Se ha producido un problema técnico momentáneo. Inténtalo de nuevo dentro de unos instantes o escríbenos a",
          digestLabel: "ID de error:",
          retry: "Intentar de nuevo",
        }
      : locale === "fr"
        ? {
            title: "Une erreur s'est produite",
            body:
              "Un problème technique temporaire s'est produit. Réessayez dans quelques instants ou écrivez-nous à",
            digestLabel: "ID d'erreur :",
            retry: "Réessayer",
          }
        : locale === "en"
          ? {
              title: "Something went wrong",
              body:
                "A temporary technical problem occurred. Please try again in a few moments or write to us at",
              digestLabel: "Error ID:",
              retry: "Try again",
            }
          : {
              title: "Qualcosa è andato storto",
              body:
                "Si è verificato un problema tecnico momentaneo. Riprova tra qualche istante oppure scrivici a",
              digestLabel: "ID errore:",
              retry: "Riprova",
            };

  useEffect(() => {
    console.error("[public] page error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-12">
      <div className="max-w-lg bg-white border border-red-200 rounded-2xl p-8 space-y-4 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">
          {copy.title}
        </h2>
        <p className="text-sm text-slate-700">
          {copy.body}{" "}
          <a
            href={getEmailHref()}
            className="text-[#d97706] underline"
          >
            {PUBLIC_CONTACT_EMAIL}
          </a>.
        </p>
        {error.digest && (
          <div className="rounded bg-slate-50 border text-xs font-mono p-3">
            <span className="text-slate-500">{copy.digestLabel}</span>{" "}
            <strong className="text-slate-800">{error.digest}</strong>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => reset()}
            className="bg-[#d97706] text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-[#b45309]"
          >
            {copy.retry}
          </button>
          <Link
            href={localizedStaticPath(locale, "/")}
            className="bg-white border border-slate-300 text-slate-900 rounded-full px-5 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
