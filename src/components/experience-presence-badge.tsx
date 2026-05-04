"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

const STORAGE_KEY = "egadisailing:presence-visitor-id";

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

function presenceLabel(locale: string, count: number): string {
  if (locale === "en") {
    return count === 1
      ? "1 person is viewing this experience now"
      : `${count} people are viewing this experience now`;
  }
  return count === 1
    ? "1 persona sta visitando questa esperienza ora"
    : `${count} persone stanno visitando questa esperienza ora`;
}

export function ExperiencePresenceBadge({
  serviceId,
  locale,
}: {
  serviceId: string;
  locale: string;
}) {
  const [count, setCount] = useState<number | null>(null);

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

  if (count == null) return null;

  return (
    <span
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-400/14 px-4 py-2 text-sm font-semibold text-white backdrop-blur"
    >
      <Eye className="h-4 w-4 text-emerald-200" />
      {presenceLabel(locale, count)}
    </span>
  );
}
