self.addEventListener('install', (event) => {
  console.log('Service Worker Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker Activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through fetch handler required for PWA installability
  event.respondWith(fetch(event.request));
});
