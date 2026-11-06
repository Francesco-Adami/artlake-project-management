// ArtLake Studio Service Worker for PWA installability
const CACHE_NAME = 'artlake-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through network fetch to support offline fallback and satisfy PWA criteria
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

