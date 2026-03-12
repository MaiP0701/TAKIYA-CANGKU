// Transitional cleanup service worker.
// Purpose: remove previously cached app-shell/runtime assets and unregister itself
// so users stop being pinned to stale frontend bundles after deployment.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      await self.clients.claim();
      await self.registration.unregister();

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      await Promise.all(
        clients.map(async (client) => {
          try {
            await client.navigate(client.url);
          } catch {
            return undefined;
          }

          return undefined;
        })
      );
    })()
  );
});
