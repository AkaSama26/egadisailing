"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { buildPageViewPayload } from "@/lib/analytics/page";
import { trackEvent } from "@/lib/analytics/client";

function sendPageView() {
  const payload = buildPageViewPayload(window.location.href, {
    title: document.title,
    referrer: document.referrer,
  });
  const key = `${payload.page_location}|${payload.page_title ?? ""}`;
  if (window.__egadiLastPageViewKey === key) return;
  const tracked = trackEvent("page_view", payload);
  if (tracked) window.__egadiLastPageViewKey = key;
}

export function GtmPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const timer = window.setTimeout(sendPageView, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, searchParams]);

  useEffect(() => {
    window.addEventListener("egadi:tracking-consent-updated", sendPageView);
    return () => window.removeEventListener("egadi:tracking-consent-updated", sendPageView);
  }, []);

  return null;
}
