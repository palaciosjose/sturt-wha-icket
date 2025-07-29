// Service Worker básico para evitar errores
const CACHE_NAME = 'whaticket-cache-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // Evitar interceptar peticiones que no son GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Solo cachear archivos estáticos importantes, no archivos de media
  if (event.request.url.includes('/public/') && 
      (event.request.url.includes('.ogg') || event.request.url.includes('.mp3') || event.request.url.includes('.mp4'))) {
    // Para archivos de media, solo hacer fetch sin cachear y manejar 404 silenciosamente
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response.ok) {
            // Si es 404, devolver respuesta vacía sin error
            return new Response(null, { status: 404 });
          }
          return response;
        })
        .catch(() => {
          // Si falla completamente, devolver respuesta vacía sin error
          return new Response(null, { status: 404 });
        })
    );
    return;
  }

  // Para otras peticiones, usar cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            // Solo cachear respuestas exitosas
            if (response && response.status === 200 && response.type === 'basic') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          })
          .catch(() => {
            // Si falla, devolver una respuesta vacía en lugar de error
            return new Response(null, { status: 404 });
          });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Manejar mensajes para evitar errores de canal
self.addEventListener('message', (event) => {
  // Responder inmediatamente para evitar errores de canal
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Responder con un mensaje simple para evitar errores
  event.ports[0]?.postMessage({ type: 'ACK' });
}); 