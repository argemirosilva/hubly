const CACHE_NAME = 'hubly-v1';
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
    icon = '/icon-192.png',
    badge = '/icon-192.png',
    tag = 'hubly-notification',
    sound = false,
    data = {},
    url = '/',
  } = payload;

  const notificationOptions = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    requireInteraction: false,
    silent: !sound, // Se sound=true, o navegador usa o som padrão do sistema
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
      // Se já tem uma janela aberta, focar nela
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Caso contrário, abrir nova janela
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Ao fechar a notificação
self.addEventListener('notificationclose', () => {
  // Pode ser usado para analytics
});
