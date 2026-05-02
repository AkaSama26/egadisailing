export const LEGACY_CACHE_RESET_VERSION = "20260502";
export const LEGACY_CACHE_RESET_COOKIE = "egadi_cache_reset";

export const SERVICE_WORKER_TOMBSTONE_SCRIPT = `const TOMBSTONE_VERSION = "egadisailing-sw-tombstone-${LEGACY_CACHE_RESET_VERSION}";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      await self.clients.claim();
      await self.registration.unregister();

      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      await Promise.all(
        clientsList.map((client) => {
          client.postMessage({ type: "EGADISAILING_SW_TOMBSTONE", version: TOMBSTONE_VERSION });
          return "navigate" in client ? client.navigate(client.url) : undefined;
        }),
      );
    })(),
  );
});
`;

export const serviceWorkerHeaders = {
  "Content-Type": "application/javascript; charset=utf-8",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
  "Service-Worker-Allowed": "/",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'",
} as const;

const knownServiceWorkerFiles = new Set([
  "firebase-messaging-sw.js",
  "ngsw-worker.js",
  "onesignalsdkupdaterworker.js",
  "onesignalsdkworker.js",
  "pwa-sw.js",
  "pwa-sw.php",
  "service-worker.js",
  "service-worker.php",
  "serviceworker.js",
  "superpwa-sw.js",
  "superpwa-sw.php",
  "sw-precache.js",
  "sw.js",
  "workbox-sw.js",
  "wp-pwa-sw.js",
  "wordpress-pwa-sw.js",
]);

export function isLegacyServiceWorkerPath(pathname: string): boolean {
  const normalized = pathname.toLowerCase();
  const basename = normalized.split("/").filter(Boolean).at(-1) ?? "";

  if (knownServiceWorkerFiles.has(basename)) {
    return true;
  }

  if (!basename.endsWith(".js") && !basename.endsWith(".php")) {
    return false;
  }

  const looksLikeServiceWorker =
    basename.includes("worker") ||
    basename === "sw.js" ||
    basename === "sw.php" ||
    basename.endsWith("-sw.js") ||
    basename.endsWith("-sw.php") ||
    basename.endsWith(".sw.js") ||
    basename.endsWith(".sw.php") ||
    basename.includes("serviceworker");

  if (!looksLikeServiceWorker) {
    return false;
  }

  return (
    normalized.startsWith("/wp-content/plugins/") ||
    normalized.startsWith("/wp-content/cache/") ||
    normalized.startsWith("/wp-includes/") ||
    normalized.startsWith("/wp-admin/") ||
    normalized.includes("/pwa") ||
    normalized.includes("/onesignal")
  );
}
