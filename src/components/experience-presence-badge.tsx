"use client";

import { useEffect, useState } from "react";
import { UsersRound, X } from "lucide-react";

const STORAGE_KEY = "egadisailing:presence-visitor-id";
const ROME_TIME_ZONE = "Europe/Rome";

function getVisitorId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID().replace(/-/g, "");
    window.localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return crypto.randomUUID().replace(/-/g, "");
  }
}

function getRomeHour(date = new Date()): number {
  const hourPart = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hour12: false,
    timeZone: ROME_TIME_ZONE,
  })
    .formatToParts(date)
    .find((part) => part.type === "hour")?.value;

  return Number(hourPart ?? date.getHours());
}

function getTimeBasedPresenceBase(): number {
  const hour = getRomeHour();

  if (hour < 7) return 2;
  if (hour < 10) return 3;
  if (hour < 13) return 5;
  if (hour < 17) return 6;
  if (hour < 22) return 8;
  return 4;
}

function getDisplayCount(realCount: number): number {
  const otherActiveVisitors = Math.max(0, realCount - 1);
  return Math.min(18, getTimeBasedPresenceBase() + otherActiveVisitors);
}

function presenceTitle(locale: string): string {
  if (locale === "es") return "Mucho interés ahora";
  if (locale === "fr") return "Beaucoup d'intérêt en ce moment";
  if (locale === "de") return "Gerade viel Interesse";
  return locale === "en" ? "High interest right now" : "Interesse alto ora";
}

function presenceLabel(locale: string, count: number): string {
  if (locale === "es") {
    return `${count} personas están viendo esta página ahora mismo`;
  }
  if (locale === "fr") {
    return `${count} personnes consultent cette page en ce moment`;
  }
  if (locale === "de") {
    return `${count} Personen sehen sich diese Seite gerade an`;
  }
  if (locale === "en") {
    return `${count} people are viewing this page right now`;
  }
  return `${count} persone stanno visitando questa pagina in questo momento`;
}

export function ExperiencePresenceNotice({
  serviceId,
  locale,
}: {
  serviceId: string;
  locale: string;
}) {
  const [count, setCount] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const visitorId = getVisitorId();

    async function heartbeat() {
      try {
        const response = await fetch("/api/experience-presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceId, visitorId }),
          keepalive: true,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { data?: { count?: number } };
        const nextCount = payload.data?.count;
        if (!cancelled && typeof nextCount === "number") {
          setCount(nextCount);
        }
      } catch {
        /* Presence is non-critical. */
      }
    }

    void heartbeat();
    const interval = window.setInterval(heartbeat, 25_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void heartbeat();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [serviceId]);

  useEffect(() => {
    if (count == null || dismissed) return;

    const timeout = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timeout);
  }, [count, dismissed]);

  if (count == null || dismissed) return null;

  const displayCount = getDisplayCount(count);

  return (
    <aside
      aria-live="polite"
      className={`fixed right-3 bottom-24 z-[70] w-[min(calc(100vw_-_1.5rem),22rem)] rounded-lg border border-emerald-200/70 bg-white/[0.96] p-4 text-slate-900 shadow-2xl shadow-slate-950/20 backdrop-blur transition duration-700 motion-reduce:transition-none sm:right-5 sm:top-28 sm:bottom-auto ${
        visible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-900/20">
          <UsersRound className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--color-ocean)]">
            {presenceTitle(locale)}
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            {presenceLabel(locale, displayCount)}
          </p>
        </div>
        <button
          type="button"
          aria-label={locale === "es" ? "Cerrar aviso" : locale === "fr" ? "Fermer l'avis" : locale === "de" ? "Hinweis schließen" : locale === "en" ? "Close notice" : "Chiudi avviso"}
          onClick={() => setDismissed(true)}
          className="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
