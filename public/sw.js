// Prestair Dashboard Service Worker — network-first, no aggressive caching
const CACHE_NAME = "prestair-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Delete all old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Always go to network, never serve from cache
  return;
});
