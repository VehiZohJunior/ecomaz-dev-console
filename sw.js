/* =========================================================================
   EcoMaZ Console Développeur — Service Worker
   Rend la console installable et capable de s'ouvrir même sans connexion
   (elle a de toute façon besoin d'internet pour agir sur les écoles du
   cloud — ceci ne fait que permettre à l'interface de s'afficher).
   ========================================================================= */
const CACHE_NAME = 'ecomaz-dev-console-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './app-dev.js',
  './config.js',
  './supabase-client.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copie = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copie)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request).then((trouve) => trouve || caches.match('./index.html')))
  );
});
