const CACHE_NAME = 'data-dropper-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/pwa-icon-512.png',
  '/bronze_drop.png',
  '/silver_drop.png',
  '/gold_drop.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
