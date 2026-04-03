const CACHE_NAME = 'agendei-v3';
const STATIC_ASSETS = [
  '/manifest.json',
];

// Instalar e cachear apenas assets estáticos mínimos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: Network first para tudo (sem cache de JS/CSS para evitar problemas de versão)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições de API e tRPC
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/trpc')) {
    return;
  }

  // Ignorar assets do Vite (JS, CSS, chunks) - sempre buscar da rede
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/src/') ||
      url.pathname.includes('node_modules') || url.pathname.includes('.vite') ||
      url.pathname.endsWith('.js') || url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx')) {
    return;
  }

  // Para navegação (HTML), sempre tentar rede primeiro
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Para outros assets estáticos (imagens, fontes): cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
