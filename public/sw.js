// ==========================================
// PWA SERVICE WORKER (CACHING STRATEGY)
// ==========================================

const CACHE_NAME = "mate-chess-cache-v2";
const STATIC_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./imgs/Mate.png",
  "./sounds/move.mp3",
  "./sounds/capture.mp3",
  "./sounds/checkmate.mp3",
  "./imgs/wP.svg",
  "./imgs/wR.svg",
  "./imgs/wN.svg",
  "./imgs/wB.svg",
  "./imgs/wQ.svg",
  "./imgs/wK.svg",
  "./imgs/bP.svg",
  "./imgs/bR.svg",
  "./imgs/bN.svg",
  "./imgs/bB.svg",
  "./imgs/bQ.svg",
  "./imgs/bK.svg"
];

// Cache core shell assets on install
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL).catch((err) => console.log("Static caching assets skipped", err));
    })
  );
  self.skipWaiting();
});

// Clean old caches on activation
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Cache First with Network Fallback & Dynamic Caching Strategy
self.addEventListener("fetch", (e) => {
  // Only handle HTTP/HTTPS protocols (avoid chrome-extension issues)
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((response) => {
        // Dynamic cache for newly loaded files (hashed bundle JS/CSS, images, web workers)
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return response;
      }).catch((err) => {
        // Offline support: fallback to index.html if navigating
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        throw err;
      });
    })
  );
});
