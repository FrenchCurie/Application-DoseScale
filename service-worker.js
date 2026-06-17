/* Service worker — Dose · Distance · Temps */
const CACHE = 'dosecalc-v24';

/* Fichiers de l'application à mettre en cache à l'installation */
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  './mark.png',
  './logo.png'
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

/* Requêtes :
   - Données live du compteur (relais Cloudflare /latest) → RÉSEAU d'abord,
     repli sur le cache uniquement si hors-ligne (sinon la valeur reste figée).
   - Reste (coque, polices) → cache d'abord, réseau ensuite. */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isLive = url.hostname.endsWith('workers.dev') || url.pathname.endsWith('/latest');

  if (isLive) {
    event.respondWith(
      fetch(event.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(cache => { try { cache.put(event.request, copy); } catch (e) {} });
        return resp;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

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
