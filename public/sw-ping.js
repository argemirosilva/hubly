// Service Worker para persistência do ping em background
const PING_INTERVAL = 5 * 60 * 1000; // 5 minutos
const PING_INTERVAL_LOW_BATTERY = 15 * 60 * 1000; // 15 minutos
let pingIntervalId = null;
let userEmail = null;
let apiBaseUrl = null;
let lastBatteryLevel = 100;

// Receber configurações do app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'INIT_PING':
      userEmail = data.email;
      apiBaseUrl = data.apiBaseUrl;
      lastBatteryLevel = data.batteryLevel || 100;
      startPingService();
      break;
      
    case 'UPDATE_BATTERY':
      lastBatteryLevel = data.batteryLevel;
      // Ajustar intervalo baseado na bateria
      if (pingIntervalId) {
        clearInterval(pingIntervalId);
        startPingService();
      }
      break;
      
    case 'STOP_PING':
      stopPingService();
      break;
  }
});

function startPingService() {
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
  }
  
  // Enviar ping imediato
  sendPing();
  
  // Determinar intervalo baseado na bateria
  const interval = lastBatteryLevel < 15 ? PING_INTERVAL_LOW_BATTERY : PING_INTERVAL;
  
  console.log(`[SW Ping] Iniciando serviço com intervalo de ${interval / 60000} minutos`);
  
  pingIntervalId = setInterval(() => {
    sendPing();
  }, interval);
}

function stopPingService() {
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }
  console.log('[SW Ping] Serviço parado');
}

async function sendPing() {
  if (!userEmail || !apiBaseUrl) {
    console.log('[SW Ping] Configuração incompleta, ignorando ping');
    return;
  }

  try {
    const payload = {
      email_usuario: userEmail,
      dispositivo_info: getDeviceInfo(),
      bateria_percentual: lastBatteryLevel,
      versao_app: '1.0.0',
    };

    const response = await fetch(`${apiBaseUrl}/api/functions/pingMobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.success) {
      console.log('[SW Ping] ✅ Enviado com sucesso');
      notifyClients({ type: 'PING_SUCCESS', timestamp: Date.now() });
    } else {
      console.error('[SW Ping] ❌ Erro:', data.error);
      notifyClients({ type: 'PING_ERROR', error: data.error });
    }
  } catch (error) {
    console.error('[SW Ping] ❌ Erro ao enviar:', error.message);
    notifyClients({ type: 'PING_ERROR', error: error.message });
    
    // Retry em 30 segundos
    setTimeout(() => sendPing(), 30000);
  }
}

function getDeviceInfo() {
  const ua = self.navigator?.userAgent || 'Service Worker';
  
  if (/android/i.test(ua)) {
    const match = ua.match(/Android\s+([\d.]+)/);
    const version = match ? match[1] : 'Unknown';
    return `Android ${version} - Service Worker`;
  }
  
  if (/iPad|iPhone|iPod/.test(ua)) {
    const match = ua.match(/OS\s+([\d_]+)/);
    const version = match ? match[1].replace(/_/g, '.') : 'Unknown';
    return `iOS ${version} - Service Worker`;
  }
  
  return `Web Browser - Service Worker`;
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// Manter o Service Worker ativo
self.addEventListener('install', (event) => {
  console.log('[SW Ping] Instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW Ping] Ativado');
  event.waitUntil(self.clients.claim());
});

// Periodic Sync API (quando disponível)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'ping-sync') {
    event.waitUntil(sendPing());
  }
});
