const CACHE_NAME = 'kuis-interaktif-v4';
const OFFLINE_URL = 'offline.html';
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwKYg9QAx77nM9Pl5iWqHw0_NFkb9l8GWhtXhW2ln-FWp48B1uCMO5IpL49in4SQCPW7Q/exec';

const urlsToCache = [
  './',
  './index.html',
  './student.html',
  './offline.html',
  './manifest.json',
  './sw.js',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Membuka cache...');
        return Promise.all(
          urlsToCache.map((url) => {
            return fetch(url)
              .then((response) => {
                if (response.ok) return cache.put(url, response);
                console.log('Gagal meng-cache:', url);
              })
              .catch((err) => console.log('Error caching:', url, err));
          })
        );
      })
      .catch((err) => console.error('Gagal mengisi cache:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://') || 
      event.request.url.includes('extension')) {
    return;
  }

  // Perbaikan: Gunakan WEB_APP_URL yang sudah didefinisikan atau ganti dengan pattern URL
  if (event.request.url.includes('/api/') || 
      event.request.url.includes(WEB_APP_URL) ||
      event.request.url.includes('script.google.com/macros')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          return new Response(JSON.stringify({ error: "Anda offline" }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request)
          .then((networkResponse) => {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return networkResponse;
          })
          .catch(() => {
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('<svg>...</svg>', { 
              headers: { 'Content-Type': 'image/svg+xml' } 
            });
          });
      })
  );
});

