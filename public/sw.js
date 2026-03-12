const CACHE_NAME = "bubble-tea-inventory-v2";
const APP_SHELL = [
  "/login",
  "/manifest.webmanifest",
  "/icon-192.svg",
  "/icon-512.svg",
  "/apple-touch-icon.svg",
  "/offline.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          if (
            response.ok &&
            (event.request.destination === "document" ||
              event.request.destination === "style" ||
              event.request.destination === "script" ||
              event.request.destination === "image" ||
              url.pathname.startsWith("/_next/static"))
          ) {
            const cloned = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }

          return response;
        })
        .catch(async () => {
          if (event.request.mode === "navigate") {
            return (await caches.match("/offline.html")) || Response.error();
          }

          return Response.error();
        });
    })
  );
});

