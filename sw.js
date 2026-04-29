importScripts('/ticket-store.js');

const SHELL_CACHE = 'osfna-shell-v1';
const STATIC_CACHE = 'osfna-static-v1';
const OFFLINE_ROUTES = new Set(['/passport.html', '/ticket.html']);
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/passport.html',
  '/scanner.html',
  '/scan/',
  '/ticket.html',
  '/style.css',
  '/script.js',
  '/pwa-shell.js',
  '/ticket-store.js',
  '/manifest.json',
  '/assets/favicon.png',
  '/assets/logo-main.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => ![SHELL_CACHE, STATIC_CACHE].includes(key))
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate' && OFFLINE_ROUTES.has(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isSameOrigin && (request.destination === 'script' || request.destination === 'style' || request.destination === 'image')) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', (event) => {
  const { data } = event;
  if (!data?.type) return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'STORE_TICKET' && data.ticket?.id) {
    event.waitUntil(
      self.OSFNATicketStore.putTicket(data.ticket).then(() => {
        if (event.source?.postMessage) {
          event.source.postMessage({ type: 'TICKET_STORED', id: data.ticket.id });
        }
      })
    );
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  const title = payload.title || 'OSFNA 2026';
  const options = {
    body: payload.body || 'Open the app for the latest update.',
    icon: '/assets/favicon.png',
    badge: '/assets/favicon.png',
    tag: payload.tag || 'osfna-update',
    data: {
      url: payload.url || '/index.html',
      topic: payload.topic || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = event.notification.data?.url || '/index.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      const existing = clientsList.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) return existing.focus().then(() => existing.navigate(destination));
      return self.clients.openWindow(destination);
    })
  );
});
