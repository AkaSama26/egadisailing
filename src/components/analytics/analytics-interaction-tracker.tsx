"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  buildPageViewPayload,
  getLocaleFromPath,
  getPageType,
  getServiceSlugFromPath,
  sanitizePageUrl,
} from "@/lib/analytics/page";
import { trackEvent } from "@/lib/analytics/client";

const BOOKING_PATH_RE = /\/(prenota|book|booking|buchen|reservar|reserver)(\/|$)/i;
const WHATSAPP_RE = /(wa\.me|whatsapp\.com)/i;
const MAPS_RE = /(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|openstreetmap\.org)/i;
const SCROLL_DEPTHS = [25, 50, 75, 90] as const;

function textFromElement(element: Element): string | undefined {
  const label = element.getAttribute("aria-label") ?? element.textContent ?? "";
  const cleaned = label.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, 80) : undefined;
}

function closestTrackingLocation(element: Element): string | undefined {
  const location = element.closest<HTMLElement>("[data-analytics-location], section[id], header, footer, nav, main");
  if (!location) return undefined;
  const explicit = location.getAttribute("data-analytics-location");
  if (explicit) return explicit;
  if (location.id) return location.id;
  return location.tagName.toLowerCase();
}

function pageContext() {
  const payload = buildPageViewPayload(window.location.href, { title: document.title });
  return {
    locale: payload.locale ?? getLocaleFromPath(window.location.pathname),
    page_type: payload.page_type,
    service_slug: payload.service_slug ?? getServiceSlugFromPath(window.location.pathname),
    page_location: payload.page_location,
  };
}

function classifyLink(anchor: HTMLAnchorElement): { event: string; params: Record<string, unknown> } | null {
  const rawHref = anchor.getAttribute("href");
  if (!rawHref || rawHref.startsWith("#")) return null;
  const lowerHref = rawHref.toLowerCase();
  const text = textFromElement(anchor);
  const location = closestTrackingLocation(anchor);
  const context = pageContext();

  if (lowerHref.startsWith("mailto:")) {
    return {
      event: "email_click",
      params: { ...context, contact_method: "email", cta_text: text, cta_location: location, link_url: "mailto:[redacted]" },
    };
  }

  if (lowerHref.startsWith("tel:")) {
    return {
      event: "phone_click",
      params: { ...context, contact_method: "phone", cta_text: text, cta_location: location, link_url: "tel:[redacted]" },
    };
  }

  let url: URL;
  try {
    url = new URL(rawHref, window.location.href);
  } catch {
    return null;
  }

  const safeLinkUrl = sanitizePageUrl(url.href);

  if (WHATSAPP_RE.test(url.hostname)) {
    return {
      event: "whatsapp_click",
      params: { ...context, contact_method: "whatsapp", cta_text: text, cta_location: location, link_url: safeLinkUrl },
    };
  }

  if (MAPS_RE.test(url.hostname + url.pathname)) {
    return {
      event: "maps_click",
      params: { ...context, contact_method: "maps", cta_text: text, cta_location: location, link_url: safeLinkUrl },
    };
  }

  const isInternal = url.origin === window.location.origin;
  if (isInternal && BOOKING_PATH_RE.test(url.pathname)) {
    return {
      event: "book_now_click",
      params: {
        ...context,
        cta_id: `book_now:${location ?? context.page_type}`,
        cta_location: location,
        cta_text: text,
        link_url: safeLinkUrl,
      },
    };
  }

  if (isInternal) {
    const destinationPath = `${url.pathname}${url.search}`;
    return {
      event: "nav_click",
      params: {
        ...context,
        cta_location: location,
        cta_text: text,
        link_url: safeLinkUrl,
        destination_path: destinationPath,
      },
    };
  }

  return {
    event: "cta_click",
    params: {
      ...context,
      cta_id: `external:${url.hostname}`,
      cta_location: location,
      cta_text: text,
      link_url: safeLinkUrl,
      outbound_domain: url.hostname,
    },
  };
}

function trackAnnotatedElement(element: HTMLElement): boolean {
  const event = element.getAttribute("data-analytics-event");
  if (!event) return false;
  const params: Record<string, unknown> = {
    ...pageContext(),
    cta_id: element.getAttribute("data-analytics-id") ?? undefined,
    cta_location: element.getAttribute("data-analytics-location") ?? closestTrackingLocation(element),
    cta_text: textFromElement(element),
  };
  return trackEvent(event, params);
}

export function AnalyticsInteractionTracker() {
  const pathname = usePathname();
  const scrollDepthsSent = useRef<Set<number>>(new Set());
  const sectionsSeen = useRef<Set<string>>(new Set());

  useEffect(() => {
    scrollDepthsSent.current = new Set();
    sectionsSeen.current = new Set();
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (window.location.pathname.startsWith("/admin")) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest("[data-analytics-ignore]")) return;

      const annotated = target.closest<HTMLElement>("[data-analytics-event]");
      if (annotated && trackAnnotatedElement(annotated)) return;

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const classified = classifyLink(anchor);
      if (!classified) return;
      trackEvent(classified.event, classified.params);
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  useEffect(() => {
    function handleScroll() {
      if (window.location.pathname.startsWith("/admin")) return;
      const doc = document.documentElement;
      const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      const percent = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      for (const depth of SCROLL_DEPTHS) {
        if (percent < depth || scrollDepthsSent.current.has(depth)) continue;
        scrollDepthsSent.current.add(depth);
        trackEvent("scroll_depth", {
          ...pageContext(),
          scroll_depth: depth,
        });
      }
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [pathname]);

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin") || !("IntersectionObserver" in window)) return;
    let observer: IntersectionObserver | null = null;
    const timer = window.setTimeout(() => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>("main section[id], [data-analytics-section]"));
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
            const element = entry.target as HTMLElement;
            const sectionId = element.getAttribute("data-analytics-section") ?? element.id;
            if (!sectionId || sectionsSeen.current.has(sectionId)) continue;
            sectionsSeen.current.add(sectionId);
            trackEvent("section_view", {
              ...pageContext(),
              section_id: sectionId,
              section_title: textFromElement(element.querySelector("h1,h2,h3") ?? element),
            });
          }
        },
        { threshold: [0.5, 0.75] },
      );
      sections.forEach((section) => observer?.observe(section));
    }, 250);

    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [pathname]);

  return null;
}
