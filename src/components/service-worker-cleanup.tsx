"use client";

import { useEffect } from "react";

const CLEANUP_FLAG = "egadisailing:service-worker-cleanup:20260501";

async function clearOriginCaches(): Promise<boolean> {
  if (!("caches" in window)) {
    return false;
  }

  const keys = await window.caches.keys();
  await Promise.allSettled(keys.map((key) => window.caches.delete(key)));
  return keys.length > 0;
}

async function unregisterServiceWorkers(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(registrations.map((registration) => registration.unregister()));

  return registrations.length > 0 || Boolean(navigator.serviceWorker.controller);
}

export function ServiceWorkerCleanup() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (window.sessionStorage.getItem(CLEANUP_FLAG) === "done") {
          return;
        }

        const hadServiceWorker = await unregisterServiceWorkers();
        const hadCaches = await clearOriginCaches();

        window.sessionStorage.setItem(CLEANUP_FLAG, "done");

        if (!cancelled && hadServiceWorker) {
          window.location.reload();
        }

        if (!cancelled && hadCaches && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
          window.location.reload();
        }
      } catch {
        window.sessionStorage.setItem(CLEANUP_FLAG, "failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
