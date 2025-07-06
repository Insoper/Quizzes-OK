const CACHE_NAME = 'kuis-interaktif-v2'; // Selalu update versi saat perubahan
const OFFLINE_URL = '/offline.html'; // Halaman fallback
const urlsToCache = [
  '/',
  '/index.html',
  '/student.html',
  '/offline.html', // Tambahkan halaman offline
  '/manifest.json',
  '/sw.js',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// Strategi Cache: Cache First, Fallback ke Network
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache terbuka');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Gagal mengisi cache:', err);
      })
  );
});

// Aktifkan service worker segera
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Abaikan request non-GET dan request external khusus
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://') || 
      event.request.url.includes('extension')) {
    return;
  }

  // Handle request API secara khusus
  if (event.request.url.includes('/api/') || event.request.url.includes(WEB_APP_URL)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache response API jika perlu
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Fallback untuk API
          return new Response(JSON.stringify({ error: "Anda offline" }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Untuk aset lainnya
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response atau fetch dari network
        return response || fetch(event.request)
          .then(networkResponse => {
            // Cache response baru
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return networkResponse;
          })
          .catch(() => {
            // Fallback untuk halaman
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            // Fallback untuk aset
            return new Response('<svg>...</svg>', { 
              headers: { 'Content-Type': 'image/svg+xml' } 
            });
          });
      })
  );
});
