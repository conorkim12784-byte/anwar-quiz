
const CACHE_NAME = 'anwar-quiz-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn-icons-png.flaticon.com/512/2874/2874311.png',
  'https://cdn-icons-png.flaticon.com/512/3241/3241517.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // محاولة إضافة الملفات الأساسية مع تجاهل الأخطاء لضمان استمرار التثبيت
      return Promise.allSettled(
        ASSETS.map(asset => cache.add(asset))
      ).then(() => self.skipWaiting());
    })
  );
});

self.addEventListener('fetch', (event) => {
  // نقوم بالتعامل فقط مع طلبات الـ GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        // لا نقوم بتخزين طلبات الـ API الخارجية (مثل Gemini) في الكاش بشكل مباشر هنا
        if (!event.request.url.startsWith('http')) return fetchResponse;
        
        return fetchResponse;
      }).catch(() => {
        // إذا فشل الاتصال بالإنترنت والملف غير موجود في الكاش
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ).then(() => self.clients.claim());
    })
  );
});
