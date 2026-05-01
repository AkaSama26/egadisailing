const TOMBSTONE_VERSION = "egadisailing-sw-tombstone-20260501";

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
