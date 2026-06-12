/* Service worker — Dose · Distance · Temps */
const CACHE = 'dosecalc-v13';

/* Fichiers de l'application à mettre en cache à l'installation */
const SHELL = [
  './',
  './index.html',
  './spectro.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

/* Installation : on précharge la coque de l'app */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

/* Activation : on supprime les anciens caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Requêtes : cache d'abord, réseau ensuite (et on met en cache au passage,
   y compris les polices Google pour un vrai hors-ligne). */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(cache => {
          try { cache.put(event.request, copy); } catch (e) {}
        });
        return resp;
      }).catch(() => cached);
    })
  );
});
