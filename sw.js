/**
 * Service Worker - Offline Caching & Background Push Event Receiver
 */
const CACHE_NAME = 'aio-utility-v13';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './css/responsive.css',
  './js/app.js',
  './js/modules.config.js',
  './js/core/EventBus.js',
  './js/core/Storage.js',
  './js/core/Router.js',
  './js/core/ModuleRegistry.js',
  './modules/downloader/index.js',
  './modules/downloader/DownloaderService.js',
  './modules/downloader/DownloaderView.js',
  './modules/downloader/downloader.css',
  './modules/frame-studio/index.js',
  './modules/frame-studio/CanvasEditor.js',
  './modules/frame-studio/FrameStudioView.js',
  './modules/frame-studio/FrameAiService.js',
  './modules/frame-studio/frame-studio.css',
  './modules/productive-tools/index.js',
  './modules/productive-tools/VehicleService.js',
  './modules/productive-tools/GeminiService.js',
  './modules/productive-tools/ProductiveToolsView.js',
  './modules/productive-tools/productive-tools.css',
  './modules/notifications/index.js',
  './modules/notifications/NotificationManager.js',
  './modules/notifications/ServiceScheduler.js',
  './modules/notifications/notifications.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First: Ambil versi terbaru dari server selalu, fallback ke cache hanya saat offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // PENTING: Jangan pernah intercept endpoint API dinamis
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => cached || caches.match('./index.html'));
      })
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Pengingat Servis Motor', body: 'Waktunya ganti oli motor Anda.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=128&auto=format&fit=crop&q=80',
    badge: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=128&auto=format&fit=crop&q=80',
    tag: 'service-reminder',
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});
