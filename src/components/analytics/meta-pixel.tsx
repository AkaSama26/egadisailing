"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ANALYTICS_EVENT_BROWSER_EVENT,
  isTrackingConsentGranted,
  type DataLayerEvent,
} from "@/lib/analytics/client";
import { buildPageViewPayload } from "@/lib/analytics/page";
import {
  buildMetaPixelInitScript,
  mapDataLayerEventToMetaPixel,
  type MetaPixelMappedEvent,
} from "@/lib/analytics/meta-pixel";

type MetaFbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: MetaFbq;
    _fbq?: MetaFbq;
    __egadiMetaLastPageViewKey?: string;
  }
}

interface MetaPixelProps {
  pixelId: string;
}

let eventSequence = 0;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`);
  return `{${entries.join(",")}}`;
}

function hashEventSeed(value: unknown): string {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function nextEventId(name: string, params: Record<string, unknown>): string {
  eventSequence += 1;
  return `egadi_${Date.now().toString(36)}_${eventSequence.toString(36)}_${hashEventSeed({ name, params })}`;
}

function callMetaPixel(mapped: MetaPixelMappedEvent): boolean {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return false;
  const method = mapped.kind === "standard" ? "track" : "trackCustom";
  window.fbq(method, mapped.name, mapped.params, {
    eventID: nextEventId(mapped.name, mapped.params),
  });
  return true;
}

function sendPageView(): boolean {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof window.fbq !== "function" ||
    !isTrackingConsentGranted("marketing")
  ) {
    return false;
  }

  const payload = buildPageViewPayload(window.location.href, {
    title: document.title,
    referrer: document.referrer,
  });
  const key = `${payload.page_location}|${payload.page_title ?? ""}`;
  if (window.__egadiMetaLastPageViewKey === key) return false;

  const params: Record<string, unknown> = {
    locale: payload.locale,
    page_type: payload.page_type,
  };
  if (payload.service_slug) params.service_slug = payload.service_slug;

  window.fbq("track", "PageView", params, {
    eventID: nextEventId("PageView", params),
  });
  window.__egadiMetaLastPageViewKey = key;
  return true;
}

function isAnalyticsCustomEvent(event: Event): event is CustomEvent<DataLayerEvent> {
  return "detail" in event && Boolean((event as CustomEvent<DataLayerEvent>).detail?.event);
}

export function MetaPixel({ pixelId }: MetaPixelProps) {
  const normalizedPixelId = pixelId.trim();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const initScript = useMemo(
    () => buildMetaPixelInitScript(normalizedPixelId),
    [normalizedPixelId],
  );

  useEffect(() => {
    function syncConsent() {
      const granted = isTrackingConsentGranted("marketing");
      setEnabled(granted);
      if (!granted) setReady(false);
      if (granted && typeof window.fbq === "function") setReady(true);
    }

    syncConsent();
    window.addEventListener("egadi:tracking-consent-updated", syncConsent);
    return () => window.removeEventListener("egadi:tracking-consent-updated", syncConsent);
  }, []);

  useEffect(() => {
    if (!enabled || ready) return;
    const timer = window.setInterval(() => {
      if (typeof window.fbq === "function") {
        setReady(true);
        window.clearInterval(timer);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [enabled, ready]);

  useEffect(() => {
    if (!enabled || !ready) return;
    const timer = window.setTimeout(sendPageView, 0);
    return () => window.clearTimeout(timer);
  }, [enabled, ready, pathname, searchParams]);

  useEffect(() => {
    if (!enabled || !ready) return;

    function handleAnalyticsEvent(event: Event) {
      if (!isTrackingConsentGranted("marketing") || !isAnalyticsCustomEvent(event)) return;
      const mapped = mapDataLayerEventToMetaPixel(event.detail);
      if (mapped) callMetaPixel(mapped);
    }

    window.addEventListener(ANALYTICS_EVENT_BROWSER_EVENT, handleAnalyticsEvent);
    return () => window.removeEventListener(ANALYTICS_EVENT_BROWSER_EVENT, handleAnalyticsEvent);
  }, [enabled, ready]);

  if (!normalizedPixelId || !enabled) return null;

  return (
    <Script
      id="egadi-meta-pixel"
      strategy="afterInteractive"
      onReady={() => setReady(true)}
      dangerouslySetInnerHTML={{ __html: initScript }}
    />
  );
}
