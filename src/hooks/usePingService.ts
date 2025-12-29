import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiService } from '@/services/api';

const PING_INTERVAL_NORMAL = 5 * 60 * 1000; // 5 minutos
const PING_INTERVAL_LOW_BATTERY = 15 * 60 * 1000; // 15 minutos
const RETRY_INTERVAL = 30 * 1000; // 30 segundos

interface PingPayload {
  email_usuario: string;
  dispositivo_info: string;
  bateria_percentual?: number;
  versao_app: string;
}

export const usePingService = () => {
  const { user, config } = useAppStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [isServiceWorkerActive, setIsServiceWorkerActive] = useState(false);

  const getDeviceInfo = useCallback((): string => {
    const ua = navigator.userAgent;
    const platform = navigator.platform || 'Unknown';
    
    if (/android/i.test(ua)) {
      const match = ua.match(/Android\s+([\d.]+)/);
      const version = match ? match[1] : 'Unknown';
      return `Android ${version} - ${platform}`;
    }
    
    if (/iPad|iPhone|iPod/.test(ua)) {
      const match = ua.match(/OS\s+([\d_]+)/);
      const version = match ? match[1].replace(/_/g, '.') : 'Unknown';
      return `iOS ${version} - ${platform}`;
    }
    
    return `Web Browser - ${platform}`;
  }, []);

  const getAppVersion = useCallback((): string => {
    return '1.0.0';
  }, []);

  // Registrar Service Worker para background sync
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.log('[Ping] Service Worker não suportado');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw-ping.js', {
        scope: '/',
      });
      
      swRegistrationRef.current = registration;
      console.log('[Ping] Service Worker registrado');

      // Aguardar ativação
      await navigator.serviceWorker.ready;
      setIsServiceWorkerActive(true);

      // Registrar periodic sync se disponível
      if ('periodicSync' in registration) {
        try {
          // @ts-ignore - API experimental
          await registration.periodicSync.register('ping-sync', {
            minInterval: 5 * 60 * 1000, // 5 minutos
          });
          console.log('[Ping] Periodic Sync registrado');
        } catch (error) {
          console.log('[Ping] Periodic Sync não permitido:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('[Ping] Erro ao registrar Service Worker:', error);
      return false;
    }
  }, []);

  // Enviar configuração para o Service Worker
  const initServiceWorkerPing = useCallback(async () => {
    if (!navigator.serviceWorker.controller) return;
    
    const batteryLevel = await apiService.getBatteryLevel();
    
    navigator.serviceWorker.controller.postMessage({
      type: 'INIT_PING',
      data: {
        email: user?.email,
        apiBaseUrl: config?.apiBaseUrl,
        batteryLevel,
      },
    });
    
    console.log('[Ping] Configuração enviada ao Service Worker');
  }, [user, config]);

  // Atualizar bateria no Service Worker
  const updateBatteryInSW = useCallback(async () => {
    if (!navigator.serviceWorker.controller) return;
    
    const batteryLevel = await apiService.getBatteryLevel();
    
    navigator.serviceWorker.controller.postMessage({
      type: 'UPDATE_BATTERY',
      data: { batteryLevel },
    });
  }, []);

  const sendPing = useCallback(async (): Promise<boolean> => {
    if (!user?.email || !config?.apiBaseUrl) return false;

    try {
      if (!navigator.onLine) {
        console.log('[Ping] Sem internet, adiando ping');
        return false;
      }

      const batteryLevel = await apiService.getBatteryLevel();
      
      const payload: PingPayload = {
        email_usuario: user.email,
        dispositivo_info: getDeviceInfo(),
        bateria_percentual: batteryLevel,
        versao_app: getAppVersion(),
      };

      const response = await fetch(`${config.apiBaseUrl}/api/functions/pingMobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[Ping] ✅ Enviado com sucesso');
        // Atualizar bateria no SW
        updateBatteryInSW();
        return true;
      } else {
        console.error('[Ping] ❌ Erro:', data.error);
        return false;
      }
    } catch (error) {
      console.error('[Ping] ❌ Erro ao enviar:', error);
      return false;
    }
  }, [user, config, getDeviceInfo, getAppVersion, updateBatteryInSW]);

  const scheduleNextPing = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const batteryLevel = await apiService.getBatteryLevel();
    const interval = (batteryLevel && batteryLevel < 15) 
      ? PING_INTERVAL_LOW_BATTERY 
      : PING_INTERVAL_NORMAL;

    console.log(`[Ping] Próximo ping em ${interval / 60000} minutos`);

    intervalRef.current = setInterval(async () => {
      const success = await sendPing();
      
      if (!success && !retryTimeoutRef.current) {
        retryTimeoutRef.current = setTimeout(async () => {
          await sendPing();
          retryTimeoutRef.current = null;
        }, RETRY_INTERVAL);
      }
    }, interval);
  }, [sendPing]);

  const start = useCallback(async () => {
    if (isRunningRef.current) return;
    
    isRunningRef.current = true;
    console.log('[Ping] Serviço iniciado');

    // Registrar Service Worker para background
    const swRegistered = await registerServiceWorker();
    
    if (swRegistered) {
      // Aguardar um pouco para o SW estar pronto
      setTimeout(() => {
        initServiceWorkerPing();
      }, 1000);
    }

    // Enviar ping imediato
    await sendPing();

    // Agendar pings regulares (fallback quando app está ativo)
    await scheduleNextPing();

    // Listener para quando voltar online
    const handleOnline = () => {
      console.log('[Ping] Conexão restaurada, enviando ping');
      sendPing();
    };

    // Listener para visibilidade (atualizar SW quando app volta ao foco)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Ping] App voltou ao foco');
        sendPing();
        updateBatteryInSW();
      }
    };

    // Listener para mensagens do Service Worker
    const handleSWMessage = (event: MessageEvent) => {
      const { type } = event.data;
      if (type === 'PING_SUCCESS') {
        console.log('[Ping] SW reportou ping bem-sucedido');
      } else if (type === 'PING_ERROR') {
        console.log('[Ping] SW reportou erro no ping');
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [sendPing, scheduleNextPing, registerServiceWorker, initServiceWorkerPing, updateBatteryInSW]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Parar Service Worker
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'STOP_PING' });
    }
    
    console.log('[Ping] Serviço parado');
  }, []);

  // Iniciar automaticamente quando usuário estiver logado
  useEffect(() => {
    if (user?.email && config?.apiBaseUrl) {
      start();
    }

    return () => {
      stop();
    };
  }, [user, config, start, stop]);

  return {
    sendPing,
    start,
    stop,
    isServiceWorkerActive,
  };
};
