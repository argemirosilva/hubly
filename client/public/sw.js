const CACHE_NAME = 'hubly-v2';
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/offline.html',
];

// Instalar: cachear app shell para funcionamento offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Ativar: limpar caches antigos e notificar clientes sobre nova versão
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => {
      // Notificar todas as janelas abertas sobre a nova versão
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
      });
    })
  );
  self.clients.claim();
});

// Estratégia de fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições de API e tRPC
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Ignorar assets do Vite em desenvolvimento
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/src/') ||
      url.pathname.includes('node_modules') || url.pathname.includes('.vite') ||
      url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx')) {
    return;
  }

  // Para navegação (HTML): Network first, fallback para offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear a resposta de navegação para uso offline futuro
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
          return response;
        })
        .catch(() => {
          // Offline: tentar servir do cache, senão mostrar página offline
          return caches.match('/').then((cached) => {
            if (cached) return cached;
            return caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // Para JS/CSS em produção (assets com hash): Cache first (imutáveis)
  if ((url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) && url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Para fontes e imagens: Cache first com fallback de rede
  if (url.pathname.match(/\.(woff2?|ttf|otf|png|jpg|jpeg|webp|svg|ico|gif)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // Demais: Network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Hubly', body: event.data.text() };
  }

  const {
    title = 'Hubly',
    body = '',
    icon = '/android-icons/icon-192x192.png',
    tag,
    sound = false,
    data = {},
    url = '/',
  } = payload;

  // Agrupamento por tipo: usar tag para agrupar notificações similares
  const notificationTag = tag || `hubly-${data.type || 'geral'}`;

  const notificationOptions = {
    body,
    icon,
    tag: notificationTag,
    renotify: true,
    requireInteraction: false,
    silent: !sound,
    data: { ...data, url },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// Ao clicar na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Ao fechar a notificação
self.addEventListener('notificationclose', () => {
  // Analytics
});
