const CACHE_NAME = "checkers-v2";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/icon-192.svg",
  "/icon-512.svg",
  "/manifest.json",
];

// Install — precache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith("checkers-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch — stale-while-revalidate for assets, network-first for navigation
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET, socket.io, and API requests
  if (request.method !== "GET") return;
  if (request.url.includes("/socket.io")) return;
  if (request.url.includes("/api/")) return;

  // Navigation requests (HTML pages) — network first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts) — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
