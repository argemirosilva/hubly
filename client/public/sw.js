// Incrementar versão para invalidar todos os caches antigos
const CACHE_NAME = 'agendei-v4';

// Ao instalar, limpar TODOS os caches anteriores imediatamente
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.skipWaiting())
  );
});

// Ao ativar, assumir controle de todos os clientes imediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estratégia: Network First para tudo (sem cache de JS/CSS do Vite)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições de API
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Para assets do Vite: sempre rede, sem cache
  if (
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@fs') ||
    url.pathname.includes('node_modules') ||
    url.pathname.startsWith('/src/')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Para navegação (HTML): sempre rede primeiro
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Para outros assets estáticos: rede primeiro com fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
